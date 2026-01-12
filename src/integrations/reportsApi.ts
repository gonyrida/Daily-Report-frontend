// src/integrations/reportsApi.ts
// COOKIE-BASED AUTHENTICATION ONLY - NO TOKEN HANDLING

import { API_ENDPOINTS, PYTHON_API_BASE_URL } from "../config/api";
import { apiGet, apiPost } from "../lib/apiFetch";
import { pythonApiPost } from "../lib/pythonApiFetch";

const API_BASE_URL = API_ENDPOINTS.DAILY_REPORTS.BASE;

// SECURITY: NO token handling, NO localStorage, NO Authorization headers

export const saveReportToDB = async (reportData: any) => {
  console.log("🔒 SAVE REPORT: Attempting to save report");

  const response = await apiPost(API_ENDPOINTS.DAILY_REPORTS.SAVE, reportData);

  console.log(`🔒 SAVE REPORT: Response ${response.status}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to save report" }));
    console.error("🔒 SAVE REPORT: Failed:", error);
    throw new Error(error.message || "Failed to save report");
  }

  const result = await response.json();
  console.log("🔒 SAVE REPORT: Success:", result);
  return result;
};

export const submitReportToDB = async (
  projectName: string,
  reportDate: Date
) => {
  const year = reportDate.getFullYear();
  const month = String(reportDate.getMonth() + 1).padStart(2, "0");
  const day = String(reportDate.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  console.log("🔒 SUBMIT REPORT: Submitting for", { projectName, dateStr });

  const response = await apiPost(API_ENDPOINTS.DAILY_REPORTS.SUBMIT, { projectName, date: dateStr });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to submit report" }));
    console.error("🔒 SUBMIT REPORT: Failed:", error);
    throw new Error(error.message || "Failed to submit report");
  }

  const result = await response.json();
  console.log("🔒 SUBMIT REPORT: Success:", result);
  return result;
};

export const loadReportFromDB = async (reportDate: Date) => {
  try {
    const year = reportDate.getFullYear();
    const month = String(reportDate.getMonth() + 1).padStart(2, "0");
    const day = String(reportDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    console.log("🔒 LOAD REPORT: Loading for date:", dateStr);

    const url = API_ENDPOINTS.DAILY_REPORTS.GET_BY_DATE(dateStr);
    const response = await apiGet(url);

    console.log(`🔒 LOAD REPORT: Response ${response.status}`);

    // 404 means "no report exists" - this is expected behavior
    if (response.status === 404) {
      console.log("🔒 LOAD REPORT: No report found (expected 404)");
      return null;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔒 LOAD REPORT: Error:", response.status, errorText);
      throw new Error(`Failed to load report: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("🔒 LOAD REPORT: Success:", result);
    return result;
  } catch (err) {
    console.error("🔒 LOAD REPORT: Exception:", err);
    throw err;
  }
};

export const generatePythonExcel = async (
  payload: any,
  mode: "report" | "reference" | "combined",
  fileName?: string
) => {
  try {
    // Get custom logos from localStorage for report mode
    let enhancedPayload = payload;
    if (mode === "report" || mode === "combined") {
      const cacpmLogo = localStorage.getItem("customCacpmLogo");
      const koicaLogo = localStorage.getItem("customKoicaLogo");
      
      enhancedPayload = {
        ...payload,
        cacpm_logo: cacpmLogo,
        koica_logo: koicaLogo,
        // userId will be extracted from JWT cookie by Python backend
      };
    }

    console.log("🔑 PYTHON EXCEL: Sending payload - userId will be validated by backend");

    const response = await pythonApiPost(`${PYTHON_API_BASE_URL}/generate-report`, {
      mode,
      data: enhancedPayload,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to generate report" }));
      throw new Error(
        error.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Handle file download
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Use provided filename or fallback to default
    const filename = fileName
      ? `${fileName}.xlsx`
      : mode === "report"
      ? `report-${payload.projectName || "export"}-${
          new Date().toISOString().split("T")[0]
        }.xlsx`
      : mode === "reference"
      ? `reference-${payload.projectName || "export"}-${
          new Date().toISOString().split("T")[0]
        }.xlsx`
      : `combined-${payload.projectName || "export"}-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Python Excel generation error:", error);
    throw error;
  }
};

export const generateReferenceExcel = async (
  referenceSections: any[],
  tableTitle: string = "SITE PHOTO EVIDENCE",
  fileName?: string
) => {
  try {
    const referenceEntries = referenceSections.flatMap((section: any) =>
      (section.entries ?? []).map((entry: any) => {
        const slots = entry.slots ?? [];
        return {
          section_title: section.title || "",
          images: slots
            .map((s: any) => s.image)
            .filter(Boolean)
            .slice(0, 2),
          footers: slots
            .map((s: any) => s.caption)
            .filter(Boolean)
            .slice(0, 2),
        };
      })
    );

    // userId will be extracted from JWT cookie by Python backend
    const payload = {
      table_title: tableTitle,
      reference: referenceEntries,
    };

    console.log("🔑 REFERENCE EXCEL: Sending payload - userId will be validated by backend");

    const response = await pythonApiPost(`${PYTHON_API_BASE_URL}/generate-reference`, payload);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to generate reference" }));
      throw new Error(
        error.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Handle file download
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Use provided filename or fallback to default
    const filename = fileName
      ? `${fileName}.xlsx`
      : `reference-${new Date().toISOString().split("T")[0]}.xlsx`;

    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Reference Excel generation error:", error);
    throw error;
  }
};

export const generateCombinedExcel = async (
  reportPayload: any,
  referenceSections: any[],
  tableTitle: string = "SITE PHOTO EVIDENCE",
  fileName?: string
) => {
  try {
    // Get custom logos from localStorage for combined mode
    const cacpmLogo = localStorage.getItem("customCacpmLogo");
    const koicaLogo = localStorage.getItem("customKoicaLogo");
    
    const enhancedPayload = {
      ...reportPayload,
      cacpm_logo: cacpmLogo,
      koica_logo: koicaLogo,
      // userId will be extracted from JWT cookie by Python backend
    };

    const referenceEntries = referenceSections.flatMap((section: any) =>
      (section.entries ?? []).map((entry: any) => {
        const slots = entry.slots ?? [];
        return {
          section_title: section.title || "",
          images: slots
            .map((s: any) => s.image)
            .filter(Boolean)
            .slice(0, 2),
          footers: slots
            .map((s: any) => s.caption)
            .filter(Boolean)
            .slice(0, 2),
        };
      })
    );

    const payload = {
      ...enhancedPayload,
      table_title: tableTitle,
      reference: referenceEntries,
    };

    console.log("🔑 COMBINED EXPORT: Sending payload - userId will be validated by backend");

    const response = await pythonApiPost(`${PYTHON_API_BASE_URL}/generate-combined`, payload);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to generate combined report" }));
      throw new Error(
        error.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Use provided filename or fallback to default
    const filename = fileName
      ? `${fileName}.xlsm`
      : `combined-${new Date().toISOString().split("T")[0]}.xlsm`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Combined Excel generation error:", error);
    throw error;
  }
};
