import { useState, useEffect } from "react";
import { SubRow, Section } from "@/types/resourceTable.types";
import { DAY_NAMES } from "@/constants/dayNames";
import { calculateGrandTotal } from "@/utils/calculationUtils";
import { generateWeekDates } from "@/lib/weekDateUtils";

export const useResourceTable = (sharedData?: { dateRange?: string }, showTitles: boolean = true) => {
  const [sections, setSections] = useState<Section[]>([
    {
      title: "I. Site Management Team",
      subtitle: "",
      subRows: [
        {
          description: "",
          dailyData: ["", "", "", "", "", "", "", ""],
          previousWeek: "",
          thisWeek: "",
          upToThisWeek: "",
        },
      ],
    },
    {
      title: "II. Site Working Team Interior",
      subtitle: "",
      subRows: [
        {
          description: "",
          dailyData: ["", "", "", "", "", "", "", ""],
          previousWeek: "",
          thisWeek: "",
          upToThisWeek: "",
        },
      ],
    },
    {
      title: "III. Site Working Team MEP",
      subtitle: "",
      subRows: [
        {
          description: "",
          dailyData: ["", "", "", "", "", "", "", ""],
          previousWeek: "",
          thisWeek: "",
          upToThisWeek: "",
        },
      ],
    },
  ]);

  const dayNames = DAY_NAMES;
  
  // Generate month-year display and dates from sharedData dateRange
  const [monthYearDisplay, setMonthYearDisplay] = useState<string>("Feb-26");
  const [dates, setDates] = useState<string[]>(["-", "-", "-", "-", "-", "-", "-", "-"]);

  useEffect(() => {
    if (sharedData?.dateRange) {
      const { monthYearDisplay: newMonthYearDisplay, dates: newDates } = generateWeekDates(sharedData.dateRange);
      setMonthYearDisplay(newMonthYearDisplay);
      setDates(newDates);
    }
  }, [sharedData?.dateRange]);

  const handleInputChange = (
    sectionIndex: number,
    rowIndex: number,
    field: keyof SubRow,
    value: string,
    dayIndex?: number,
  ) => {
    const newSections = [...sections];
    if (dayIndex !== undefined && field === "dailyData") {
      newSections[sectionIndex].subRows[rowIndex].dailyData[dayIndex] = value;
      
      // Auto-calculate This Week when any daily data changes
      let weekSum = 0;
      newSections[sectionIndex].subRows[rowIndex].dailyData.forEach(dayValue => {
        weekSum += parseFloat(dayValue) || 0;
      });
      newSections[sectionIndex].subRows[rowIndex].thisWeek = weekSum.toString();
      
      // Auto-calculate Up to This Week when This Week changes
      const prevWeek = parseFloat(newSections[sectionIndex].subRows[rowIndex].previousWeek) || 0;
      newSections[sectionIndex].subRows[rowIndex].upToThisWeek = (prevWeek + weekSum).toString();
    } else if (field !== "dailyData") {
      newSections[sectionIndex].subRows[rowIndex][field] = value;
      
      // Auto-calculate Up to This Week when Previous Week changes
      if (field === "previousWeek") {
        const prevWeek = parseFloat(newSections[sectionIndex].subRows[rowIndex].previousWeek) || 0;
        const thisWeek = parseFloat(newSections[sectionIndex].subRows[rowIndex].thisWeek) || 0;
        newSections[sectionIndex].subRows[rowIndex].upToThisWeek = (prevWeek + thisWeek).toString();
      }
    }
    setSections(newSections);
  };

  const removeSubRow = (sectionIndex: number, rowIndex: number) => {
    if (sections[sectionIndex].subRows.length > 1) {
      const newSections = [...sections];
      newSections[sectionIndex].subRows = newSections[sectionIndex].subRows.filter((_, i) => i !== rowIndex);
      setSections(newSections);
    }
  };

  return {
    sections,
    setSections,
    handleInputChange,
    removeSubRow,
    monthYearDisplay,
    dates,
  };
};
