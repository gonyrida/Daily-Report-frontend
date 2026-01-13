// src/hooks/useUserProfile.ts
// User profile state management hook

import { useState, useEffect, useCallback } from "react";
import { UserProfile, getUserProfile, updateUserProfile, uploadProfilePicture } from "@/integrations/userProfileApi";
import { useToast } from "@/hooks/use-toast";

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
      // First verify authentication
      const { verifyAuth } = await import("@/integrations/authApi");
      const authResult = await verifyAuth();
      
      if (!authResult.success) {
        throw new Error("Please log in to view your profile");
      }
      
      const result = await getUserProfile();
      if (result.success && result.data) {
        setProfile(result.data);
        setTempProfile({});
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
    
    try {
      const result = await updateUserProfile(data);
      if (result.success && result.data) {
        setProfile(result.data);
        setTempProfile({});
        setIsEditing(false);
        
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
    
    try {
      const result = await uploadProfilePicture(file);
      if (result.success && result.data) {
        // Update temp profile with new picture URL
        setTempProfile(prev => ({ ...prev, profilePicture: result.data.url }));
        
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
    
    if (tempProfile.fullName !== undefined && tempProfile.fullName !== profile.fullName) {
      changes.fullName = tempProfile.fullName;
    }
    
    if (tempProfile.profilePicture !== undefined && tempProfile.profilePicture !== profile.profilePicture) {
      changes.profilePicture = tempProfile.profilePicture;
    }
    
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
  };
};
