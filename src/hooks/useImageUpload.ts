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
        // Convert file to data URL for immediate display
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const updatedData = { ...coverData, coverImage: dataUrl };
          setCoverData(updatedData);
          onDataChange?.(updatedData);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Failed to process image:', error);
      }
    }
  };

  return { handleImageUpload };
};
