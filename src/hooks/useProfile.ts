// src/hooks/useProfile.ts
// Centralized profile state management hook

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  accountStatus: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  profileVisibility: boolean;
  twoFactorAuth: boolean;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface ProfileState {
  user: UserProfile | null;
  accountSettings: AccountSettings;
  loading: boolean;
  error: string | null;
  editing: boolean;
  uploading: boolean;
  saving: boolean;
}

const useProfile = () => {
  const [state, setState] = useState<ProfileState>({
    user: null,
    accountSettings: {
      emailNotifications: true,
      pushNotifications: false,
      profileVisibility: true,
      twoFactorAuth: false,
    },
    loading: false,
    error: null,
    editing: false,
    uploading: false,
    saving: false,
  });

  const { toast } = useToast();

  // API Functions
  const fetchProfile = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        user: data.user, // Backend returns data.user
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load profile',
        loading: false,
      }));
    }
  }, []);

  const fetchAccountSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/user/account-settings', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch account settings');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        accountSettings: data.data,
      }));
    } catch (error) {
      console.error('Failed to fetch account settings:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setState(prev => ({ ...prev, saving: true, error: null }));
    
    try {
      // Extract only the fields the backend expects
      const requestBody: any = {};
      if (updates.fullName !== undefined) {
        requestBody.fullName = updates.fullName;
      }
      if (updates.profilePicture !== undefined) {
        requestBody.profilePicture = updates.profilePicture;
      }
      
      const response = await fetch('/api/auth/profile', {
        method: 'PUT', // Use PUT to match backend route
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        user: data.data, // Backend returns data.data
        saving: false,
        editing: false,
      }));

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update profile',
        saving: false,
      }));
    }
  }, [toast]);

  const uploadProfilePicture = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, uploading: true, error: null }));
    
    try {
      const formData = new FormData();
      formData.append('profilePicture', file); // Backend expects 'profilePicture' not 'image'

      const response = await fetch('/api/images/upload-profile', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const data = await response.json();
      await updateProfile({ profilePicture: data.imageUrl });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to upload picture',
        uploading: false,
      }));
    }
  }, [updateProfile, toast]);

  const updateAccountSettings = useCallback(async (settings: Partial<AccountSettings>) => {
    setState(prev => ({ ...prev, saving: true, error: null }));
    
    try {
      const response = await fetch('/api/user/account-settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update account settings');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        accountSettings: data.data,
        saving: false,
      }));

      toast({
        title: 'Settings Updated',
        description: 'Your account settings have been successfully updated.',
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update settings',
        saving: false,
      }));
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }, []);

  // State Management Functions
  const setEditing = useCallback((editing: boolean) => {
    setState(prev => ({ ...prev, editing }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchProfile();
    // fetchAccountSettings(); // Commented out - endpoint doesn't exist in backend
  }, [fetchProfile]);

  return {
    // State
    ...state,
    
    // Actions
    fetchProfile,
    fetchAccountSettings,
    updateProfile,
    uploadProfilePicture,
    updateAccountSettings,
    logout,
    setEditing,
    clearError,
  };
};

export default useProfile;
