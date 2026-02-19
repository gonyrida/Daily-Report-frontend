import { useState } from "react";
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

  return { coverData, setCoverData };
};
