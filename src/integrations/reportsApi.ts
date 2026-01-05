// src/integrations/reportsApi.ts
import { API_ENDPOINTS } from "@/config/api";

const API_BASE_URL = API_ENDPOINTS.DAILY_REPORTS.BASE;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const saveReportToDB = async (reportData: any) => {
  console.log("DEBUG FRONTEND: Attempting to save report:", reportData);
  
  const response = await fetch(API_ENDPOINTS.DAILY_REPORTS.SAVE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(reportData),
  });

  console.log("DEBUG FRONTEND: Save response status:", response.status);
  
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to save report" }));
    console.error("DEBUG FRONTEND: Save failed:", error);
    throw new Error(error.message || "Failed to save report");
  }

  const result = await response.json();
  console.log("DEBUG FRONTEND: Save success:", result);
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

  // DEBUG 1: Verify what string we are sending
  console.log("DEBUG FRONTEND: Sending to API ->", { projectName, dateStr });

  const response = await fetch(API_ENDPOINTS.DAILY_REPORTS.SUBMIT, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ projectName, date: dateStr }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to submit report" }));
    throw new Error(error.message || "Failed to submit report");
  }

  return response.json();
};

export const loadReportFromDB = async (reportDate: Date) => {
  try {
    // FIX: Instead of toISOString(), manually build the YYYY-MM-DD string
    // This ensures Dec 29 stays Dec 29 regardless of your timezone offset.
    const year = reportDate.getFullYear();
    const month = String(reportDate.getMonth() + 1).padStart(2, "0");
    const day = String(reportDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    console.log("DEBUG FRONTEND: Loading report for date:", dateStr);

    const headers = getAuthHeaders();
    console.log("DEBUG FRONTEND: Auth headers:", headers);

    if (!headers.Authorization) {
      console.error("DEBUG FRONTEND: No auth token found");
      throw new Error("No authentication token found. Please log in.");
    }

    // Now this URL will correctly be .../date/2025-12-29
    const url = API_ENDPOINTS.DAILY_REPORTS.GET_BY_DATE(dateStr);
    console.log("DEBUG FRONTEND: Making request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    console.log("DEBUG FRONTEND: Load response status:", response.status);

    if (response.status === 404) {
      console.log("DEBUG FRONTEND: Report not found (404), returning null");
      return null;
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error("DEBUG FRONTEND: Load failed:", response.status, errorText);
      throw new Error(`Failed to load report: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("DEBUG FRONTEND: Load success:", result);
    return result;
  } catch (err) {
    console.error("Error loading report:", err);
    throw err;
  }
};

export const generatePythonExcel = async (
  payload: any,
  mode: "report" | "reference" | "combined",
  fileName?: string
) => {
  try {
    const response = await fetch(
      "https://dr2-backend.onrender.com/generate-report",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          data: payload,
        }),
      }
    );

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

    const payload = {
      table_title: tableTitle,
      reference: referenceEntries,
    };

    const response = await fetch(
      "https://dr2-backend.onrender.com/generate-reference",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload), // Send the wrapped payload
      }
    );

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
    ...reportPayload,
    table_title: tableTitle,
    reference: referenceEntries,
  };

  const response = await fetch(
    "https://dr2-backend.onrender.com/generate-combined",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

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
    ? `${fileName}.xlsx`
    : `combined-${new Date().toISOString().split("T")[0]}.xlsx`;

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true };
};
