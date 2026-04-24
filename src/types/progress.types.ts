import { ResourceRow } from "@/components/ResourceTable";

export interface OverallProgressRow {
  id: string;
  no?: string;
  scopeOfWorks?: string;
  description?: string;
  pctUpToPrevWeek?: number | string;
  prevWeek?: number | string;
  pctThisWeek?: number | string;
  thisWeek?: number | string;
  pctUpToThisWeek?: number | string;
  upToThisWeek?: number | string;
  pctRemaining?: number | string;
  remaining?: number | string;
  pctNextWeekPlan?: number | string;
  nextWeek?: number | string;
  pctUpNextWeekPlan?: number | string;
  upNextWeek?: number | string;
  rowType?: "title" | "detail" | "subDetail";
  displayIndex?: string;
  sourceId?: string;
  searchTerm?: string;
  isCustomInput?: boolean;
}

export interface ProgressRow extends OverallProgressRow {}
