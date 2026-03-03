// API Configuration
// Determine API base URL based on environment
const getApiBaseUrl = (): string => {
  // Always prefer VITE_API_BASE_URL if defined
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Check for Render-specific environment variables
  if (import.meta.env.RENDER_SERVICE_URL) {
    return `${import.meta.env.RENDER_SERVICE_URL}/api`;
  }
  
  if (import.meta.env.RENDER_EXTERNAL_URL) {
    return `${import.meta.env.RENDER_EXTERNAL_URL}/api`;
  }

  // Fallback detection based on hostname or explicit production flag
  const isProduction = 
    import.meta.env.MODE === "production" || 
    window.location.hostname !== "localhost" ||
    import.meta.env.VITE_FORCE_PRODUCTION === "true";

  if (isProduction) {
    return "https://daily-report-backend.officemuckup.com/api";
  }

  return "http://localhost:5000/api";
};

// Determine static files base URL based on environment (without /api)
const getStaticBaseUrl = (): string => {
  // Always prefer VITE_API_BASE_URL if defined, but remove /api
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '');
  }

  // Check for Render-specific environment variables
  if (import.meta.env.RENDER_SERVICE_URL) {
    return import.meta.env.RENDER_SERVICE_URL;
  }
  
  if (import.meta.env.RENDER_EXTERNAL_URL) {
    return import.meta.env.RENDER_EXTERNAL_URL;
  }
  
  // Fallback detection based on hostname or explicit production flag
  const isProduction = 
    import.meta.env.MODE === "production" || 
    window.location.hostname !== "localhost" ||
    import.meta.env.VITE_FORCE_PRODUCTION === "true";

  if (isProduction) {
    // Fallback - update this to your actual service URL
    return "https://daily-report-backend.officemuckup.com";
  }

  return "http://localhost:5000";
};

// Determine Python API base URL based on environment
const getPythonApiBaseUrl = (): string => {
  // Always prefer VITE_PYTHON_API_BASE_URL if defined
  if (import.meta.env.VITE_PYTHON_API_BASE_URL) {
    return import.meta.env.VITE_PYTHON_API_BASE_URL;
  }

  // If not defined, use production URL in production mode, localhost in development
  if (import.meta.env.MODE === "production") {
    return "https://daily-report-python.officemuckup.com";
  }

  return "http://localhost:5001";
};

export const API_BASE_URL = getApiBaseUrl();
export const STATIC_BASE_URL = getStaticBaseUrl();
export const PYTHON_API_BASE_URL = getPythonApiBaseUrl();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `/auth/login`,
    REGISTER: `/auth/register`,
    LOGOUT: `/auth/logout`,
    VERIFY: `/auth/verify`,
    FORGOT_PASSWORD: `/auth/forgot-password`,
    RESET_PASSWORD: `/auth/reset-password`,
    PROFILE: `/auth/profile`,
    CHANGE_PASSWORD: `/auth/change-password`,
  },
  USER: {
    PROFILE: `/auth/profile`,
    UPLOAD_PICTURE: `/images/upload-profile`,
  },
  DAILY_REPORTS: {
    BASE: `/daily-reports`,
    SAVE: `/daily-reports/upsert`,
    SUBMIT: `/daily-reports/submit`,
    GET_BY_DATE: (date: string) => `/daily-reports/date/${date}`,
    // NEW: Bulk import endpoints
    BULK_IMPORT: (reportId: string) => `/daily-reports/${reportId}/bulk-import`,
    GET_BY_BULK_ID: (bulkId: string) => `/daily-reports/bulk-import/${bulkId}`,
    BULK_STATS: `/daily-reports/bulk-import/stats`,
  },
  PROJECTS: {
    BASE: `/projects`,
    CREATE: `/projects`,
    GET_ALL: `/projects`,
    UPDATE: (id: string) => `/projects/${id}`,
    DELETE: (id: string) => `/projects/${id}`,
  },
};
