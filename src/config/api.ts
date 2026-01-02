// API Configuration
// Use environment variable for API URL, fallback to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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

