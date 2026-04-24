// src/utils/activityTransform.ts
// Data transformation utilities for activities
// Now that frontend and backend schemas match, transformations are minimal

import { ActivityRow } from "@/types/activity.types";

export interface BackendActivityRow {
  description: string;
  percent: number;
  percentage?: string;                     // Legacy field
  source?: "manual" | "bulk";
  bulkImportId?: string;
  addedAt?: Date;
}

/**
 * Transform frontend activity data to backend format
 * Since schemas now match, this is mostly validation and defaults
 */
export const transformFrontendToBackend = (activities: BackendActivityRow[]): BackendActivityRow[] => {
  return activities.map(activity => ({
    description: activity.description || "",
    percent: activity.percent || 0,
    percentage: activity.percentage || (activity.percent ? activity.percent.toString() : "0"), // Legacy field
    source: activity.source || "manual",
    bulkImportId: activity.bulkImportId,
    addedAt: activity.addedAt || new Date()
  }));
};

/**
 * Transform backend activity data to frontend format
 * Since schemas now match, this is mostly validation
 */
export const transformBackendToFrontend = (activities: BackendActivityRow[]): BackendActivityRow[] => {
  return activities.map(activity => ({
    description: activity.description || "",
    percent: activity.percent || 0,
    percentage: activity.percentage, // Keep legacy field if present
    source: activity.source || "manual",
    bulkImportId: activity.bulkImportId,
    addedAt: activity.addedAt
  }));
};

/**
 * Handle legacy data format (old nested structure)
 */
export const transformLegacyToFrontend = (legacyActivities: any[]): BackendActivityRow[] => {
  return legacyActivities.map(activity => ({
    description: activity.description || "",
    percent: activity.percent || parseInt(activity.percentage) || 0,
    percentage: activity.percentage,
    source: activity.source || "manual",
    bulkImportId: activity.bulkImportId,
    addedAt: activity.addedAt || new Date()
  }));
};

/**
 * Validate and normalize activity data
 */
export const validateActivityData = (activity: BackendActivityRow): BackendActivityRow => {
  return {
    description: activity.description?.trim() || "",
    percent: Math.max(0, Math.min(100, Number(activity.percent) || 0)),
    percentage: activity.percentage || (activity.percent ? activity.percent.toString() : "0"),
    source: ["manual", "bulk"].includes(activity.source) ? activity.source : "manual",
    bulkImportId: activity.bulkImportId,
    addedAt: activity.addedAt || new Date()
  };
};

/**
 * Merge activities, avoiding duplicates by description
 */
export const mergeActivities = (existing: BackendActivityRow[], incoming: BackendActivityRow[]): BackendActivityRow[] => {
  const merged = [...existing];
  
  incoming.forEach(incomingActivity => {
    const existingIndex = merged.findIndex(
      existing => existing.description.trim() === incomingActivity.description.trim()
    );
    
    if (existingIndex >= 0) {
      // Update existing activity
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...incomingActivity,
        description: merged[existingIndex].description // Keep original description
      };
    } else {
      // Add new activity
      merged.push(incomingActivity);
    }
  });
  
  return merged;
};
