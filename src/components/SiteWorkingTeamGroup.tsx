import { Wrench } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";
import { INTERIOR_TEAM_OPTIONS } from "./ResourcesSection";

interface SiteWorkingTeamGroupProps {
  interiorTeam: ResourceRow[];
  setInteriorTeam: (rows: ResourceRow[]) => void;
}

const SiteWorkingTeamGroup = ({
  interiorTeam,
  setInteriorTeam,
}: SiteWorkingTeamGroupProps) => {
  return (
    <ResourceTable
      title="Site Team"
      icon={<Wrench className="w-5 h-5 text-accent" />}
      rows={interiorTeam}
      setRows={setInteriorTeam}
      useDropdown={true}
      dropdownOptions={INTERIOR_TEAM_OPTIONS}
      inputNumberOnly={true}
    />
  );
};

export default SiteWorkingTeamGroup;
