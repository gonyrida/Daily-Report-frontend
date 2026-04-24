import { CoverData } from '@/types/coverData';
import { formatDate } from '@/utils/dateUtils';
import React from 'react';

interface UseFieldChangeProps {
  coverData: CoverData;
  setCoverData: React.Dispatch<React.SetStateAction<CoverData>>;
  onDataChange?: (data: CoverData) => void;
}

export const useFieldChange = ({ coverData, setCoverData, onDataChange }: UseFieldChangeProps) => {
  const handleFieldChange = (field: string, value: string) => {
    let updatedData = { ...coverData, [field]: value };
    // If startDate changes, auto-calculate dateRange
    if (field === "startDate") {
      if (value) {
        const start = new Date(value);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const formattedRange = `${formatDate(start)} ~ ${formatDate(end)}`;
        updatedData = { ...updatedData, dateRange: formattedRange };
      } else {
        updatedData = { ...updatedData, dateRange: "" };
      }
    }
    setCoverData(updatedData);
    onDataChange?.(updatedData);
  };

  return { handleFieldChange };
};
