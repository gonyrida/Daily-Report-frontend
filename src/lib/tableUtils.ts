import { QaqcRow } from "@/types/qaqc.types";

export const handleCommentChange = (
  newValue: string,
  rows: QaqcRow[],
  onCellChange: (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => void,
  sectionId: string,
) => {
  if (newValue.trim() === '') {
    // Clear all comments if textarea is empty
    rows.forEach((row) => {
      onCellChange(sectionId, row.id, "comment", "");
    });
  } else {
    // Split and assign comments normally
    const comments = newValue.split('\n\n---\n\n');
    rows.forEach((row, idx) => {
      if (comments[idx] && comments[idx].trim()) {
        onCellChange(sectionId, row.id, "comment", comments[idx]);
      } else {
        onCellChange(sectionId, row.id, "comment", "");
      }
    });
  }
};
