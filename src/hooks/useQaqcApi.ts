import { useState, useEffect, useRef } from "react";
import { QaqcRow, Section, TableData } from "@/types/qaqc.types";
import { makeRow } from "@/utils/rowFactory";
import { handleCommentChange } from "@/lib/tableUtils";
import { updateQaqcStatus } from "@/integrations/reportsApi";
import { buildQaqcPayload } from "@/utils/qaqcUtils";

const MIN_ROWS = 5;

const padToMinRows = (rows: QaqcRow[]): QaqcRow[] => {
  if (rows.length >= MIN_ROWS) return rows;
  return [
    ...rows,
    ...Array(MIN_ROWS - rows.length).fill(null).map(() => makeRow())
  ];
};

// Helper to build initial data from initialQaqcData
const buildInitialData = (sections: Section[], initialQaqcData?: any): TableData => {
  if (!initialQaqcData || Object.keys(initialQaqcData).length === 0) {
    // No initial data - create empty rows
    return Object.fromEntries(
      sections.map((s) => [s.id, Array(MIN_ROWS).fill(null).map(() => makeRow())])
    );
  }

  // Check if data is already in frontend format (keys like "4.1", "4.2")
  const frontendKeys = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10", "4.11", "4.12", "4.13"];
  const dataKeys = Object.keys(initialQaqcData);
  const isFrontendFormat = dataKeys.some(key => frontendKeys.includes(key));

  if (isFrontendFormat) {
    // Data is already in frontend format - use directly
    return sections.reduce((acc: TableData, section) => {
      const sectionData = initialQaqcData[section.id];
      if (sectionData && Array.isArray(sectionData) && sectionData.length > 0) {
        acc[section.id] = padToMinRows(sectionData);
      } else {
        acc[section.id] = Array(MIN_ROWS).fill(null).map(() => makeRow());
      }
      return acc;
    }, {} as TableData);
  } else {
    // Data is in backend format (keys like "ncr", "car") - transform it
    const sectionIdMap: Record<string, string> = {
      "4.1": "ncr", "4.2": "car", "4.3": "scar", "4.4": "pmsi",
      "4.5": "csi", "4.6": "ir", "4.7": "mfa", "4.8": "rfi",
      "4.9": "rfa", "4.10": "fcr", "4.11": "vo", "4.12": "tr", "4.13": "mir"
    };

    return sections.reduce((acc: TableData, section) => {
      const backendKey = sectionIdMap[section.id];
      const backendSection = initialQaqcData[backendKey];

      if (backendSection?.items) {
        const mapped = backendSection.items.map((item: any, index: number) => ({
          id: item.id || `${section.id}-${index}`,
          code: item.code || "",
          description: item.description || "",
          status: item.status || "",
          dateResponse: item.dateResponded || "",
          comment: index === 0 && backendSection.comments ? backendSection.comments : ""
        }));
        acc[section.id] = padToMinRows(mapped);
      } else {
        acc[section.id] = Array(MIN_ROWS).fill(null).map(() => makeRow());
      }

      return acc;
    }, {} as TableData);
  }
};

export const useQaqcApi = (sections: Section[], reportId?: string, initialQaqcData?: any) => {
  // Initialize synchronously with initialQaqcData if available
  const [tableData, setTableData] = useState<TableData>(() => buildInitialData(sections, initialQaqcData));
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Removed cache since we no longer fetch separately

  // Track last synced backend data to prevent unnecessary re-initializations
  const lastSyncedBackendRef = useRef<string>('');

  // Update tableData when initialQaqcData changes to a NEW value
  useEffect(() => {
    if (!initialQaqcData || Object.keys(initialQaqcData).length === 0) return;

    // Check if user has entered data - don't overwrite it
    const hasUserData = Object.values(tableData).some(
      rows => rows?.some((r: QaqcRow) =>
        r.code?.trim() || r.description?.trim() || r.status?.trim() || r.comment?.trim()
      )
    );
    if (hasUserData) {
      return;
    }

    const incomingStr = JSON.stringify(initialQaqcData);
    // Only re-initialize if backend data is actually different
    if (incomingStr === lastSyncedBackendRef.current) {
      return;
    }

    const newData = buildInitialData(sections, initialQaqcData);
    setTableData(newData);
    lastSyncedBackendRef.current = incomingStr;
  }, [initialQaqcData, sections, tableData]);

  // Removed loadQaqcData function - data is now passed as initialQaqcData prop

  const saveQaqcData = async (retryCount = 0) => {
    if (!reportId) return;

    setIsSaving(true);
    setError(null);

    try {
      // Transform frontend data to backend format using shared utility
      const backendData = buildQaqcPayload(tableData);
      console.log('💾 Saving QAQC data:', backendData);

      await updateQaqcStatus(reportId, backendData);
      
    // Invalidate cache after successful save - no longer needed
    } catch (err) {
      console.error("Failed to save QAQC data:", err);
      
      // Retry logic for network errors
      if (retryCount < 2 && err instanceof Error && (
        err.message.includes('fetch') || 
        err.message.includes('network') || 
        err.message.includes('timeout')
      )) {
        console.log(`Retrying save attempt ${retryCount + 1}/3`);
        setTimeout(() => saveQaqcData(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
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
  const openRows = Object.values(tableData).flat().filter((r) => r.status === "Pending").length;

  const clearQaqcData = (): void => {
    const emptyData: TableData = Object.fromEntries(
      sections.map((s) => [s.id, Array(5).fill(null).map(() => makeRow())])
    );
    setTableData(emptyData);
  };

  const clearQaqcStorage = (): void => {
    // For API version, we don't use localStorage
    // This function is kept for compatibility
    console.log('clearQaqcStorage: No localStorage used in API mode');
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

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search)
  );

  const refetch = async () => {
    // No-op - data is loaded via initialQaqcData prop
    setError(null);
  };

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
    refetch,
    isSaving,
    saveQaqcData,
    loadExternalData, // Keep for compatibility
  };
};
