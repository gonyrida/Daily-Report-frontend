import { useState, useEffect } from "react";
import { HsesData } from "@/types/weeklyReport.types";
import { getWeeklyReportById } from "@/services/weeklyReportService";

export const defaultHsesData: HsesData = {
  training: [
    { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
    { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
    { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" }
  ],
  inspection: [
    { typeOfInspection: "", date: "", inspector: "", remarks: "" },
    { typeOfInspection: "", date: "", inspector: "", remarks: "" },
    { typeOfInspection: "", date: "", inspector: "", remarks: "" }
  ],
  permit: [
    { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
    { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
    { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" }
  ],
  firstAidAccident: "",
  otherActivities: "",
  hsePhotoReferences: [],
};

export const useHsesData = (reportId: string) => {
  const [data, setData] = useState<HsesData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load HSES data
  const refetch = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeeklyReportById(reportId);

      if (response.success && response.data) {
        setData(response.data.sections.hses || defaultHsesData);
      } else {
        setError(response.error || 'Failed to load HSES data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (reportId) {
      refetch();
    }
  }, [reportId]);

  const updateData = (section: keyof HsesData, value: any) => {
    if (!data) return;
    const newData = { ...data, [section]: value };
    setData(newData);
  };

  const clearHsesData = () => {
    setData(defaultHsesData);
  };

  return {
    data,
    setData,
    isLoading,
    error,
    refetch,
    updateData,
    clearHsesData,
  };
};
