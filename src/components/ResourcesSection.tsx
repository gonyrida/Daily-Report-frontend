import { Users, Wrench, Package, Truck } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";

interface ResourcesSectionProps {
  managementTeam: ResourceRow[];
  setManagementTeam: (rows: ResourceRow[]) => void;
  workingTeam: ResourceRow[];
  setWorkingTeam: (rows: ResourceRow[]) => void;
  materials: ResourceRow[];
  setMaterials: (rows: ResourceRow[]) => void;
  machinery: ResourceRow[];
  setMachinery: (rows: ResourceRow[]) => void;
}
// add more options as needed
const MANAGEMENT_OPTIONS = [
  "Project Manager",
  "Construction Manager",
  "QS Engineer",
  "Architect Engineer",
  "MEP Engineer",
  "Site Engineer",
];

const WORKING_TEAM_OPTIONS = ["Foreman", "Skill Workers", "General Workers"];
const ResourcesSection = ({
  managementTeam,
  setManagementTeam,
  workingTeam,
  setWorkingTeam,
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

        <ResourceTable
          title="Site Working Team"
          icon={<Wrench className="w-5 h-5 text-accent" />}
          rows={workingTeam}
          setRows={setWorkingTeam}
          useDropdown={true}
          dropdownOptions={WORKING_TEAM_OPTIONS}
        />

        <ResourceTable
          title="Materials Deliveries"
          icon={<Package className="w-5 h-5 text-warning" />}
          rows={materials}
          setRows={setMaterials}
          showUnit
        />

        <ResourceTable
          title="Machinery & Equipment"
          icon={<Truck className="w-5 h-5 text-success" />}
          rows={machinery}
          setRows={setMachinery}
          showUnit
        />
      </div>
    </div>
  );
};

export default ResourcesSection;
