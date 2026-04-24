// src/utils/supabaseStorage.ts
// Utilities for uploading and managing files in Supabase Storage

import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  path: string;
  publicUrl: string;
  error?: string;
}

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  reportId?: string;
  description?: string;
}

/**
 * Upload an image to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The bucket name (default: 'daily-reports')
 * @param folder - Optional folder path within bucket
 * @returns Upload result with path and public URL
 */
export const uploadImageToSupabase = async (
  file: File,
  bucket: string = 'daily-report',
  folder?: string
): Promise<UploadResult> => {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        path: '',
        publicUrl: '',
        error: error.message
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl,
      error: undefined
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      path: '',
      publicUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Delete an image from Supabase Storage
 * @param path - The file path in storage
 * @param bucket - The bucket name (default: 'daily-reports')
 */
export const deleteImageFromSupabase = async (
  path: string,
  bucket: string = 'daily-reports'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

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
 * Get public URL for a file in Supabase Storage
 * @param path - The file path in storage
 * @param bucket - The bucket name (default: 'daily-reports')
 * @returns Public URL
 */
export const getSupabasePublicUrl = (
  path: string,
  bucket: string = 'daily-reports'
): string => {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
};

/**
 * Upload image and save metadata to MongoDB via API
 * @param file - The file to upload
 * @param metadata - Additional metadata to store in MongoDB
 * @param apiEndpoint - Your backend API endpoint for saving image metadata
 * @returns Combined result with Supabase URL and MongoDB ID
 */
export const uploadImageWithMetadata = async (
  file: File,
  metadata: Partial<ImageMetadata>,
  apiEndpoint: string = '/api/images'
): Promise<{
  success: boolean;
  supabaseUrl?: string;
  mongoId?: string;
  error?: string;
}> => {
  // 1. Upload to Supabase
  const uploadResult = await uploadImageToSupabase(file);
  
  if (uploadResult.error || !uploadResult.publicUrl) {
    return {
      success: false,
      error: uploadResult.error || 'Failed to upload to Supabase'
    };
  }

  // 2. Save metadata to MongoDB
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: uploadResult.publicUrl,
        path: uploadResult.path,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: metadata.uploadedBy || 'anonymous',
        reportId: metadata.reportId,
        description: metadata.description,
        uploadedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      supabaseUrl: uploadResult.publicUrl,
      mongoId: result._id || result.id
    };

  } catch (error) {
    // If MongoDB save fails, clean up Supabase file
    await deleteImageFromSupabase(uploadResult.path);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save metadata'
    };
  }
};

/**
 * Check if a URL is from Supabase Storage
 * @param url - The URL to check
 * @returns True if it's a Supabase URL
 */
export const isSupabaseUrl = (url: string): boolean => {
  return url.includes('supabase.co/storage/v1/object');
};
