import { useState, useEffect, useMemo } from "react";
import { QaqcRow, Section, TableData } from "@/types/qaqc.types";
import { makeRow } from "@/utils/rowFactory";
import { handleCommentChange } from "@/lib/tableUtils";

export const useQaqcTable = (sections: Section[]) => {
  const initialData = useMemo<TableData>(
    () => Object.fromEntries(
      sections.map((s) => [s.id, Array(5).fill(null).map(() => makeRow())])
    ),
    []
  );

  const [tableData, setTableData] = useState<TableData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("qaqc_table_data");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Validate that all sections exist
          const hasAllSections = sections.every(s => parsed[s.id] !== undefined);
          if (hasAllSections) {
            return parsed;
          }
        } catch (e) {
          // Failed to parse saved QAQC data, will use initial data
        }
      }
    }
    return initialData;
  });

  // Persist to localStorage whenever data changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("qaqc_table_data", JSON.stringify(tableData));
    }
  }, [tableData]);

  const [search, setSearch] = useState<string>("");

  const handleAddRow = (sectionId: string): void => {
    setTableData((prev) => ({
      ...prev,
      [sectionId]: [...prev[sectionId], makeRow()],
    }));
  };

  const handleDeleteRow = (sectionId: string, rowId: string): void => {
    setTableData((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].filter((r) => r.id !== rowId),
    }));
  };

  const handleCellChange = (
    sectionId: string,
    rowId: string,
    field: keyof QaqcRow,
    value: string
  ): void => {
    setTableData((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].map((r) =>
        r.id === rowId ? { ...r, [field]: value } : r
      ),
    }));
  };

  const clearQaqcData = (): void => {
    setTableData(initialData);
  };

  const clearQaqcStorage = (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("qaqc_table_data");
    }
  };

  const totalRows = Object.values(tableData).reduce((a, r) => a + r.length, 0);
  const openRows = Object.values(tableData).flat().filter((r) => r.status === "Pending").length;

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search)
  );

  return {
    tableData,
    setTableData,
    search,
    setSearch,
    handleAddRow,
    handleDeleteRow,
    handleCellChange,
    clearQaqcData,
    clearQaqcStorage,
    totalRows,
    openRows,
    filteredSections,
  };
};
