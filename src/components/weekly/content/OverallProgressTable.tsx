import { useState, useMemo, useEffect, useRef } from "react";
import { BarChart2, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import PercentageCell from "@/components/ui/PercentageCell";
import { ProgressRow } from "@/types/progress.types";
import { toRoman } from "@/lib/numberUtils";

interface OverallProgressTableProps {
  rows?: ProgressRow[];
  setRows?: (
    rows: ProgressRow[] | ((prev: ProgressRow[]) => ProgressRow[])
  ) => void;
  updateRows?: (newRows: ProgressRow[]) => void;
  addTitleRow?: () => void;
  addDetailRow?: () => void;
  descriptionsReadOnly?: boolean;
  remark?: string;
  setRemark?: (remark: string) => void;
  mode?: 'single' | 'master'; // NEW: Master mode support
}

export default function OverallProgressTable({
  rows,
  setRows,
  updateRows,
  addTitleRow,
  addDetailRow,
  descriptionsReadOnly = false,
  remark = "",
  setRemark,
  mode = 'single',
}: OverallProgressTableProps) {
  const isMasterMode = mode === 'master';
  const displayRows = rows || [];
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);


  // ---------- numbering ----------
  //
  // Rules:
  //   title     → I, II, III, … (resets detail + subDetail counters)
  //   detail    → 1, 2, 3, …    (resets subDetail counter)
  //   subDetail → <parentDetail>.<subIndex>
  //
  // Single pass, left-to-right. Order of the array IS the order of the output.
  // No lookups into the original unfiltered array, no index arithmetic — each
  // row's displayIndex comes purely from the running counters at that position.
  // Drag-and-drop just reorders the array; this function renumbers from scratch
  // every render.
  const formattedRows = useMemo(() => {
    // Step 1: filter out alpha-only source ids that aren't Roman I/V.
    // (Kept from the previous implementation — these are headers like "A", "B"
    // that we don't want in Overall Progress.)
    const filtered = displayRows.filter((row) => {
      if (!row.sourceId) return true;
      const trimmed = row.sourceId.trim();
      const isSingleAlpha = /^[a-zA-Z]$/i.test(trimmed);
      const isRomanIorV = /^(I|V)$/i.test(trimmed);
      return !(isSingleAlpha && !isRomanIorV);
    });

    // Step 2: single pass with running counters.
    let titleCount = 0;
    let detailCount = 0;
    let subDetailCount = 0;

    return filtered.map((row) => {
      if (row.rowType === "title") {
        titleCount += 1;
        // New title resets BOTH child counters — the rules call for this.
        detailCount = 0;
        subDetailCount = 0;
        return { ...row, displayIndex: `${toRoman(titleCount)}.` };
      }

      if (row.rowType === "detail") {
        detailCount += 1;
        // New detail resets subDetail — sub-items belong to their nearest detail.
        subDetailCount = 0;
        return { ...row, displayIndex: `${detailCount}.` };
      }

      if (row.rowType === "subDetail") {
        subDetailCount += 1;
        // If a subDetail appears before any detail (edge case — user dragged
        // one above everything), show it as "0.1", "0.2", … Clear signal that
        // it needs a parent.
        const parent = detailCount > 0 ? detailCount : 0;
        return { ...row, displayIndex: `${parent}.${subDetailCount}` };
      }

      // Unknown rowType — leave untouched.
      return { ...row, displayIndex: row.displayIndex ?? "" };
    });
  }, [displayRows]);


  // Custom formatter for percentage display
  const formatPercentageDisplay = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === "") return "";
    const numValue = typeof value === "string" ? parseFloat(value.replace("%", "")) : value;
    if (isNaN(numValue)) return "";
    return `${numValue.toFixed(1)}%`;
  };

  const customUpdateRow = (
    id: string,
    field: keyof ProgressRow,
    value: string | number | boolean
  ) => {
    const newRows = displayRows.map((row) => {
      if (row.id === id) {
        let updatedRow = { ...row };

        
        // Handle percentage formatting for percentage columns
        const percentageFields = ["pctUpToPrevWeek", "pctThisWeek", "pctNextWeekPlan", "pctUpNextWeekPlan"];
        let processedValue = value;

        if (percentageFields.includes(field) && typeof value === "string") {
          const numericValue = parseFloat(value);
          if (!isNaN(numericValue)) {
            processedValue = numericValue;
          } else {
            processedValue = 0; // Default to 0 for invalid numbers
          }
        }

        // Update the field
        updatedRow = { ...updatedRow, [field]: processedValue };

        // Calculate % Up to This Week when % Up to Previous Week or % This Week changes
        if (field === "pctUpToPrevWeek" || field === "pctThisWeek") {
          const upToPrevWeek = typeof updatedRow.pctUpToPrevWeek === "number" ? updatedRow.pctUpToPrevWeek : Number(updatedRow.pctUpToPrevWeek) || 0;
          const thisWeek = typeof updatedRow.pctThisWeek === "number" ? updatedRow.pctThisWeek : Number(updatedRow.pctThisWeek) || 0;
          updatedRow.pctUpToThisWeek = upToPrevWeek + thisWeek;
          // Calculate Remaining as 100% - up to this week %
          const upToThisWeek = updatedRow.pctUpToThisWeek;
          updatedRow.pctRemaining = Math.max(0, 100 - upToThisWeek);
          // Also calculate % Up Next Week Plan when % Up to This Week changes
          const nextWeekPlan = typeof updatedRow.pctNextWeekPlan === "number" ? updatedRow.pctNextWeekPlan : Number(updatedRow.pctNextWeekPlan) || 0;
          updatedRow.pctUpNextWeekPlan = upToThisWeek + nextWeekPlan;
        }

        // Recalculate Remaining when pctUpToThisWeek field changes directly
        if (field === "pctUpToThisWeek") {
          const upToThisWeek = typeof updatedRow.pctUpToThisWeek === "number" ? updatedRow.pctUpToThisWeek : Number(updatedRow.pctUpToThisWeek) || 0;
          updatedRow.pctRemaining = Math.max(0, 100 - upToThisWeek);
        }

        // Calculate % Up to next week plan when % up to this week or % next week plan changes
        if (field === "pctUpToThisWeek" || field === "pctNextWeekPlan") {
          const upToThisWeek = typeof updatedRow.pctUpToThisWeek === "number" ? updatedRow.pctUpToThisWeek : Number(updatedRow.pctUpToThisWeek) || 0;
          const nextWeekPlan = typeof updatedRow.pctNextWeekPlan === "number" ? updatedRow.pctNextWeekPlan : Number(updatedRow.pctNextWeekPlan) || 0;
          updatedRow.pctUpNextWeekPlan = upToThisWeek + nextWeekPlan;
        }

        return updatedRow;
      }
      return row;
    });

    setRows?.(newRows);
  };

  const localAddTitleRow = () => {
    const newRow: ProgressRow = {
      id: crypto.randomUUID(),
      description: "",
      scopeOfWorks: "",
      pctUpToPrevWeek: 0,
      pctThisWeek: 0,
      pctUpToThisWeek: 0,
      pctRemaining: 0,
      pctNextWeekPlan: 0,
      pctUpNextWeekPlan: 0,
      rowType: "title",
      searchTerm: "",
      isCustomInput: false,
      isNewlyAdded: true,
    };

    setRows?.((prev) => [...(prev || []), newRow]);
    addTitleRow?.();
  };

  const localAddDetailRow = () => {
    const newRow: ProgressRow = {
      id: crypto.randomUUID(),
      description: "",
      scopeOfWorks: "",
      pctUpToPrevWeek: 0,
      pctThisWeek: 0,
      pctUpToThisWeek: 0,
      pctRemaining: 0,
      pctNextWeekPlan: 0,
      pctUpNextWeekPlan: 0,
      rowType: "detail",
      searchTerm: "",
      isCustomInput: false,
      isNewlyAdded: true,
    };

    setRows?.((prev) => [...(prev || []), newRow]);
    addDetailRow?.();
  };

  const localAddSubDetailRow = () => {
    const newRow: ProgressRow = {
      id: crypto.randomUUID(),
      description: "",
      scopeOfWorks: "",
      pctUpToPrevWeek: 0,
      pctThisWeek: 0,
      pctUpToThisWeek: 0,
      pctRemaining: 0,
      pctNextWeekPlan: 0,
      pctUpNextWeekPlan: 0,
      rowType: "subDetail",
      searchTerm: "",
      isCustomInput: false,
      isNewlyAdded: true,
    };

    const newRows = [...(displayRows || []), newRow];
    setRows?.(newRows);
    updateRows?.(newRows);
  };

  const removeRow = (id: string) => {
    setRows?.(prevRows => {
      // Soft delete: mark row as deleted instead of removing it
      const newRows = prevRows.map((row) => 
        row.id === id ? { ...row, isDeleted: true } : row
      );
      return newRows;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", rowId);
  };

  const handleDragOver = (e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (rowId !== draggedRowId) {
      setDragOverRowId(rowId);
    }
  };

  const handleDragLeave = () => {
    setDragOverRowId(null);
  };

  const handleDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedRowId || draggedRowId === targetRowId) {
      handleDragEnd();
      return;
    }

    setRows?.((prevAll) => {
      // Split prev into visible + tombstones.
      const visible = prevAll.filter((r) => !r.isDeleted);
      const tombstones = prevAll.filter((r) => r.isDeleted);

      const draggedIndex = visible.findIndex((r) => r.id === draggedRowId);
      const targetIndex = visible.findIndex((r) => r.id === targetRowId);
      if (draggedIndex === -1 || targetIndex === -1) return prevAll;

      const reordered = [...visible];
      const [dragged] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, dragged);

      // Put tombstones back at the end — they're invisible, order doesn't matter.
      return [...reordered, ...tombstones];
    });

    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  const handleDragEnd = () => {
    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Overall Progress</h3>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground p-4 rounded-lg">
                <th className="text-left px-4 py-2.5 text-sm font-medium text-base w-[5%]">#</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-base w-[300px]">
                  Scope of work
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[12%]">
                  % Up to Previous Week
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[12%]">
                  % This Week
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[12%]">
                  % Up to This Week
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[12%]">
                 % Remaining
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[12%]">
                  % Next Week Plan
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[12%]">
                  % Up Next Week Plan
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[8%]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {formattedRows.map((row) => (
                <tr
                  key={row.id}
                  onDragOver={(e) => handleDragOver(e, row.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, row.id)}
                  className={`border-b transition-colors ${
                    row.rowType === "title"
                      ? "bg-slate-200 dark:bg-slate-800/50"
                      : row.rowType === "subDetail"
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-muted/30"
                  } ${dragOverRowId === row.id ? "border-t-2 border-t-primary" : ""} ${draggedRowId === row.id ? "opacity-50" : ""}`}
                >
                  <td className={`px-4 py-2 text-sm ${row.rowType === "title" ? "font-semibold text-muted-foreground" : "text-muted-foreground"}`}>
                    {row.displayIndex || ""}
                  </td>

                  {/* Description */}
                  <td className="px-3 py-2">
                    {descriptionsReadOnly || !row.isNewlyAdded ? (
                      <span className={`text-sm px-2 ${row.rowType === 'title' ? 'font-semibold' : ''}`}>
                        {row.description || <span className="text-muted-foreground italic">—</span>}
                      </span>
                    ) : (
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          customUpdateRow(row.id, "description", e.target.value)
                        }
                        placeholder="Enter scope of work..."
                        className={`border-0 bg-transparent focus-visible:ring-1 ${row.rowType === "title" ? "font-semibold" : ""}`}
                      />
                    )}
                  </td>

                  {/* % Up to Previous Week */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctUpToPrevWeek}
                      onChange={(value) => customUpdateRow(row.id, "pctUpToPrevWeek", value)}
                      readOnly={descriptionsReadOnly || row.isNewlyAdded === false}
                    />
                  </td>

                  {/* % This Week */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctThisWeek}
                      onChange={(value) => customUpdateRow(row.id, "pctThisWeek", value)}
                      readOnly={descriptionsReadOnly || row.isNewlyAdded === false}
                    />
                  </td>

                  {/* % Up to This Week */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctUpToThisWeek}
                      onChange={(value) => customUpdateRow(row.id, "pctUpToThisWeek", value)}
                      readOnly={descriptionsReadOnly || row.isNewlyAdded === false}
                      backgroundType="blue"
                    />
                  </td>

                  {/* Remaining */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctRemaining}
                      onChange={(value) => customUpdateRow(row.id, "pctRemaining", value)}
                      readOnly={descriptionsReadOnly || row.isNewlyAdded === false}
                      backgroundType="orange"
                    />
                  </td>

                  {/* % Next Week Plan */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctNextWeekPlan}
                      onChange={(value) => customUpdateRow(row.id, "pctNextWeekPlan", value)}
                      readOnly={descriptionsReadOnly || row.isNewlyAdded === false}
                    />
                  </td>

                  {/* % Up Next Week Plan */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctUpNextWeekPlan}
                      onChange={(value) => customUpdateRow(row.id, "pctUpNextWeekPlan", value)}
                      readOnly={true}
                      backgroundType="green"
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, row.id)}
                        onDragEnd={handleDragEnd}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <Button
                        onClick={() => removeRow(row.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={localAddTitleRow}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Title Row
        </Button>
        <Button
          onClick={localAddDetailRow}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Detail Row
        </Button>
        <Button
          onClick={localAddSubDetailRow}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Sub Detail
        </Button>
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Remarks
        </label>
        <Textarea
          placeholder="Enter any additional remarks or notes..."
          className="min-h-[100px] resize-y"
          value={remark}
          onChange={(e) => setRemark?.(e.target.value)}
        />
      </div>
    </div>
  );
}
