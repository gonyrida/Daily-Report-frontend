import { useState, useMemo, useEffect } from "react";
import { BarChart2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PercentageCell from "@/components/ui/PercentageCell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgressRow } from "@/types/progress.types";
import { CAMBODIA_PROVINCES } from "@/constants/cambodiaProvinces";
import { toRoman } from "@/lib/numberUtils";

interface OverallProgressTableProps {
  rows?: ProgressRow[];
  setRows?: (rows: ProgressRow[]) => void;
  updateRows?: (newRows: ProgressRow[]) => void;
  addTitleRow?: () => void;
  addDetailRow?: () => void;
  descriptionsReadOnly?: boolean;
}

export default function OverallProgressTable({
  rows = [],
  setRows = () => { },
  updateRows = () => { },
  addTitleRow = () => { },
  addDetailRow = () => { },
  descriptionsReadOnly = false
}: OverallProgressTableProps) {
  const [localRows, setLocalRows] = useState<ProgressRow[]>(rows || []);

  // Sync local state with props when they change, but don't overwrite local changes
  useEffect(() => {
    // Only sync if the props rows are different and we don't have local changes
    if (rows && rows.length > 0) {
      // Check if we have any local rows that aren't in the props
      const hasLocalChanges = localRows.some(localRow =>
        !rows.some(propRow => propRow.id === localRow.id)
      );

      if (!hasLocalChanges) {
        setLocalRows(rows);
      }
    } else if (!rows || rows.length === 0) {
      // Only clear if props are empty and we don't have local rows
      if (localRows.length === 0) {
        setLocalRows([]);
      }
    }
  }, [rows]);

  // 🔥 Correct numbering logic
  const formattedRows = useMemo(() => {
    let titleCount = 0;

    // Filter out alpha level rows (single letters like A, B, C)
    // but keep single-character Roman numerals (I, V)
    const filteredRows = localRows.filter(row => {
      if (!row.sourceId) return true;
      const trimmed = row.sourceId.trim();
      // Skip single alphabetic characters that are NOT Roman numerals I or V
      const isSingleAlpha = /^[a-zA-Z]$/i.test(trimmed);
      const isRomanNumeralIorV = /^(I|V)$/i.test(trimmed);
      const shouldKeep = !(isSingleAlpha && !isRomanNumeralIorV);
      if (!shouldKeep) {
      }
      return shouldKeep;
    });

    const result = filteredRows.map((row, index) => {
      // Debug: log each row to see what's happening

      if (row.rowType === "title") {
        titleCount++;
        return {
          ...row,
          displayIndex: `${toRoman(titleCount)}.`,
        };
      }

      if (row.rowType === "detail") {
        // Count detail rows up to this point
        let detailCount = 0;
        for (let i = 0; i <= index; i++) {
          if (localRows[i].rowType === "detail") {
            detailCount++;
          }
        }
        return {
          ...row,
          displayIndex: `${detailCount}.`,
        };
      }

      if (row.rowType === "subDetail") {
        // Find the parent detail number for this sub-detail
        let parentDetailNumber = 0;
        for (let i = index; i >= 0; i--) {
          if (localRows[i].rowType === "detail") {
            // Count detail rows up to that point to get the parent number
            let detailCount = 0;
            for (let j = 0; j <= i; j++) {
              if (localRows[j].rowType === "detail") {
                detailCount++;
              }
            }
            parentDetailNumber = detailCount;
            break;
          }
        }

        // Count sub-details under the same parent
        let subDetailCount = 0;
        for (let i = 0; i <= index; i++) {
          if (localRows[i].rowType === "detail") {
            // Check if this is the parent detail
            let detailCount = 0;
            for (let j = 0; j <= i; j++) {
              if (localRows[j].rowType === "detail") {
                detailCount++;
              }
            }
            if (detailCount === parentDetailNumber) {
              subDetailCount = 0; // Reset for this parent
            }
          } else if (localRows[i].rowType === "subDetail") {
            // Count sub-details under the same parent
            let currentParentDetail = 0;
            for (let k = i; k >= 0; k--) {
              if (localRows[k].rowType === "detail") {
                let detailCount = 0;
                for (let j = 0; j <= k; j++) {
                  if (localRows[j].rowType === "detail") {
                    detailCount++;
                  }
                }
                currentParentDetail = detailCount;
                break;
              }
            }
            if (currentParentDetail === parentDetailNumber) {
              subDetailCount++;
            }
          }
        }

        return {
          ...row,
          displayIndex: `${parentDetailNumber}.${subDetailCount}`,
        };
      }

      return row;
    });

    return result;
  }, [localRows]);

  const localUpdateRows = (newRows: ProgressRow[]) => {
    setLocalRows(newRows);
    setRows?.(newRows);
  };

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
    const newRows = localRows.map((row) => {
      if (row.id === id) {
        let updatedRow = { ...row };

        if (field === "description" && value === "__custom__") {
          return { ...row, description: "", isCustomInput: true };
        }
        if (field === "scopeOfWorks" && value === "__custom_unit__") {
          return { ...row, scopeOfWorks: "__custom_unit_input__" };
        }
        if (field === "isCustomInput" && value === false) {
          return {
            ...row,
            isCustomInput: false,
            description: CAMBODIA_PROVINCES[0] || "",
          };
        }

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

    setLocalRows(newRows);
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
    };

    setLocalRows((prev) => [...prev, newRow]);
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
    };

    setLocalRows((prev) => [...prev, newRow]);
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
    };

    const newRows = [...localRows, newRow];
    setLocalRows(newRows);
    setRows?.(newRows);
    updateRows?.(newRows);
  };

  const removeRow = (id: string) => {
    const newRows = localRows.filter((row) => row.id !== id);
    setLocalRows(newRows);
    setRows?.(newRows);
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
              </tr>
            </thead>
            <tbody>
              {formattedRows.map((row) => (
                <tr key={row.id} className={`border-b ${row.rowType === "title" ? "bg-slate-200 dark:bg-slate-800/50" : row.rowType === "subDetail" ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-muted/30"}`}>
                  <td className={`px-4 py-2 text-sm ${row.rowType === "title" ? "font-semibold text-muted-foreground" : "text-muted-foreground"}`}>
                    {row.sourceId || row.displayIndex || ""}
                  </td>

                  {/* Description */}
                  <td className="px-3 py-2">
                    {descriptionsReadOnly ? (
                      <span className={`text-sm px-2 ${row.rowType === 'title' ? 'font-semibold' : ''}`}>
                        {row.description || <span className="text-muted-foreground italic">—</span>}
                      </span>
                    ) : (
                      <>
                        {row.isCustomInput ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={row.description}
                              onChange={(e) =>
                                customUpdateRow(row.id, "description", e.target.value)
                              }
                              placeholder="Enter custom..."
                              className={`border-0 bg-transparent focus-visible:ring-1 ${row.rowType === "title" ? "font-semibold" : ""}`}
                            />
                            <Button
                              onClick={() => customUpdateRow(row.id, "description", "")}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              variant="ghost"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={row.description}
                            onValueChange={(value) =>
                              customUpdateRow(row.id, "description", value)
                            }
                          >
                            <SelectTrigger className={`border-0 bg-transparent focus:ring-1 ${row.rowType === "title" ? "font-semibold" : ""}`}>
                              <SelectValue placeholder="Select description" />
                            </SelectTrigger>
                            <SelectContent>
                              {CAMBODIA_PROVINCES.map((province) => (
                                <SelectItem key={province} value={province}>
                                  {province}
                                </SelectItem>
                              ))}
                              <SelectItem value="__custom__">+ Custom Input</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </>
                    )}
                  </td>

                  {/* % Up to Previous Week */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctUpToPrevWeek}
                      onChange={(value) => customUpdateRow(row.id, "pctUpToPrevWeek", value)}
                      readOnly={descriptionsReadOnly}
                    />
                  </td>

                  {/* % This Week */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctThisWeek}
                      onChange={(value) => customUpdateRow(row.id, "pctThisWeek", value)}
                      readOnly={descriptionsReadOnly}
                    />
                  </td>

                  {/* % Up to This Week */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctUpToThisWeek}
                      onChange={(value) => customUpdateRow(row.id, "pctUpToThisWeek", value)}
                      readOnly={descriptionsReadOnly}
                    />
                  </td>

                  {/* Remaining */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctRemaining}
                      onChange={(value) => customUpdateRow(row.id, "pctRemaining", value)}
                      readOnly={descriptionsReadOnly}
                    />
                  </td>

                  {/* % Next Week Plan */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctNextWeekPlan}
                      onChange={(value) => customUpdateRow(row.id, "pctNextWeekPlan", value)}
                      readOnly={descriptionsReadOnly}
                    />
                  </td>

                  {/* % Up Next Week Plan */}
                  <td className="px-3 py-2 text-center">
                    <PercentageCell
                      value={row.pctUpNextWeekPlan}
                      onChange={(value) => customUpdateRow(row.id, "pctUpNextWeekPlan", value)}
                      readOnly={descriptionsReadOnly}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-2">
                    {!descriptionsReadOnly && (
                      <Button
                        onClick={() => removeRow(row.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Buttons */}
      <div className="flex gap-2">
        {!descriptionsReadOnly && (
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
        )}
      </div>
    </div>
  );
}
