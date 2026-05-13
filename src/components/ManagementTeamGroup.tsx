import { Users, Wrench,Trash2, GripVertical } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";
import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiDelete } from "@/lib/apiFetch";

interface ManagementTeamGroupProps {
  managementTeam: ResourceRow[];
  setManagementTeam: (rows: ResourceRow[] | ((prev: ResourceRow[]) => ResourceRow[])) => void;
  mepTeam: ResourceRow[];
  setMepTeam: (rows: ResourceRow[] | ((prev: ResourceRow[]) => ResourceRow[])) => void;
  onValueChange?: (value: string) => void;
  sectionTitle?: string;
  managementOptions?: { id: string; name: string }[];
  mepTeamOptions?: { id: string; name: string }[];
  onOptionDeleted?: () => void;
}

const ManagementTeamGroup = ({
  managementTeam,
  setManagementTeam,
  mepTeam,
  setMepTeam,
  onValueChange,
  sectionTitle = "Management Team",
  managementOptions = [],
  mepTeamOptions = [],
  onOptionDeleted
}: ManagementTeamGroupProps) => {

  useEffect(() => {
    // Sync local section title state with prop
    if (sectionTitle) {
      setMgTeamTitle(sectionTitle);
    }
  }, [sectionTitle]);

  // This tracks which row is currently showing the text input
  const [editingId, setEditingId] = useState(null);
  const [draggedRow, setDraggedRow] = useState<{type: 'management' | 'mep', row: ResourceRow, index: number} | null>(null);

  // Section title state
  const [mgTeamTitle, setMgTeamTitle] = useState(sectionTitle);

  const handleDragStart = (e: React.DragEvent, row: ResourceRow, index: number, type: 'management' | 'mep') => {
    setDraggedRow({ type, row, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number, type: 'management' | 'mep') => {
    e.preventDefault();
    if (draggedRow && draggedRow.index !== dropIndex && draggedRow.type === type) {
      const rows = type === 'management' ? managementTeam : mepTeam;
      const setRows = type === 'management' ? setManagementTeam : setMepTeam;
      const newRows = [...rows];
      newRows.splice(draggedRow.index, 1);
      newRows.splice(dropIndex, 0, draggedRow.row);
      setRows(newRows);
    }
    setDraggedRow(null);
  };

  const handleDragEnd = () => {
    setDraggedRow(null);
  };

  const handleRemoveOption = async (team, optFor, id) => {
    try {
      const response = await apiDelete(`/daily-reports/dropdown-options/${optFor}/${id}`);
      if (onOptionDeleted) await onOptionDeleted();
    } catch (error) {
      console.error("Error removing option:", error);
    }
  }

  const updateRow = (
    team: string,
    id: string,
    field,
    value: string | number,
  ) => {
    if (team === "mgmt") {
      setManagementTeam((currentRows) =>
        currentRows.map((row) => {
          if (row.id === id) {
            if (field === "description" && value === "__custom__") {
              return { ...row, description: "", isCustomInput: true };
            }
            if (field === "isCustomUnitInput") {
              return { ...row, isCustomUnitInput: value === "true" };
            }
            if (field === "isCustomInput") {
              return { ...row, isCustomInput: value === "true" };
            }
            const updatedRow = { ...row, [field]: value };
            if (field === "prev" || field === "today") {
              const prev = field === "prev" ? Number(value) || 0 : row.prev;
              const today = field === "today" ? Number(value) || 0 : row.today;
              updatedRow.accumulated = prev + today;
            }
            return updatedRow;
          }
          return row;
        }),
      );
    } else {
      setMepTeam((currentRows) =>
        currentRows.map((row) => {
          if (row.id === id) {
            if (field === "description" && value === "__custom__") {
              return { ...row, description: "", isCustomInput: true };
            }
            if (field === "isCustomUnitInput") {
              return { ...row, isCustomUnitInput: value === "true" };
            }
            if (field === "isCustomInput") {
              return { ...row, isCustomInput: value === "true" };
            }
            const updatedRow = { ...row, [field]: value };
            if (field === "prev" || field === "today") {
              const prev = field === "prev" ? Number(value) || 0 : row.prev;
              const today = field === "today" ? Number(value) || 0 : row.today;
              updatedRow.accumulated = prev + today;
            }
            return updatedRow;
          }
          return row;
        }),
      );
    }
  };

  return (
    <div className="section-card overflow-hidden animate-fade-in">
      {/* Parent Header */}
      <div className="bg-table-header px-4 py-3 border-b border-table-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <Input 
            type="text"
            value={mgTeamTitle}
            placeholder="Enter section title..."
            className="w-full h-10"
            onChange={(e) => {
              onValueChange(e.target.value)
              setMgTeamTitle(e.target.value)
            }}
          />
        </div>
      </div>

      {/* Sub-sections Container */}
      <div className="divide-y divide-table-border">
        {/* Management Team Sub-section */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm">Management</h2>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-center px-2 py-2.5 text-sm font-medium text-muted-foreground w-[8%]">
                    
                  </th>
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-muted-foreground w-[32%]">
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
                  <th className="w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {managementTeam.length === 0 ? (
                  <tr key="empty-management">
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No entries yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  <>
                    {managementTeam.map((row) => (
                      <tr
                        key={`management-${row.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, row, managementTeam.indexOf(row), 'management')}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, managementTeam.indexOf(row), 'management')}
                        onDragEnd={handleDragEnd}
                        className="border-t border-table-border hover:bg-muted/30 transition-colors cursor-move"
                      >
                        <td className="px-2 py-2 text-center">
                          <div className="flex justify-center">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {managementOptions.length > 0 ? (() => {
                            // 1. Create a temporary list that includes the current custom value
                            // This ensures that even after typing, the "Dropdown" view can show it.
                            const managementOptionLabels = managementOptions.map(opt => opt.name);
                            const isInOptions = managementOptionLabels.includes(row.description);
                            const allMgmtOptions = row.description && !managementOptionLabels.includes(row.description) 
                              ? [...managementOptions, {id: row.description.toLowerCase, name: row.description}] 
                              : managementOptions;

                            // Check if THIS specific row is being edited
                            const isEditing = editingId === row.id;

                            return !isEditing ? (
                              <Select 
                                value={row.description} 
                                onValueChange={(val) => {
                                  if (val === "__custom__") {
                                    setEditingId(row.id); // Trigger Edit Mode
                                    // Clear the field for a fresh start
                                    setManagementTeam(managementTeam.map((r) =>
                                      r.id === row.id ? { ...r, description: "" } : r
                                    ));
                                  } else {
                                    setManagementTeam(
                                      managementTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: val } : r
                                      )
                                    );
                                  }
                                }}
                              >
                                <SelectTrigger 
                                  className="w-full border-0 bg-transparent focus:ring-1 focus:ring-primary rounded px-2 py-1 truncate whitespace-nowrap overflow-hidden text-ellipsis"
                                  title={row.description}
                                >
                                  <SelectValue placeholder="Select position..." />
                                </SelectTrigger>
                                
                                <SelectContent className="w-full">
                                  {/* TODO LATER: Input loss focus first time typing but works fine the second time */}
                                  {/* <div className="p-2">
                                    <Input
                                      placeholder="Search..."
                                      value={row.searchTerm || ""}
                                      onChange={(e) => 
                                        updateRow("mgmt", row.id, "searchTerm", e.target.value)
                                      }
                                      className="h-8 w-full"
                                    />
                                  </div> */}
                                  {allMgmtOptions.filter(opt =>
                                    opt.name.toLowerCase().includes((row.searchTerm || "").toLowerCase())
                                  ).map((option) => (
                                    <SelectItem key={option.id.toString()} value={option.name} className="p-0 px-4">
                                      <div className="flex items-center min-w-[300px] group">
                                        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1.5">
                                          {option.name}
                                        </div>

                                        <button
                                          type="button"
                                          onPointerUp={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log("Deleting:", option);
                                            handleRemoveOption("mgmt", "role", option.id)
                                          }}
                                          className="ml-auto flex-shrink-0 p-2 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__custom__" className="text-primary font-medium">
                                    + Custom Entry
                                  </SelectItem>
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
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      setEditingId(null); // SNAP BACK TO DROPDOWN
                                    }
                                  }}
                                  onBlur={() => setEditingId(null)} // SNAP BACK IF CLICKED OUTSIDE
                                  placeholder="Enter custom position..."
                                  className="flex-1 border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    setManagementTeam(
                                      managementTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: managementOptions[0].name || "" }
                                          : r
                                      )
                                    )
                                  }
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          })() : (
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
                            <Trash2 className="w-4 h-4" />
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

        {/* MEP Team Sub-section */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm">MEP Team</h2>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-center px-2 py-2.5 text-sm font-medium text-muted-foreground w-[8%]">
                    
                  </th>
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-muted-foreground w-[32%]">
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
                  <th className="w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {mepTeam.length === 0 ? (
                  <tr key="empty-mep">
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No entries yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  <>
                    {mepTeam.map((row) => (
                      <tr
                        key={`mep-${row.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, row, mepTeam.indexOf(row), 'mep')}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, mepTeam.indexOf(row), 'mep')}
                        onDragEnd={handleDragEnd}
                        className="border-t border-table-border hover:bg-muted/30 transition-colors cursor-move"
                      >
                        <td className="px-2 py-2 text-center">
                          <div className="flex justify-center">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {mepTeamOptions.length > 0 ? (() => {
                            const mepTeamOptionLabels = mepTeamOptions.map(opt => opt.name)
                            const isInOptions = mepTeamOptionLabels.includes(row.description);
                            const isEditing = editingId === row.id;
                            return !isEditing ? (
                              <Select 
                                value={row.description} 
                                onValueChange={(val) => {
                                  if (val === "__custom__") {
                                    setEditingId(row.id); // Trigger Edit Mode
                                    // Clear the field for a fresh start
                                    setMepTeam(mepTeam.map((r) =>
                                      r.id === row.id ? { ...r, description: "" } : r
                                    ));
                                  } else {
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id ? { ...r, description: val } : r
                                      )
                                    );
                                  }
                                }}
                              >
                                <SelectTrigger 
                                  className="w-full border-0 bg-transparent focus:ring-1 focus:ring-primary rounded px-2 py-1 truncate whitespace-nowrap overflow-hidden text-ellipsis"
                                  title={row.description}
                                >
                                  <SelectValue placeholder="Select position..." />
                                </SelectTrigger>
                                
                                <SelectContent className="w-full">
                                  {mepTeamOptions.map((option) => (
                                    <SelectItem key={option.name} value={option.name} className="p-0 px-4">
                                      <div className="flex items-center min-w-[300px] group">
                                        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1.5">
                                          {option.name}
                                        </div>

                                        <button
                                          type="button"
                                          onPointerUp={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log("Deleting:", option);
                                            handleRemoveOption("mep", "role", option.id)
                                          }}
                                          className="ml-auto flex-shrink-0 p-2 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__custom__" className="text-primary font-medium">
                                    + Custom Entry
                                  </SelectItem>
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
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      setEditingId(null); // SNAP BACK TO DROPDOWN
                                    }
                                  }}
                                  onBlur={() => setEditingId(null)} // SNAP BACK IF CLICKED OUTSIDE
                                  placeholder="Enter custom position..."
                                  className="flex-1 border-0 bg-transparent focus-visible:ring-1 rounded px-2 py-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    setMepTeam(
                                      mepTeam.map((r) =>
                                        r.id === row.id
                                          ? { ...r, description: mepTeamOptions[0].name || "" }
                                          : r
                                      )
                                    )
                                  }
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          })() : (
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
                           <Trash2 className="w-4 h-4" />
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
      </div>
    </div>
  );
};

export default ManagementTeamGroup;