// src/lib/storageUtils.ts
import { ReportData } from "@/types/report";

// We export this in case other files need to know the prefix
export const STORAGE_PREFIX = "daily-report:";

// Profile storage keys
export const PROFILE_STORAGE_KEY = `${STORAGE_PREFIX}profile`;
export const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CachedProfile {
  data: any;
  timestamp: number;
}

export const dateKey = (date: Date | undefined): string => {
  if (!date) return STORAGE_PREFIX + "unknown";
  return STORAGE_PREFIX + date.toISOString().slice(0, 10);
};

export function saveDraftLocally(date: Date | undefined, data: ReportData): void {
  try {
    localStorage.setItem(dateKey(date), JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

export function loadDraftLocally(date: Date | undefined): any | null {
  try {
    const raw = localStorage.getItem(dateKey(date));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
    return null;
  }
}

// Profile data storage functions
export function saveProfileLocally(profileData: any): void {
  try {
    const cachedProfile: CachedProfile = {
      data: profileData,
      timestamp: Date.now()
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cachedProfile));
    console.log("Profile saved to localStorage:", profileData);
  } catch (e) {
    console.error("Failed to save profile to localStorage:", e);
  }
}

export function loadProfileLocally(): any | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    
    const cachedProfile: CachedProfile = JSON.parse(raw);
    
    // Check if cache is still valid
    if (Date.now() - cachedProfile.timestamp > PROFILE_CACHE_DURATION) {
      console.log("Profile cache expired, removing");
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      return null;
    }
    
    console.log("Profile loaded from localStorage:", cachedProfile.data);
    return cachedProfile.data;
  } catch (e) {
    console.error("Failed to load profile from localStorage:", e);
    return null;
  }
}

export function clearProfileCache(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    console.log("Profile cache cleared");
  } catch (e) {
    console.error("Failed to clear profile cache:", e);
  }
}