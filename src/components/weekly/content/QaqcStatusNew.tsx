import React, { useState } from "react";
import { CheckCircle, AlertCircle, Clock, XCircle, FileText, Plus, Trash2, MessageSquare } from "lucide-react";

type StatusKey = "Open" | "In Review" | "Pending" | "Approved" | "Issued" | "Closed" | "Rejected" | "";

interface QaqcRow {
  id: string;
  code: string;
  description: string;
  status: StatusKey;
  dateResponse: string;
  comment: string;
}

interface Section {
  id: string;
  title: string;
}

type TableData = Record<string, QaqcRow[]>;

const STATUS_OPTIONS: StatusKey[] = [
  "Open", "In Review", "Pending", "Approved", "Issued", "Closed", "Rejected",
];

const makeRow = (): QaqcRow => ({
  id: crypto.randomUUID(),
  code: "",
  description: "",
  status: "",
  dateResponse: "",
  comment: "",
});

const StatusIcon: React.FC<{ status: StatusKey }> = ({ status }) => {
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

interface QaqcTableProps {
  section: Section;
  rows: QaqcRow[];
  onAddRow: (sectionId: string) => void;
  onDeleteRow: (sectionId: string, rowId: string) => void;
  onCellChange: (sectionId: string, rowId: string, field: keyof QaqcRow, value: string) => void;
}

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
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => onCellChange(section.id, row.id, "description", e.target.value)}
                      placeholder="Enter description"
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={row.status}
                      onChange={(e) => onCellChange(section.id, row.id, "status", e.target.value as StatusKey)}
                      className={`w-full border rounded px-2 py-1 text-sm font-medium ${
                        row.status === "Open" ? "bg-yellow-50 text-yellow-800 border-yellow-200" :
                        row.status === "In Review" ? "bg-purple-50 text-purple-800 border-purple-200" :
                        row.status === "Pending" ? "bg-blue-50 text-blue-800 border-blue-200" :
                        row.status === "Approved" ? "bg-green-50 text-green-800 border-green-200" :
                        row.status === "Issued" ? "bg-cyan-50 text-cyan-800 border-cyan-200" :
                        row.status === "Closed" ? "bg-gray-50 text-gray-800 border-gray-200" :
                        row.status === "Rejected" ? "bg-red-50 text-red-800 border-red-200" :
                        "bg-gray-50 text-gray-600 border-gray-200"
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
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => onDeleteRow(section.id, row.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
                                const newValue = e.target.value;
                                if (newValue.trim() === '') {
                                  // Clear all comments if textarea is empty
                                  rows.forEach((row) => {
                                    onCellChange(section.id, row.id, "comment", "");
                                  });
                                } else {
                                  // Split and assign comments normally
                                  const comments = newValue.split('\n\n---\n\n');
                                  rows.forEach((row, idx) => {
                                    if (comments[idx] && comments[idx].trim()) {
                                      onCellChange(section.id, row.id, "comment", comments[idx]);
                                    } else {
                                      onCellChange(section.id, row.id, "comment", "");
                                    }
                                  });
                                }
                              }}
                              placeholder="Add comments for all rows here... "
                              rows={3}
                              className="w-full border rounded px-2 py-1 text-sm resize-none"
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

interface QaqcStatusNewProps {
  sections: Section[];
}

export default function QaqcStatusNew({ sections }: QaqcStatusNewProps) {
  const initialData: TableData = Object.fromEntries(sections.map((s) => [s.id, Array(5).fill(null).map(() => makeRow())]));
  
  const [tableData, setTableData] = useState<TableData>(initialData);
  const [search, setSearch] = useState<string>("");

  const handleAddRow = (sectionId: string): void => {
    setTableData((prev) => ({
      ...prev,
      [sectionId]: [...prev[sectionId], makeRow()],
    }));
  };

  const handleDeleteRow = (sectionId: string, rowId: string): void => {
    setTableData((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].filter((r) => r.id !== rowId),
    }));
  };

  const handleCellChange = (
    sectionId: string,
    rowId: string,
    field: keyof QaqcRow,
    value: string
  ): void => {
    setTableData((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].map((r) =>
        r.id === rowId ? { ...r, [field]: value } : r
      ),
    }));
  };

  const totalRows = Object.values(tableData).reduce((a, r) => a + r.length, 0);
  const openRows = Object.values(tableData).flat().filter((r) => r.status === "Open").length;

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="bg-primary text-primary-foreground p-4 rounded-lg">
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
            <span>Total Entries: <strong>{totalRows}</strong></span>
            <span>Open Items: <strong className="text-yellow-300">{openRows}</strong></span>
          </div>
        </div>
      </div> */}

      {/* Search and Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections here..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Tables */}
      <div className="space-y-6">
        {filteredSections.map((section) => (
          <div key={section.id} id={`section-${section.id}`}>
            <QaqcTable
              section={section}
              rows={tableData[section.id]}
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
