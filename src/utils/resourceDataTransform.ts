import { Resources, ManPowerTeams, ManPowerEntry } from "@/types/resources.types";
import { Section } from "@/types/resourceTable.types";

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
    manPower
  };
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
