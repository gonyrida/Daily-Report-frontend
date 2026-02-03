// src/contexts/ProfileContext.tsx
// Global profile state management context

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile } from '@/integrations/userProfileApi';
import { loadProfileLocally, saveProfileLocally } from '@/lib/storageUtils';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfileCache: (profile: UserProfile) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile from cache on mount
  useEffect(() => {
    const loadCachedProfile = () => {
      try {
        const cachedProfile = loadProfileLocally();
        if (cachedProfile) {
          console.log('ProfileContext: Loaded cached profile');
          setProfile(cachedProfile);
        }
      } catch (err) {
        console.error('ProfileContext: Failed to load cached profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCachedProfile();
  }, []);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'daily-report:profile' && e.newValue) {
        try {
          const updatedProfile = JSON.parse(e.newValue);
          if (updatedProfile.data) {
            console.log('ProfileContext: Profile updated in another tab');
            setProfile(updatedProfile.data);
          }
        } catch (err) {
          console.error('ProfileContext: Failed to parse storage event:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refreshProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { getUserProfile } = await import('@/integrations/userProfileApi');
      const result = await getUserProfile();
      
      if (result.success && result.data) {
        setProfile(result.data);
        saveProfileLocally(result.data);
        console.log('ProfileContext: Profile refreshed from API');
      } else {
        throw new Error('Failed to refresh profile');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh profile';
      setError(errorMessage);
      console.error('ProfileContext: Refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfileCache = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    saveProfileLocally(updatedProfile);
    console.log('ProfileContext: Profile cache updated');
  };

  const clearProfile = () => {
    setProfile(null);
    setError(null);
    const { clearProfileCache } = require('@/lib/storageUtils');
    clearProfileCache();
    console.log('ProfileContext: Profile cleared');
  };

  const value: ProfileContextType = {
    profile,
    isLoading,
    error,
    refreshProfile,
    updateProfileCache,
    clearProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};
