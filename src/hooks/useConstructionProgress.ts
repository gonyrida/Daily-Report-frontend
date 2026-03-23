import { useState, useEffect, useCallback, useRef } from 'react';
import { ConstructionProgressData } from '@/types/constructionProgress';
import ConstructionProgressService from '@/services/constructionProgressService';
import { useToast } from '@/hooks/use-toast';

interface UseConstructionProgressOptions {
  reportId?: string;
}

export const useConstructionProgress = (options: UseConstructionProgressOptions = {}) => {
  const { reportId } = options;
  
  console.log('🔍 useConstructionProgress hook called with reportId:', reportId);
  
  const [constructionData, setConstructionData] = useState<ConstructionProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Ref to track if data has been modified since last save
  const isModifiedRef = useRef(false);

  /**
   * Load construction progress data from the server
   */
  const loadConstructionProgress = useCallback(async () => {
    if (!reportId) {
      console.log('🔍 loadConstructionProgress: No reportId provided, skipping load');
      return;
    }

    console.log('🔍 loadConstructionProgress: Starting load for reportId:', reportId);
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading construction progress for reportId:', reportId);
      const result = await ConstructionProgressService.getConstructionProgress(reportId);
      console.log('🔍 Construction progress result:', result);
      
      if (result.success && result.data) {
        console.log('🔍 Setting construction data:', result.data);
        setConstructionData(result.data);
        isModifiedRef.current = false;
      } else {
        console.log('🔍 Failed to load construction progress:', result.error);
        setError(result.error || 'Failed to load construction progress');
        toast({
          title: "Error",
          description: result.error || "Failed to load construction progress data",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('🔍 Exception in loadConstructionProgress:', error);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportId, toast]);

  /**
   * Save construction progress data to the server
   */
  const saveConstructionProgress = useCallback(async (data?: ConstructionProgressData) => {
    if (!reportId) return;

    const dataToSave = data || constructionData;
    if (!dataToSave) {
      setError('No data to save');
      return;
    }

    // Validate data before saving
    const validationErrors = ConstructionProgressService.validateConstructionProgressData(dataToSave);
    if (validationErrors.length > 0) {
      setError('Validation failed');
      toast({
        title: "Validation Error",
        description: validationErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await ConstructionProgressService.saveConstructionProgress(reportId, dataToSave);
      
      if (result.success) {
        setLastSaved(new Date());
        isModifiedRef.current = false;
        toast({
          title: "Success",
          description: "Construction progress saved successfully",
        });
      } else {
        setError(result.error || 'Failed to save construction progress');
        toast({
          title: "Error",
          description: result.error || "Failed to save construction progress",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [reportId, constructionData, toast]);

  /**
   * Update construction progress data locally (manual save only)
   */
  const updateConstructionData = useCallback((newData: ConstructionProgressData | ((prev: ConstructionProgressData | null) => ConstructionProgressData)) => {
    setConstructionData(prev => {
      const updated = typeof newData === 'function' ? newData(prev) : newData;
      isModifiedRef.current = true;
      return updated;
    });
  }, []);

  /**
   * Reset construction progress data
   */
  const resetConstructionData = useCallback(() => {
    setConstructionData(null);
    isModifiedRef.current = false;
    setError(null);
    setLastSaved(null);
  }, []);

  /**
   * Check if data has been modified since last save
   */
  const isModified = useCallback(() => isModifiedRef.current, []);

  /**
   * Force save current data
   */
  const forceSave = useCallback(() => {
    saveConstructionProgress();
  }, [saveConstructionProgress]);

  // Ref to track initial reportId to prevent reset on first mount
  const initialReportIdRef = useRef<string | undefined>(reportId);
  const prevReportIdRef = useRef<string | undefined>(undefined);

  // Load data when reportId changes
  useEffect(() => {
    console.log('🔍 useConstructionProgress useEffect triggered with reportId:', reportId);
    
    // Only reset if reportId changed from a valid value to null (user explicitly creating new report)
    // Don't reset on initial mount when reportId is null (URL params not yet parsed)
    if (reportId === undefined && prevReportIdRef.current !== undefined) {
      console.log('🔍 reportId changed from valid to null, resetting construction data');
      resetConstructionData();
    } else if (reportId) {
      console.log('🔍 Calling loadConstructionProgress...');
      loadConstructionProgress();
    }
    
    // Track the previous reportId
    prevReportIdRef.current = reportId;
  }, [reportId, loadConstructionProgress, resetConstructionData]);

  return {
    constructionData,
    isLoading,
    isSaving,
    lastSaved,
    error,
    loadConstructionProgress,
    saveConstructionProgress,
    updateConstructionData,
    resetConstructionData,
    isModified,
    forceSave,
  };
};

export default useConstructionProgress;
