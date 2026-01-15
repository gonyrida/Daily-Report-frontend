import { apiGet, apiPost, apiPut } from '@/lib/apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface WeeklyReportExportParams {
  startDate: string;
  endDate: string;
  projectName: string;
  format: 'pdf' | 'excel' | 'zip';
  data: any;
}

// Weekly Report API calls
export const getWeeklyReports = async (searchQuery?: string) => {
  const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
  const response = await apiGet(`${API_BASE_URL}/weekly-reports${params}`);
  const data = await response.json();
  return data;
};

export const getWeeklyReportDetails = async (weekStart: string, projectName: string) => {
  const encodedProjectName = encodeURIComponent(projectName);
  const response = await apiGet(`${API_BASE_URL}/weekly-reports/${weekStart}/${encodedProjectName}`);
  const data = await response.json();
  return data;
};

export const getWeeklyReportSummary = async (weekStart: string, projectName: string) => {
  const encodedProjectName = encodeURIComponent(projectName);
  const response = await apiGet(`${API_BASE_URL}/weekly-reports/${weekStart}/${encodedProjectName}/summary`);
  const data = await response.json();
  return data;
};

export const generateWeeklyReport = async (startDate: string, endDate: string, projectName?: string) => {
  const response = await apiPost(`${API_BASE_URL}/weekly-reports/generate`, {
    startDate,
    endDate,
    projectName
  });
  const data = await response.json();
  return data;
};

export const saveWeeklyReport = async (weekStart: string, projectName: string, reportData: any) => {
  const encodedProjectName = encodeURIComponent(projectName);
  const response = await apiPut(`${API_BASE_URL}/weekly-reports/${weekStart}/${encodedProjectName}`, reportData);
  const data = await response.json();
  return data;
};

export const exportWeeklyReport = async (params: WeeklyReportExportParams) => {
  const { startDate, endDate, projectName, format, data } = params;
  
  const response = await fetch(`${API_BASE_URL}/weekly-reports/export/${format}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      startDate,
      endDate,
      projectName,
      data
    })
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  // Create download link
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Generate filename
  const cleanProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Weekly_Report_${cleanProjectName}_${startDate}_to_${endDate}.${format}`;
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default {
  getWeeklyReports,
  getWeeklyReportDetails,
  getWeeklyReportSummary,
  generateWeeklyReport,
  saveWeeklyReport,
  exportWeeklyReport
};
