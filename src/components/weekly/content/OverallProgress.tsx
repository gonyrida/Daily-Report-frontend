import ResourceTable, { ResourceRow } from "@/components/ResourceTable";
import { useState } from "react";
import { BarChart2 } from "lucide-react";

interface ProgressRow extends ResourceRow {
  extra?: string;
}


const cambodiaProvinces = [
  "Banteay Meanchey",
  "Battambang",
  "Kampong Cham",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Kampot",
  "Kandal",
  "Kep",
  "Koh Kong",
  "Kratie",
  "Mondulkiri",
  "Oddar Meanchey",
  "Pailin",
  "Phnom Penh",
  "Preah Sihanouk",
  "Preah Vihear",
  "Prey Veng",
  "Pursat",
  "Ratanakiri",
  "Siem Reap",
  "Stung Treng",
  "Svay Rieng",
  "Takeo",
  "Tboung Khmum",
];


const initialRows: ProgressRow[] = [
  {
    id: crypto.randomUUID(),
    description: "Task A",
    unit: "hrs",
    prev: 5,
    today: 3,
    accumulated: 8,
    extra: "Note 1",
    rowType: "title",
    nextWeekPlan: 0,
    upNextWeekPlan: 0,
    searchTerm: "",
    isCustomInput: false,
  },
  {
    id: crypto.randomUUID(),
    description: "Task B",
    unit: "hrs",
    prev: 2,
    today: 4,
    accumulated: 6,
    extra: "Note 2",
    rowType: "detail",
    nextWeekPlan: 0,
    upNextWeekPlan: 0,
    searchTerm: "",
    isCustomInput: false,
  },
];

export default function OverallProgress() {
  const [rows, setRows] = useState<ProgressRow[]>(initialRows);

  // Handler for updating rows including extra column
  const updateRows = (newRows: ProgressRow[]) => {
    setRows(newRows);
  };

  // Custom update handler that handles special cases and overrides automatic calculation for accumulated field
  const customUpdateRow = (
    id: string,
    field: keyof ProgressRow,
    value: string | number | boolean
  ) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          // Handle special custom entry cases
          if (field === "description" && value === "__custom__") {
            return { ...row, description: "", isCustomInput: true };
          }
          if (field === "unit" && value === "__custom_unit__") {
            return { ...row, unit: "__custom_unit_input__" };
          }
          if (field === "isCustomInput" && value === false) {
            return { ...row, isCustomInput: false, description: cambodiaProvinces[0] || "" };
          }
          
          // For all other fields, just update the field without automatic calculation
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  // Handler for adding title row
  const addTitleRow = () => {
    const newRow: ProgressRow = {
      id: crypto.randomUUID(),
      description: "",
      unit: "hrs",
      prev: 0,
      today: 0,
      accumulated: 0,
      extra: "",
      rowType: "title",
      nextWeekPlan: 0,
      upNextWeekPlan: 0,
      searchTerm: "",
      isCustomInput: false,
    };
    setRows([...rows, newRow]);
  };

  // Handler for adding detail row
  const addDetailRow = () => {
    const newRow: ProgressRow = {
      id: crypto.randomUUID(),
      description: "",
      unit: "hrs",
      prev: 0,
      today: 0,
      accumulated: 0,
      extra: "",
      rowType: "detail",
      nextWeekPlan: 0,
      upNextWeekPlan: 0,
      searchTerm: "",
      isCustomInput: false,
    };
    setRows([...rows, newRow]);
  };

  console.log("OverallProgress rendering, rows:", rows);

  return (
    <>
      <ResourceTable
        title="Materials"
        icon={<BarChart2 className="w-5 h-5 text-primary" />}
        rows={rows}
        setRows={updateRows}
        showUnit={true}
        showAddButtons={true}
        addTitleRow={addTitleRow}
        addDetailRow={addDetailRow}
        useDropdown={true}
        dropdownOptions={cambodiaProvinces}
        showExtraColumns={true}
        customUpdateRow={customUpdateRow}
        unitNumberOnly={true}
        customHeaders={{
          description: "Scope of work",
          unit: "% Up to Previous Week",
          prev: "% This Week",
          today: "% Up to This Week",
          accumulated: "Remaining",
          nextWeekPlan: "% Next Week Plan",
          upNextWeekPlan: "% Up Next Week Plan"
        }}
      />
    </>
  );
}
