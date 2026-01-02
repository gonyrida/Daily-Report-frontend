// src/lib/storageUtils.ts
import { ReportData } from "@/types/report";

// We export this in case other files need to know the prefix
export const STORAGE_PREFIX = "daily-report:";

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