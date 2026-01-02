import { ResourceRow } from "@/components/ResourceTable";

export interface ReportData {
  projectName: string;
  reportDate: string | null;
  weather: string;
  weatherPeriod: "AM" | "PM";
  temperature: string;
  activityToday: string;
  workPlanNextDay: string;
  managementTeam: ResourceRow[];
  workingTeam: ResourceRow[];
  materials: ResourceRow[];
  machinery: ResourceRow[];
}