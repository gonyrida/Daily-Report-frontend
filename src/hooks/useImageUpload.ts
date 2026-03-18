import { CoverData } from '@/types/coverData';
import { validateImageFile, validateFileSize } from '@/utils/fileUtils';
import React from 'react';

interface UseImageUploadProps {
  coverData: CoverData;
  setCoverData: React.Dispatch<React.SetStateAction<CoverData>>;
  onDataChange?: (data: CoverData) => void;
}

export const useImageUpload = ({ coverData, setCoverData, onDataChange }: UseImageUploadProps) => {
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file before processing
      if (!validateImageFile(file)) {
        console.error('Invalid file type');
        return;
      }
      
      if (!validateFileSize(file, 10)) {
        console.error('File too large (max 10MB)');
        return;
      }

      try {
        // For now, just store the file object - let the backend handle Supabase upload
        const updatedData = { ...coverData, coverImage: file };
        setCoverData(updatedData);
        onDataChange?.(updatedData);
      } catch (error) {
        console.error('Failed to process image:', error);
      }
    }
  };

  return { handleImageUpload };
};
