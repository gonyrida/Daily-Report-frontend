import React, { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Clock, XCircle, FileText, Plus, Trash2, MessageSquare } from "lucide-react";
import { StatusKey, QaqcRow, Section, TableData, QaqcTableProps, QaqcStatusNewProps } from "@/types/qaqc.types";
import { STATUS_OPTIONS } from "@/constants/qaqcStatus";
import { makeRow } from "@/utils/rowFactory";
import { handleCommentChange } from "@/lib/tableUtils";
import { QaqcStatusApiWrapper } from "./QaqcStatusApiWrapper";

interface ExtendedQaqcStatusNewProps extends QaqcStatusNewProps {
  weeklyReportId?: string;
}

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

const QaqcTable: React.FC<QaqcTableProps> = ({
  section,
  rows,
  onAddRow,
  onDeleteRow,
  onCellChange,
}) => {
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
                <th className="text-left py-2 px-2 w-12">#</th>
                <th className="text-left py-2 px-2">Code</th>
                <th className="text-left py-2 px-2 min-w-48">Description</th>
                <th className="text-left py-2 px-2 w-32">Status</th>
                <th className="text-left py-2 px-2 w-32">Date Submit/Response</th>
                <th className="text-left py-2 px-2 w-12"></th>
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
                            <textarea
                              value={rows.map(row => row.comment).filter(comment => comment.trim()).join('\n\n---\n\n')}
                              onChange={(e) => {
                                handleCommentChange(e.target.value, rows, onCellChange, section.id);
                              }}
                              placeholder="Add comments for all rows here... "
                              rows={3}
                              className="w-full border rounded px-2 py-1 text-sm resize-none dark:bg-card dark:border-border"
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

export default function QaqcStatusNew({
  sections,
  tableData,
  setTableData,
  search,
  setSearch,
  handleAddRow,
  handleDeleteRow,
  handleCellChange,
  totalRows,
  openRows,
  filteredSections = sections,
  weeklyReportId
}: ExtendedQaqcStatusNewProps) {
  const initialData: TableData = Object.fromEntries(
    sections.map((s) => [s.id, Array(5).fill(null).map(() => makeRow())])
  );

  const [localTableData, setLocalTableData] = useState<TableData>(tableData || initialData);
  const [localSearch, setLocalSearch] = useState<string>(search || "");

  // Sync local state with hook state when hook state changes (for example data loading)
  useEffect(() => {
    if (tableData && JSON.stringify(tableData) !== JSON.stringify(localTableData)) {
      setLocalTableData(tableData);
    }
  }, [tableData, localTableData]);

  const handleAddRowLocal = (sectionId: string): void => {
    setLocalTableData((prev) => ({
      ...prev,
      [sectionId]: [...prev[sectionId], makeRow()],
    }));
    
    // Also update the hook state if available
    if (handleAddRow) {
      handleAddRow(sectionId);
    }
  };

  const handleDeleteRowLocal = (sectionId: string, rowId: string): void => {
    setLocalTableData((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].filter((r) => r.id !== rowId),
    }));
    
    // Also update the hook state if available
    if (handleDeleteRow) {
      handleDeleteRow(sectionId, rowId);
    }
  };

  const handleCellChangeLocal = (
    sectionId: string,
    rowId: string,
    field: keyof QaqcRow,
    value: string
  ): void => {
    setLocalTableData((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      ),
    }));
    
    // Also update the hook state if available
    if (handleCellChange) {
      handleCellChange(sectionId, rowId, field, value);
    }
  };

  const totalRowsCount = Object.values(localTableData).reduce((a, r) => a + r.length, 0);
  const openRowsCount = Object.values(localTableData).flat().filter((r) => r.status === "Pending").length;

  const filteredSectionsList = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(localSearch.toLowerCase()) ||
      s.id.includes(localSearch)
  );

  // Use passed handlers if available, otherwise use local ones
  const onAddRowHandler = handleAddRow || handleAddRowLocal;
  const onDeleteRowHandler = handleDeleteRow || handleDeleteRowLocal;
  const onCellChangeHandler = handleCellChange || handleCellChangeLocal;

  // If we have a reportId, use the API wrapper for full backend integration
  if (weeklyReportId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-bold">QA/QC Status Register</h1>
                <p className="text-sm opacity-90">Quality Assurance / Quality Control</p>
              </div>
              <span className="px-2 py-1 bg-white/20 rounded text-xs font-bold">
                SECTION 4
              </span>
            </div>
            <div className="flex gap-6 text-sm">
              <span>Total Entries: <strong>{totalRows || 0}</strong></span>
              <span>Open Items: <strong className="text-yellow-300">{openRows || 0}</strong></span>
            </div>
          </div>
        </div>

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

        {/* API Wrapper Component */}
        <QaqcStatusApiWrapper
          sections={sections}
          weeklyReportId={weeklyReportId}
          search={search}
          setSearch={setSearch}
          setTableData={setTableData}
        />
      </div>
    );
  }

  // Fallback to local state management when no reportId - but still allow typing and parent state updates
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">QA/QC Status Register</h1>
              <p className="text-sm opacity-90">Quality Assurance / Quality Control</p>
            </div>
            <span className="px-2 py-1 bg-white/20 rounded text-xs font-bold">
              SECTION 4
            </span>
          </div>
          <div className="flex gap-6 text-sm">
            <span>Total Entries: <strong>{totalRows || 0}</strong></span>
            <span>Open Items: <strong className="text-yellow-300">{openRows || 0}</strong></span>
          </div>
        </div>
      </div>

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

      {/* Local Tables with parent state integration */}
      <div className="space-y-6">
        {filteredSections.map((section) => (
          <div key={section.id} id={`section-${section.id}`}>
            <QaqcTable
              section={section}
              rows={tableData[section.id] || []}
              onAddRow={handleAddRowLocal}
              onDeleteRow={handleDeleteRowLocal}
              onCellChange={(sectionId, rowId, field, value) => {
                handleCellChangeLocal(sectionId, rowId, field, value);
                // Also call parent setTableData if available
                if (setTableData) {
                  const updatedData = { ...tableData };
                  updatedData[sectionId] = updatedData[sectionId].map(row =>
                    row.id === rowId ? { ...row, [field]: value } : row
                  );
                  setTableData(updatedData);
                }
              }}
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
}
