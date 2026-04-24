import { useState, useMemo, useEffect } from "react";
import { ProgressRow } from "@/types/progress.types";
import { CAMBODIA_PROVINCES } from "@/constants/cambodiaProvinces";
import { toRoman } from "@/lib/numberUtils";
import { getWeeklyReportById } from "@/services/weeklyReportService";

export const useOverallProgress = (reportId: string) => {
  const [data, setData] = useState<ProgressRow[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 Correct numbering logic
  const formattedRows = useMemo(() => {
    if (!data) return [];
    
    let titleCount = 0;

    return data.map((row, index) => {
      if (row.rowType === "title") {
        titleCount++;
        return {
          ...row,
          displayIndex: `${toRoman(titleCount)}.`,
        };
      }

      if (row.rowType === "detail") {
        let detailCount = 0;

        for (let i = 0; i <= index; i++) {
          if (data[i].rowType === "title") {
            detailCount = 0; // reset when new title appears
          } else if (data[i].rowType === "detail") {
            detailCount++;
          }
        }

        return {
          ...row,
          displayIndex: `${detailCount}.`,
        };
      }

      return row;
    });
  }, [data]);

  const updateRows = (newRows: ProgressRow[]) => {
    setData(newRows);
  };

  const customUpdateRow = (
    id: string,
    field: keyof ProgressRow,
    value: string | number | boolean
  ) => {
    setData((prevData) =>
      prevData.map((row) => {
        if (row.id === id) {
          if (field === "description" && value === "__custom__") {
            return { ...row, description: "", isCustomInput: true };
          }
          if (field === "scopeOfWorks" && value === "__custom_unit__") {
            return { ...row, scopeOfWorks: "__custom_unit_input__" };
          }
          if (field === "isCustomInput" && value === false) {
            return {
              ...row,
              isCustomInput: false,
              description: CAMBODIA_PROVINCES[0] || "",
            };
          }

          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const addTitleRow = () => {
    const newRow: ProgressRow = {
      id: crypto.randomUUID(),
      description: "",
      scopeOfWorks: "",
      pctUpToPrevWeek: 0,
      pctThisWeek: 0,
      pctUpToThisWeek: 0,
      pctRemaining: 0,
      pctNextWeekPlan: 0,
      pctUpNextWeekPlan: 0,
      rowType: "title",
      searchTerm: "",
      isCustomInput: false,
    };

    setData((prev) => prev ? [...prev, newRow] : [newRow]);
  };

  const addDetailRow = () => {
    const newRow: ProgressRow = {
      id: crypto.randomUUID(),
      description: "",
      scopeOfWorks: "",
      pctUpToPrevWeek: 0,
      pctThisWeek: 0,
      pctUpToThisWeek: 0,
      pctRemaining: 0,
      pctNextWeekPlan: 0,
      pctUpNextWeekPlan: 0,
      rowType: "detail",
      searchTerm: "",
      isCustomInput: false,
    };

    setData((prev) => prev ? [...prev, newRow] : [newRow]);
  };

  // Load overall progress data
  const refetch = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeeklyReportById(reportId);

      if (response.success && response.data) {
        const progressData = response.data.sections.overallProgress;
        setData(progressData?.rows || null);
      } else {
        setError(response.error || 'Failed to load overall progress data');
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

  return {
    data,
    setData,
    // Backward compatibility aliases
    rows: data,
    setRows: setData,
    isLoading,
    error,
    refetch,
    updateRows,
    addTitleRow,
    addDetailRow,
  };
};
