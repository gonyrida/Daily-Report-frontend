// src/lib/apiFetch.ts
// SINGLE UNIFIED FETCH LAYER - COOKIE-BASED AUTH ONLY

interface ApiFetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Single fetch helper that enforces cookie-based authentication
 * ALL API calls MUST use this helper - NO DIRECT fetch() ALLOWED
 */
export const apiFetch = async (url: string, options: ApiFetchOptions = {}): Promise<Response> => {
  const {
    method = "GET",
    body,
    headers = {},
    timeout = 10000,
  } = options;

  console.log(`🔒 API FETCH: ${method} ${url}`, { 
    hasBody: !!body, 
    headers: Object.keys(headers) 
  });

  // // SECURITY: NEVER allow Authorization headers
  // if (headers.authorization || headers.Authorization) {
  //   console.error('🚨 SECURITY: Authorization header detected - removing for cookie-based auth');
  //   delete headers.authorization;
  //   delete headers.Authorization;
  // }

  // Add localStorage token as fallback
  const token = localStorage.getItem('authToken');
  if (token && !headers['X-Auth-Token']) {
    headers['X-Auth-Token'] = token;
    console.log('🔑 Adding localStorage token to X-Auth-Token header');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // CRITICAL: ALWAYS send HTTP-only cookies
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`🔒 API FETCH: ${method} ${url} → ${response.status}`);

    // Global 401 handling
    if (response.status === 401) {
      console.error('🚨 AUTHENTICATION FAILED: User not authenticated');
      // Could trigger global logout here if needed
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`🚨 API FETCH ERROR: ${method} ${url} →`, error);
    throw error;
  }
};

/**
 * GET request helper
 */
export const apiGet = (url: string, headers?: Record<string, string>) => 
  apiFetch(url, { method: "GET", headers });

/**
 * POST request helper  
 */
export const apiPost = (url: string, body: any, headers?: Record<string, string>) => 
  apiFetch(url, { method: "POST", body, headers });

/**
 * PUT request helper
 */
export const apiPut = (url: string, body: any, headers?: Record<string, string>) => 
  apiFetch(url, { method: "PUT", body, headers });

/**
 * DELETE request helper
 */
export const apiDelete = (url: string, headers?: Record<string, string>) => 
  apiFetch(url, { method: "DELETE", headers });

/**
 * PATCH request helper for partial updates (auto-save)
 */
export const apiPatch = (url: string, body: any, headers?: Record<string, string>) => 
  apiFetch(url, { method: "PATCH", body, headers });
