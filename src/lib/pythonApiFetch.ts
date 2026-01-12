// src/lib/pythonApiFetch.ts
// Specialized fetch wrapper for Python API endpoints
// Uses Authorization header + credentials for dual authentication support

import { API_ENDPOINTS, PYTHON_API_BASE_URL } from "../config/api";

interface PythonApiFetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Python API fetch helper that prioritizes cookies for authentication
 * Python backend expects cookies, not Authorization headers
 */
export const pythonApiFetch = async (url: string, options: PythonApiFetchOptions = {}): Promise<Response> => {
  const {
    method = "POST",
    body,
    headers = {},
    timeout = 30000, // Longer timeout for Excel generation
  } = options;

  console.log(`🔒 PYTHON API FETCH: ${method} ${url}`, { 
    hasBody: !!body, 
    headers: Object.keys(headers) 
  });

  // Prepare headers - NO Authorization header for Python API
  // Python backend expects cookies, not Authorization headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // DO NOT add Authorization header - Python backend uses cookies
  console.log("🔒 PYTHON API: Using cookie-based authentication (no Authorization header)");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // Still send cookies for fallback
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`🔒 PYTHON API FETCH: ${method} ${url} → ${response.status}`);

    // Handle 401 errors with clear message
    if (response.status === 401) {
      console.error('🚨 PYTHON API AUTHENTICATION FAILED: User not authenticated');
      throw new Error("User not authenticated - Please login again");
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`🚨 PYTHON API FETCH ERROR: ${method} ${url} →`, error);
    
    // Re-throw with clear authentication message
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new Error("Python API server unavailable - Check if server is running on port 5001");
    }
    
    throw error;
  }
};

/**
 * POST request helper for Python API
 */
export const pythonApiPost = (url: string, body: any, headers?: Record<string, string>) => 
  pythonApiFetch(url, { method: "POST", body, headers });

/**
 * GET request helper for Python API
 */
export const pythonApiGet = (url: string, headers?: Record<string, string>) => 
  pythonApiFetch(url, { method: "GET", headers });
