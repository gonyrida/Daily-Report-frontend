import { Resources, ManPowerTeams, ManPowerEntry, MaterialEntry, MachineryEntry } from "@/types/resources.types";
import { Section, SubRow } from "@/types/resourceTable.types";

/**
 * Transform the legacy UI data structure to the new payload format
 */
export const transformResourceDataToNewPayload = (
  sections: Section[], 
  dateRange?: string,
  materialSections?: Section[],
  machinerySections?: Section[]
): Resources => {
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

  // Transform materials data
  const material: MaterialEntry[] = materialSections?.[0]?.subRows.map(row => ({
    description: row.description,
    unit: row.unit || '',
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
  })) || [];

  // Transform machinery data
  const machinery: MachineryEntry[] = machinerySections?.[0]?.subRows.map(row => ({
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
  })) || [];

  return {
    manPower,
    material,
    machinery
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
  console.log('🔍 transformMaterialsToFrontendFormat input:', {
    materialsCount: materials?.length || 0,
    materialsSample: materials?.slice(0, 2) || [],
    firstMaterialDate: materials?.[0]?.date
  });
  
  const result = materials?.map(entry => {
    // Use empty string (not "0") for daily cells that have no real data.
    // Materials store thisWeek independently — forcing "0" in daily columns
    // makes the Grand Total calculation (which sums dailyData) return 0.
    const toDaily = (v: number | undefined): string =>
      v != null && v !== 0 ? v.toString() : "";

    const transformed = {
      description: entry.description,
      unit: entry.unit || '',
      dailyData: [
        toDaily(entry.date?.fri),
        toDaily(entry.date?.sat),
        toDaily(entry.date?.sun),
        toDaily(entry.date?.mon),
        toDaily(entry.date?.tue),
        toDaily(entry.date?.wed),
        toDaily(entry.date?.thu),
      ],
      previousWeek: entry.prevWeek?.toString() || "0",
      thisWeek: entry.thisWeek?.toString() || "0",
      upToThisWeek: entry.accumulated?.toString() || "0"
    };
    
    console.log('🔍 Transformed material entry:', {
      description: entry.description,
      originalDate: entry.date,
      transformedDailyData: transformed.dailyData,
      originalThisWeek: entry.thisWeek,
      transformedThisWeek: transformed.thisWeek
    });
    
    return transformed;
  }) || [];
  
  console.log('🔍 transformMaterialsToFrontendFormat result:', {
    resultCount: result.length,
    resultSample: result.slice(0, 2)
  });
  
  return result;
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

/**
 * Transform resources data to Excel export format
 * Converts backend Resources format to the format expected by Weeklyreportexcelmapper
 */
export const transformResourcesToExcelFormat = (resources: Resources | null | undefined) => {
  if (!resources) {
    return {
      manpowerRows: [],
      materialRows: [],
      equipmentRows: [],
      weekDates: ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']
    };
  }

  // Transform manpower data - flatten teams with group headers
  const manpowerRows: any[] = [];

  // Add group header and rows for Management Team
  if (resources.manPower?.managementTeam?.length > 0) {
    manpowerRows.push({ description: 'I. Site Management Team', isGroupHeader: true });
    resources.manPower.managementTeam.forEach(entry => {
      manpowerRows.push({
        description: entry.description,
        dailyCounts: [
          entry.date?.fri ?? 0,
          entry.date?.sat ?? 0,
          entry.date?.sun ?? 0,
          entry.date?.mon ?? 0,
          entry.date?.tue ?? 0,
          entry.date?.wed ?? 0,
          entry.date?.thu ?? 0
        ],
        previousWeek: entry.prevWeek ?? 0,
        thisWeek: entry.thisWeek ?? 0,
        upToThisWeek: entry.accumulated ?? 0
      });
    });
  }

  // Add group header and rows for Working Team Interior
  if (resources.manPower?.workingTeamInterior?.length > 0) {
    manpowerRows.push({ description: 'II. Site Working Team Interior', isGroupHeader: true });
    resources.manPower.workingTeamInterior.forEach(entry => {
      manpowerRows.push({
        description: entry.description,
        dailyCounts: [
          entry.date?.fri ?? 0,
          entry.date?.sat ?? 0,
          entry.date?.sun ?? 0,
          entry.date?.mon ?? 0,
          entry.date?.tue ?? 0,
          entry.date?.wed ?? 0,
          entry.date?.thu ?? 0
        ],
        previousWeek: entry.prevWeek ?? 0,
        thisWeek: entry.thisWeek ?? 0,
        upToThisWeek: entry.accumulated ?? 0
      });
    });
  }

  // Add group header and rows for Working Team MEP
  if (resources.manPower?.workingTeamMEP?.length > 0) {
    manpowerRows.push({ description: 'III. Site Working Team MEP', isGroupHeader: true });
    resources.manPower.workingTeamMEP.forEach(entry => {
      manpowerRows.push({
        description: entry.description,
        dailyCounts: [
          entry.date?.fri ?? 0,
          entry.date?.sat ?? 0,
          entry.date?.sun ?? 0,
          entry.date?.mon ?? 0,
          entry.date?.tue ?? 0,
          entry.date?.wed ?? 0,
          entry.date?.thu ?? 0
        ],
        previousWeek: entry.prevWeek ?? 0,
        thisWeek: entry.thisWeek ?? 0,
        upToThisWeek: entry.accumulated ?? 0
      });
    });
  }

  // Transform material data
  const materialRows = (resources.material || []).map(entry => ({
    description: entry.description,
    unit: entry.unit,
    dailyData: [
      entry.date?.fri ?? 0,
      entry.date?.sat ?? 0,
      entry.date?.sun ?? 0,
      entry.date?.mon ?? 0,
      entry.date?.tue ?? 0,
      entry.date?.wed ?? 0,
      entry.date?.thu ?? 0
    ],
    previous: entry.prevWeek ?? 0,
    thisPeriod: entry.thisWeek ?? 0,
    accumulate: entry.accumulated ?? 0
  }));

  // Transform machinery data (equipment)
  const equipmentRows = (resources.machinery || []).map(entry => ({
    description: entry.description,
    dailyData: [
      entry.date?.fri ?? 0,
      entry.date?.sat ?? 0,
      entry.date?.sun ?? 0,
      entry.date?.mon ?? 0,
      entry.date?.tue ?? 0,
      entry.date?.wed ?? 0,
      entry.date?.thu ?? 0
    ],
    previous: entry.prevWeek ?? 0,
    thisPeriod: entry.thisWeek ?? 0,
    accumulate: entry.accumulated ?? 0
  }));

  return {
    manpowerRows,
    materialRows,
    equipmentRows,
    weekDates: ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']
  };
};

/**
 * Transform HSE data to Excel export format
 * Converts backend HSES format to the format expected by Weeklyreportexcelmapper
 */
export const transformHSEToExcelFormat = (hsesData: any) => {
  if (!hsesData) {
    return {
      hseTraining: [],
      hseInspection: [],
      hsePermits: [],
      hseFirstAid: '',
      hseOtherConcerns: '',
      hsePhotoReferences: { hseToolboxMeeting: [], hseActivityPhotos: [] }
    };
  }

  return {
    hseTraining: (hsesData.training || []).map((row: any) => ({
      typeOfTraining: row.typeOfTraining || row.type,
      date: row.date,
      venue: row.venue,
      trainer: row.trainer,
      attendee: row.attendee || row.count,
      remarks: row.remarks
    })),
    hseInspection: (hsesData.inspection || []).map((row: any) => ({
      typeOfInspection: row.typeOfInspection || row.type,
      date: row.date,
      inspector: row.inspector,
      remarks: row.remarks
    })),
    hsePermits: (hsesData.permit || []).map((row: any) => ({
      typeOfPermit: row.typeOfPermit || row.type,
      startDate: row.startDate,
      endDate: row.endDate,
      inspector: row.inspector,
      approver: row.approver,
      remarks: row.remarks
    })),
    hseFirstAid: hsesData.firstAidAccident || '',
    hseOtherConcerns: hsesData.otherActivities || '',
    hsePhotoReferences: {
      hseToolboxMeeting: hsesData.hsePhotoReferences?.hseToolboxMeeting || [],
      hseActivityPhotos: hsesData.hsePhotoReferences?.hseActivityPhotos || []
    }
  };
};
