import { Users, Package, Truck } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";
import SiteWorkingTeamGroup from "./SiteWorkingTeamGroup";

interface ResourcesSectionProps {
  managementTeam: ResourceRow[];
  setManagementTeam: (rows: ResourceRow[]) => void;
  interiorTeam: ResourceRow[];
  setInteriorTeam: (rows: ResourceRow[]) => void;
  mepTeam: ResourceRow[];
  setMepTeam: (rows: ResourceRow[]) => void;
  materials: ResourceRow[];
  setMaterials: (rows: ResourceRow[]) => void;
  machinery: ResourceRow[];
  setMachinery: (rows: ResourceRow[]) => void;
}
// add more options as needed
const MANAGEMENT_OPTIONS = [
  "Project Manager",
  "Construction Manager",
  "Site Engineer",
  "Architecture",
  "QS Engineer",
  "MEP Engineer",
 
];

const WORKING_TEAM_OPTIONS = ["Site Manager", "Site Engineer","MEP Engineer","Foreman", "Skill Workers","MEP Workers", "General Workers"];

const INTERIOR_TEAM_OPTIONS = ["Site Manager", "Site Engineer", "Foreman", "Skill Workers", "General Workers"];

const MEP_TEAM_OPTIONS = ["MEP Engineer", "MEP Workers"];

const MACHINERY_OPTIONS = [
  "Air compressor",
  "Auto Level Machine",
  "Bar bending machine",
  "Bulldozer",
  "Cargo Crane",
  "Concrete Cutting Machine",
  "Concrete Finished",
  "Concrete mixer",
  "Concrete Mixer Car",
  "Concrete pump",
  "Concrete vibrator",
  "Container",
  "Excavator",
  "Generator",
  "Jackhammer",
  "Material hoist",
  "Mobile crane",
  "Plate compactor",
  "Power trowel",
  "Pump Car",
  "Rammer",
  "Rebar cutting machine",
  "Roller",
  "Total level",
  "Total station",
  "Truck",
  "Water pump",
  "Welding machine",
];

const MATERIAL_OPTIONS = [
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
];

const Units = [
  "Pack",
  "PCS",
  "EA",
  "Box",
  "m",
  "m2",
  "m3",
  "kg",
  "ton",
];

const ResourcesSection = ({
  managementTeam,
  setManagementTeam,
  interiorTeam,
  setInteriorTeam,
  mepTeam,
  setMepTeam,
  materials,
  setMaterials,
  machinery,
  setMachinery,
}: ResourcesSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <div className="w-1 h-5 bg-accent rounded-full" />
        Resources Employed
      </h2>

      <div className="grid lg:grid-cols-2 gap-4">
        <ResourceTable
          title="Site Management Team"
          icon={<Users className="w-5 h-5 text-primary" />}
          rows={managementTeam}
          setRows={setManagementTeam}
          useDropdown={true}
          dropdownOptions={MANAGEMENT_OPTIONS}
        />

        <SiteWorkingTeamGroup
          interiorTeam={interiorTeam}
          setInteriorTeam={setInteriorTeam}
          mepTeam={mepTeam}
          setMepTeam={setMepTeam}
        />

        <ResourceTable
          title="Materials Deliveries"
          icon={<Package className="w-5 h-5 text-warning" />}
          rows={materials}
          setRows={setMaterials}
          useDropdown={true}
          dropdownOptions={MATERIAL_OPTIONS}
          showUnit
          unitOptions={Units}
        />

        <ResourceTable
          title="Machinery & Equipment"
          icon={<Truck className="w-5 h-5 text-success" />}
          rows={machinery}
          setRows={setMachinery}
          useDropdown={true}
          dropdownOptions={MACHINERY_OPTIONS}
          showUnit
          unitOptions={Units}
        />
      </div>
    </div>
  );
};

export default ResourcesSection;
