import React, { useState } from "react";
import { CheckCircle, AlertCircle, Clock, XCircle, FileText, Plus, Trash2 } from "lucide-react";
import { StatusKey, QaqcRow, Section, TableData, QaqcTableProps } from "@/types/qaqc.types";
import { STATUS_OPTIONS } from "@/constants/qaqcStatus";
import { handleCommentChange } from "@/lib/tableUtils";
import { makeRow } from "@/utils/rowFactory";

interface QaqcStatusNewProps {
  sections: Section[];
  weeklyReportId: string;
  tableData?: TableData;
  setTableData?: React.Dispatch<React.SetStateAction<TableData>>;
  initialQaqcData?: any;
}

const CommentTextarea: React.FC<{
  rows: QaqcRow[];
  sectionId: string;
  onCellChange: (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => void;
}> = ({ rows, sectionId, onCellChange }) => {
  return (
    <textarea
      value={rows[0]?.comment || ''}
      onChange={(e) => handleCommentChange(e.target.value, rows, onCellChange, sectionId)}
      placeholder="Add comments for all rows here..."
      rows={3}
      className="w-full border rounded px-2 py-1 text-sm resize-none dark:bg-card dark:border-border"
    />
  );
};

const StatusIcon: React.FC<{ status: StatusKey }> = ({ status }) => {
  switch (status) {
    case "Pending":
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case "Respond":
      return <Clock className="w-4 h-4 text-purple-600" />;
    case "Submit":
      return <Clock className="w-4 h-4 text-blue-600" />;
    case "Resubmit":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "Approved":
      return <FileText className="w-4 h-4 text-cyan-600" />;
    case "Approved with Condition":
      return <CheckCircle className="w-4 h-4 text-gray-600" />;
    case "Not Approved":
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return <div className="w-4 h-4 text-gray-400" />;
  }
};

// QaqcTable Component (moved here to avoid import issues)
const QaqcTable: React.FC<QaqcTableProps> = ({
  section,
  rows,
  onAddRow,
  onDeleteRow,
  onCellChange,
}) => {
  // Define custom headers for specific sections
  const getSectionHeaders = () => {
    switch (section.id) {
      case '4.5': // Client Site Instruction (SI)
        return [
          { key: '#', label: '#', width: 'w-12' },
          { key: 'code', label: 'Code', width: 'min-w-36' },
          { key: 'description', label: 'Description', width: 'min-w-48' },
          { key: 'issuedBy', label: 'Issued By', width: 'min-w-36' },
          { key: 'issuedDate', label: 'Issued Date', width: 'w-32' },
          { key: 'actions', label: '', width: 'w-12' }
        ];
      case '4.6': // Inspection Request (IR)
        return [
          { key: '#', label: '#', width: 'w-12' },
          { key: 'code', label: 'Code', width: 'min-w-36' },
          { key: 'description', label: 'Description', width: 'min-w-48' },
          { key: 'receivedDate', label: 'Received Date', width: 'w-32' },
          { key: 'inspectionDate', label: 'Inspection Date', width: 'w-32' },
          { key: 'actions', label: '', width: 'w-12' }
        ];
      default:
        return [
          { key: '#', label: '#', width: 'w-12' },
          { key: 'code', label: 'Code', width: 'min-w-36' },
          { key: 'description', label: 'Description', width: 'min-w-48' },
          { key: 'status', label: 'Status', width: 'min-w-36' },
          { key: 'dateResponse', label: 'Date Submit/Response', width: 'w-32' },
          { key: 'actions', label: '', width: 'w-12' }
        ];
    }
  };

  const headers = getSectionHeaders();
  return (
    <div className="section-card p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">
              {section.id}
            </span>
            <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
          </div>
          {rows && rows.length > 0 && (
            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
              {rows.length} {rows.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>
        <button
          onClick={() => onAddRow(section.id)}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus className="w-4 h-4" /> Add Row
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {headers.map((header) => (
                  <th key={header.key} className={`text-left py-2 px-2 ${header.width}`}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((row, idx) => (
                <tr key={row.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-2 text-center text-muted-foreground font-medium text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={row.code}
                      onChange={(e) => onCellChange(section.id, row.id, "code", e.target.value)}
                      placeholder="e.g. NCR-001"
                      className="w-full border rounded px-2 py-1 text-sm dark:bg-card dark:border-border"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => onCellChange(section.id, row.id, "description", e.target.value)}
                      placeholder="Enter description"
                      className="w-full border rounded px-2 py-1 text-sm dark:bg-card dark:border-border"
                    />
                  </td>
                  {section.id === '4.5' && (
                    <>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.issuedBy || ''}
                          onChange={(e) => onCellChange(section.id, row.id, "issuedBy", e.target.value)}
                          placeholder="Enter issued by"
                          className="w-full border rounded px-2 py-1 text-sm dark:bg-card dark:border-border"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={row.issuedDate || ''}
                          onChange={(e) => onCellChange(section.id, row.id, "issuedDate", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm dark:bg-card dark:border-border"
                        />
                      </td>
                    </>
                  )}
                  {section.id === '4.6' && (
                    <>
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={row.receivedDate || ''}
                          onChange={(e) => onCellChange(section.id, row.id, "receivedDate", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm dark:bg-card dark:border-border"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={row.inspectionDate || ''}
                          onChange={(e) => onCellChange(section.id, row.id, "inspectionDate", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm dark:bg-card dark:border-border"
                        />
                      </td>
                    </>
                  )}
                  {section.id !== '4.5' && section.id !== '4.6' && (
                    <>
                      <td className="py-2 px-2">
                        <select
                          value={row.status}
                          onChange={(e) => onCellChange(section.id, row.id, "status", e.target.value as StatusKey)}
                          className={`w-full border rounded px-2 py-1 text-sm font-medium dark:bg-card dark:border-border ${
                            row.status === "Pending" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700" :
                            row.status === "Respond" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700" :
                            row.status === "Submit" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700" :
                            row.status === "Resubmit" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700" :
                            row.status === "Approved" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700" :
                            row.status === "Approved with Condition" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700" :
                            row.status === "Not Approved" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700" :
                            "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <option value="">Select</option>
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={row.dateResponse}
                          onChange={(e) => onCellChange(section.id, row.id, "dateResponse", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm dark:bg-card dark:border-border"
                        />
                      </td>
                    </>
                  )}
                  <td className="py-2 px-2">
                    <button
                      onClick={() => onDeleteRow(section.id, row.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows && rows.length > 0 && (
                <tr className="bg-muted/10">
                  <td colSpan={6} className="py-3 px-2">
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="flex-1">
                            <div className="mb-2">
                              <span className="text-sm font-semibold text-foreground">Comments</span>
                            </div>
                            <CommentTextarea
                              rows={rows}
                              sectionId={section.id}
                              onCellChange={onCellChange}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
};

export const QaqcStatusNew: React.FC<QaqcStatusNewProps> = ({
  sections,
  weeklyReportId,
  tableData,
  setTableData,
  initialQaqcData,
}) => {
  const [search, setSearch] = useState<string>("");

  // Simple row handlers - just call parent's setTableData directly
  const handleAddRow = (sectionId: string) => {
    if (!setTableData) return;
    const newRow = makeRow();
    setTableData(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), newRow]
    }));
  };

  const handleDeleteRow = (sectionId: string, rowId: string) => {
    if (!setTableData) return;
    setTableData(prev => ({
      ...prev,
      [sectionId]: prev[sectionId]?.filter(row => row.id !== rowId) || []
    }));
  };

  const handleCellChange = (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => {
    if (!setTableData) return;
    setTableData(prev => ({
      ...prev,
      [sectionId]: prev[sectionId]?.map(row =>
        row.id === rowId ? { ...row, [field]: value } : row
      ) || []
    }));
  };

  // Calculate totals
  const totalRows = Object.values(tableData).reduce((sum, rows) => sum + (rows?.length || 0), 0);
  const openRows = Object.values(tableData).reduce((sum, rows) =>
    sum + (rows?.filter(row => row.status === "Pending" || row.status === "Respond" || row.status === "Submit").length || 0), 0
  );

  // Filter sections based on search
  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Search and Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections here..."
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card dark:border-border"
          />
        </div>
      </div>

      {/* Tables */}
      <div className="space-y-6">
        {filteredSections.map((section) => (
          <div key={section.id} id={`section-${section.id}`}>
            <QaqcTable
              section={section}
              rows={tableData[section.id] || []}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onCellChange={handleCellChange}
            />
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No sections match your filter.
          </div>
        )}
      </div>

    </div>
  );
};
