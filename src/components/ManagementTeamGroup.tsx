import { Users, Wrench,Trash2, X, GripVertical } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";
import { MANAGEMENT_OPTIONS, MEP_TEAM_OPTIONS } from "./ResourcesSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface ManagementTeamGroupProps {
  managementTeam: ResourceRow[];
  setManagementTeam: (rows: ResourceRow[]) => void;
  mepTeam: ResourceRow[];
  setMepTeam: (rows: ResourceRow[]) => void;
}

const ManagementTeamGroup = ({
  managementTeam,
  setManagementTeam,
  mepTeam,
  setMepTeam,
}: ManagementTeamGroupProps) => {
  const [draggedRow, setDraggedRow] = useState<{
    type: 'management' | 'mep';
    index: number;
  } | null>(null);

  const handleDragStart = (type: 'management' | 'mep', index: number) => {
    setDraggedRow({ type, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, type: 'management' | 'mep', dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedRow) return;
    
    if (draggedRow.type === type && draggedRow.index !== dropIndex) {
      const sourceArray = type === 'management' ? managementTeam : mepTeam;
      const setSourceArray = type === 'management' ? setManagementTeam : setMepTeam;
      
      const newArray = [...sourceArray];
      const [draggedItem] = newArray.splice(draggedRow.index, 1);
      newArray.splice(dropIndex, 0, draggedItem);
      
      setSourceArray(newArray);
    }
    
    setDraggedRow(null);
  };
  return (
    <div className="section-card overflow-hidden animate-fade-in">
      {/* Parent Header */}
      <div className="bg-table-header px-4 py-3 border-b border-table-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Management Team</h3>
        </div>
      </div>

      {/* Sub-sections Container */}
      <div className="divide-y divide-table-border">
        {/* Management Team Sub-section */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm">Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-12"></th>
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-muted-foreground w-[40%]">
                    Description
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[20%]">
                    Prev
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[20%]">
                    Today
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Accum
                  </th>
                  <th className="w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {managementTeam.length === 0 ? (
                  <tr key="empty-management">
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No entries yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  <>
                    {managementTeam.map((row, index) => (
                      <tr
                        key={`management-${row.id}`}
                        className={`border-t border-table-border hover:bg-muted/30 transition-colors ${
                          draggedRow?.type === 'management' && draggedRow.index === index
                            ? 'opacity-50'
                            : ''
                        }`}
                        draggable
                        onDragStart={() => handleDragStart('management', index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'management', index)}
                      >
                        <td className="px-2 py-2">
                          <div className="flex justify-center">
                            <div className="cursor-move text-muted-foreground hover:text-foreground">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {MANAGEMENT_OPTIONS.length > 0 ? (
                            (row.description === "" || MANAGEMENT_OPTIONS.includes(row.description)) && row.description !== "__custom_input__" ? (
                              <Select
                              value={row.description}
                              onValueChange={(value) => {
                                if (value === "__custom__") {
                                  setManagementTeam(
                                    managementTeam.map((r) =>
                                      r.id === row.id
                                        ? { ...r, description: "__custom_input__" }
                                        : r
                                    )
                                  );
                                } else {
                                  setManagementTeam(
                                    managementTeam.map((r) =>
                                      r.id === row.id ? { ...r, description: value } : r
                                    )
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="w-full border-0 bg-transparent focus:ring-1 focus:ring-primary rounded px-2 py-1">
                                <SelectValue placeholder="Select position..." />
                              </SelectTrigger>
                              <SelectContent>
                                {MANAGEMENT_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__custom__">+ Custom Entry</SelectItem>
                              </SelectContent>
                            </Select>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={row.description === "__custom_input__" ? "" : row.description}
                                  onChange={(e) =>
                                    setManagementTeam(
                                      managementTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: e.target.value } : r
                                      )
                                    )
                                  }
                                  placeholder="Enter custom position..."
                                  className="flex-1 border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    setManagementTeam(
                                      managementTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: MANAGEMENT_OPTIONS[0] || "", isCustomInput: false }
                                          : r
                                      )
                                    )
                                  }
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          ) : (
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) =>
                                setManagementTeam(
                                  managementTeam.map((r) =>
                                    r.id === row.id ? { ...r, description: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="Enter description..."
                              className="w-full border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.prev || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setManagementTeam(
                                managementTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, prev: value, accumulated: value + r.today }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.today || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setManagementTeam(
                                managementTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, today: value, accumulated: r.prev + value }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-center font-semibold text-primary">
                            {row.accumulated}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() =>
                              setManagementTeam(managementTeam.filter((r) => r.id !== row.id))
                            }
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                          >
                             <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const newRow: ResourceRow = {
                    id: crypto.randomUUID(),
                    description: "",
                    prev: 0,
                    today: 0,
                    accumulated: 0,
                  };
                  setManagementTeam([...managementTeam, newRow]);
                }}
                className="mt-3 text-primary hover:text-primary hover:bg-primary/10 px-3 py-1 rounded text-sm"
              >
                + Add Row
              </button>
            </div>
          </div>
          
        </div>

        {/* MEP Team Sub-section */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm">MEP Team</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-12"></th>
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-muted-foreground w-[40%]">
                    Description
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[20%]">
                    Prev
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[20%]">
                    Today
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-muted-foreground w-[12%]">
                    Accum
                  </th>
                  <th className="w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {mepTeam.length === 0 ? (
                  <tr key="empty-mep">
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No entries yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  <>
                    {mepTeam.map((row, index) => (
                      <tr
                        key={`mep-${row.id}`}
                        className={`border-t border-table-border hover:bg-muted/30 transition-colors ${
                          draggedRow?.type === 'mep' && draggedRow.index === index
                            ? 'opacity-50'
                            : ''
                        }`}
                        draggable
                        onDragStart={() => handleDragStart('mep', index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'mep', index)}
                      >
                        <td className="px-2 py-2">
                          <div className="flex justify-center">
                            <div className="cursor-move text-muted-foreground hover:text-foreground">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {MEP_TEAM_OPTIONS.length > 0 ? (
                            (row.description === "" || MEP_TEAM_OPTIONS.includes(row.description)) && row.description !== "__custom_input__" ? (
                              <Select
                                value={row.description}
                                onValueChange={(value) => {
                                  if (value === "__custom__") {
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: "__custom_input__" }
                                          : r
                                      )
                                    );
                                  } else {
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: value } : r
                                      )
                                    );
                                  }
                                }}
                              >
                              <SelectTrigger className="w-full border-0 bg-transparent focus:ring-1 focus:ring-primary rounded px-2 py-1">
                                <SelectValue placeholder="Select position..." />
                              </SelectTrigger>
                              <SelectContent>
                                {MEP_TEAM_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__custom__">+ Custom Entry</SelectItem>
                              </SelectContent>
                            </Select>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={row.description === "__custom_input__" ? "" : row.description}
                                  onChange={(e) =>
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: e.target.value } : r
                                      )
                                    )
                                  }
                                  placeholder="Enter custom position..."
                                  className="flex-1 border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: MEP_TEAM_OPTIONS[0] || "", isCustomInput: false }
                                          : r
                                      )
                                    )
                                  }
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 rounded"
                                >
                                   <X className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          ) : (
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) =>
                                setMepTeam(
                                  mepTeam.map((r) =>
                                    r.id === row.id ? { ...r, description: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="Enter description..."
                              className="w-full border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.prev || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setMepTeam(
                                mepTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, prev: value, accumulated: value + r.today }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.today || ""}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setMepTeam(
                                mepTeam.map((r) =>
                                  r.id === row.id
                                    ? { ...r, today: value, accumulated: r.prev + value }
                                    : r
                                )
                              );
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent text-center focus-visible:ring-1 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-center font-semibold text-primary">
                            {row.accumulated}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() =>
                              setMepTeam(mepTeam.filter((r) => r.id !== row.id))
                            }
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>

      {/* Combined Total Row */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            <tr className="border-t-2 border-primary/30 bg-primary/5">
              <td className="px-4 py-3 font-semibold text-foreground" style={{width: '40%'}}>
                Total
              </td>
              <td className="px-3 py-3 text-center font-bold text-foreground" style={{width: '12%'}}>
                {managementTeam.reduce((sum, row) => sum + row.prev, 0) + mepTeam.reduce((sum, row) => sum + row.prev, 0)}
              </td>
              <td className="px-3 py-3 text-center font-bold text-foreground" style={{width: '12%'}}>
                {managementTeam.reduce((sum, row) => sum + row.today, 0) + mepTeam.reduce((sum, row) => sum + row.today, 0)}
              </td>
              <td className="px-3 py-3 text-center font-bold text-primary" style={{width: '12%'}}>
                {managementTeam.reduce((sum, row) => sum + row.accumulated, 0) + mepTeam.reduce((sum, row) => sum + row.accumulated, 0)}
              </td>
              <td className="px-2 py-3" style={{width: '8%'}}></td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-center">
          <button
            onClick={() => {
              const newRow: ResourceRow = {
                id: crypto.randomUUID(),
                description: "",
                prev: 0,
                today: 0,
                accumulated: 0,
              };
              setMepTeam([...mepTeam, newRow]);
            }}
            className="mt-3 text-primary hover:text-primary hover:bg-primary/10 px-3 py-1 rounded text-sm"
          >
            + Add Row
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagementTeamGroup;
