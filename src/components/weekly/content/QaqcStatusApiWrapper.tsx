import React, { useEffect, useState } from "react";
import { Section, TableData, QaqcTableProps } from "@/types/qaqc.types";
import { useQaqcApi } from "@/hooks/useQaqcApi";
import { STATUS_OPTIONS } from "@/constants/qaqcStatus";
import { CheckCircle, AlertCircle, Clock, XCircle, FileText, Plus, Trash2 } from "lucide-react";
// import { toast } from "sonner";

interface QaqcStatusApiWrapperProps {
  sections: Section[];
  weeklyReportId?: string;
  search?: string;
  setSearch?: React.Dispatch<React.SetStateAction<string>>;
}

// Status Icon Component
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case "Open":
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case "In Review":
      return <Clock className="w-4 h-4 text-purple-600" />;
    case "Pending":
      return <Clock className="w-4 h-4 text-blue-600" />;
    case "Approved":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "Issued":
      return <FileText className="w-4 h-4 text-cyan-600" />;
    case "Closed":
      return <CheckCircle className="w-4 h-4 text-gray-600" />;
    case "Rejected":
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
          {rows.length > 0 && (
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
              <th className="text-left py-2 px-2 w-32">Date Response</th>
              <th className="text-left py-2 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
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
                    onChange={(e) => onCellChange(section.id, row.id, "status", e.target.value)}
                    className={`w-full border rounded px-2 py-1 text-sm font-medium dark:bg-card dark:border-border ${
                      row.status === "Open" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700" :
                      row.status === "In Review" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700" :
                      row.status === "Pending" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700" :
                      row.status === "Approved" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700" :
                      row.status === "Issued" ? "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700" :
                      row.status === "Closed" ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700" :
                      row.status === "Rejected" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700" :
                      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <option value="">— Select —</option>
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
            {rows.length > 0 && (
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
                              const value = e.target.value;
                              const comments = value.split('\n\n---\n\n');
                              rows.forEach((row, index) => {
                                if (index < comments.length) {
                                  onCellChange(section.id, row.id, "comment", comments[index]);
                                }
                              });
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

export const QaqcStatusApiWrapper: React.FC<QaqcStatusApiWrapperProps> = ({
  sections,
  weeklyReportId,
  search: externalSearch,
  setSearch: externalSetSearch,
}) => {
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const {
    tableData,
    setTableData,
    search: internalSearch,
    setSearch: internalSetSearch,
    handleAddRow,
    handleDeleteRow,
    handleCellChange,
    totalRows,
    openRows,
    filteredSections,
    isLoading,
    error,
    isSaving,
    saveQaqcData,
    loadQaqcData,
  } = useQaqcApi(sections, weeklyReportId);

  // Use external search state if provided, otherwise use internal
  const search = externalSearch ?? internalSearch;
  const setSearch = externalSetSearch ?? internalSetSearch;

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !weeklyReportId || isSaving) return;

    const timeoutId = setTimeout(() => {
      saveQaqcData()
        .then(() => {
          setLastSaved(new Date());
          console.log("QAQC data auto-saved");
        })
        .catch((err) => {
          console.error("Auto-save failed:", err);
        });
    }, 2000); // 2-second debounce

    return () => clearTimeout(timeoutId);
  }, [tableData, autoSaveEnabled, weeklyReportId, isSaving]);

  const handleManualSave = async () => {
    if (!weeklyReportId) {
      console.error("No report ID available for saving");
      return;
    }

    try {
      await saveQaqcData();
      setLastSaved(new Date());
      console.log("QAQC data saved successfully");
    } catch (err) {
      console.error("Manual save failed:", err);
    }
  };

  const handleRefresh = async () => {
    if (!weeklyReportId) {
      console.error("No report ID available for refreshing");
      return;
    }

    try {
      await loadQaqcData();
      console.log("QAQC data refreshed");
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading QAQC data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-save"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="auto-save" className="text-sm">
              Auto-save {isSaving && "(saving...)"}
            </label>
          </div>
          
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3 py-1 text-sm border rounded hover:bg-muted"
          >
            Refresh
          </button>
          
          <button
            onClick={handleManualSave}
            disabled={isSaving || !weeklyReportId}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
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

      {/* Summary */}
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground border-t pt-4">
        <div className="flex gap-6">
          <span>Total Entries: <strong>{totalRows}</strong></span>
          <span>Open Items: <strong className="text-yellow-600">{openRows}</strong></span>
        </div>
        
        {!weeklyReportId && (
          <span className="text-orange-600 text-xs">
            No report ID - changes won't be saved
          </span>
        )}
      </div>
    </div>
  );
};
