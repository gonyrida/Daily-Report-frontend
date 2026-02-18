import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'date';
  placeholder?: string;
  width?: string;
}

interface HsesTableComponentProps {
  data?: any[];
  onChange?: (data: any[]) => void;
  isEditing?: boolean;
  columns: ColumnConfig[];
  emptyMessage: string;
  addButtonText?: string;
}

const HsesTableComponent: React.FC<HsesTableComponentProps> = ({
  data = [],
  onChange,
  isEditing = false,
  columns,
  emptyMessage,
  addButtonText = "Add Row"
}) => {
  const [tableData, setTableData] = useState<any[]>(data);

  const addRow = () => {
    const newRow: any = {};
    columns.forEach(column => {
      newRow[column.key] = "";
    });
    const newData = [...tableData, newRow];
    setTableData(newData);
    onChange?.(newData);
  };

  const removeRow = (index: number) => {
    const newData = tableData.filter((_, i) => i !== index);
    setTableData(newData);
    onChange?.(newData);
  };

  const updateRow = (index: number, field: string, value: string) => {
    const newData = tableData.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    );
    setTableData(newData);
    onChange?.(newData);
  };

  if (!isEditing) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="border border-gray-300 px-4 py-2 text-sm text-gray-900"
                    style={{ width: column.width || 'auto' }}
                  >
                    {row[column.key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tableData.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          {addButtonText}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700"
                  style={{ width: column.width || 'auto' }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key} className="border border-gray-300 px-2 py-1" style={{ width: column.width || 'auto' }}>
                    {column.type === 'date' ? (
                      <input
                        type="date"
                        value={row[column.key]}
                        onChange={(e) => updateRow(index, column.key, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[column.key]}
                        onChange={(e) => updateRow(index, column.key, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={column.placeholder}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HsesTableComponent;
