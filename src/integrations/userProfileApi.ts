// src/integrations/userProfileApi.ts
// User profile API integration

import { API_ENDPOINTS, API_BASE_URL } from "../config/api";
import { apiGet, apiPost, apiPut } from "../lib/apiFetch";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  accountStatus: "active" | "inactive" | "suspended";
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
  profilePicture?: string;
}

export const getUserProfile = async (): Promise<{ success: boolean; data: UserProfile }> => {
  try {
    const response = await apiGet(API_ENDPOINTS.USER.PROFILE);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch profile" }));
      throw new Error(error.message || "Failed to fetch profile");
    }
    
    const result = await response.json();

    // 🔥 TRANSFORM: Handle both response formats for compatibility
    if (result.success) {
      if (result.user) {
        // Backend returns user
        return {
          success: true,
          data: result.user
        };
      } else if (result.data) {
        // Fallback for data format
        return {
          success: true,
          data: result.data
        };
      }
    }

    return result;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (profileData: UpdateProfileData): Promise<{ success: boolean; data: UserProfile }> => {
  try {
    const response = await apiPut(API_ENDPOINTS.USER.PROFILE, profileData);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to update profile" }));
      throw new Error(error.message || "Failed to update profile");
    }
    
    const result = await response.json();

    // 🔥 TRANSFORM: Handle both response formats for compatibility
    if (result.success) {
      if (result.data) {
        // Backend returns data
        return {
          success: true,
          data: result.data
        };
      } else if (result.user) {
        // Fallback for user format
        return {
          success: true,
          data: result.user
        };
      }
    }

    return result;
  } catch (error) {
    throw error;
  }
};

export const uploadProfilePicture = async (file: File): Promise<{ success: boolean; data: { path: string } }> => {
  try {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    // Add localStorage token for authentication
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['X-Auth-Token'] = token;
    }
    
    // Use fetch directly for FormData to avoid JSON stringification
    const uploadUrl = `${API_BASE_URL}${API_ENDPOINTS.USER.UPLOAD_PICTURE}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers, // Include X-Auth-Token header
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to upload picture" }));
      throw new Error(error.message || "Failed to upload picture");
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};
