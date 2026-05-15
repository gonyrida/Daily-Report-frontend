import { Wrench } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";
import { useState, useEffect } from "react";

interface SiteWorkingTeamGroupProps {
  interiorTeam: ResourceRow[];
  setInteriorTeam: (rows: ResourceRow[]) => void;
  onValueChange?: (value: string) => void;
  sectionTitle?: string;
  interiorTeamOptions?: { id: string; name: string }[];
  onRefresh?: () => void;
}

const SiteWorkingTeamGroup = ({
  interiorTeam,
  setInteriorTeam,
  onValueChange,
  sectionTitle = "Site Team",
  interiorTeamOptions = [],
  onRefresh
}: SiteWorkingTeamGroupProps) => {
  // Section title state
  const [localSectionTitle, setLocalSectionTitle] = useState(sectionTitle);

  useEffect(() => {
    // Sync local section title state with prop
    if (sectionTitle) {
      setLocalSectionTitle(sectionTitle);
    }
  }, [sectionTitle]);

  return (
    <ResourceTable
      title={localSectionTitle}
      icon={<Wrench className="w-5 h-5 text-accent" />}
      rows={interiorTeam}
      setRows={setInteriorTeam}
      useDropdown={true}
      dropdownOptions={interiorTeamOptions}
      optionsFor="role"
      inputNumberOnly={true}
      enableDragDrop={true}
      titleInput={true}
      onTitleChange={(title) => onValueChange?.(title.trim() ? title : localSectionTitle)}
      onOptionDeleted={onRefresh}
    />
  );
};

export default SiteWorkingTeamGroup;
