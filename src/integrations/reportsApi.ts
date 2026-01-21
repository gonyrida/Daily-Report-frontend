// src/integrations/reportsApi.ts
// COOKIE-BASED AUTHENTICATION ONLY - NO TOKEN HANDLING

import { API_ENDPOINTS, PYTHON_API_BASE_URL } from "../config/api";
import { apiGet, apiPost, apiDelete, apiPatch } from "../lib/apiFetch";
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
  console.log("🐛 DEBUG API: loadReportFromDB called with:", reportDate);
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
    console.log("🐛 DEBUG API: loadReportFromDB result:", result);
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
  tableTitle: string = "HSE Tools Metting",
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

export const generateCarExcel = async (
  carData: any,
  fileName?: string
) => {
  try {
    const payload = {
      data: carData,
    };

    const response = await fetch(`${PYTHON_API_BASE_URL}/generate-car`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to generate CAR" }));
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
    const filename = fileName ? `${fileName}.xlsx` : `car-${new Date().toISOString().split("T")[0]}.xlsx`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("CAR Excel generation error:", error);
    throw error;
  }
};

export const generateCombinedExcel = async (
  reportPayload: any,
  referenceSections: any[],
  tableTitle: string = "HSE Toolbox Meeting",
  fileName?: string,
  koicaLogo?: string,
  cacpmLogo?: string
) => {
  try {
    const enhancedPayload = {
      ...reportPayload,
      logos: {
        cacpm: cacpmLogo,
        koica: koicaLogo,
      }
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

export const getAllUserReports = async () => {
  console.log("🔒 GET ALL REPORTS: Fetching all user reports");

  const response = await apiGet(API_ENDPOINTS.DAILY_REPORTS.BASE);

  console.log(`🔒 GET ALL REPORTS: Response ${response.status}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch reports" }));
    console.error("🔒 GET ALL REPORTS: Failed:", error);
    throw new Error(error.message || "Failed to fetch reports");
  }

  const result = await response.json();
  console.log("🔒 GET ALL REPORTS: Success:", result);
  return result;
};

export const createNewReport = async (projectName?: string, date?: string) => {
  console.log("🔒 CREATE NEW REPORT: Creating new report", { projectName, date });

  const response = await apiPost(API_ENDPOINTS.DAILY_REPORTS.BASE, { 
    projectName: projectName || "Default Project", 
    date: date || new Date().toISOString().split('T')[0] 
  });

  console.log(`🔒 CREATE NEW REPORT: Response ${response.status}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to create new report" }));
    console.error("🔒 CREATE NEW REPORT: Failed:", error);
    throw new Error(error.message || "Failed to create new report");
  }

  const result = await response.json();
  console.log("🔒 CREATE NEW REPORT: Success:", result);
  return result;
};

export const loadReportById = async (reportId: string) => {
  console.log("🔒 LOAD REPORT BY ID: Loading report with ID:", reportId);

  const response = await apiGet(`${API_ENDPOINTS.DAILY_REPORTS.BASE}/${reportId}`);

  console.log(`🔒 LOAD REPORT BY ID: Response ${response.status}`);

  if (response.status === 404) {
    console.log("🔒 LOAD REPORT BY ID: Report not found (404)");
    return null;
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("🔒 LOAD REPORT BY ID: Error:", response.status, errorText);
    throw new Error(`Failed to load report: ${response.statusText}`);
  }

  const result = await response.json();
  console.log("🔒 LOAD REPORT BY ID: Success:", result);
  return result;
};

export const deleteReport = async (reportId: string) => {
  console.log("🔒 DELETE REPORT: Deleting report with ID:", reportId);

  const response = await apiDelete(`${API_ENDPOINTS.DAILY_REPORTS.BASE}/${reportId}`);

  console.log(`🔒 DELETE REPORT: Response ${response.status}`);

  if (response.status === 404) {
    console.log("🔒 DELETE REPORT: Report not found (404)");
    throw new Error("Report not found");
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("🔒 DELETE REPORT: Error:", response.status, errorText);
    throw new Error(`Failed to delete report: ${response.statusText}`);
  }

  const result = await response.json();
  console.log("🔒 DELETE REPORT: Success:", result);
  return result;
};

// Google Docs-style auto-save functions
export const createBlankReport = async (projectName?: string) => {
  console.log("🔒 CREATE BLANK REPORT: Creating blank report", { projectName });

  const response = await apiPost(`${API_ENDPOINTS.DAILY_REPORTS.BASE}/blank`, { 
    projectName: projectName || "Untitled Report" 
  });

  console.log(`🔒 CREATE BLANK REPORT: Response ${response.status}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to create blank report" }));
    console.error("🔒 CREATE BLANK REPORT: Failed:", error);
    throw new Error(error.message || "Failed to create blank report");
  }

  const result = await response.json();
  console.log("🔒 CREATE BLANK REPORT: Success:", result);
  return result;
};

export const autoSaveReport = async (reportId: string, partialData: any) => {
  console.log("🔒 AUTO-SAVE REPORT: Auto-saving report", { reportId });

  const response = await apiPatch(`${API_ENDPOINTS.DAILY_REPORTS.BASE}/${reportId}/auto-save`, partialData);

  console.log(`🔒 AUTO-SAVE REPORT: Response ${response.status}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to auto-save report" }));
    console.error("🔒 AUTO-SAVE REPORT: Failed:", error);
    throw new Error(error.message || "Failed to auto-save report");
  }

  const result = await response.json();
  console.log("🔒 AUTO-SAVE REPORT: Success:", result);
  return result;
};

export const getRecentReports = async (limit: number = 20, status?: string) => {
  console.log("🔒 GET RECENT REPORTS: Fetching recent reports", { limit, status });

  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (status) params.append('status', status);

  const response = await apiGet(`${API_ENDPOINTS.DAILY_REPORTS.BASE}/recent?${params.toString()}`);

  console.log(`🔒 GET RECENT REPORTS: Response ${response.status}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch recent reports" }));
    console.error("🔒 GET RECENT REPORTS: Failed:", error);
    throw new Error(error.message || "Failed to fetch recent reports");
  }

  const result = await response.json();
  console.log("🔒 GET RECENT REPORTS: Success:", result);
  return result;
};

export const generateCombinedPDF = async (
  reportPayload: any,
  referenceSections: any[],
  tableTitle: string = "HSE Toolbox Meeting",
  fileName?: string,
  koicaLogo?: string,
  cacpmLogo?: string
) => {
  // console.log("DEBUG API: Received referenceSections:", referenceSections);
  const referenceEntries = referenceSections.flatMap((section: any) =>
    (section.entries ?? []).map((entry: any) => {
      const slots = entry.slots ?? [];

      // DEBUG: Log what's in slots
      // console.log("DEBUG API: Entry slots:", slots);
      // console.log("DEBUG API: First slot image:", slots[0]?.image?.substring(0, 50));
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

  // console.log("DEBUG API: Processed referenceEntries:", referenceEntries);
  // console.log("DEBUG API: Total images being sent:", referenceEntries.reduce((acc, entry) => acc + entry.images.length, 0));

  const payload = {
    mode: "combined",
    data: {
      ...reportPayload,
      table_title: tableTitle,
      reference: referenceSections.flatMap((section: any) =>
        (section.entries ?? []).map((entry: any) => {
          const slots = entry.slots ?? [];
          return {
            section_title: section.title || "",
            images: slots.map((s: any) => s.image).filter(Boolean).slice(0, 2),
            footers: slots.map((s: any) => s.caption).filter(Boolean).slice(0, 2),
          };
        })
      ),
      logos: {
        cacpm: cacpmLogo,
        koica: koicaLogo,
      }
    },
  };

  console.log("🔑 COMBINED EXPORT: Sending payload - userId will be validated by backend");

  const response = await pythonApiPost(`${PYTHON_API_BASE_URL}/generate-combined-pdf`, payload);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to generate combined PDF" }));
    throw new Error(
      error.message || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const filename = fileName
    ? `${fileName}.pdf`
    : `combined-${new Date().toISOString().split("T")[0]}.pdf`;

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true };
};