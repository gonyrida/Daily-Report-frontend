// src/utils/weeklyReportSupabase.ts
// Specialized Supabase storage utilities for weekly reports

import { supabase } from '@/integrations/supabase/client';
import { uploadImageToSupabase } from './supabaseStorage';
import { MasterScheduleEntry } from '@/types/weeklyReport.types';

export interface WeeklyReportUploadResult {
  success: boolean;
  supabaseUrl?: string;
  supabasePath?: string;
  error?: string;
}

/**
 * Upload master schedule file to Supabase Storage
 * @param file - The file to upload
 * @param reportId - Weekly report ID for folder organization
 * @param entryType - Type of schedule entry
 * @returns Upload result with Supabase URL and path
 */
export const uploadScheduleFileToSupabase = async (
  file: File,
  reportId: string,
  entryType: 'document' | 'image' | 'chart' = 'document'
): Promise<WeeklyReportUploadResult> => {
  try {
    console.log('DEBUG: Starting Supabase upload for file:', file.name, 'reportId:', reportId);
    
    // Handle temporary report IDs for new reports
    const folderId = reportId.startsWith('temp-') ? 'temp-uploads' : reportId;
    
    // Create organized folder structure
    const folderPath = `weekly-reports/${folderId}/master-schedule`;
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${entryType}-${timestamp}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    console.log('DEBUG: Upload path:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('weekly-reports')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    console.log('DEBUG: Supabase upload result:', { data, error });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('weekly-reports')
      .getPublicUrl(data.path);

    console.log('DEBUG: Supabase public URL:', publicUrl);

    return {
      success: true,
      supabaseUrl: publicUrl,
      supabasePath: data.path
    };
  } catch (error) {
    console.error('Schedule file upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Upload multiple schedule files with progress tracking
 * @param files - Array of files to upload
 * @param reportId - Weekly report ID
 * @param onProgress - Progress callback
 * @returns Array of upload results
 */
export const uploadMultipleScheduleFiles = async (
  files: Array<{ file: File; type: 'document' | 'image' | 'chart' }>,
  reportId: string,
  onProgress?: (progress: number) => void
): Promise<WeeklyReportUploadResult[]> => {
  const results: WeeklyReportUploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const { file, type } = files[i];
    const result = await uploadScheduleFileToSupabase(file, reportId, type);
    results.push(result);
    
    // Update progress
    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100));
    }
  }
  
  return results;
};

/**
 * Delete schedule file from Supabase
 * @param supabasePath - The file path in Supabase storage
 * @returns Deletion result
 */
export const deleteScheduleFileFromSupabase = async (
  supabasePath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from('weekly-reports')
      .remove([supabasePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Convert master schedule entries with files to Supabase URLs
 * @param entries - Schedule entries with potential File objects
 * @param reportId - Weekly report ID
 * @returns Converted entries with Supabase URLs
 */
export const convertScheduleEntriesToSupabase = async (
  entries: Partial<MasterScheduleEntry>[],
  reportId: string
): Promise<MasterScheduleEntry[]> => {
  const convertedEntries: MasterScheduleEntry[] = [];

  for (const entry of entries) {
    // Skip entries that are completely empty (no file, no data)
    if (!entry.file && !entry.fileName && !entry.supabaseUrl) {
      console.log('DEBUG: Skipping empty entry:', entry);
      continue;
    }

    let convertedEntry: MasterScheduleEntry = {
      id: entry.id || crypto.randomUUID(),
      type: entry.type || 'document',
      caption: entry.caption || '',
      fileName: entry.fileName || (entry.file ? entry.file.name : 'document.pdf'),
      fileSize: entry.fileSize || 0,
      fileType: entry.fileType || 'application/pdf'
    };

    // Handle file upload if File object exists
    if (entry.file && entry.file instanceof File) {
      console.log('DEBUG: Converting entry with File object:', entry.fileName);
      const uploadResult = await uploadScheduleFileToSupabase(
        entry.file,
        reportId,
        entry.type
      );

      if (uploadResult.success) {
        convertedEntry.supabaseUrl = uploadResult.supabaseUrl;
        convertedEntry.supabasePath = uploadResult.supabasePath;
        convertedEntry.fileName = entry.file.name;
        convertedEntry.fileSize = entry.file.size;
        convertedEntry.fileType = entry.file.type;
      } else {
        console.error('Failed to upload file:', uploadResult.error);
        // Keep fileData as fallback for small files
        if (entry.file.size <= 5 * 1024 * 1024) { // 5MB limit
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(entry.file);
          });
          convertedEntry.fileData = base64;
        }
      }
    } else if (entry.supabaseUrl && entry.supabasePath) {
      // Entry already has Supabase URLs, keep as-is
      console.log('DEBUG: Converting entry with existing Supabase URLs:', entry.fileName);
      convertedEntry.supabaseUrl = entry.supabaseUrl;
      convertedEntry.supabasePath = entry.supabasePath;
      convertedEntry.fileData = entry.fileData;
    } else {
      // Handle legacy entries with fileData
      convertedEntry.fileData = entry.fileData;
    }

    // ALWAYS push the converted entry, regardless of which path it took
    convertedEntries.push(convertedEntry);
  }

  return convertedEntries;
};

/**
 * Get weekly report folder structure from Supabase
 * @param reportId - Weekly report ID
 * @returns List of files in the weekly report folder
 */
export const getWeeklyReportFiles = async (
  reportId: string
): Promise<{ success: boolean; files?: any[]; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from('weekly-reports')
      .list(`weekly-reports/${reportId}`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Supabase list error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true, files: data };

  } catch (error) {
    console.error('List files error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Upload HSE photo reference images to Supabase Storage
 * @param photoReferences - Array of photo reference sections with entries and slots
 * @param reportId - Weekly report ID for folder organization
 * @returns Converted photo references with Supabase URLs
 */
export const uploadHSEPhotoReferencesToSupabase = async (
  photoReferences: any[],
  reportId: string
): Promise<any[]> => {
  if (!photoReferences || !Array.isArray(photoReferences) || photoReferences.length === 0) {
    return [];
  }

  // Handle temporary report IDs for new reports
  const folderId = reportId?.startsWith('temp-') || !reportId ? 'temp-uploads' : reportId;

  const convertedSections = await Promise.all(
    photoReferences.map(async (section, sectionIndex) => {
      const convertedEntries = await Promise.all(
        (section.entries || []).map(async (entry, entryIndex) => {
          const convertedSlots = await Promise.all(
            (entry.slots || []).map(async (slot, slotIndex) => {
              // If slot has a File object, upload to Supabase
              if (slot.image instanceof File) {
                try {
                  const folderPath = `weekly-reports/${folderId}/hse-photos/${sectionIndex}`;
                  const timestamp = Date.now();
                  const fileExt = slot.image.name.split('.').pop();
                  const fileName = `hse-${sectionIndex}-${entryIndex}-${slotIndex}-${timestamp}.${fileExt}`;
                  const filePath = `${folderPath}/${fileName}`;

                  // Upload to Supabase Storage
                  const { data, error } = await supabase.storage
                    .from('weekly-reports')
                    .upload(filePath, slot.image, {
                      cacheControl: '3600',
                      upsert: false,
                      contentType: slot.image.type
                    });

                  if (error) {
                    console.error('Supabase upload error for HSE photo:', error);
                    // Fallback: convert to base64 if upload fails
                    const base64 = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(slot.image);
                    });
                    return { ...slot, image: base64 };
                  }

                  // Get public URL
                  const { data: { publicUrl } } = supabase.storage
                    .from('weekly-reports')
                    .getPublicUrl(data.path);

                  return { ...slot, image: publicUrl };
                } catch (uploadError) {
                  console.error('Error uploading HSE photo to Supabase:', uploadError);
                  // Fallback: convert to base64
                  const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(slot.image);
                  });
                  return { ...slot, image: base64 };
                }
              }

              // If it's already a URL (Supabase or otherwise), keep it as-is
              if (typeof slot.image === 'string' && slot.image.startsWith('http')) {
                return slot;
              }

              // For base64 strings or null, return as-is
              return slot;
            })
          );

          return { ...entry, slots: convertedSlots };
        })
      );

      return { ...section, entries: convertedEntries };
    })
  );

  return convertedSections;
};
