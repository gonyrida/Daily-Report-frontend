// src/services/dailyReportImageService.ts
// Service for handling daily report image operations with backend APIs

import { API_BASE_URL } from '@/config/api';

export interface ImageMetadata {
  supabaseUrl?: string;
  supabasePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  caption?: string;
  isTemp?: boolean;
  legacyBase64?: string;
}

export interface ImageUploadResult {
  success: boolean;
  images: ImageMetadata[];
  hasTempFiles: boolean;
  errors?: Array<{ file?: string; error: string }>;
}

export interface TempFileMoveResult {
  success: boolean;
  movedFiles: Array<{
    oldPath: string;
    newPath: string;
    fileName: string;
    imageType: string;
  }>;
  error?: string;
}

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  errors?: string[];
}

/**
 * Upload images for a daily report section
 */
export const uploadReportImages = async (
  reportId: string,
  imageType: string,
  imageData: Array<{ file?: File; caption?: string }>
): Promise<ImageUploadResult> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(
      `${API_BASE_URL}/daily-reports-images/reports/${reportId}/images/${imageType}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageData })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error uploading images:', error);
    return {
      success: false,
      images: [],
      hasTempFiles: false,
      errors: [{ error: error instanceof Error ? error.message : 'Upload failed' }]
    };
  }
};

/**
 * Move temp files to permanent location when report is saved
 */
export const moveTempFiles = async (
  tempReportId: string,
  finalReportId: string
): Promise<TempFileMoveResult> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(
      `${API_BASE_URL}/daily-reports-images/reports/move-temp-files`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tempReportId, finalReportId })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Move failed');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error moving temp files:', error);
    return {
      success: false,
      movedFiles: [],
      error: error instanceof Error ? error.message : 'Move failed'
    };
  }
};

/**
 * Clean up unused images
 */
export const cleanupImages = async (
  reportId: string,
  currentImages: ImageMetadata[],
  newImages: ImageMetadata[]
): Promise<CleanupResult> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(
      `${API_BASE_URL}/daily-reports-images/reports/${reportId}/cleanup-images`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentImages, newImages })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Cleanup failed');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error cleaning up images:', error);
    return {
      success: false,
      deletedCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Cleanup failed']
    };
  }
};

/**
 * Get all image metadata for a report
 */
export const getReportImages = async (reportId: string): Promise<{
  success: boolean;
  images?: {
    projectLogo?: ImageMetadata;
    hse: Array<{ images: ImageMetadata[] }>;
    site_ref: Array<{ images: ImageMetadata[] }>;
    photo_groups: Array<{ images: ImageMetadata[] }>;
    carSheet: {
      photo_groups: Array<{ images: ImageMetadata[] }>;
    };
  };
  error?: string;
}> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(
      `${API_BASE_URL}/daily-reports-images/reports/${reportId}/images`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Get images failed');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error getting report images:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Get images failed'
    };
  }
};

/**
 * Generate a temporary report ID for new reports
 */
export const generateTempReportId = (userId: string): string => {
  return `temp-${userId}-${Date.now()}`;
};

/**
 * Check if a report ID is temporary
 */
export const isTempReportId = (reportId: string): boolean => {
  return reportId.startsWith('temp-');
};

/**
 * Process file for upload
 */
export const processFileForUpload = (file: File, caption?: string): {
  file: File;
  caption: string;
} => {
  return {
    file,
    caption: caption || file.name
  };
};

/**
 * Convert legacy Base64 to image metadata
 */
export const convertLegacyBase64 = (base64String: string, caption?: string): ImageMetadata => {
  return {
    legacyBase64: base64String,
    caption: caption || 'Legacy image'
  };
};

/**
 * Get image display URL from metadata
 */
export const getImageUrl = (image: ImageMetadata): string => {
  if (image.supabaseUrl) {
    return image.supabaseUrl;
  }
  if (image.legacyBase64) {
    return image.legacyBase64;
  }
  return '';
};

/**
 * Check if image needs upload (has file property)
 */
export const needsUpload = (image: ImageMetadata): boolean => {
  return !!(image as any).file;
};

/**
 * Filter images that need upload
 */
export const filterImagesNeedingUpload = (images: ImageMetadata[]): Array<{ file: File; caption: string }> => {
  return images
    .filter(needsUpload)
    .map(img => ({
      file: (img as any).file,
      caption: img.caption || 'Image'
    }));
};
