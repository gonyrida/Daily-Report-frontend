// src/utils/dailyReportErrors.ts
// User-friendly error handling for daily report operations

export class UploadError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public technicalDetails: string,
    public actionable: boolean = true
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export interface FailedFile {
  file: string;
  error: string;
  size?: number;
  type?: string;
}

export interface UploadResult {
  success: boolean;
  files: any[];
  errors: FailedFile[];
  userMessage?: string;
}

/**
 * Upload images with comprehensive error handling and rollback
 */
export const uploadImagesWithUserFriendlyErrors = async (
  files: File[],
  reportId: string | null,
  userId: string,
  type: 'hse' | 'site' | 'car' | 'photo' | 'logo',
  uploadFunction: (file: File, reportId: string | null, userId: string, type: string) => Promise<any>
): Promise<UploadResult> => {
  const uploadedFiles: any[] = [];
  const failedFiles: FailedFile[] = [];
  
  console.log('DEBUG: Starting upload of', files.length, 'files of type:', type);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      console.log('DEBUG: Uploading file', i + 1, 'of', files.length, ':', file.name);
      const result = await uploadFunction(file, reportId, userId, type);
      
      if (result.success) {
        uploadedFiles.push({
          ...result,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
        console.log('DEBUG: Successfully uploaded:', file.name);
      } else {
        failedFiles.push({ 
          file: file.name, 
          error: result.error || 'Unknown upload error',
          size: file.size,
          type: file.type
        });
        console.error('DEBUG: Upload failed for:', file.name, result.error);
      }
    } catch (error) {
      failedFiles.push({ 
        file: file.name, 
        error: error instanceof Error ? error.message : 'Unknown error',
        size: file.size,
        type: file.type
      });
      console.error('DEBUG: Exception during upload of:', file.name, error);
    }
  }
  
  // If any failures, rollback all successful uploads
  if (failedFiles.length > 0 && uploadedFiles.length > 0) {
    console.log('DEBUG: Rolling back', uploadedFiles.length, 'successful uploads');
    
    // Rollback successful uploads
    const rollbackPromises = uploadedFiles.map(async (uploadedFile) => {
      try {
        if (uploadedFile.supabasePath) {
          const { deleteImageFromSupabase } = await import('./supabaseStorage');
          await deleteImageFromSupabase(uploadedFile.supabasePath, 'daily-reports');
          console.log('DEBUG: Rolled back file:', uploadedFile.originalName);
        }
      } catch (rollbackError) {
        console.error('DEBUG: Failed to rollback file:', uploadedFile.originalName, rollbackError);
        // Don't throw here - we want to continue with other rollbacks
      }
    });
    
    await Promise.allSettled(rollbackPromises);
    
    // Clear successful uploads since we rolled them back
    uploadedFiles.length = 0;
  }
  
  // Generate user-friendly error message
  let userMessage = '';
  if (failedFiles.length === 0) {
    userMessage = `Successfully uploaded ${uploadedFiles.length} image(s).`;
  } else if (failedFiles.length === files.length) {
    // All files failed
    userMessage = `None of your images could be uploaded. Please check your internet connection and file formats, then try again.`;
  } else {
    // Some files failed
    const failedFileNames = failedFiles.map(f => f.file).join(', ');
    if (failedFiles.length <= 3) {
      userMessage = `${failedFiles.length} of ${files.length} images failed to upload. The following files had issues: ${failedFileNames}. Please check these files and retry.`;
    } else {
      userMessage = `${failedFiles.length} of ${files.length} images failed to upload. Several files had issues. Please check the file formats and sizes, then retry.`;
    }
  }
  
  const result: UploadResult = {
    success: failedFiles.length === 0,
    files: uploadedFiles,
    errors: failedFiles,
    userMessage
  };
  
  console.log('DEBUG: Upload operation completed:', {
    success: result.success,
    uploadedCount: uploadedFiles.length,
    failedCount: failedFiles.length,
    userMessage
  });
  
  return result;
};

/**
 * Create user-friendly error messages for different scenarios
 */
export const createUserFriendlyErrorMessage = (error: any, context: string): string => {
  if (error instanceof UploadError) {
    return error.userMessage;
  }
  
  // Handle common error patterns
  const errorMessage = error?.message || error?.toString() || '';
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return `Network connection issue. Please check your internet connection and try again.`;
  }
  
  if (errorMessage.includes('file size') || errorMessage.includes('too large')) {
    return `One or more files are too large. Please reduce file sizes and try again.`;
  }
  
  if (errorMessage.includes('file type') || errorMessage.includes('format')) {
    return `One or more files have unsupported formats. Please use JPG, PNG, or PDF files and try again.`;
  }
  
  if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
    return `Storage space issue. Please contact support or try again later.`;
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
    return `Permission denied. Please log in again and try again.`;
  }
  
  // Generic error with context
  switch (context) {
    case 'upload':
      return `Upload failed. Please check your files and internet connection, then try again.`;
    case 'delete':
      return `Failed to delete file. Please try again or contact support if the issue persists.`;
    case 'move':
      return `Failed to organize files. Please try saving the report again.`;
    default:
      return `Something went wrong. Please try again or contact support if the issue persists.`;
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate file before upload
 */
export const validateFileForUpload = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File "${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is 10MB.`
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File "${file.name}" has unsupported format. Allowed formats: JPG, PNG, GIF, WebP, PDF.`
    };
  }
  
  return { valid: true };
};
