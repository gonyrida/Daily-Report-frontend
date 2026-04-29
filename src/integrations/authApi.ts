// src/integrations/authApi.ts
// Cookie-based authentication API calls

import { API_ENDPOINTS } from "../config/api";
import { apiGet, apiPost } from "../lib/apiFetch";

export const verifyAuth = async () => {
  try {
    const response = await apiGet(API_ENDPOINTS.AUTH.VERIFY);
    
    if (response.status === 401) {
      return { success: false, user: null };
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Auth verification failed" }));
      throw new Error(error.message || "Auth verification failed");
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email: string , password: string) => {
  try {
    const response = await apiPost(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }));
      throw new Error(error.message || "Login failed");
    }
    
    const result = await response.json(); 
    return result;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const response = await apiPost(API_ENDPOINTS.AUTH.LOGOUT, {});
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Logout failed" }));
      throw new Error(error.message || "Logout failed");
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};
