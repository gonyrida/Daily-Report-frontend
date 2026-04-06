import { useState, useMemo } from "react";
import { ProgressRow } from "@/types/progress.types";
import { CAMBODIA_PROVINCES } from "@/constants/cambodiaProvinces";
import { toRoman } from "@/lib/numberUtils";

export const useOverallProgress = () => {
  const [rows, setRows] = useState<ProgressRow[]>([]);

  // 🔥 Correct numbering logic
  const formattedRows = useMemo(() => {
    let titleCount = 0;

    return rows.map((row, index) => {
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
          if (rows[i].rowType === "title") {
            detailCount = 0; // reset when new title appears
          } else if (rows[i].rowType === "detail") {
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
  }, [rows]);

  const updateRows = (newRows: ProgressRow[]) => {
    setRows(newRows);
  };

  const customUpdateRow = (
    id: string,
    field: keyof ProgressRow,
    value: string | number | boolean
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
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

    setRows((prev) => [...prev, newRow]);
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

    setRows((prev) => [...prev, newRow]);
  };

  return {
    rows,
    setRows,
    updateRows,
    addTitleRow,
    addDetailRow,
  };
};
