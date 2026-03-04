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
}

export default function OverallProgressTable({
  rows = [],
  setRows = () => {},
  updateRows = () => {},
  addTitleRow = () => {},
  addDetailRow = () => {}
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

    const result = localRows.map((row, index) => {
      // Debug: log each row to see what's happening
      console.log(`Processing row ${index}:`, row.rowType, row.displayIndex);
      
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

    console.log("Final formatted rows:", result);
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
        if (field === "unit" && value === "__custom_unit__") {
          return { ...row, unit: "__custom_unit_input__" };
        }
        if (field === "isCustomInput" && value === false) {
          return {
            ...row,
            isCustomInput: false,
            description: CAMBODIA_PROVINCES[0] || "",
          };
        }

        // Handle percentage formatting for percentage columns
        const percentageFields = ["unit", "prev", "today", "nextWeekPlan", "upNextWeekPlan"];
        let processedValue = value;
        
        if (percentageFields.includes(field) && typeof value === "string") {
          // Convert string input to number, but handle special cases
          if (value === "__custom_unit_input__") {
            processedValue = value; // Keep the special string value
          } else {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
              processedValue = numericValue;
            } else {
              processedValue = 0; // Default to 0 for invalid numbers
            }
          }
        }

        // Update the field
        updatedRow = { ...updatedRow, [field]: processedValue };

        // Calculate % Up to This Week when % Up to Previous Week or % This Week changes
        if (field === "unit" || field === "prev") {
          const upToPrevWeek = typeof updatedRow.unit === "number" ? updatedRow.unit : (typeof updatedRow.unit === "string" && updatedRow.unit !== "__custom_unit_input__" ? Number(updatedRow.unit) || 0 : 0);
          const thisWeek = typeof updatedRow.prev === "number" ? updatedRow.prev : Number(updatedRow.prev) || 0;
          updatedRow.today = upToPrevWeek + thisWeek;
          // Calculate Remaining as 100% - up to this week %
          const upToThisWeek = updatedRow.today;
          updatedRow.accumulated = Math.max(0, 100 - upToThisWeek);
        }

        // Recalculate Remaining when today field changes directly
        if (field === "today") {
          const upToThisWeek = typeof updatedRow.today === "number" ? updatedRow.today : Number(updatedRow.today) || 0;
          updatedRow.accumulated = Math.max(0, 100 - upToThisWeek);
        }

        // Calculate % Up to next week plan when % up to this week or % next week plan changes
        if (field === "today" || field === "nextWeekPlan") {
          const upToThisWeek = typeof updatedRow.today === "number" ? updatedRow.today : Number(updatedRow.today) || 0;
          const nextWeekPlan = typeof updatedRow.nextWeekPlan === "number" ? updatedRow.nextWeekPlan : Number(updatedRow.nextWeekPlan) || 0;
          updatedRow.upNextWeekPlan = upToThisWeek + nextWeekPlan;
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
      unit: 0,
      prev: 0,
      today: 0,
      accumulated: 0,
      rowType: "title",
      nextWeekPlan: 0,
      upNextWeekPlan: 0,
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
      unit: 0,
      prev: 0,
      today: 0,
      accumulated: 0,
      rowType: "detail",
      nextWeekPlan: 0,
      upNextWeekPlan: 0,
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
      unit: 0,
      prev: 0,
      today: 0,
      accumulated: 0,
      rowType: "subDetail",
      nextWeekPlan: 0,
      upNextWeekPlan: 0,
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
        <table className="w-full">
          <thead>
            <tr className="bg-primary text-primary-foreground p-4 rounded-lg">
              <th className="text-left px-4 py-2.5 text-sm font-medium text-base w-[5%]">#</th>
              <th className="text-left px-4 py-2.5 text-sm font-medium text-base w-[25%]">
                Scope of work
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                % Up to Previous Week
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                % This Week
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                % Up to This Week
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                Remaining
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                % Next Week Plan
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                % Up Next Week Plan
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[5%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {formattedRows.map((row) => (
              <tr key={row.id} className={`border-b ${row.rowType === "title" ? "bg-slate-200 dark:bg-slate-800/50" : row.rowType === "subDetail" ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-muted/30"}`}>
                <td className={`px-4 py-2 text-sm ${row.rowType === "title" ? "font-semibold text-muted-foreground" : "text-muted-foreground"}`}>
                  {row.displayIndex || ""}
                </td>
                
                {/* Description */}
                <td className="px-3 py-2">
                  {row.isCustomInput ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          customUpdateRow(row.id, "description", e.target.value)
                        }
                        placeholder="Enter custom..."
                        className={`border-0 bg-transparent focus-visible:ring-1 ${row.rowType === "title" ? "font-semibold" : ""}`}
                        showIndicator={false}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          customUpdateRow(row.id, "isCustomInput", false)
                        }
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
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
                        <SelectValue placeholder="Select province..." />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="max-h-60 overflow-y-auto">
                          <Input
                            placeholder="Search..."
                            value={row.searchTerm || ""}
                            onChange={(e) =>
                              customUpdateRow(
                                row.id,
                                "searchTerm",
                                e.target.value,
                              )
                            }
                            className="border-b mb-2"
                            showIndicator={false}
                          />
                          {CAMBODIA_PROVINCES.filter((province) =>
                            province
                              .toLowerCase()
                              .includes((row.searchTerm || "").toLowerCase())
                          ).map((province) => (
                            <SelectItem key={province} value={province}>
                              {province}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__">+ Add Custom</SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  )}
                </td>

                {/* % Up to Previous Week */}
                <PercentageCell
                  value={0}
                  onChange={(value) => customUpdateRow(row.id, "unit", value)}
                  placeholder="0"
                  showIndicator={false}
                  backgroundType="none"
                />

                {/* % This Week */}
                <PercentageCell
                  value={row.prev}
                  onChange={(value) => customUpdateRow(row.id, "prev", value)}
                  placeholder="0"
                  showIndicator={false}
                  backgroundType="none"
                />

                {/* % Up to This Week */}
                <PercentageCell
                  value={row.today}
                  placeholder="0"
                  readOnly
                  showIndicator={false}
                  backgroundType="blue"
                />

                {/* Remaining */}
                <PercentageCell
                  value={row.accumulated}
                  placeholder="0"
                  readOnly
                  showIndicator={false}
                  backgroundType="orange"
                />

                {/* % Next Week Plan */}
                <PercentageCell
                  value={row.nextWeekPlan}
                  onChange={(value) => customUpdateRow(row.id, "nextWeekPlan", value)}
                  placeholder="0"
                  showIndicator={false}
                  backgroundType="none"
                />

                {/* % Up Next Week Plan */}
                <PercentageCell
                  value={row.upNextWeekPlan}
                  placeholder="0"
                  readOnly
                  showIndicator={false}
                  backgroundType="green"
                />

                {/* Actions */}
                <td className="px-2 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
}
