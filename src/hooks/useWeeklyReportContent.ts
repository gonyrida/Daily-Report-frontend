// src/hooks/useWeeklyReportContent.ts
// Main orchestrator hook for Weekly Report content management

import { useState, useEffect } from "react";
import type { 
  WeeklyReport, 
  WeeklyReportTabType, 
  UseWeeklyReportHookReturn,
  WeeklyReportStatus 
} from "@/types/weeklyReport.types";
import { 
  getWeeklyReportById,
  updateWeeklyReport,
  submitWeeklyReport,
  approveWeeklyReport,
  rejectWeeklyReport,
  autoSaveWeeklyReport
} from "@/services/weeklyReportService";

// Import section hooks (these will be updated next)
import { useActivities } from "./useActivities";
import { useHsesData } from "./useHsesData";
import { useResourceTable } from "./useResourceTable";
import { useQaqcTable } from "./useQaqcTable";
import { useConstructionIssue } from "./useConstructionIssue";
import { useOverallProgress } from "./useOverallProgress";
import { useIntroductionText } from "./useIntroductionText";
import { useWeeklyReportLetter } from "./useWeeklyReportLetter";

/**
 * Main orchestrator hook for weekly report content
 * Manages all sections and provides unified state management
 */
export const useWeeklyReportContent = (reportId: string) => {
  // Main report state
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WeeklyReportTabType>("cover");
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Section hooks - each manages its own state
  const activities = useActivities(reportId);
  const hsesData = useHsesData(reportId);
  const resourceTable = useResourceTable(reportId);
  const qaqcTable = useQaqcTable(reportId);
  const constructionIssues = useConstructionIssue(reportId);
  const overallProgress = useOverallProgress(reportId);
  const introductionText = useIntroductionText(reportId);
  const weeklyReportLetter = useWeeklyReportLetter(reportId);

  // Load initial report data
  const loadReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await getWeeklyReportById(reportId);
      
      if (response.success && response.data) {
        setReport(response.data);
        setLastSaved(new Date(response.data.updatedAt));
      } else {
        setError(response.error || 'Failed to load weekly report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save functionality
  const autoSave = async (updates: Partial<WeeklyReport>) => {
    if (!reportId || isAutoSaving) return;

    try {
      setIsAutoSaving(true);
      
      const response = await autoSaveWeeklyReport(reportId, updates);
      
      if (response.success && response.data) {
        setReport(response.data);
        setLastSaved(new Date());
      } else {
        console.error('Auto-save failed:', response.error);
      }
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Manual save
  const save = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Collect all section data
      const updates: Partial<WeeklyReport> = {
        sections: {
          activities: activities.data || undefined,
          hses: hsesData.data || undefined,
          resources: resourceTable.data || undefined,
          qaqcStatus: qaqcTable.data || undefined,
          constructionIssues: constructionIssues.data || undefined,
          overallProgress: overallProgress.data || undefined,
          introduction: introductionText.data || undefined,
          letter: weeklyReportLetter.data || undefined,
        }
      };

      const response = await updateWeeklyReport(reportId, updates);
      
      if (response.success && response.data) {
        setReport(response.data);
        setLastSaved(new Date());
        return true;
      } else {
        setError(response.error || 'Failed to save weekly report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Submit report
  const submit = async () => {
    if (!reportId) return false;

    try {
      setIsLoading(true);
      setError(null);

      // First save any pending changes
      const saved = await save();
      if (!saved) return false;

      const response = await submitWeeklyReport(reportId);
      
      if (response.success && response.data) {
        setReport(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to submit weekly report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Approve report
  const approve = async () => {
    if (!reportId) return false;

    try {
      setIsLoading(true);
      setError(null);

      const response = await approveWeeklyReport(reportId);
      
      if (response.success && response.data) {
        setReport(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to approve weekly report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Reject report
  const reject = async (reason?: string) => {
    if (!reportId) return false;

    try {
      setIsLoading(true);
      setError(null);

      const response = await rejectWeeklyReport(reportId, reason);
      
      if (response.success && response.data) {
        setReport(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to reject weekly report');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all sections
  const refresh = async () => {
    await Promise.all([
      activities.refetch(),
      hsesData.refetch(),
      resourceTable.refetch(),
      qaqcTable.refetch(),
      constructionIssues.refetch(),
      overallProgress.refetch(),
      introductionText.refetch(),
      weeklyReportLetter.refetch(),
      loadReport()
    ]);
  };

  // Check if any section has unsaved changes
  const hasUnsavedChanges = () => {
    return activities.error !== null ||
           hsesData.error !== null ||
           resourceTable.error !== null ||
           qaqcTable.error !== null ||
           constructionIssues.error !== null ||
           overallProgress.error !== null ||
           introductionText.error !== null ||
           weeklyReportLetter.error !== null;
  };

  // Get validation status for all sections
  const getValidationStatus = () => {
    const sections = {
      activities: activities.data !== null,
      hses: hsesData.data !== null,
      resources: resourceTable.data !== null,
      qaqc: qaqcTable.data !== null,
      constructionIssues: constructionIssues.data !== null,
      overallProgress: overallProgress.data !== null,
      introduction: introductionText.data !== null,
      letter: weeklyReportLetter.data !== null,
    };

    const isValid = Object.values(sections).every(Boolean);
    const incompleteSections = Object.entries(sections)
      .filter(([_, isComplete]) => !isComplete)
      .map(([section]) => section);

    return {
      isValid,
      incompleteSections,
      sections
    };
  };

  // Load report on mount
  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  // Auto-save on section changes (debounced)
  useEffect(() => {
    if (!reportId || !report) return;

    const timeoutId = setTimeout(() => {
      if (hasUnsavedChanges()) {
        autoSave({
          sections: {
            activities: activities.data || undefined,
            hses: hsesData.data || undefined,
            resources: resourceTable.data || undefined,
            qaqcStatus: qaqcTable.data || undefined,
            constructionIssues: constructionIssues.data || undefined,
            overallProgress: overallProgress.data || undefined,
            introduction: introductionText.data || undefined,
            letter: weeklyReportLetter.data || undefined,
          }
        });
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [
    reportId,
    report,
    activities.data,
    hsesData.data,
    resourceTable.data,
    qaqcTable.data,
    constructionIssues.data,
    overallProgress.data,
    introductionText.data,
    weeklyReportLetter.data
  ]);

  return {
    // Main state
    report,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    isAutoSaving,
    lastSaved,

    // Section states
    activities,
    hsesData,
    resourceTable,
    qaqcTable,
    constructionIssues,
    overallProgress,
    introductionText,
    weeklyReportLetter,

    // Actions
    loadReport,
    save,
    submit,
    approve,
    reject,
    refresh,
    autoSave,

    // Utilities
    hasUnsavedChanges,
    getValidationStatus,

    // Report metadata
    status: report?.status,
    canEdit: report?.status === 'draft' || report?.status === 'in-progress',
    canSubmit: report?.status === 'draft' || report?.status === 'in-progress',
    canApprove: report?.status === 'submitted',
    canReject: report?.status === 'submitted',
  };
};
