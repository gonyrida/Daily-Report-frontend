import { CoverData } from '@/types/coverData';
import { fileToDataUrl } from '@/utils/fileUtils';
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
      try {
        const newImageData = await fileToDataUrl(file);
        const updatedData = { ...coverData, coverImage: newImageData };
        setCoverData(updatedData);
        onDataChange?.(updatedData);
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    }
  };

  return { handleImageUpload };
};
