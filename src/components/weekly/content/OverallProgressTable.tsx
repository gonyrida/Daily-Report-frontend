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

  // Sync local state with props when they change
  useEffect(() => {
    setLocalRows(rows || []);
  }, [rows]);

  // 🔥 Correct numbering logic
  const formattedRows = useMemo(() => {
    let titleCount = 0;

    return localRows.map((row, index) => {
      if (row.rowType === "title") {
        titleCount++;
        return {
          ...row,
          displayIndex: `${toRoman(titleCount)}.`,
        };
      }

      if (row.rowType === "detail") {
        let detailCount = 0;

        for (let i = 0; i <= index; i++) {
          if (localRows[i].rowType === "title") {
            detailCount = 0; // reset when new title appears
          } else if (localRows[i].rowType === "detail") {
            detailCount++;
          }
        }

        return {
          ...row,
          displayIndex: `${detailCount}.`,
        };
      }

      return row;
    });
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
          // Convert string input to number
          const numericValue = parseFloat(value);
          if (!isNaN(numericValue)) {
            processedValue = numericValue;
          }
        }

        // Update the field
        updatedRow = { ...updatedRow, [field]: processedValue };

        // Calculate % Up to This Week when % Up to Previous Week or % This Week changes
        if (field === "unit" || field === "prev") {
          const upToPrevWeek = typeof updatedRow.unit === "number" ? updatedRow.unit : Number(updatedRow.unit) || 0;
          const thisWeek = typeof updatedRow.prev === "number" ? updatedRow.prev : Number(updatedRow.prev) || 0;
          updatedRow.today = upToPrevWeek + thisWeek;
          // Remove automatic accumulated calculation - let user input it manually
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
            <tr className="bg-muted/50">
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
              <tr key={row.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2 text-sm text-muted-foreground">
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
                        className="border-0 bg-transparent focus-visible:ring-1"
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
                      <SelectTrigger className="border-0 bg-transparent focus:ring-1">
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
                  onChange={(value) => customUpdateRow(row.id, "accumulated", value)}
                  placeholder="0"
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
                  onChange={(value) => customUpdateRow(row.id, "upNextWeekPlan", value)}
                  placeholder="0"
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
      </div>
    </div>
  );
}
