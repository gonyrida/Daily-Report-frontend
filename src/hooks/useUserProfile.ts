// src/hooks/useUserProfile.ts
// User profile state management hook

import { useState, useEffect, useCallback } from "react";
import { UserProfile, getUserProfile, updateUserProfile, uploadProfilePicture } from "@/integrations/userProfileApi";
import { useToast } from "@/hooks/use-toast";
import { saveProfileLocally, loadProfileLocally, clearProfileCache } from "@/lib/storageUtils";

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  isSaving: boolean;
  isUploading: boolean;
  tempProfile: Partial<UserProfile>;
}

interface ProfileActions {
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { fullName?: string; profilePicture?: string }) => Promise<void>;
  uploadPicture: (file: File) => Promise<void>;
  startEditing: () => void;
  cancelEditing: () => void;
  saveChanges: () => Promise<void>;
  clearError: () => void;
  updateTempProfile: (updates: Partial<UserProfile>) => void; // Add method to update temp profile
}

export const useUserProfile = (): ProfileState & ProfileActions => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile>>({});
  
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to load from cache
      const cachedProfile = loadProfileLocally();
      if (cachedProfile) {
        console.log('Using cached profile for useUserProfile');
        setProfile(cachedProfile);
        setTempProfile({});
      }
      
      // Always fetch fresh data from API to ensure consistency
      const { verifyAuth } = await import("@/integrations/authApi");
      const authResult = await verifyAuth();
      
      if (!authResult.success) {
        throw new Error("Please log in to view your profile");
      }
      
      const result = await getUserProfile();
      if (result.success && result.data) {
        setProfile(result.data);
        setTempProfile({});
        
        // Update cache with fresh data
        saveProfileLocally(result.data);
      } else {
        throw new Error("Failed to load profile data");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateProfile = useCallback(async (data: { fullName?: string; profilePicture?: string }) => {
    setIsSaving(true);
    setError(null);
    
    console.log('DEBUG UPDATE: Data received:', data);
    
    try {
      const result = await updateUserProfile(data);
      console.log('DEBUG UPDATE: API result:', result);
      
      if (result.success && result.data) {
        setProfile(result.data);
        setTempProfile({});
        setIsEditing(false);
        
        // Update cache with new data
        saveProfileLocally(result.data);
        
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const uploadPicture = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    
    console.log('DEBUG UPLOAD: File received:', file.name);
    
    try {
      const result = await uploadProfilePicture(file);
      console.log('DEBUG UPLOAD: Upload result:', result);
      
      if (result.success && result.data) {
        // Update temp profile with new picture URL
        setTempProfile(prev => {
          const updated = { ...prev, profilePicture: result.data.url };
          console.log('DEBUG UPLOAD: Updating temp profile:', updated);
          return updated;
        });
        
        toast({
          title: "Picture Uploaded",
          description: "Profile picture uploaded successfully.",
        });
      } else {
        throw new Error("Failed to upload picture");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload picture";
      setError(errorMessage);
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const startEditing = useCallback(() => {
    if (profile) {
      setTempProfile({
        fullName: profile.fullName,
        profilePicture: profile.profilePicture,
      });
      setIsEditing(true);
      setError(null);
    }
  }, [profile]);

  const cancelEditing = useCallback(() => {
    setTempProfile({});
    setIsEditing(false);
    setError(null);
  }, []);

  const saveChanges = useCallback(async () => {
    if (!profile) return;
    
    const changes: { fullName?: string; profilePicture?: string } = {};
    
    console.log('DEBUG HOOK: Current profile:', profile);
    console.log('DEBUG HOOK: Temp profile:', tempProfile);
    
    if (tempProfile.fullName !== undefined && tempProfile.fullName !== profile.fullName) {
      changes.fullName = tempProfile.fullName;
      console.log('DEBUG HOOK: Adding fullName to changes:', changes.fullName);
    }
    
    // Always include profilePicture if it exists in tempProfile, even if it's the same URL
    // This handles the case where user uploads a picture but the URL hasn't changed
    if (tempProfile.profilePicture !== undefined) {
      changes.profilePicture = tempProfile.profilePicture;
      console.log('DEBUG HOOK: Adding profilePicture to changes (always include if in temp):', changes.profilePicture);
    }
    
    console.log('DEBUG HOOK: Final changes object:', changes);
    
    if (Object.keys(changes).length > 0) {
      await updateProfile(changes);
    } else {
      // No changes to save
      setIsEditing(false);
      setTempProfile({});
    }
  }, [profile, tempProfile, updateProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Add method to update temp profile from components
  const updateTempProfile = useCallback((updates: Partial<UserProfile>) => {
    setTempProfile(prev => ({ ...prev, ...updates }));
  }, []);

  // Auto-fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    // State
    profile,
    isLoading,
    error,
    isEditing,
    isSaving,
    isUploading,
    tempProfile,
    
    // Actions
    fetchProfile,
    updateProfile,
    uploadPicture,
    startEditing,
    cancelEditing,
    saveChanges,
    clearError,
    updateTempProfile, // Add the new method to return object
  };
};
