import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ColumnConfig, HsesTableComponentProps } from "@/types/hsesTable.types";

const HsesTableComponent: React.FC<HsesTableComponentProps> = ({
  data = [],
  onChange,
  isEditing = false,
  columns,
  emptyMessage,
  addButtonText = "Add Row"
}) => {
  // IDs must already exist on rows - assigned at data source, not here
  const tableData = data;

  const addRow = () => {
    const newRow: any = { id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    columns.forEach(column => {
      newRow[column.key] = "";
    });
    onChange?.([...tableData, newRow]);
  };

  const removeRow = (rowId: string) => {
    onChange?.(tableData.filter((row) => row.id !== rowId));
  };

  const updateRow = (index: number, field: string, value: string) => {
    onChange?.(tableData.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    ));
  };

  if (!isEditing) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-2 text-left text-sm font-medium text-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={row.id || index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-2 py-1 text-sm text-muted-foreground ${column.width || ''}`}
                  >
                    {row[column.key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tableData.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div></div>
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm font-medium min-w-[180px] justify-center"
        >
          <Plus size={16} />
          {addButtonText}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-2 text-left text-sm font-medium text-foreground ${column.width || ''}`}
                >
                  {column.label}
                </th>
              ))}
              {isEditing && (
                <th className="px-4 py-2 text-left text-sm font-medium text-foreground" style={{ width: '80px' }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={row.id || index}>
                {columns.map((column) => (
                  <td key={column.key} className={`px-2 py-1 ${column.width || ''}`}>
                    {column.type === 'date' ? (
                      <input
                        type="date"
                        value={row[column.key]}
                        onChange={(e) => updateRow(index, column.key, e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-card dark:border-border"
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[column.key]}
                        onChange={(e) => updateRow(index, column.key, e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-card dark:border-border"
                        placeholder={column.placeholder}
                      />
                    )}
                  </td>
                ))}
                {isEditing && (
                  <td className="px-2 py-1 text-center" style={{ width: '80px' }}>
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HsesTableComponent;
