import { Plus, Trash2, X, GripVertical } from "lucide-react";
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
  rowType?: "title" | "detail" | "subDetail";
  nextWeekPlan?: number;
  upNextWeekPlan?: number;
  searchTerm?: string;
  isCustomInput?: boolean;        // For description
  isCustomUnitInput?: boolean;    // For unit
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
    value: string | number,
  ) => void;
  unitNumberOnly?: boolean;
  enableDragDrop?: boolean;
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
  enableDragDrop = false,
}: ResourceTableProps) => {
  const [draggedRow, setDraggedRow] = useState<ResourceRow | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addRow = () => {
    const newRow: ResourceRow = {
      id: crypto.randomUUID(),
      description: "",
      unit: showUnit ? "Pack" : undefined,
      prev: 0,
      today: 0,
      accumulated: 0,
      nextWeekPlan: 0,
      upNextWeekPlan: 0,
      searchTerm: "",
      isCustomInput: false,
      isCustomUnitInput: false,
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, row: ResourceRow, index: number) => {
    setDraggedRow(row);
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedRow !== null && draggedIndex !== null && draggedIndex !== dropIndex) {
      const newRows = [...rows];
      newRows.splice(draggedIndex, 1);
      newRows.splice(dropIndex, 0, draggedRow);
      setRows(newRows);
    }
    setDraggedRow(null);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedRow(null);
    setDraggedIndex(null);
  };

  const updateRow = (
    id: string,
    field: keyof ResourceRow,
    value: string | number,
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
      <div>
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-muted dark:bg-muted">
              {enableDragDrop && (
                <th className="text-center px-2 py-2.5 text-base font-medium w-[6%]">
                  
                </th>
              )}
              {showAddButtons && (
                <th className="text-center px-4 py-2.5 text-base font-medium w-[8%]">
                  No
                </th>
              )}
              <th className="text-left px-4 py-2.5 text-base font-medium w-[35%]">
                {customHeaders.description || "Description"}
              </th>
              {showUnit && (
                <th className="text-center px-4 py-2.5 text-base font-medium w-[80px]">
                  {customHeaders.unit || "Unit"}
                </th>
              )}
              <th className="text-center py-2.5 text-base font-medium w-[80px]">
                {customHeaders.prev || "Prev"}
              </th>
              <th className="text-center py-2.5 text-base font-medium w-[80px]">
                {customHeaders.today || "Today"}
              </th>
              <th className="text-center py-2.5 text-base font-medium w-[80px]">
                {customHeaders.accumulated || "Accum"}
              </th>
              {showExtraColumns && (
                <>
                  <th className="text-center px-4 py-2.5 text-base font-medium w-[10%]">
                    {customHeaders.nextWeekPlan || "% Next Week Plan"}
                  </th>
                  <th className="text-center px-4 py-2.5 text-base font-medium w-[10%]">
                    {customHeaders.upNextWeekPlan || "% Up Next Week Plan"}
                  </th>
                </>
              )}
              <th className="w-[8%]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr key="empty-row">
                <td
                  colSpan={
                    (() => {
                      let colSpan = 5; // Base columns: Description, Prev, Today, Accum, Delete
                      if (enableDragDrop) colSpan += 1; // Drag handle column
                      if (showAddButtons) colSpan += 1; // No column
                      if (showUnit) colSpan += 1; // Unit column
                      if (showExtraColumns) colSpan += 2; // Extra columns
                      return colSpan;
                    })()
                  }
                  className="text-center py-8 text-muted-foreground"
                >
                  No entries yet. Click "Add Row" to begin.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const filteredOptions = dropdownOptions.filter((option) =>
                  option
                    .toLowerCase()
                    .includes((row.searchTerm || "").toLowerCase()),
                );

                return (
                  <tr
                    key={`${title}-${row.id}`}
                    draggable={enableDragDrop}
                    onDragStart={(e) => handleDragStart(e, row, rows.indexOf(row))}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rows.indexOf(row))}
                    onDragEnd={handleDragEnd}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${
                      row.rowType === "title" ? "bg-muted dark:bg-muted" : ""
                    } ${enableDragDrop ? "cursor-move" : ""}`}
                  >
                    {enableDragDrop && (
                      <td className="px-2 py-2 text-center">
                        <div className="flex justify-center">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                        </div>
                      </td>
                    )}
                    {showAddButtons && (
                      <td className="px-3 py-2 text-center font-medium text-muted-foreground">
                        {(() => {
                          let titleCount = 0;
                          let detailCount = 0;

                          for (let i = 0; i < rows.length; i++) {
                            if (rows[i].rowType === "title") {
                              titleCount++;
                              detailCount = 0;

                              if (rows[i].id === row.id) {
                                return toRoman(titleCount);
                              }
                            } else {
                              detailCount++;

                              if (rows[i].id === row.id) {
                                return detailCount;
                              }
                            }
                          }

                          return "";
                        })()}
                      </td>
                    )}
                    {/* Description / Dropdown */}
                    <td className="px-1 py-2 max-w-0 w-full overflow-hidden">
                      {useDropdown && dropdownOptions.length > 0 ? (() => {
                        const allOptions = row.description && !dropdownOptions.includes(row.description) 
                          ? [...dropdownOptions, row.description] 
                          : dropdownOptions;

                        return !row.isCustomInput ? (
                          <div className="w-full">
                            <Select
                              value={row.description}
                              onValueChange={(value) => {
                                if (value === "__custom__") {
                                  updateRow(row.id, "isCustomInput", "true");
                                } else {
                                  updateRow(row.id, "description", value);
                                }
                              }}
                            >
                              <SelectTrigger 
                                className="w-full border-0 bg-transparent focus:ring-1 focus:ring-primary rounded px-2 py-1 truncate whitespace-nowrap overflow-hidden text-ellipsis"
                                title={row.description} // Add title to trigger
                              >
                                <SelectValue placeholder="Select..." className="min-w-[200px]" />
                              </SelectTrigger>
                              <SelectContent className="w-[32%]">
                                <div className="p-2">
                                  <Input
                                    placeholder="Search..."
                                    value={row.searchTerm || ""}
                                    onChange={(e) =>
                                      updateRow(
                                        row.id,
                                        "searchTerm",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-full"
                                  />
                                </div>
                                {allOptions.filter(option => 
                                  option.toLowerCase().includes((row.searchTerm || "").toLowerCase())
                                ).map((option, index) => (
                                  <SelectItem
                                    key={`${title}-opt-${option}-${index}`}
                                    value={option}
                                    className="p-0 px-4"
                                  >
                                    <div 
                                      className="truncate whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1.5"
                                    >
                                      {option}
                                    </div>
                                  </SelectItem>
                                ))}
                                <SelectItem key="custom-entry" value="__custom__">
                                  <span className="text-primary">
                                    + Custom Entry
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateRow(row.id, "description", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateRow(row.id, "isCustomInput", "false");
                                }
                              }}
                              placeholder="Enter custom..."
                              className="flex-1 min-w-0 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 truncate"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateRow(row.id, "isCustomInput", "false")
                              }
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })() : (
                        <input
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
                          className={`w-full min-w-0 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 truncate whitespace-nowrap overflow-hidden text-ellipsis ${
                            row.rowType === "title"
                              ? "font-bold text-foreground"
                              : ""
                          }`}
                        />
                      )}
                    </td>

                    {/* Unit */}
                    {showUnit && (
                      <td className="px-1 py-2 ">
                        {unitOptions.length > 0 ? (() => {
                          const allUnitOptions = row.unit && row.unit !== "" && !unitOptions.includes(row.unit) 
                            ? [...unitOptions, row.unit] 
                            : unitOptions;
                            
                          return !row.isCustomUnitInput ? ( // Use the new flag
                            <Select
                              value={row.unit || ""}
                              onValueChange={(value) => {
                                if (value === "__custom_unit__") {
                                  updateRow(row.id, "isCustomUnitInput", "true");
                                } else {
                                  updateRow(row.id, "unit", value); // Direct string assignment
                                }
                              }}
                            >
                              <SelectTrigger
                                className={`w-full border-0 bg-transparent focus:ring-1 ${
                                  row.rowType === "title"
                                    ? "font-bold text-foreground"
                                    : ""
                                }`}
                              >
                                <SelectValue placeholder="Select unit..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allUnitOptions.map((unit, index) => (
                                  <SelectItem
                                    key={`${title}-unit-${unit}-${index}`}
                                    value={unit}
                                  >
                                    {unit}
                                  </SelectItem>
                                ))}
                                <SelectItem
                                  key="custom-unit"
                                  value="__custom_unit__"
                                >
                                  <span className="text-primary">
                                    + Custom Unit
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Input
                                value={row.unit || ""}
                                onChange={(e) =>
                                  updateRow(row.id, "unit", e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    // Save the custom value and exit custom input mode
                                    updateRow(row.id, "unit", (e.target as HTMLInputElement).value || "Pack");
                                    updateRow(row.id, "isCustomUnitInput", "false");
                                  }
                                }}
                                placeholder="Enter custom unit..."
                                className="border-0 bg-transparent focus-visible:ring-1 w-[90px]"
                                autoFocus
                                showIndicator={false}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateRow(row.id, "isCustomUnitInput", "false")
                                }
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )
                        })() : unitNumberOnly ? (
                          <Input
                            type="number"
                            value={row.unit || ""}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "unit",
                                Number(e.target.value) || 0,
                              )
                            }
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                            showIndicator={false}
                          />
                        ) : (
                          <Input
                            value={row.unit || ""}
                            onChange={(e) =>
                              updateRow(row.id, "unit", e.target.value)
                            }
                            placeholder="Unit"
                            className="border-0 bg-transparent text-center focus-visible:ring-1 w-full"
                            showIndicator={false}
                          />
                        )}
                      </td>
                    )}

                    {/* Prev */}
                    <td className="px-1 py-2 text-center">
                      <Input
                        type="number"
                        value={row.prev || ""}
                        onChange={(e) =>
                          updateRow(row.id, "prev", Number(e.target.value) || 0)
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="border-0 bg-transparent text-center focus-visible:ring-1 w-full [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                        showIndicator={false}
                      />
                    </td>

                    {/* Today */}
                    <td className="px-1 py-2 text-center">
                      <Input
                        type="number"
                        value={row.today || ""}
                        onChange={(e) =>
                          updateRow(
                            row.id,
                            "today",
                            Number(e.target.value) || 0,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="border-0 bg-transparent text-center focus-visible:ring-1 w-full [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                        showIndicator={false}
                      />
                    </td>

                    {/* Accumulated */}
                    <td className="px-1 py-2 text-center">
                      <Input
                        type="number"
                        showIndicator={false}
                        value={row.accumulated || ""}
                        disabled
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="border-0 bg-transparent text-center font-semibold text-primary focus-visible:ring-1 w-full [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed disabled:opacity-100"
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
                              updateRow(
                                row.id,
                                "nextWeekPlan",
                                Number(e.target.value) || 0,
                              )
                            }
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
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
                                Number(e.target.value) || 0,
                              )
                            }
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0"
                            className="border-0 bg-transparent text-center focus-visible:ring-1 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                            showIndicator={false}
                          />
                        </td>
                      </>
                    )}

                    {/* Delete button */}
                    <td className="py-2">
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