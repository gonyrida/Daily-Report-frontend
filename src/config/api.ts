// API Configuration
// Determine API base URL based on environment
const getApiBaseUrl = (): string => {
  // Always prefer VITE_API_BASE_URL if defined
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // If not defined, use production URL in production mode, localhost in development
  if (import.meta.env.MODE === "production") {
    return "https://daily-report-backend.onrender.com/api";
  }

  return "http://localhost:5000/api";
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    VERIFY: `${API_BASE_URL}/auth/verify`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  },
  DAILY_REPORTS: {
    BASE: `${API_BASE_URL}/daily-reports`,
    SAVE: `${API_BASE_URL}/daily-reports/save`,
    SUBMIT: `${API_BASE_URL}/daily-reports/submit`,
    GET_BY_DATE: (date: string) => `${API_BASE_URL}/daily-reports/date/${date}`,
  },
};
