// src/hooks/useUserProfile.ts
// User profile state management hook

import { useState, useEffect, useCallback } from "react";
import {
  UserProfile,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
} from "@/integrations/userProfileApi";
import { useToast } from "@/hooks/use-toast";
import {
  saveProfileLocally,
  loadProfileLocally,
  clearProfileCache,
} from "@/lib/storageUtils";
import {
  constructImageUrl,
  getCacheBustingTimestamp,
} from "@/utils/imageUtils";
import { useProfileContext } from "@/contexts/ProfileContext";

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  isSaving: boolean;
  isUploading: boolean;
  tempProfile: Partial<UserProfile> & { _profilePictureData?: string }; // Internal base64/dataURL tracking
}

interface ProfileActions {
  fetchProfile: () => Promise<void>;
  updateProfile: (data: {
    fullName?: string;
    email?: string;
    profilePicture?: string;
  }) => Promise<void>;
  uploadPicture: (file: File) => Promise<void>;
  startEditing: () => void;
  cancelEditing: () => void;
  saveChanges: () => Promise<void>;
  clearError: () => void;
  updateTempProfile: (
    updates: Partial<UserProfile> & { _profilePictureData?: string },
  ) => void; // Add method to update temp profile
}

export const useUserProfile = (): ProfileState & ProfileActions => {
  // Use global context for profile state
  const { profile, isLoading, error, refreshProfile, updateProfileCache } =
    useProfileContext();

  // Local state for editing and temporary changes
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tempProfile, setTempProfile] = useState<
    Partial<UserProfile> & { _profilePicturePath?: string }
  >({});

  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    // Use global context refresh instead of local state
    await refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(
    async (data: {
      fullName?: string;
      email?: string;
      profilePicture?: string;
    }) => {
      setIsSaving(true);

      console.log("DEBUG UPDATE: Data received:", data);

      try {
        const result = await updateUserProfile(data);
        console.log("DEBUG UPDATE: API result:", result);

        if (result.success && result.data) {
          // Update global context with new profile data
          updateProfileCache(result.data);
          setIsEditing(false);
          setTempProfile({});

          toast({
            title: "Profile Updated",
            description: "Your profile has been updated successfully.",
          });
        } else {
          throw new Error("Failed to update profile");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update profile";
        toast({
          title: "Update Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [toast, updateProfileCache],
  );

  const uploadPicture = useCallback(
    async (file: File) => {
      setIsUploading(true);

      console.log("DEBUG UPLOAD: File received:", file.name);

      try {
        const result = await uploadProfilePicture(file);
        console.log("DEBUG UPLOAD: Upload result:", result);

        if (result.success && result.data) {
          // Backend now returns a base64 data URL in result.data.profilePicture
          const dataUrl =
            result.data.profilePicture ||
            result.data.dataUrl ||
            result.data.path;

          setTempProfile((prev) => ({
            ...prev,
            profilePicture: dataUrl,
            _profilePictureData: dataUrl,
          }));

          toast({
            title: "Picture Uploaded",
            description: "Profile picture uploaded successfully.",
          });
        } else {
          throw new Error("Failed to upload picture");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to upload picture";
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [toast],
  );

  const startEditing = useCallback(() => {
    if (profile) {
      setTempProfile({
        fullName: profile.fullName,
        email: profile.email,
        profilePicture: profile.profilePicture, // Store relative path
      });
      setIsEditing(true);
    }
  }, [profile]);

  const cancelEditing = useCallback(() => {
    setTempProfile({});
    setIsEditing(false);
  }, []);

  const saveChanges = useCallback(async () => {
    if (!profile) return;

    const changes: {
      fullName?: string;
      email?: string;
      profilePicture?: string;
    } = {};

    console.log("DEBUG HOOK: Current profile:", profile);
    console.log("DEBUG HOOK: Temp profile:", tempProfile);

    if (
      tempProfile.fullName !== undefined &&
      tempProfile.fullName !== profile.fullName
    ) {
      changes.fullName = tempProfile.fullName;
      console.log("DEBUG HOOK: Adding fullName to changes:", changes.fullName);
    }

    if (
      tempProfile.email !== undefined &&
      tempProfile.email !== profile.email
    ) {
      changes.email = tempProfile.email;
      console.log("DEBUG HOOK: Adding email to changes:", changes.email);
    }

    // Use the stored data URL for database if provided
    if (tempProfile._profilePictureData !== undefined) {
      changes.profilePicture = tempProfile._profilePictureData;
      console.log(
        "DEBUG HOOK: Adding profilePicture dataURL to changes:",
        changes.profilePicture?.slice?.(0, 50) + "...",
      );
    }

    console.log("DEBUG HOOK: Final changes object:", changes);

    if (Object.keys(changes).length > 0) {
      await updateProfile(changes);
    } else {
      // No changes to save
      setIsEditing(false);
      setTempProfile({});
    }
  }, [profile, tempProfile, updateProfile]);

  const clearError = useCallback(() => {
    // Error handling is now managed by the context
    // This function is kept for backward compatibility
  }, []);

  // Add method to update temp profile from components
  const updateTempProfile = useCallback(
    (updates: Partial<UserProfile> & { _profilePictureData?: string }) => {
      setTempProfile((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // Auto-fetch profile on mount (handled by context)
  // useEffect(() => {
  //   fetchProfile();
  // }, [fetchProfile]);

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
