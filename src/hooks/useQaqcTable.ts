import { useState, useEffect, useMemo, useRef } from "react";
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
    // Priority 1: Use localStorage data if available
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
    
    // Priority 2: Use initial data
    return initialData;
  });

  // Persist to localStorage whenever data changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const dataString = JSON.stringify(tableData);
        // Check if data is too large (localStorage typically has 5-10MB limit)
        if (dataString.length > 4 * 1024 * 1024) { // 4MB limit
          console.warn('QAQC data too large for localStorage, skipping save');
          return;
        }
        localStorage.setItem("qaqc_table_data", dataString);
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded for QAQC data, clearing old data');
          // Clear the old data to free up space
          localStorage.removeItem("qaqc_table_data");
        } else {
          console.error('Error saving QAQC data:', error);
        }
      }
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

  // Load external data (call from component when needed)
  const loadExternalData = (externalData: any): void => {
    if (externalData && typeof externalData === 'object') {
      const convertedData: TableData = {};
      sections.forEach(section => {
        if (externalData[section.id]) {
          convertedData[section.id] = externalData[section.id];
        } else {
          convertedData[section.id] = Array(5).fill(null).map(() => makeRow());
        }
      });
      setTableData(convertedData);
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
    loadExternalData,
    totalRows,
    openRows,
    filteredSections,
  };
};
