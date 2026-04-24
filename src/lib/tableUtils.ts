import { QaqcRow } from "@/types/qaqc.types";

export const handleCommentChange = (
  newValue: string,
  rows: QaqcRow[],
  onCellChange: (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => void,
  sectionId: string,
) => {
  // Store the same comment value only on the FIRST row
  // Other rows' comments are ignored
  if (rows.length > 0) {
    onCellChange(sectionId, rows[0].id, "comment", newValue);
  }
};
