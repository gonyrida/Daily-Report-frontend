import { QaqcRow, Section, TableData } from "@/types/qaqc.types";
import { makeRow } from "@/utils/rowFactory";

// Section mapping between frontend IDs and backend keys
const SECTION_ID_MAP: Record<string, string> = {
  "4.1": "ncr", "4.2": "car", "4.3": "scar", "4.4": "pmsi",
  "4.5": "csi", "4.6": "ir", "4.7": "mfa", "4.8": "rfi",
  "4.9": "rfa", "4.10": "fcr", "4.11": "vo", "4.12": "tr", "4.13": "mir"
};

// Reverse mapping for backend to frontend
const REVERSE_SECTION_MAP: Record<string, string> = {};
Object.entries(SECTION_ID_MAP).forEach(([frontendId, backendKey]) => {
  REVERSE_SECTION_MAP[backendKey] = frontendId;
});

/**
 * Transform backend QAQC data to frontend TableData format
 * Called once in report loader, no API calls
 */
export const transformQaqcData = (backendQaqcData: any, sections: Section[]): TableData => {
  const transformedData: TableData = {};
  
  sections.forEach(section => {
    const backendKey = SECTION_ID_MAP[section.id];
    const backendSection = backendQaqcData?.[backendKey];
    
    if (backendSection?.items && backendSection.items.length > 0) {
      transformedData[section.id] = backendSection.items.map((item: any, index: number) => ({
        id: item.id || `${section.id}-${index}`,
        code: item.code || "",
        description: item.description || "",
        status: item.status || "",
        dateResponse: item.dateResponded || "",
        comment: index === 0 && backendSection.comments ? backendSection.comments : ""
      }));
      
    } else {
      // Create 5 empty rows for sections without data
      transformedData[section.id] = Array(5).fill(null).map(() => makeRow());
    }
  });
  
  return transformedData;
};

/**
 * Build backend payload from frontend TableData for saving
 * Called only when user explicitly saves, not auto-save
 */
export const buildQaqcPayload = (tableData: TableData): any => {
  const backendData: any = {};
  
  Object.entries(tableData).forEach(([sectionId, rows]) => {
    const backendKey = SECTION_ID_MAP[sectionId];
    if (backendKey) {
      // Filter out empty rows (only save rows with actual data)
      const nonEmptyRows = rows.filter(row => 
        row.code.trim() || 
        row.description.trim() || 
        row.status.trim() || 
        row.dateResponse.trim() || 
        row.comment.trim()
      );
      
      backendData[backendKey] = {
        items: nonEmptyRows.map(row => ({
          code: row.code, 
          description: row.description, 
          status: row.status,
          dateResponded: row.dateResponse
        })),
        comments: nonEmptyRows.map(row => row.comment).filter(comment => comment.trim()).join('\n\n---\n\n') || ""
      };
    }
  });
  
  return backendData;
};
