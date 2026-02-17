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
  unit?: string;
  prev: number;
  today: number;
  accumulated: number;
  rowType?: "title" | "detail";
  nextWeekPlan?: number;
  upNextWeekPlan?: number;
  searchTerm?: string;
  isCustomInput?: boolean;
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
    value: string | number
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
    value: string | number
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
              return { ...row, unit: "__custom_unit_input__" };
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
        })
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
        (item, index) => dropdownOptions.indexOf(item) !== index
      );
      if (duplicates.length > 0) {
        console.warn("Duplicate dropdown options found!", duplicates);
      }
    }
  }, [rows, dropdownOptions]);

  return (
    <div className="section-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-table-border flex items-center justify-between">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Row
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-blue-100">
              {showAddButtons && (
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[8%]">
                  No
                </th>
              )}
              <th className="text-left px-4 py-2.5 text-sm font-medium text-base w-[25%]">
                {customHeaders.description || "Description"}
              </th>
              {showUnit && (
                <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[12%]">
                  {customHeaders.unit || "Unit"}
                </th>
              )}
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                {customHeaders.prev || "Prev"}
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                {customHeaders.today || "Today"}
              </th>
              <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                {customHeaders.accumulated || "Accum"}
              </th>
              {showExtraColumns && (
                <>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                    {customHeaders.nextWeekPlan || "% Next Week Plan"}
                  </th>
                  <th className="text-center px-4 py-2.5 text-sm font-medium text-base w-[10%]">
                    {customHeaders.upNextWeekPlan || "% Up Next Week Plan"}
                  </th>
                </>
              )}
              <th className="w-[5%]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr key="empty-row">
                <td
                  colSpan={
                    showAddButtons
                      ? showUnit
                        ? showExtraColumns
                          ? 9
                          : 7
                        : showExtraColumns
                        ? 8
                        : 6
                      : showUnit
                      ? showExtraColumns
                        ? 8
                        : 6
                      : showExtraColumns
                      ? 7
                      : 5
                  }
                  className="text-center py-8 text-muted-foreground"
                >
                  No entries yet. Click "Add Row" to begin.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const filteredOptions = dropdownOptions.filter((option) =>
                  option.toLowerCase().includes((row.searchTerm || "").toLowerCase())
                );

                return (
                  <tr
                    key={`${title}-${row.id}`}
                    className={`border-t border-table-border hover:bg-muted/30 transition-colors ${
                      row.rowType === "title" ? "bg-gray-100" : ""
                    }`}
                  >
                    {showAddButtons && (
                      <td className="px-3 py-2 text-center font-medium text-muted-foreground">
                        {row.rowType === "title"
                          ? toRoman(
                              rows.filter((r) => r.rowType === "title").indexOf(row) +
                                1
                            )
                          : rows.filter((r) => r.rowType !== "title").indexOf(row) + 1}
                      </td>
                    )}
                    {/* Description / Dropdown */}
                    <td className="px-3 py-2">
                      {useDropdown && dropdownOptions.length > 0 ? (
                        !row.isCustomInput ? (
                          <Select
                            value={row.description}
                            onValueChange={(value) =>
                              updateRow(row.id, "description", value)
                            }
                          >
                            <SelectTrigger className="border-0 bg-transparent focus:ring-1">
                              <SelectValue placeholder="Select..." />
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
                              className="border-0 bg-transparent focus-visible:ring-1"
                              autoFocus
                              showIndicator={false}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateRow(row.id, "isCustomInput", false)
                              }
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
                                : e.target.value
                            )
                          }
                          placeholder="Enter description..."
                          className={`border-0 bg-transparent focus-visible:ring-1 ${
                            row.rowType === "title" ? "font-bold text-foreground" : ""
                          }`}
                          showIndicator={false}
                        />
                      )}
                    </td>

                    {/* Unit */}
                    {showUnit && (
                      <td className="px-3 py-2">
                        {unitOptions.length > 0 ? (
                          row.unit !== "__custom_unit_input__" ? (
                            <Select
                              value={row.unit}
                              onValueChange={(value) =>
                                updateRow(row.id, "unit", value)
                              }
                            >
                              <SelectTrigger
                                className={`border-0 bg-transparent focus:ring-1 ${
                                  row.rowType === "title" ? "font-bold text-foreground" : ""
                                }`}
                              >
                                <SelectValue placeholder="Select unit..." />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((unit, index) => (
                                  <SelectItem
                                    key={`${title}-unit-${unit}-${index}`}
                                    value={unit}
                                  >
                                    {unit}
                                  </SelectItem>
                                ))}
                                <SelectItem key="custom-unit" value="__custom_unit__">
                                  <span className="text-primary">+ Custom Unit</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Input
                                value=""
                                onChange={(e) =>
                                  updateRow(row.id, "unit", e.target.value)
                                }
                                placeholder="Enter custom unit..."
                                className="border-0 bg-transparent focus-visible:ring-1"
                                autoFocus
                                showIndicator={false}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateRow(row.id, "unit", unitOptions[0] || "")
                                }
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )
                        ) : unitNumberOnly ? (
                          <Input
                            type="number"
                            value={row.unit || ""}
                            onChange={(e) =>
                              updateRow(row.id, "unit", Number(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1"
                            showIndicator={false}
                          />
                        ) : (
                          <Input
                            value={row.unit || ""}
                            onChange={(e) =>
                              updateRow(row.id, "unit", e.target.value)
                            }
                            placeholder="Unit"
                            className="border-0 bg-transparent text-center focus-visible:ring-1"
                            showIndicator={false}
                          />
                        )}
                      </td>
                    )}

                    {/* Prev */}
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={row.prev || ""}
                        onChange={(e) =>
                          updateRow(row.id, "prev", Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="border-0 bg-transparent text-center focus-visible:ring-1"
                        showIndicator={false}
                      />
                    </td>

                    {/* Today */}
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={row.today || ""}
                        onChange={(e) =>
                          updateRow(row.id, "today", Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="border-0 bg-transparent text-center focus-visible:ring-1"
                        showIndicator={false}
                      />
                    </td>

                    {/* Accumulated */}
                    <td className="px-3 py-2 text-center font-semibold text-primary">
                      {row.accumulated}
                    </td>

                    {/* Extra Columns */}
                    {showExtraColumns && (
                      <>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.nextWeekPlan || ""}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "nextWeekPlan",
                                Number(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1"
                            showIndicator={false}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.upNextWeekPlan || ""}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "upNextWeekPlan",
                                Number(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1"
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
      </div>
    </div>
  );
};

export default ResourceTable;
