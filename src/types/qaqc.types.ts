export type StatusKey = "Open" | "In Review" | "Pending" | "Approved" | "Issued" | "Closed" | "Rejected" | "";

export interface QaqcRow {
  id: string;
  code: string;
  description: string;
  status: StatusKey;
  dateResponse: string;
  comment: string;
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
