import { Resources, ManPowerTeams, ManPowerEntry, MaterialEntry, MachineryEntry } from "@/types/resources.types";
import { Section, SubRow } from "@/types/resourceTable.types";

/**
 * Transform the legacy UI data structure to the new payload format
 */
export const transformResourceDataToNewPayload = (sections: Section[], dateRange?: string): Resources => {
  const manPower: ManPowerTeams = {
    dateRange: dateRange || "",
    managementTeam: sections[0]?.subRows.map(row => ({
      description: row.description,
      date: {
        fri: parseFloat(row.dailyData[0]) || 0,
        sat: parseFloat(row.dailyData[1]) || 0,
        sun: parseFloat(row.dailyData[2]) || 0,
        mon: parseFloat(row.dailyData[3]) || 0,
        tue: parseFloat(row.dailyData[4]) || 0,
        wed: parseFloat(row.dailyData[5]) || 0,
        thu: parseFloat(row.dailyData[6]) || 0
      },
      prevWeek: parseFloat(row.previousWeek) || 0,
      thisWeek: parseFloat(row.thisWeek) || 0,
      accumulated: parseFloat(row.upToThisWeek) || 0
    })) || [],
    workingTeamInterior: sections[1]?.subRows.map(row => ({
      description: row.description,
      date: {
        fri: parseFloat(row.dailyData[0]) || 0,
        sat: parseFloat(row.dailyData[1]) || 0,
        sun: parseFloat(row.dailyData[2]) || 0,
        mon: parseFloat(row.dailyData[3]) || 0,
        tue: parseFloat(row.dailyData[4]) || 0,
        wed: parseFloat(row.dailyData[5]) || 0,
        thu: parseFloat(row.dailyData[6]) || 0
      },
      prevWeek: parseFloat(row.previousWeek) || 0,
      thisWeek: parseFloat(row.thisWeek) || 0,
      accumulated: parseFloat(row.upToThisWeek) || 0
    })) || [],
    workingTeamMEP: sections[2]?.subRows.map(row => ({
      description: row.description,
      date: {
        fri: parseFloat(row.dailyData[0]) || 0,
        sat: parseFloat(row.dailyData[1]) || 0,
        sun: parseFloat(row.dailyData[2]) || 0,
        mon: parseFloat(row.dailyData[3]) || 0,
        tue: parseFloat(row.dailyData[4]) || 0,
        wed: parseFloat(row.dailyData[5]) || 0,
        thu: parseFloat(row.dailyData[6]) || 0
      },
      prevWeek: parseFloat(row.previousWeek) || 0,
      thisWeek: parseFloat(row.thisWeek) || 0,
      accumulated: parseFloat(row.upToThisWeek) || 0
    })) || []
  };

  return {
    manPower,
    material: [],
    machinery: []
  };
};

/**
 * Transform backend manpower data to frontend format (alias for transformNewPayloadToUIData)
 */
export const transformBackendToFrontendFormat = (manPower: ManPowerTeams): Section[] => {
  return [
    {
      title: "I. Site Management Team",
      subtitle: "",
      subRows: manPower.managementTeam?.map(entry => ({
        description: entry.description,
        dailyData: [
          entry.date?.fri?.toString() || "0",
          entry.date?.sat?.toString() || "0",
          entry.date?.sun?.toString() || "0",
          entry.date?.mon?.toString() || "0",
          entry.date?.tue?.toString() || "0",
          entry.date?.wed?.toString() || "0",
          entry.date?.thu?.toString() || "0"
        ],
        previousWeek: entry.prevWeek?.toString() || "0",
        thisWeek: entry.thisWeek?.toString() || "0",
        upToThisWeek: entry.accumulated?.toString() || "0"
      })) || []
    },
    {
      title: "II. Site Working Team Interior",
      subtitle: "",
      subRows: manPower.workingTeamInterior?.map(entry => ({
        description: entry.description,
        dailyData: [
          entry.date?.fri?.toString() || "0",
          entry.date?.sat?.toString() || "0",
          entry.date?.sun?.toString() || "0",
          entry.date?.mon?.toString() || "0",
          entry.date?.tue?.toString() || "0",
          entry.date?.wed?.toString() || "0",
          entry.date?.thu?.toString() || "0"
        ],
        previousWeek: entry.prevWeek?.toString() || "0",
        thisWeek: entry.thisWeek?.toString() || "0",
        upToThisWeek: entry.accumulated?.toString() || "0"
      })) || []
    },
    {
      title: "III. Site Working Team MEP",
      subtitle: "",
      subRows: manPower.workingTeamMEP?.map(entry => ({
        description: entry.description,
        dailyData: [
          entry.date?.fri?.toString() || "0",
          entry.date?.sat?.toString() || "0",
          entry.date?.sun?.toString() || "0",
          entry.date?.mon?.toString() || "0",
          entry.date?.tue?.toString() || "0",
          entry.date?.wed?.toString() || "0",
          entry.date?.thu?.toString() || "0"
        ],
        previousWeek: entry.prevWeek?.toString() || "0",
        thisWeek: entry.thisWeek?.toString() || "0",
        upToThisWeek: entry.accumulated?.toString() || "0"
      })) || []
    }
  ];
};

/**
 * Transform backend material data to frontend subRows format
 */
export const transformMaterialsToFrontendFormat = (materials: MaterialEntry[]): SubRow[] => {
  return materials?.map(entry => ({
    description: entry.description,
    unit: entry.unit,
    dailyData: [
      entry.date?.fri?.toString() || "0",
      entry.date?.sat?.toString() || "0",
      entry.date?.sun?.toString() || "0",
      entry.date?.mon?.toString() || "0",
      entry.date?.tue?.toString() || "0",
      entry.date?.wed?.toString() || "0",
      entry.date?.thu?.toString() || "0"
    ],
    previousWeek: entry.prevWeek?.toString() || "0",
    thisWeek: entry.thisWeek?.toString() || "0",
    upToThisWeek: entry.accumulated?.toString() || "0"
  })) || [];
};

/**
 * Transform backend machinery data to frontend subRows format
 */
export const transformMachineryToFrontendFormat = (machinery: MachineryEntry[]): SubRow[] => {
  return machinery?.map(entry => ({
    description: entry.description,
    dailyData: [
      entry.date?.fri?.toString() || "0",
      entry.date?.sat?.toString() || "0",
      entry.date?.sun?.toString() || "0",
      entry.date?.mon?.toString() || "0",
      entry.date?.tue?.toString() || "0",
      entry.date?.wed?.toString() || "0",
      entry.date?.thu?.toString() || "0"
    ],
    previousWeek: entry.prevWeek?.toString() || "0",
    thisWeek: entry.thisWeek?.toString() || "0",
    upToThisWeek: entry.accumulated?.toString() || "0"
  })) || [];
};

/**
 * Transform the new payload format back to the legacy UI data structure
 */
export const transformNewPayloadToUIData = (resources: Resources): Section[] => {
  const { manPower } = resources;
  
  return [
    {
      title: "I. Site Management Team",
      subtitle: "",
      subRows: manPower.managementTeam.map(entry => ({
        description: entry.description,
        dailyData: [
          entry.date.fri.toString(),
          entry.date.sat.toString(),
          entry.date.sun.toString(),
          entry.date.mon.toString(),
          entry.date.tue.toString(),
          entry.date.wed.toString(),
          entry.date.thu.toString()
        ],
        previousWeek: entry.prevWeek.toString(),
        thisWeek: entry.thisWeek.toString(),
        upToThisWeek: entry.accumulated.toString()
      }))
    },
    {
      title: "II. Site Working Team Interior",
      subtitle: "",
      subRows: manPower.workingTeamInterior.map(entry => ({
        description: entry.description,
        dailyData: [
          entry.date.fri.toString(),
          entry.date.sat.toString(),
          entry.date.sun.toString(),
          entry.date.mon.toString(),
          entry.date.tue.toString(),
          entry.date.wed.toString(),
          entry.date.thu.toString()
        ],
        previousWeek: entry.prevWeek.toString(),
        thisWeek: entry.thisWeek.toString(),
        upToThisWeek: entry.accumulated.toString()
      }))
    },
    {
      title: "III. Site Working Team MEP",
      subtitle: "",
      subRows: manPower.workingTeamMEP.map(entry => ({
        description: entry.description,
        dailyData: [
          entry.date.fri.toString(),
          entry.date.sat.toString(),
          entry.date.sun.toString(),
          entry.date.mon.toString(),
          entry.date.tue.toString(),
          entry.date.wed.toString(),
          entry.date.thu.toString()
        ],
        previousWeek: entry.prevWeek.toString(),
        thisWeek: entry.thisWeek.toString(),
        upToThisWeek: entry.accumulated.toString()
      }))
    }
  ];
};
