import { useState, useEffect } from "react";
import { SubRow, Section } from "@/types/resourceTable.types";
import { DAY_NAMES } from "@/constants/dayNames";
import { calculateGrandTotal } from "@/utils/calculationUtils";
import { generateWeekDates } from "@/lib/weekDateUtils";
import { getWeeklyReportById } from "@/services/weeklyReportService";

export const useResourceTable = (reportId: string) => {
  const [data, setData] = useState<Section[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const dayNames = DAY_NAMES;
  const getTodayDisplay = () => {
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'short' });
    const day = today.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  };
  const [monthYearDisplay, setMonthYearDisplay] = useState<string>(getTodayDisplay());
  const [dates, setDates] = useState<string[]>(["-", "-", "-", "-", "-", "-", "-"]);

  // Load resource table data
  const refetch = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeeklyReportById(reportId);

      if (response.success && response.data) {
        const resources = response.data.sections.resources;
        // Transform resources data to Section[] format if needed
        // For now, set null if not available
        setData(null);
        
        // Update dates if dateRange is available
        if (resources?.manPower?.dateRange) {
          const { monthYearDisplay: newMonthYearDisplay, dates: newDates } = generateWeekDates(resources.manPower.dateRange);
          setMonthYearDisplay(newMonthYearDisplay);
          setDates(newDates);
        }
      } else {
        setError(response.error || 'Failed to load resource table data');
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

  const handleInputChange = (
    sectionIndex: number,
    rowIndex: number,
    field: keyof SubRow,
    value: string,
    dayIndex?: number,
  ) => {
    if (!data) return;
    const newData = [...data];
    if (dayIndex !== undefined && field === "dailyData") {
      newData[sectionIndex].subRows[rowIndex].dailyData[dayIndex] = value;
      
      // Auto-calculate This Week when any daily data changes
      let weekSum = 0;
      newData[sectionIndex].subRows[rowIndex].dailyData.forEach(dayValue => {
        weekSum += parseFloat(dayValue) || 0;
      });
      newData[sectionIndex].subRows[rowIndex].thisWeek = weekSum.toString();
      
      // Auto-calculate Up to This Week when This Week changes
      const prevWeek = parseFloat(newData[sectionIndex].subRows[rowIndex].previousWeek) || 0;
      newData[sectionIndex].subRows[rowIndex].upToThisWeek = (prevWeek + weekSum).toString();
    } else if (field !== "dailyData") {
      newData[sectionIndex].subRows[rowIndex][field] = value;
      
      // Auto-calculate Up to This Week when Previous Week changes
      if (field === "previousWeek") {
        const prevWeek = parseFloat(newData[sectionIndex].subRows[rowIndex].previousWeek) || 0;
        const thisWeek = parseFloat(newData[sectionIndex].subRows[rowIndex].thisWeek) || 0;
        newData[sectionIndex].subRows[rowIndex].upToThisWeek = (prevWeek + thisWeek).toString();
      }
    }
    setData(newData);
  };

  const removeSubRow = (sectionIndex: number, rowIndex: number) => {
    if (!data) return;
    if (data[sectionIndex].subRows.length > 1) {
      const newData = [...data];
      newData[sectionIndex].subRows = newData[sectionIndex].subRows.filter((_, i) => i !== rowIndex);
      setData(newData);
    }
  };

  return {
    data,
    setData,
    isLoading,
    error,
    refetch,
    handleInputChange,
    removeSubRow,
    monthYearDisplay,
    dates,
  };
};
