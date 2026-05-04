import { ActivityRow } from "./activity.types";
import { ConstructionProgressItem } from "./constructionProgress";
import { MasterReportMetadata } from "@/utils/masterReportTransform";

export interface Section {
  id: string;
  title: string;
}

export type TabType = "construction-progress" | "cover" | "letter" | "table-of-content" | "overall-progress" | "activities" | "qaqc-status" | "hses" | "resource" | "photos" | "issues" | "schedule";

/**
 * Mode for WeeklyReportContent - 'single' for individual reports, 'master' for aggregated folder view
 */
export type WeeklyReportMode = 'single' | 'master';

export interface WeeklyReportContentProps {
  showIntroduction?: boolean;
  setShowIntroduction?: (show: boolean) => void;
  projectLogo?: string;
  setActiveTab?: (tab: TabType) => void;
  setShowSecondNav?: (show: boolean) => void;
  activeTab?: TabType;
  sharedData?: any;
  setSharedData?: (data: any) => void;
  overallProgressData?: any;
  setOverallProgressData?: (data: any) => void;
  overallProgressRemark?: string;
  setOverallProgressRemark?: (remark: string) => void;
  reportId?: string; 
  weeklyActivities?: ActivityRow[];
  setWeeklyActivities?: (activities: ActivityRow[]) => void;
  nextWeekPlan?: ActivityRow[];
  setNextWeekPlan?: (activities: ActivityRow[]) => void;
  qaqcData?: any;
  setQaqcData?: (qaqcData: any) => void;
  hsesData?: any;
  setHsesData?: (hsesData: any) => void;
  onQaqcDataChange?: (qaqcData: any) => void;
  onClearQaqcData?: (clearFn: () => void) => void;
  onClearHsesData?: (clearFn: () => void) => void;
  constructionProgressItems?: ConstructionProgressItem[];
  resourcesData?: any;
  setResourcesData?: (resourcesData: any) => void;
  photosData?: any;
  setPhotosData?: (photosData: any) => void;
  
  // NEW: Master mode support
  mode?: WeeklyReportMode;
  masterMetadata?: MasterReportMetadata;
  constructionIssues?: any[];
  setConstructionIssues?: (issues: any[]) => void;
}
