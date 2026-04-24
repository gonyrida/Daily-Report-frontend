// src/hooks/useActivities.ts
// Hook for managing weekly activities section

import { useState, useEffect } from "react";
import type { 
  ActivityRow, 
  WeeklyReportActivities,
  UseWeeklyReportHookReturn 
} from "@/types/weeklyReport.types";
import { 
  getWeeklyReportById,
  updateActivities 
} from "@/services/weeklyReportService";

export const useActivities = (reportId: string): UseWeeklyReportHookReturn<WeeklyReportActivities> => {
  const [data, setData] = useState<WeeklyReportActivities | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load activities data
  const refetch = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeeklyReportById(reportId);
      
      if (response.success && response.data) {
        setData(response.data.sections.activities);
      } else {
        setError(response.error || 'Failed to load activities');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Update activities data
  const update = async (updates: Partial<WeeklyReportActivities>) => {
    if (!reportId || !data) return;

    try {
      setIsLoading(true);
      setError(null);

      const updatedData = { ...data, ...updates };
      const response = await updateActivities(reportId, updatedData);
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to update activities');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for managing activities
  const addRow = (type: "weekly" | "next") => {
    if (!data) return;

    const newRow: ActivityRow = { description: "", percent: 0 };
    const updatedData = { ...data };
    
    if (type === "weekly") {
      updatedData.weeklyActivities = [...updatedData.weeklyActivities, newRow];
    } else {
      updatedData.nextWeekPlan = [...updatedData.nextWeekPlan, newRow];
    }
    
    setData(updatedData);
  };

  const deleteRow = (type: "weekly" | "next", index: number) => {
    if (!data) return;

    const updatedData = { ...data };
    
    if (type === "weekly") {
      updatedData.weeklyActivities = updatedData.weeklyActivities.filter((_, idx) => idx !== index);
    } else {
      updatedData.nextWeekPlan = updatedData.nextWeekPlan.filter((_, idx) => idx !== index);
    }
    
    setData(updatedData);
  };

  const updateRow = (
    type: "weekly" | "next",
    index: number,
    field: "description" | "percent",
    value: string
  ) => {
    if (!data) return;

    const updatedData = { ...data };
    const target = type === "weekly" ? [...updatedData.weeklyActivities] : [...updatedData.nextWeekPlan];
    
    if (field === "percent") {
      target[index][field] = value === "" ? 0 : Number(value);
    } else {
      target[index][field] = value;
    }
    
    if (type === "weekly") {
      updatedData.weeklyActivities = target;
    } else {
      updatedData.nextWeekPlan = target;
    }
    
    setData(updatedData);
  };

  // Load data on mount
  useEffect(() => {
    if (reportId) {
      refetch();
    }
  }, [reportId]);

  return {
    data,
    isLoading,
    error,
    refetch,
    update,
  } as UseWeeklyReportHookReturn<WeeklyReportActivities> & {
    addRow: (type: "weekly" | "next") => void;
    deleteRow: (type: "weekly" | "next", index: number) => void;
    updateRow: (type: "weekly" | "next", index: number, field: "description" | "percent", value: string) => void;
  };
};
