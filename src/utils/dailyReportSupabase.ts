// src/utils/dailyReportSupabase.ts
// Specialized Supabase storage utilities for daily reports

import { supabase } from '@/integrations/supabase/client';
import { uploadImageToSupabase, deleteImageFromSupabase } from './supabaseStorage';

export interface DailyReportUploadResult {
  success: boolean;
  supabaseUrl?: string;
  supabasePath?: string;
  isTemp?: boolean;
  error?: string;
}

export interface DailyReportImageMetadata {
  supabaseUrl: string;
  supabasePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  caption?: string;
}

/**
 * Generate a temporary report ID for new reports
 */
export const generateTempReportId = (userId: string): string => {
  return `temp-${userId}-${Date.now()}`;
};

/**
 * Upload daily report image with temp folder support
 */
export const uploadDailyReportImage = async (
  file: File,
  reportId: string | null,
  userId: string,
  type: 'hse' | 'site' | 'car' | 'photo' | 'logo'
): Promise<DailyReportUploadResult> => {
  try {
    console.log('DEBUG: Starting daily report image upload:', file.name, 'reportId:', reportId);
    
    // Handle temp uploads for unsaved reports
    const folderId = reportId?.startsWith('temp-') 
      ? `temp-uploads/${userId}` 
      : reportId || `temp-uploads/${userId}`;
    
    // Create organized folder structure
    const folderPath = `daily-reports/${folderId}/${type}-images`;
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${timestamp}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    console.log('DEBUG: Upload path:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('daily-reports')
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
      .from('daily-reports')
      .getPublicUrl(data.path);

    console.log('DEBUG: Supabase public URL:', publicUrl);

    return {
      success: true,
      supabaseUrl: publicUrl,
      supabasePath: data.path,
      isTemp: !reportId || reportId.startsWith('temp-')
    };
  } catch (error) {
    console.error('Daily report image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Move temp files to permanent report folder
 * Uses copy → delete strategy since Supabase doesn't have native move
 */
export const moveTempFilesToReportFolder = async (
  userId: string,
  tempReportId: string,
  finalReportId: string
): Promise<{ success: boolean; movedFiles: any[]; error?: string }> => {
  const tempPath = `daily-reports/temp-uploads/${userId}`;
  const finalPath = `daily-reports/${finalReportId}`;
  
  try {
    console.log('DEBUG: Moving temp files from', tempPath, 'to', finalPath);
    
    // 1. List all temp files
    const { data: tempFiles, error: listError } = await supabase.storage
      .from('daily-reports')
      .list(tempPath, { limit: 100 });
      
    if (listError) {
      console.error('Failed to list temp files:', listError);
      throw listError;
    }
    
    if (!tempFiles || tempFiles.length === 0) {
      console.log('DEBUG: No temp files to move');
      return { success: true, movedFiles: [] };
    }
    
    const movedFiles: any[] = [];
    const copiedFiles: any[] = [];
    
    // 2. Copy each file to new location
    for (const file of tempFiles) {
      const sourcePath = `${tempPath}/${file.name}`;
      const destPath = `${finalPath}/${file.name}`;
      
      try {
        console.log('DEBUG: Copying file from', sourcePath, 'to', destPath);
        
        // Download file data
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('daily-reports')
          .download(sourcePath);
          
        if (downloadError) throw downloadError;
        
        // Create File object from downloaded data
        const fileExt = file.name.split('.').pop();
        const mimeType = file.metadata?.mimetype || `application/${fileExt}`;
        const fileObj = new File([fileData], file.name, { type: mimeType });
        
        // Upload to new location
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('daily-reports')
          .upload(destPath, fileObj, {
            contentType: mimeType,
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        copiedFiles.push({ 
          source: sourcePath, 
          dest: destPath, 
          uploadData,
          originalFile: file
        });
        
        console.log('DEBUG: Successfully copied file:', file.name);
        
      } catch (error) {
        console.error(`Failed to copy file ${file.name}:`, error);
        
        // Cleanup: Delete any successfully copied files
        console.log('DEBUG: Rolling back copied files...');
        await Promise.allSettled(
          copiedFiles.map(f => deleteImageFromSupabase(f.dest))
        );
        
        throw new Error(`File move failed at ${file.name}. All copies cleaned up.`);
      }
    }
    
    // 3. Delete temp files after ALL copies succeed
    console.log('DEBUG: Deleting temp files...');
    const deletePromises = copiedFiles.map(f => deleteImageFromSupabase(f.source));
    const deleteResults = await Promise.allSettled(deletePromises);
    
    // 4. Check for delete failures (log but don't fail the operation)
    const failedDeletes = deleteResults.filter(r => r.status === 'rejected');
    if (failedDeletes.length > 0) {
      console.warn('Warning: Some temp files failed to delete:', failedDeletes);
      // Log for manual cleanup but don't fail the operation
      console.log('Manual cleanup may be needed for:', failedDeletes);
    }
    
    console.log('DEBUG: Successfully moved', copiedFiles.length, 'files');
    return { success: true, movedFiles: copiedFiles };
    
  } catch (error) {
    console.error('File move operation failed:', error);
    return { success: false, error: error.message, movedFiles: [] };
  }
};

/**
 * Delete daily report file from Supabase
 */
export const deleteDailyReportFile = async (
  supabasePath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await deleteImageFromSupabase(supabasePath, 'daily-reports');
    return result;
  } catch (error) {
    console.error('Delete daily report file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Upload multiple daily report images with progress tracking
 */
export const uploadMultipleDailyReportImages = async (
  files: Array<{ file: File; type: 'hse' | 'site' | 'car' | 'photo' | 'logo' }>,
  reportId: string | null,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<DailyReportUploadResult[]> => {
  const results: DailyReportUploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const { file, type } = files[i];
    const result = await uploadDailyReportImage(file, reportId, userId, type);
    results.push(result);
    
    // Update progress
    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100));
    }
  }
  
  return results;
};

/**
 * Check if a report ID is a temporary ID
 */
export const isTempReportId = (reportId: string): boolean => {
  return reportId.startsWith('temp-');
};

/**
 * Extract user ID from temp report ID
 */
export const extractUserIdFromTempId = (tempReportId: string): string => {
  const match = tempReportId.match(/^temp-(.+)-\d+$/);
  return match ? match[1] : '';
};
