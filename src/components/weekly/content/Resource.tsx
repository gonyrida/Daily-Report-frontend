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
        <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.1</span> Manpower Status</h3>
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
        <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.2</span> Material Delivery Status</h3>
        <ResourceTableComponent sharedData={sharedData} showTitles={false} />
      </div>
      <div id="section-6.3">
        <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.3</span> Machinery & Equipment Status</h3>
        <ResourceTableComponent sharedData={sharedData} showTitles={false} />
      </div>
    </div>
  );
};

export default Resource;
