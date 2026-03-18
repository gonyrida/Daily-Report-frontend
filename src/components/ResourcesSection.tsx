import { Users, Package, Truck } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";
import SiteWorkingTeamGroup from "./SiteWorkingTeamGroup";
import ManagementTeamGroup from "./ManagementTeamGroup";

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
export const MANAGEMENT_OPTIONS = [
  "Project Manager",
  "Construction Manager",
  "Site Engineer",
  "Architecture",
  "QS Engineer",
  "MEP Engineer",
];

const WORKING_TEAM_OPTIONS = [
  "Site Manager",
  "Site Engineer",
  "MEP Engineer",
  "Foreman",
  "Skill Workers",
  "MEP Workers",
  "General Workers",
];

export const INTERIOR_TEAM_OPTIONS = [
  "Site Manager",
  "Site Engineer",
  "Foreman",
  "Skill Workers",
  "General Workers",
  "MEP Workers",
];

export const MEP_TEAM_OPTIONS = [
  "Site Manager",
  "Site Engineer",
  "Foreman",
  "Skill Workers",
  "General Workers",
  "MEP Workers",
];

const MACHINERY_OPTIONS = [
  "Air Compressor",
  "Angle Grinder",
  "Auto Level Machine",
  "Bar Bending Machine",
  "Bulldozer",
  "Cargo Crane",
  "Concrete Cutting Machine",
  "Concrete Finished",
  "Concrete Mixer",
  "Concrete Mixer Car",
  "Concrete Pump",
  "Concrete Vibrator",
  "Container",
  "Electric Drill",
  "Electric Hammer",
  "Excavator",
  "Generator",
  "Jackhammer",
  "Material Hoist",
  "Mobile Crane",
  "Plate Compactor",
  "Power Cable",
  "Power Trowel",
  "Pump Car",
  "Rammer",
  "Rebar Cutting Machine",
  "Roller",
  "Scaffolding",
  "Total Level",
  "Total Station",
  "Truck",
  "Water Pump",
  "Welding Machine"
];

const MATERIAL_OPTIONS = [
  "1 Gang 1 Way Switch",
  "2 Gang 2 Way Switch",
  "3 Gang 2 Way Switch",
  "Aggregates",
  "Air Conditioner Wall Mount 2.5HP",
  "Audio Cable",
  "Brick",
  "Cement",
  "Copper Pipe",
  "Double Data Socket",
  "Double Socket",
  "Electrical Conduit 20mm",
  "Electrical Conduit 25mm",
  "Electrical Wire",
  "Electrical Wire 1Cx1.5mm²",
  "Electrical Wire 1Cx2.5mm²",
  "Electricity Tape",
  "Fiber Optic HDMI",
  "Flexible Conduit 20mm",
  "Flexible Conduit 25mm",
  "Floor Tile F6608",
  "HDMI Socket",
  "HDPE Pipe",
  "Insulation Copper Pipe",
  "LED Panel Light 300x600mm 40W 6500K",
  "MCB 1P 10A 6kA",
  "MCB 1P 20A 6kA",
  "MCB 2P 50A 6kA",
  "MCB 2P 63A 6kA",
  "Outdoor Unit Support",
  "Paint",
  "PVC Drain Pipe Class 8.5",
  "PVC Pipe",
  "RCBO 1P+N 20A 30mA 4.5kA",
  "Rebar D14",
  "Rebar DB10",
  "Rebar DB16",
  "Rebar R6",
  "Rebar R8",
  "Sand",
  "Scaffolding",
  "Skim Coat",
  "Surface Electrical Box",
  "Tile",
  "UTP CAT6 Cable (DATA)"
];

const Units = ["Pack", "PCS", "EA", "Box", "m", "m2", "m3", "kg", "ton", "length", "set", "roll"];

export const MATERIAL_UNIT_MAP: Record<string, string> = {
  "1 Gang 1 Way Switch": "PCS",
  "2 Gang 2 Way Switch": "PCS",
  "3 Gang 2 Way Switch": "PCS",
  "Aggregates": "m3",
  "Air Conditioner Wall Mount 2.5HP": "set",
  "Audio Cable": "roll",
  "Brick": "PCS",
  "Cement": "Pack",
  "Copper Pipe": "roll",
  "Double Data Socket": "PCS",
  "Double Socket": "PCS",
  "Electrical Conduit 20mm": "PCS",
  "Electrical Conduit 25mm": "PCS",
  "Electrical Wire": "roll",
  "Electrical Wire 1Cx1.5mm²": "roll",
  "Electrical Wire 1Cx2.5mm²": "roll",
  "Electricity Tape": "roll",
  "Fiber Optic HDMI": "roll",
  "Flexible Conduit 20mm": "roll",
  "Flexible Conduit 25mm": "roll",
  "Floor Tile F6608": "Pack",
  "HDMI Socket": "PCS",
  "HDPE Pipe": "m",
  "Insulation Copper Pipe": "PCS",
  "LED Panel Light 300x600mm 40W 6500K": "PCS",
  "MCB 1P 10A 6kA": "PCS",
  "MCB 1P 20A 6kA": "PCS",
  "MCB 2P 50A 6kA": "PCS",
  "MCB 2P 63A 6kA": "PCS",
  "Outdoor Unit Support": "set",
  "Paint": "kg",
  "PVC Drain Pipe Class 8.5": "m",
  "PVC Pipe": "m",
  "RCBO 1P+N 20A 30mA 4.5kA": "PCS",
  "Rebar D14": "kg",
  "Rebar DB10": "kg",
  "Rebar DB16": "kg",
  "Rebar R6": "kg",
  "Rebar R8": "kg",
  "Sand": "m3",
  "Scaffolding": "set",
  "Skim Coat": "Pack",
  "Surface Electrical Box": "PCS",
  "Tile": "m2",
  "UTP CAT6 Cable (DATA)": "roll",
};

export const MACHINERY_UNIT_MAP: Record<string, string> = {
  "Air Compressor": "EA",
  "Angle Grinder": "EA",
  "Auto Level Machine": "EA",
  "Bar Bending Machine": "EA",
  "Bulldozer": "EA",
  "Cargo Crane": "EA",
  "Concrete Cutting Machine": "EA",
  "Concrete Finished": "EA",
  "Concrete Mixer": "EA",
  "Concrete Mixer Car": "EA",
  "Concrete Pump": "EA",
  "Concrete Vibrator": "EA",
  "Container": "EA",
  "Electric Drill": "EA",
  "Electric Hammer": "EA",
  "Excavator": "EA",
  "Generator": "EA",
  "Jackhammer": "EA",
  "Material Hoist": "EA",
  "Mobile Crane": "EA",
  "Plate Compactor": "EA",
  "Power Cable": "roll",
  "Power Trowel": "EA",
  "Pump Car": "EA",
  "Rammer": "EA",
  "Rebar Cutting Machine": "EA",
  "Roller": "EA",
  "Scaffolding": "set",
  "Total Level": "EA",
  "Total Station": "EA",
  "Truck": "EA",
  "Water Pump": "EA",
  "Welding Machine": "EA",
};

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
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <div className="w-1 h-5 bg-accent rounded-full" />
        Man Power
      </h2>

      <div className="grid lg:grid-cols-1 gap-4">
        <ManagementTeamGroup
          managementTeam={managementTeam}
          setManagementTeam={setManagementTeam}
          mepTeam={mepTeam}
          setMepTeam={setMepTeam}
        />
        
        <SiteWorkingTeamGroup
          interiorTeam={interiorTeam}
          setInteriorTeam={setInteriorTeam}
        />

        <ResourceTable
          title="Materials"
          icon={<Package className="w-5 h-5 text-warning" />}
          rows={materials}
          setRows={setMaterials}
          useDropdown={true}
          dropdownOptions={MATERIAL_OPTIONS}
          showUnit
          unitOptions={Units}
          inputNumberOnly={true}
          descriptionUnitMap={MATERIAL_UNIT_MAP}
          enableDragDrop={true}
        />

        <ResourceTable
          title="Equipment"
          icon={<Truck className="w-5 h-5 text-success" />}
          rows={machinery}
          setRows={setMachinery}
          useDropdown={true}
          dropdownOptions={MACHINERY_OPTIONS}
          showUnit
          unitOptions={Units}
          descriptionUnitMap={MACHINERY_UNIT_MAP}
          inputNumberOnly={true}
          enableDragDrop={true}
        />
      </div>
    </div>
  );
};

export default ResourcesSection;
