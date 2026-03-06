// Resource types for weekly reports

export interface ManPowerEntry {
  description: string;
  date: {
    fri: number;
    sat: number;
    sun: number;
    mon: number;
    tue: number;
    wed: number;
    thu: number;
  };
  prevWeek: number;
  thisWeek: number;
  accumulated: number;
}

export interface ManPowerTeams {
  dateRange: string;
  managementTeam: ManPowerEntry[];
  workingTeamInterior: ManPowerEntry[];
  workingTeamMEP: ManPowerEntry[];
}

export interface Resources {
  manPower: ManPowerTeams;
  // Add other resource types here if needed in the future
  // materials?: MaterialEntry[];
  // machinery?: MachineryEntry[];
}

export interface ResourceSection {
  id: string;
  title: string;
  subtitle: string;
  subRows: any[]; // Keep for backward compatibility
}
