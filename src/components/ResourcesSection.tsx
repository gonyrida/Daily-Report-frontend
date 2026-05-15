import { Users, Package, Truck } from "lucide-react";
import ResourceTable, { ResourceRow } from "./ResourceTable";
import SiteWorkingTeamGroup from "./SiteWorkingTeamGroup";
import ManagementTeamGroup from "./ManagementTeamGroup";
import { useEffect, useState } from "react";
import { useDropdownOptions, DropdownData } from "../hooks/useDropdownOptions";

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
  firstSectionTitle?: string;
  setFirstSectionTitle?: (title: string) => void;
  secondSectionTitle?: string;
  setSecondSectionTitle?: (title: string) => void;
}

// Helper function to transform API data to component-friendly formats
const transformApiData = (apiData: DropdownData | null) => {
  if (!apiData) {
    return {
      managementOptions: [],
      interiorTeamOptions: [],
      mepTeamOptions: [],
      materialOptions: [],
      materialUnitMap: {},
      machineryOptions: [],
      machineryUnitMap: {},
      unitOptions: []
    };
  }

  // Create option arrays (just the names)
  const managementOptions = apiData.roles.management.map(r => ({id: r.id, name: r.name}));
  const workingRoles = apiData.roles.working.map(r => ({id: r.id, name: r.name}));
  const interiorTeamOptions = workingRoles;
  const mepTeamOptions = workingRoles;

  const materialOptions = apiData.items.material.map(i => ({id: i.id, name: i.name}));
  const machineryOptions = apiData.items.equipment.map(i => ({id: i.id, name: i.name}));
  const unitOptions = apiData.units.map(u => ({id: u.id, name: u.name}));

  // Create unit maps (name -> unit)
  const materialUnitMap: Record<string, string> = {};
  apiData.items.material.forEach(item => {
    materialUnitMap[item.name] = item.unit;
  });

  const machineryUnitMap: Record<string, string> = {};
  apiData.items.equipment.forEach(item => {
    machineryUnitMap[item.name] = item.unit;
  });

  return {
    managementOptions,
    interiorTeamOptions,
    mepTeamOptions,
    materialOptions,
    materialUnitMap,
    machineryOptions,
    machineryUnitMap,
    unitOptions
  };
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
  firstSectionTitle,
  setFirstSectionTitle,
  secondSectionTitle,
  setSecondSectionTitle
}: ResourcesSectionProps) => {
  // Fetch dropdown data from API
  const { data: dropdownData, loading, error, refetch } = useDropdownOptions();

  // Transform API data
  const {
    managementOptions,
    interiorTeamOptions,
    mepTeamOptions,
    materialOptions,
    materialUnitMap,
    machineryOptions,
    machineryUnitMap,
    unitOptions
  } = transformApiData(dropdownData);

  const handleRefresh = async () => {
    await refetch(); // This updates 'data', which flows back down to children
  };

  useEffect(() => {
    // Sync local section title states with props
    if (firstSectionTitle) {
      setFirstSectionTitle(firstSectionTitle);
    }
    if (secondSectionTitle) {
      setSecondSectionTitle(secondSectionTitle);
    }
  }, [firstSectionTitle, secondSectionTitle]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <div className="w-1 h-5 bg-accent rounded-full" />
          Manpower
        </h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <div className="w-1 h-5 bg-accent rounded-full" />
          Manpower
        </h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 font-medium">Failed to load options</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <div className="w-1 h-5 bg-accent rounded-full" />
        Manpower
      </h2>

      <div className="grid lg:grid-cols-1 gap-4">
        <ManagementTeamGroup
          managementTeam={managementTeam}
          setManagementTeam={setManagementTeam}
          mepTeam={mepTeam}
          setMepTeam={setMepTeam}
          sectionTitle={firstSectionTitle}
          onValueChange={(value) => 
            value.trim() ? setFirstSectionTitle?.(value) : setFirstSectionTitle?.("Management Team")
          }
          managementOptions={managementOptions}
          mepTeamOptions={mepTeamOptions}
          onOptionDeleted={handleRefresh}
        />
        
        <SiteWorkingTeamGroup
          interiorTeam={interiorTeam}
          setInteriorTeam={setInteriorTeam}
          sectionTitle={secondSectionTitle}
          onValueChange={(value) =>
            value.trim() ? setSecondSectionTitle?.(value) : setSecondSectionTitle?.("Site Team")
          }
          interiorTeamOptions={interiorTeamOptions}
          onRefresh={handleRefresh}
        />

        <ResourceTable
          title="Materials"
          icon={<Package className="w-5 h-5 text-warning" />}
          rows={materials}
          setRows={setMaterials}
          useDropdown={true}
          dropdownOptions={materialOptions}
          optionsFor="item"
          showUnit
          unitOptions={unitOptions}
          inputNumberOnly={true}
          descriptionUnitMap={materialUnitMap}
          enableDragDrop={true}
          onOptionDeleted={handleRefresh}
        />

        <ResourceTable
          title="Equipment"
          icon={<Truck className="w-5 h-5 text-success" />}
          rows={machinery}
          setRows={setMachinery}
          useDropdown={true}
          dropdownOptions={machineryOptions}
          optionsFor="item"
          showUnit
          unitOptions={unitOptions}
          descriptionUnitMap={machineryUnitMap}
          inputNumberOnly={true}
          enableDragDrop={true}
          onOptionDeleted={handleRefresh}
        />
      </div>
    </div>
  );
};

export default ResourcesSection;
