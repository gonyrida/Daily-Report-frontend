import React, { useEffect, useState } from "react";
import { Section, TableData, QaqcTableProps, QaqcRow } from "@/types/qaqc.types";
import { useQaqcApi } from "@/hooks/useQaqcApi";
import { STATUS_OPTIONS } from "@/constants/qaqcStatus";
import { CheckCircle, AlertCircle, Clock, XCircle, FileText, Plus, Trash2 } from "lucide-react";
import { handleCommentChange } from "@/lib/tableUtils";
import { transformQaqcData, buildQaqcPayload } from "@/utils/qaqcUtils";
import { makeRow } from "@/utils/rowFactory";
// import { toast } from "sonner";

interface QaqcStatusApiWrapperProps {
  sections: Section[];
  weeklyReportId?: string;
  search?: string;
  setSearch?: React.Dispatch<React.SetStateAction<string>>;
  setTableData?: React.Dispatch<React.SetStateAction<TableData>>;
  initialQaqcData?: any; // New prop for initial data
}

// CommentTextarea Component
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

// Status Icon Component
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
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
              <th className="text-left py-2 px-2 w-32">Date Response</th>
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
                    onChange={(e) => onCellChange(section.id, row.id, "status", e.target.value)}
                    className={`w-full border rounded px-2 py-1 text-sm font-medium dark:bg-card dark:border-border ${row.status === "Pending" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700" :
                        row.status === "Respond" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700" :
                          row.status === "Submit" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700" :
                            row.status === "Resubmit" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700" :
                              row.status === "Approved" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700" :
                                row.status === "Approved with Condition" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700" :
                                  row.status === "Not Approved" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700" :
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

export const QaqcStatusApiWrapper: React.FC<QaqcStatusApiWrapperProps> = ({
  sections,
  weeklyReportId,
  search: externalSearch,
  setSearch: externalSetSearch,
  setTableData: externalSetTableData, // Add setTableData prop
  initialQaqcData, // New prop for initial data
}) => {
  const [tableData, setTableData] = useState<TableData>(() =>
    sections.reduce((acc, section) => {
      acc[section.id] = Array(5).fill(null).map(() => makeRow());
      return acc;
    }, {} as TableData)
  );
  
  // Initialize with initialQaqcData when it arrives
  React.useEffect(() => {
    if (!initialQaqcData || Object.keys(initialQaqcData).length === 0) return;

    // Rebuild from scratch using sections as source of truth
    setTableData(() => {
      return sections.reduce((acc, section) => {
        const incoming = initialQaqcData[section.id];
        acc[section.id] = incoming?.length > 0
          ? incoming
          : Array(5).fill(null).map(() => makeRow()); // always guarantee 5 rows
        return acc;
      }, {} as TableData);
    });
  }, [initialQaqcData, sections]);
  // Transform initial data once on mount (no API calls)
  const [search, setSearch] = useState<string>(externalSearch || "");

  // Simple row handlers (no complex API logic)
  const handleAddRow = (sectionId: string) => {
    setTableData(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), makeRow()]
    }));
  };

  const handleDeleteRow = (sectionId: string, rowId: string) => {
    setTableData(prev => ({
      ...prev,
      [sectionId]: prev[sectionId]?.filter(row => row.id !== rowId) || []
    }));
  };

  const handleCellChange = (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => {
    setTableData(prev => ({
      ...prev,
      [sectionId]: prev[sectionId]?.map(row =>
        row.id === rowId ? { ...row, [field]: value } : row
      ) || []
    }));
  };

  // Sync with external data when it changes
  React.useEffect(() => {
    if (externalSetTableData) {
      externalSetTableData(tableData);
    }
  }, [tableData, externalSetTableData]);

  // Sync search with external
  React.useEffect(() => {
    if (externalSetSearch) {
      externalSetSearch(search);
    }
  }, [search, externalSetSearch]);

  // Calculate totals
  const totalRows = Object.values(tableData).reduce((sum, rows) => sum + (rows?.length || 0), 0);
  const openRows = Object.values(tableData).reduce((sum, rows) =>
    sum + (rows?.filter(row => row.status === "Pending" || row.status === "Respond" || row.status === "Submit").length || 0), 0
  );

  // Filter sections based on search
  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = async () => {
    // No longer needed - data is bundled with report load
    console.log('QAQC data refresh not needed - using bundled report data');
  };

  if (true) {
    // No loading/error states needed - data is bundled with report
    // const isLoading = false;
    // const error = null;

    return (
      <div className="space-y-4">

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
  }
};
