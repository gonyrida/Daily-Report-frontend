// src/hooks/useDailyReportImages.ts
// Custom hook for managing daily report images with Supabase backend

import { useState, useCallback, useRef } from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import {
  uploadReportImages,
  moveTempFiles,
  cleanupImages,
  generateTempReportId,
  isTempReportId,
  processFileForUpload,
  filterImagesNeedingUpload,
  type ImageMetadata,
  type ImageUploadResult,
  type TempFileMoveResult
} from '@/services/dailyReportImageService';

interface UseDailyReportImagesOptions {
  reportId?: string;
  autoUpload?: boolean;
}

interface ImageSection {
  images: ImageMetadata[];
  isUploading?: boolean;
  error?: string;
}

export const useDailyReportImages = (options: UseDailyReportImagesOptions = {}) => {
  const { profile } = useProfileContext();
  const [reportId, setReportId] = useState<string | undefined>(options.reportId);
  const [sections, setSections] = useState<Record<string, ImageSection>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadQueueRef = useRef<Set<string>>(new Set());

  // Initialize with temp report ID if no report ID provided
  const initializeReport = useCallback(() => {
    if (!reportId && profile?.userId) {
      const tempId = generateTempReportId(profile.userId);
      setReportId(tempId);
      return tempId;
    }
    return reportId;
  }, [reportId, profile?.userId]);

  // Update image section
  const updateSection = useCallback((sectionName: string, images: ImageMetadata[]) => {
    setSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        images
      }
    }));
  }, []);

  // Add files to a section
  const addFilesToSection = useCallback(async (sectionName: string, files: File[], captions?: string[]) => {
    if (!reportId) {
      setError('No report ID available');
      return;
    }

    setError(null);
    
    // Mark section as uploading
    setSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        isUploading: true,
        error: undefined
      }
    }));

    try {
      // Process files for upload
      const processedFiles = files.map((file, index) => 
        processFileForUpload(file, captions?.[index])
      );

      // Upload images
      const imageType = sectionName.replace(/_/g, '-'); // Convert section_name to image-type
      const result: ImageUploadResult = await uploadReportImages(reportId, imageType, processedFiles);

      if (result.success) {
        // Update section with uploaded images
        const currentImages = sections[sectionName]?.images || [];
        const updatedImages = [...currentImages, ...result.images];
        updateSection(sectionName, updatedImages);

        // If there are temp files, mark report as having temp files
        if (result.hasTempFiles) {
          console.log('Report has temp files that need to be moved on save');
        }
      } else {
        // Handle upload error
        const errorMessage = result.errors?.map(e => e.error).join(', ') || 'Upload failed';
        setSections(prev => ({
          ...prev,
          [sectionName]: {
            ...prev[sectionName],
            isUploading: false,
            error: errorMessage
          }
        }));
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setSections(prev => ({
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          isUploading: false,
          error: errorMessage
        }
      }));
      setError(errorMessage);
    } finally {
      // Mark section as not uploading
      setSections(prev => ({
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          isUploading: false
        }
      }));
    }
  }, [reportId, sections, updateSection]);

  // Remove image from section
  const removeImageFromSection = useCallback((sectionName: string, index: number) => {
    const currentImages = sections[sectionName]?.images || [];
    const updatedImages = currentImages.filter((_, i) => i !== index);
    updateSection(sectionName, updatedImages);
  }, [sections, updateSection]);

  // Update image caption
  const updateImageCaption = useCallback((sectionName: string, index: number, caption: string) => {
    const currentImages = sections[sectionName]?.images || [];
    const updatedImages = [...currentImages];
    updatedImages[index] = { ...updatedImages[index], caption };
    updateSection(sectionName, updatedImages);
  }, [sections, updateSection]);

  // Move temp files to permanent location (called when saving report)
  const moveTempFilesToPermanent = useCallback(async (finalReportId: string): Promise<boolean> => {
    if (!reportId || !isTempReportId(reportId)) {
      return true; // No temp files to move
    }

    setIsSaving(true);
    setError(null);

    try {
      const result: TempFileMoveResult = await moveTempFiles(reportId, finalReportId);
      
      if (result.success) {
        // Update report ID to the permanent one
        setReportId(finalReportId);
        console.log('Temp files moved successfully:', result.movedFiles);
        return true;
      } else {
        setError(result.error || 'Failed to move temp files');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move temp files';
      setError(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [reportId]);

  // Clean up unused images
  const cleanupUnusedImages = useCallback(async (finalReportId: string) => {
    if (!finalReportId) return;

    try {
      // Collect all current images from all sections
      const allCurrentImages: ImageMetadata[] = [];
      Object.values(sections).forEach(section => {
        allCurrentImages.push(...section.images);
      });

      // For now, we'll skip cleanup as it's complex to determine "unused" images
      // This would be called when deleting/replacing images specifically
      console.log('Cleanup skipped - would be called when images are deleted/replaced');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, [sections]);

  // Get all images for a report
  const loadReportImages = useCallback(async (reportIdToLoad: string) => {
    try {
      // This would load existing images from the backend
      // For now, we'll initialize empty sections
      const initialSections: Record<string, ImageSection> = {
        projectLogo: { images: [] },
        hse: { images: [] },
        site_ref: { images: [] },
        photo_groups: { images: [] },
        carSheet: { images: [] }
      };
      
      setSections(initialSections);
      setReportId(reportIdToLoad);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load images';
      setError(errorMessage);
    }
  }, []);

  // Get section data
  const getSection = useCallback((sectionName: string): ImageSection => {
    return sections[sectionName] || { images: [] };
  }, [sections]);

  // Check if report has temp files
  const hasTempFiles = useCallback((): boolean => {
    return isTempReportId(reportId || '');
  }, [reportId]);

  // Get upload progress for a section
  const getUploadProgress = useCallback((sectionName: string): boolean => {
    return sections[sectionName]?.isUploading || false;
  }, [sections]);

  // Clear all sections
  const clearAllSections = useCallback(() => {
    setSections({});
    setError(null);
  }, []);

  // Get summary of all images
  const getImageSummary = useCallback(() => {
    const summary = {
      totalImages: 0,
      tempImages: 0,
      sections: {} as Record<string, { count: number; tempCount: number }>
    };

    Object.entries(sections).forEach(([sectionName, section]) => {
      const sectionCount = section.images.length;
      const sectionTempCount = section.images.filter(img => img.isTemp).length;
      
      summary.totalImages += sectionCount;
      summary.tempImages += sectionTempCount;
      summary.sections[sectionName] = {
        count: sectionCount,
        tempCount: sectionTempCount
      };
    });

    return summary;
  }, [sections]);

  return {
    // State
    reportId,
    sections,
    isSaving,
    error,
    
    // Actions
    initializeReport,
    setReportId,
    addFilesToSection,
    removeImageFromSection,
    updateImageCaption,
    moveTempFilesToPermanent,
    cleanupUnusedImages,
    loadReportImages,
    clearAllSections,
    
    // Helpers
    getSection,
    hasTempFiles,
    getUploadProgress,
    getImageSummary,
    setError
  };
};
