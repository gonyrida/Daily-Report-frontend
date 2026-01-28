// src/integrations/authApi.ts
// Cookie-based authentication API calls

import { API_ENDPOINTS } from "../config/api";
import { apiGet, apiPost } from "../lib/apiFetch";

export const verifyAuth = async () => {
  try {
    console.log("DEBUG FRONTEND: Verifying authentication with cookies");
    
    const response = await apiGet(API_ENDPOINTS.AUTH.VERIFY);
    
    console.log("DEBUG FRONTEND: Auth verify response status:", response.status);
    
    if (response.status === 401) {
      console.log("DEBUG FRONTEND: User not authenticated (401)");
      return { success: false, user: null };
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Auth verification failed" }));
      throw new Error(error.message || "Auth verification failed");
    }
    
    const result = await response.json();
    console.log("DEBUG FRONTEND: Auth verification success:", result);
    return result;
  } catch (error) {
    console.error("DEBUG FRONTEND: Auth verification error:", error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    console.log("DEBUG FRONTEND: Attempting login with email:", email);
    
    const response = await apiPost(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    
    console.log("DEBUG FRONTEND: Login response status:", response.status);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }));
      throw new Error(error.message || "Login failed");
    }
    
    const result = await response.json(); 
    console.log("DEBUG FRONTEND: Login success:", result);
    return result;
  } catch (error) {
    console.error("DEBUG FRONTEND: Login error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    console.log("DEBUG FRONTEND: Attempting logout");
    
    const response = await apiPost(API_ENDPOINTS.AUTH.LOGOUT, {});
    
    console.log("DEBUG FRONTEND: Logout response status:", response.status);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Logout failed" }));
      throw new Error(error.message || "Logout failed");
    }
    
    const result = await response.json();
    console.log("DEBUG FRONTEND: Logout success:", result);
    return result;
  } catch (error) {
    console.error("DEBUG FRONTEND: Logout error:", error);
    throw error;
  }
};
