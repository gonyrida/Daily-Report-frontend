import { useState, useEffect } from "react";
import { CoverData, WeeklyReportData } from '@/types/coverData';
import { parseStartDateFromRange } from '@/utils/dateUtils';

export const useCoverData = (data: WeeklyReportData = {}) => {
  // Parse initial start date from data.dateRange if possible
  const initialStartDate = parseStartDateFromRange(data.dateRange || "");

  const [coverData, setCoverData] = useState<CoverData>({
    weekNumber: data.weekNumber || "",
    startDate: initialStartDate,
    dateRange: data.dateRange || "",
    projectName:
      data.projectName ||
      "Renovation Works of The Project for Building Capacity and Establishing Enabling Environment in ICT Majors of TVET in Cambodia",
    employer: data.employer || "Client Name",
    contractor:
      data.contractor ||
      "Cambodian Advanced Construction Project Management (CACPM) Co., Ltd",
    coverImage: data.coverImage || "",
  });

  // Sync with external data when it changes (e.g., after loading from database)
  useEffect(() => {
    const newStartDate = parseStartDateFromRange(data.dateRange || "");
    setCoverData(prev => ({
      ...prev,
      weekNumber: data.weekNumber ?? prev.weekNumber ?? "",
      startDate: newStartDate || prev.startDate || "",
      dateRange: data.dateRange ?? prev.dateRange ?? "",
      projectName: data.projectName ?? prev.projectName ?? "",
      employer: data.employer ?? prev.employer ?? "",
      contractor: data.contractor ?? prev.contractor ?? "",
      coverImage: data.coverImage ?? prev.coverImage ?? "",
    }));
  }, [data.weekNumber, data.dateRange, data.projectName, data.employer, data.contractor, data.coverImage]);

  return { coverData, setCoverData };
};
