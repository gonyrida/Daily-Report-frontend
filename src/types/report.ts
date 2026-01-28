import { ResourceRow } from "@/components/ResourceTable";

export interface ReportData {
  projectName: string;
  reportDate: string | null;
  weatherAM: string;
  weatherPM: string;
  tempAM: string;
  tempPM: string;
  activityToday: string;
  workPlanNextDay: string;
  managementTeam: ResourceRow[];
  workingTeamInterior: ResourceRow[];
  workingTeamMEP: ResourceRow[];
  materials: ResourceRow[];
  machinery: ResourceRow[];
  logos?: {
    koica?: string;
  };
  hse_title?: string;
  hse?: Array<{
    section_title: string;
    images: string[];
    footers: string[];
  }>;
  site_title?: string;
  site_ref?: Array<{
    section_title: string;
    images: string[];
    footers: string[];
  }>;
  description?: string;
  photo_groups?: Array<{
    images: string[];
    date: string;
    footers: string[];
  }>;
  // Frontend-specific fields for backward compatibility
  siteActivitiesSections?: any[];
  siteActivitiesTitle?: string;
  referenceSections?: any[];
  tableTitle?: string;
}