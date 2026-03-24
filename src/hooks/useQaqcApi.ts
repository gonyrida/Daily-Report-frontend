import { useState, useEffect } from "react";
import { QaqcRow, Section, TableData } from "@/types/qaqc.types";
import { makeRow } from "@/utils/rowFactory";
import { handleCommentChange } from "@/lib/tableUtils";
import { updateQaqcStatus, getQaqcStatus } from "@/integrations/reportsApi";

export const useQaqcApi = (sections: Section[], reportId?: string) => {
  const initialData: TableData = Object.fromEntries(
    sections.map((s) => [s.id, Array(5).fill(null).map(() => makeRow())])
  );

  const [tableData, setTableData] = useState<TableData>(initialData);
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load QAQC data from API when reportId is available
  useEffect(() => {
    if (reportId) {
      loadQaqcData();
    }
  }, [reportId]);

  const loadQaqcData = async () => {
    if (!reportId) return;

    setIsLoading(true);
    setError(null);

    try {
      const qaqcData = await getQaqcStatus(reportId);
      
      if (qaqcData) {
        // Transform backend data to frontend format
        const transformedData: TableData = {};
        
        // Map frontend section IDs to backend keys
        const sectionIdMap: Record<string, string> = {
          "4.1": "ncr",
          "4.2": "car", 
          "4.3": "scar",
          "4.4": "pmsi",
          "4.5": "csi",
          "4.6": "ir",
          "4.7": "mfa",
          "4.8": "rfi",
          "4.9": "rfa",
          "4.10": "fcr",
          "4.11": "vo",
          "4.12": "tr",
          "4.13": "mir"
        };
        
        sections.forEach(section => {
          const backendKey = sectionIdMap[section.id];
          const backendSection = qaqcData[backendKey];
          
          if (backendSection && backendSection.items) {
            transformedData[section.id] = backendSection.items.map((item: any, index: number) => ({
              id: item.id || `${section.id}-${index}`,
              code: item.code || "",
              description: item.description || "",
              status: item.status || "",
              dateResponse: item.dateResponded || "", // Map backend field to frontend
              comment: "" // Backend stores comments at section level, frontend expects per row
            }));
            
            // Add section-level comments to the first row's comment field
            if (backendSection.comments && transformedData[section.id].length > 0) {
              transformedData[section.id][0].comment = backendSection.comments;
            }
          } else {
            transformedData[section.id] = [];
          }
        });

        setTableData(transformedData);
      }
    } catch (err) {
      console.error("Failed to load QAQC data:", err);
      setError(err instanceof Error ? err.message : "Failed to load QAQC data");
    } finally {
      setIsLoading(false);
    }
  };

  const saveQaqcData = async () => {
    if (!reportId) return;

    setIsSaving(true);
    setError(null);

    try {
      // Transform frontend data to backend format
      const backendData: any = {};
      
      // Map frontend section IDs to backend keys
      const sectionIdMap: Record<string, string> = {
        "4.1": "ncr",
        "4.2": "car", 
        "4.3": "scar",
        "4.4": "pmsi",
        "4.5": "csi",
        "4.6": "ir",
        "4.7": "mfa",
        "4.8": "rfi",
        "4.9": "rfa",
        "4.10": "fcr",
        "4.11": "vo",
        "4.12": "tr",
        "4.13": "mir"
      };
      
      Object.entries(tableData).forEach(([sectionId, rows]) => {
        const backendKey = sectionIdMap[sectionId];
        if (backendKey) {
          backendData[backendKey] = {
            items: rows.map(row => ({
              code: row.code,
              description: row.description,
              status: row.status,
              dateResponded: row.dateResponse // Map frontend field to backend
            })),
            comments: rows.map(row => row.comment).filter(comment => comment.trim()).join('\n\n---\n\n') || ""
          };
        }
      });

      console.log("🔧 DEBUG: Sending QAQC data to backend:", JSON.stringify(backendData, null, 2));
      await updateQaqcStatus(reportId, backendData);
      console.log("QAQC data saved successfully");
    } catch (err) {
      console.error("Failed to save QAQC data:", err);
      setError(err instanceof Error ? err.message : "Failed to save QAQC data");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

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
    isLoading,
    error,
    isSaving,
    saveQaqcData,
    loadQaqcData,
  };
};
