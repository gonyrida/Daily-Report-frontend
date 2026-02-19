import React from "react";
import ResourceTableComponent from "./ResourceTableComponent";
import ResourceTable, { ResourceRow } from "../../ResourceTable";
import { Package } from "lucide-react";

const Resource: React.FC<{ 
  sharedData?: any;
  sections?: any[];
  setSections?: any;
  handleInputChange?: any;
  removeSubRow?: any;
  monthYearDisplay?: string;
  dates?: string[];
}> = ({ 
  sharedData,
  sections,
  setSections,
  handleInputChange,
  removeSubRow,
  monthYearDisplay,
  dates
}) => {
  // Material delivery status data
  const [materials, setMaterials] = React.useState<ResourceRow[]>([]);

  return (
    <div className="space-y-6">
      <div id="section-6.1">
        <h3 className="text-lg font-semibold mb-4">6.1 Manpower Status</h3>
        <ResourceTableComponent 
          sharedData={sharedData}
          sections={sections}
          setSections={setSections}
          handleInputChange={handleInputChange}
          removeSubRow={removeSubRow}
          monthYearDisplay={monthYearDisplay}
          dates={dates}
        />
      </div>
      <div id="section-6.2">
        <h3 className="text-lg font-semibold mb-4">6.2 Material Delivery Status</h3>
        <ResourceTable
          title="Materials"
          icon={<Package className="w-5 h-5 text-warning" />}
          rows={materials}
          setRows={setMaterials}
          useDropdown={true}
          dropdownOptions={[
            "Aggregates",
            "Brick",
            "Cement",
            "Electricity Tape",
            "Electrical wire",
            "HDPE pipe",
            "Paint",
            "PVC pipe",
            "Rebar D14",
            "Rebar DB10",
            "Rebar DB16",
            "Rebar R6",
            "Rebar R8",
            "Sand",
            "Scaffolding",
            "Tile",
          ]}
          showUnit={true}
          unitOptions={["Pack", "PCS", "EA", "Box", "m", "m2", "m3", "kg", "ton"]}
          inputNumberOnly={true}
        />
      </div>
      <div id="section-6.3">
        <h3 className="text-lg font-semibold mb-4">6.3 Machinery & Equipment Status</h3>
        <ResourceTableComponent sharedData={sharedData} showTitles={false} />
      </div>
    </div>
  );
};

export default Resource;
