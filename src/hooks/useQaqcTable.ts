import { useState } from "react";
import { QaqcRow, Section, TableData } from "@/types/qaqc.types";
import { makeRow } from "@/utils/rowFactory";
import { handleCommentChange } from "@/lib/tableUtils";

export const useQaqcTable = (sections: Section[]) => {
  const initialData: TableData = Object.fromEntries(
    sections.map((s) => [s.id, Array(5).fill(null).map(() => makeRow())])
  );

  const [tableData, setTableData] = useState<TableData>(initialData);
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
    totalRows,
    openRows,
    filteredSections,
  };
};
