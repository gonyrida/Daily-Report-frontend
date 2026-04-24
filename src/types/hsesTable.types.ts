export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'date';
  placeholder?: string;
  width?: string;
}

export interface HsesTableComponentProps {
  data?: any[];
  onChange?: (data: any[]) => void;
  isEditing?: boolean;
  columns: ColumnConfig[];
  emptyMessage: string;
  addButtonText?: string;
}
