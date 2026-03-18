import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

const toRoman = (num: number): string => {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  let remaining = num;

  for (const { value, numeral } of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
};

export interface ResourceRow {
  id: string;
  description: string;
  unit?: string | number;
  prev: number;
  today: number;
  accumulated: number;
  rowType?: "title" | "detail" | "subDetail";
  nextWeekPlan?: number;
  upNextWeekPlan?: number;
  searchTerm?: string;
  isCustomInput?: boolean;
  isCustomUnit?: boolean;
}

interface ResourceTableProps {
  title: string;
  icon: React.ReactNode;
  rows: ResourceRow[];
  setRows: (rows: ResourceRow[]) => void;
  showUnit?: boolean;
  useDropdown?: boolean;
  dropdownOptions?: string[];
  unitOptions?: string[];
  /** Map of description → default unit. When user picks a description, unit auto-fills. */
  descriptionUnitMap?: Record<string, string>;
  inputNumberOnly?: boolean;
  showAddButtons?: boolean;
  addTitleRow?: () => void;
  addDetailRow?: () => void;
  showExtraColumns?: boolean;
  customHeaders?: {
    description?: string;
    unit?: string;
    prev?: string;
    today?: string;
    accumulated?: string;
    nextWeekPlan?: string;
    upNextWeekPlan?: string;
  };
  customUpdateRow?: (
    id: string,
    field: keyof ResourceRow,
    value: string | number | boolean,
  ) => void;
  unitNumberOnly?: boolean;
}

const ResourceTable = ({
  title,
  icon,
  rows,
  setRows,
  showUnit = false,
  useDropdown = false,
  dropdownOptions = [],
  unitOptions = [],
  descriptionUnitMap = {},
  inputNumberOnly = false,
  showAddButtons = false,
  addTitleRow,
  addDetailRow,
  showExtraColumns = false,
  customHeaders = {},
  customUpdateRow,
  unitNumberOnly = false,
}: ResourceTableProps) => {
  const addRow = () => {
    const newRow: ResourceRow = {
      id: crypto.randomUUID(),
      description: "",
      unit: showUnit ? "" : undefined,
      prev: 0,
      today: 0,
      accumulated: 0,
      nextWeekPlan: 0,
      upNextWeekPlan: 0,
      searchTerm: "",
      isCustomInput: false,
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const updateRow = (
    id: string,
    field: keyof ResourceRow,
    value: string | number | boolean,
  ) => {
    if (customUpdateRow) {
      customUpdateRow(id, field, value);
    } else {
      setRows(
        rows.map((row) => {
          if (row.id === id) {
            if (field === "description" && value === "__custom__") {
              return { ...row, description: "", isCustomInput: true };
            }
            if (field === "unit" && value === "__custom_unit__") {
              return { ...row, unit: "", isCustomUnit: true };
            }
            if (field === "isCustomUnit" && value === false) {
              return { ...row, isCustomUnit: false, unit: unitOptions[0] || "" };
            }

            const updatedRow = { ...row, [field]: value };

            // ── AUTO-FILL UNIT when a description is selected from dropdown ──
            if (
              field === "description" &&
              typeof value === "string" &&
              value !== "__custom__" &&
              showUnit &&
              descriptionUnitMap[value]
            ) {
              updatedRow.unit = descriptionUnitMap[value];
              updatedRow.isCustomUnit = false;
            }

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

  useEffect(() => {
    const ids = rows.map((r) => r.id);
    if (new Set(ids).size !== ids.length) {
      console.error(`Duplicate IDs found in ${title} table:`, ids);
    }

    if (dropdownOptions.length > 0) {
      const duplicates = dropdownOptions.filter(
        (item, index) => dropdownOptions.indexOf(item) !== index,
      );
      if (duplicates.length > 0) {
        console.warn("Duplicate dropdown options found!", duplicates);
      }
    }
  }, [rows, dropdownOptions]);

  return (
    <div className="section-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-card dark:bg-card px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {showAddButtons ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={addTitleRow}
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Title
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addDetailRow}
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Rows
            </Button>
          </div>
        ) : (
          <div></div> // Add div as a placeholder
          // Comment out this button for now
          // <Button
          //   variant="ghost"
          //   size="sm"
          //   onClick={addRow}
          //   className="text-primary hover:text-primary hover:bg-primary/10"
          // >
          //   <Plus className="w-4 h-4 mr-1" />
          //   Add Row
          // </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted dark:bg-muted">
              {showAddButtons && (
                <th className="text-center px-4 py-2.5 text-sm font-medium w-16">No</th>
              )}
              <th className="text-left px-4 py-2.5 text-sm font-medium min-w-[200px]">
                {customHeaders.description || "Description"}
              </th>
              {showUnit && (
                <th className="text-center px-4 py-2.5 text-sm font-medium whitespace-nowrap w-24">
                  {customHeaders.unit || "Unit"}
                </th>
              )}
              <th className="text-center px-4 py-2.5 text-sm font-medium w-28 min-w-[110px]">
                {customHeaders.prev || "Prev"}
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium w-28 min-w-[110px]">
                {customHeaders.today || "Today"}
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium w-28 min-w-[110px]">
                {customHeaders.accumulated || "Accum"}
              </th>
              {showExtraColumns && (
                <>
                  <th className="text-center px-4 py-2.5 text-sm font-medium w-32">Next Plan</th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium w-32">Up Next</th>
                </>
              )}
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr key="empty-row">
                <td
                  colSpan={
                    showAddButtons
                      ? showUnit
                        ? showExtraColumns ? 9 : 7
                        : showExtraColumns ? 8 : 6
                      : showUnit
                        ? showExtraColumns ? 8 : 6
                        : showExtraColumns ? 7 : 5
                  }
                  className="text-center py-8 text-muted-foreground"
                >
                  No entries yet. Click "Add Row" to begin.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const filteredOptions = dropdownOptions.filter((option) =>
                  option.toLowerCase().includes((row.searchTerm || "").toLowerCase()),
                );

                return (
                  <tr
                    key={`${title}-${row.id}`}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      row.rowType === "title" ? "bg-muted dark:bg-muted" : ""
                    }`}
                  >
                    {showAddButtons && (
                      <td className="px-3 py-2 text-center font-medium text-muted-foreground">
                        {(() => {
                          let titleCount = 0;
                          let detailCount = 0;
                          for (let i = 0; i < rows.length; i++) {
                            if (rows[i].rowType === "title") {
                              titleCount++;
                              detailCount = 0;
                              if (rows[i].id === row.id) return toRoman(titleCount);
                            } else {
                              detailCount++;
                              if (rows[i].id === row.id) return detailCount;
                            }
                          }
                          return "";
                        })()}
                      </td>
                    )}
                    {/* Description / Dropdown */}
                    <td className="px-3 py-2">
                      {useDropdown && dropdownOptions.length > 0 ? (
                        !row.isCustomInput && (dropdownOptions.includes(row.description) || row.description === "") ? (
                          <Select
                            value={row.description}
                            onValueChange={(value) =>
                              updateRow(row.id, "description", value)
                            }
                            onOpenChange={(open) => {
                              if (!open) {
                                // Clear search when dropdown closes
                                updateRow(row.id, "searchTerm", "");
                              }
                            }}
                          >
                            <SelectTrigger className="border-0 bg-transparent focus:ring-1">
                              <SelectValue placeholder="Select Items..." />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Search..."
                                  value={row.searchTerm || ""}
                                  onChange={(e) =>
                                    updateRow(row.id, "searchTerm", e.target.value)
                                  }
                                  className="h-8"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    // Prevent Select keyboard handling when typing in search
                                    e.stopPropagation();
                                  }}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                  }}
                                />
                              </div>
                              {filteredOptions.map((option, index) => (
                                <SelectItem
                                  key={`${title}-opt-${option}-${index}`}
                                  value={option}
                                >
                                  {option}
                                </SelectItem>
                              ))}
                              <SelectItem key="custom-entry" value="__custom__">
                                <span className="text-primary">+ Custom Entry</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Input
                              value={row.description}
                              onChange={(e) =>
                                updateRow(row.id, "description", e.target.value)
                              }
                              placeholder="Enter custom..."
                              className="border-0 bg-transparent focus-visible:ring-1 w-full"
                              autoFocus
                              showIndicator={false}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (customUpdateRow) {
                                  customUpdateRow(row.id, "description", "");
                                  customUpdateRow(row.id, "isCustomInput", false);
                                } else {
                                  setRows(rows.map(r => 
                                    r.id === row.id 
                                      ? { ...r, description: "", isCustomInput: false }
                                      : r
                                  ));
                                }
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )
                      ) : (
                        <Input
                          value={row.description}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "description",
                              row.rowType === "title"
                                ? e.target.value.toUpperCase()
                                : e.target.value,
                            )
                          }
                          placeholder="Enter description..."
                          className={`border-0 bg-transparent focus-visible:ring-1 w-full ${
                            row.rowType === "title" ? "font-bold text-foreground" : ""
                          }`}
                          showIndicator={false}
                        />
                      )}
                    </td>

                    {/* Unit — shows auto-filled value, still editable */}
                    {showUnit && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        {unitOptions.length > 0 ? (
                          !row.isCustomUnit ? (
                            <Select
                              value={String(row.unit || "")}
                              onValueChange={(value) => updateRow(row.id, "unit", value)}
                            >
                              <SelectTrigger className="border-0 bg-transparent focus:ring-1 min-w-[80px] w-full">
                                <SelectValue placeholder="Unit..." />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((unit, index) => (
                                  <SelectItem key={index} value={unit}>{unit}</SelectItem>
                                ))}
                                <SelectItem value="__custom_unit__">
                                  <span className="text-primary">+ Custom Unit</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-1 min-w-[100px]">
                              <Input
                                value={row.unit || ""}
                                onChange={(e) => updateRow(row.id, "unit", e.target.value)}
                                placeholder="Unit..."
                                className="border-0 bg-transparent w-auto max-w-full px-1 py-0"
                                autoFocus
                                showIndicator={false}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateRow(row.id, "isCustomUnit", false)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )
                        ) : (
                          <Input
                            type={unitNumberOnly ? "number" : "text"}
                            value={row.unit || ""}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "unit",
                                unitNumberOnly ? Number(e.target.value) || 0 : e.target.value,
                              )
                            }
                            placeholder="Unit"
                            className="border-0 bg-transparent text-center w-auto max-w-full px-1 py-0"
                          />
                        )}
                      </td>
                    )}

                    {/* Prev */}
                    <td className="px-3 py-2 w-28">
                      <Input
                        type="number"
                        value={row.prev || ""}
                        onChange={(e) =>
                          updateRow(row.id, "prev", Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="border-0 bg-transparent text-center focus-visible:ring-1 w-full"
                        showIndicator={false}
                      />
                    </td>

                    {/* Today */}
                    <td className="px-3 py-2 w-28">
                      <Input
                        type="number"
                        value={row.today || ""}
                        onChange={(e) =>
                          updateRow(row.id, "today", Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="border-0 bg-transparent text-center focus-visible:ring-1 w-full"
                        showIndicator={false}
                      />
                    </td>

                    {/* Accumulated */}
                    <td className="px-3 py-2 w-28">
                      <Input
                        type="number"
                        showIndicator={false}
                        value={row.accumulated || ""}
                        onChange={(e) =>
                          updateRow(row.id, "accumulated", Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="border-0 bg-transparent text-center font-semibold text-primary focus-visible:ring-1 w-full"
                      />
                    </td>

                    {/* Extra Columns */}
                    {showExtraColumns && (
                      <>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.nextWeekPlan || ""}
                            onChange={(e) =>
                              updateRow(row.id, "nextWeekPlan", Number(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1 w-full"
                            showIndicator={false}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.upNextWeekPlan || ""}
                            onChange={(e) =>
                              updateRow(row.id, "upNextWeekPlan", Number(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1 w-full"
                            showIndicator={false}
                          />
                        </td>
                      </>
                    )}

                    {/* Delete button */}
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
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex justify-end py-3 px-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Row
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResourceTable;