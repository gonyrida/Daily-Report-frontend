export type StatusKey = "Pending" | "Respond" | "Submit" | "Resubmit" | "Approved" | "Approved with Condition" | "Not Approved" | "";

export interface QaqcRow {
  id: string;
  code: string;
  description: string;
  status: StatusKey;
  dateResponse: string;
  comment: string;
  // Additional fields for specific sections
  issuedBy?: string; // For section 4.5 Client Site Instruction (SI)
  issuedDate?: string; // For section 4.5 Client Site Instruction (SI)
  receivedDate?: string; // For section 4.6 Inspection Request (IR)
  inspectionDate?: string; // For section 4.6 Inspection Request (IR)
}

export interface Section {
  id: string;
  title: string;
}

export type TableData = Record<string, QaqcRow[]>;

export interface QaqcTableProps {
  section: Section;
  rows: QaqcRow[];
  onAddRow: (sectionId: string) => void;
  onDeleteRow: (sectionId: string, rowId: string) => void;
  onCellChange: (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => void;
}

export interface QaqcStatusNewProps {
  sections: Section[];
  tableData?: TableData;
  setTableData?: React.Dispatch<React.SetStateAction<TableData>>;
  search?: string;
  setSearch?: React.Dispatch<React.SetStateAction<string>>;
  handleAddRow?: (sectionId: string) => void;
  handleDeleteRow?: (sectionId: string, rowId: string) => void;
  handleCellChange?: (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => void;
  totalRows?: number;
  openRows?: number;
  filteredSections?: Section[];
}
