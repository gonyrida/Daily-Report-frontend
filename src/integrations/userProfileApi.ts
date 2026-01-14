// src/integrations/userProfileApi.ts
// User profile API integration

import { API_ENDPOINTS } from "../config/api";
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
  profilePicture?: string;
}

export const getUserProfile = async (): Promise<{ success: boolean; data: UserProfile }> => {
  try {
    console.log("DEBUG FRONTEND: Fetching user profile");
    
    const response = await apiGet(API_ENDPOINTS.USER.PROFILE);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch profile" }));
      throw new Error(error.message || "Failed to fetch profile");
    }
    
    const result = await response.json();
    console.log("DEBUG FRONTEND: Profile fetched successfully:", result);
    return result;
  } catch (error) {
    console.error("DEBUG FRONTEND: Error fetching profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (profileData: UpdateProfileData): Promise<{ success: boolean; data: UserProfile }> => {
  try {
    console.log("DEBUG FRONTEND: Updating user profile:", profileData);
    
    const response = await apiPut(API_ENDPOINTS.USER.PROFILE, profileData);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to update profile" }));
      throw new Error(error.message || "Failed to update profile");
    }
    
    const result = await response.json();
    console.log("DEBUG FRONTEND: Profile updated successfully:", result);
    return result;
  } catch (error) {
    console.error("DEBUG FRONTEND: Error updating profile:", error);
    throw error;
  }
};

export const uploadProfilePicture = async (file: File): Promise<{ success: boolean; data: { path: string } }> => {
  try {
    console.log("DEBUG FRONTEND: Uploading profile picture");
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    // Use fetch directly for FormData to avoid JSON stringification
    const response = await fetch(API_ENDPOINTS.USER.UPLOAD_PICTURE, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {}, // Let browser set Content-Type for FormData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to upload picture" }));
      throw new Error(error.message || "Failed to upload picture");
    }
    
    const result = await response.json();
    console.log("DEBUG FRONTEND: Profile picture uploaded successfully:", result);
    return result;
  } catch (error) {
    console.error("DEBUG FRONTEND: Error uploading profile picture:", error);
    throw error;
  }
};
