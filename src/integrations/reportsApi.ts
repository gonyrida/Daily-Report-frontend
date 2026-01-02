// src/integrations/reportsApi.ts

const API_BASE_URL = "http://localhost:5000/api/daily-reports";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const saveReportToDB = async (reportData: any) => {
  const response = await fetch(`${API_BASE_URL}/save`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to save report" }));
    throw new Error(error.message || "Failed to save report");
  }
  
  return response.json();
};

export const submitReportToDB = async (projectName: string, reportDate: Date) => {
  const year = reportDate.getFullYear();
  const month = String(reportDate.getMonth() + 1).padStart(2, '0');
  const day = String(reportDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`; 

  // DEBUG 1: Verify what string we are sending
  console.log("DEBUG FRONTEND: Sending to API ->", { projectName, dateStr });

  const response = await fetch(`${API_BASE_URL}/submit`, {
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
    const month = String(reportDate.getMonth() + 1).padStart(2, '0');
    const day = String(reportDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; 

    const headers = getAuthHeaders();
    
    if (!headers.Authorization) {
      throw new Error("No authentication token found. Please log in.");
    }

    // Now this URL will correctly be .../date/2025-12-29
    const response = await fetch(`${API_BASE_URL}/date/${dateStr}`, {
      method: "GET",
      headers: headers
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to load report: ${response.statusText}`);
    }

    return response.json();
  } catch (err) {
    console.error("Error loading report:", err);
    throw err;
  }
};

export const generatePythonExcel = async (payload: any, mode: 'report' | 'reference' | 'combined') => {
  try {
    const response = await fetch('https://dr2-backend.onrender.com/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode,
        data: payload
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to generate report' }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle file download
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Set filename based on mode
    const filename = mode === 'report' 
      ? `report-${payload.projectName || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`
      : mode === 'reference' 
      ? `reference-${payload.projectName || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`
      : `combined-${payload.projectName || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Python Excel generation error:', error);
    throw error;
  }
};

export const generateReferenceExcel = async (referenceSections: any[], tableTitle: string = "SITE PHOTO EVIDENCE") => {
  try {
    const referenceEntries = referenceSections.flatMap((section: any) =>
      (section.entries ?? []).map((entry: any) => {
        const slots = entry.slots ?? [];
        return {
          section_title: section.title || "",
          images: slots.map((s: any) => s.image).filter(Boolean).slice(0, 2),
          footers: slots.map((s: any) => s.caption).filter(Boolean).slice(0, 2),
        };
      })
    );

    const payload = {
      table_title: tableTitle,
      reference: referenceEntries,
    };

    const response = await fetch('https://dr2-backend.onrender.com/generate-reference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload) // Send the wrapped payload
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to generate reference' }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle file download
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reference-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Reference Excel generation error:', error);
    throw error;
  }
};

export const generateCombinedExcel = async (
  reportPayload: any,
  referenceSections: any[],
  tableTitle: string = "SITE PHOTO EVIDENCE"
) => {
  const referenceEntries = referenceSections.flatMap((section: any) =>
    (section.entries ?? []).map((entry: any) => {
      const slots = entry.slots ?? [];
      return {
        section_title: section.title || "",
        images: slots.map((s: any) => s.image).filter(Boolean).slice(0, 2),
        footers: slots.map((s: any) => s.caption).filter(Boolean).slice(0, 2),
      };
    })
  );

  const payload = {
    ...reportPayload,
    table_title: tableTitle,
    reference: referenceEntries,
  };

  const response = await fetch("https://dr2-backend.onrender.com/generate-combined", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to generate combined report" }));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `combined-${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true };
};