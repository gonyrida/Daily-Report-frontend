import { useState, useEffect } from "react";
import { QaqcRow, Section, TableData } from "@/types/qaqc.types";
import { makeRow } from "@/utils/rowFactory";
import { handleCommentChange } from "@/lib/tableUtils";

const STORAGE_KEY = 'qaqc-table-data';

export const useQaqcTable = (sections: Section[]) => {
  const initialData: TableData = Object.fromEntries(
    sections.map((s) => [s.id, Array(5).fill(null).map(() => makeRow())])
  );

  // Load from localStorage on init
  const [tableData, setTableData] = useState<TableData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge stored data with initial data structure
        const merged: TableData = {};
        sections.forEach((s) => {
          merged[s.id] = parsed[s.id] || initialData[s.id];
        });
        return merged;
      }
    } catch (e) {
      console.error('Error loading QAQC data from localStorage:', e);
    }
    return initialData;
  });

  const [search, setSearch] = useState<string>("");

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tableData));
    } catch (e) {
      console.error('Error saving QAQC data to localStorage:', e);
    }
  }, [tableData]);

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
    localStorage.removeItem(STORAGE_KEY);
  };

  const totalRows = Object.values(tableData).reduce((a, r) => a + r.length, 0);
  const openRows = Object.values(tableData).flat().filter((r) => r.status === "Open").length;

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
    totalRows,
    openRows,
    filteredSections,
  };
};
