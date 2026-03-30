import { ActivityRow } from "./activity.types";
import { ConstructionProgressItem } from "./constructionProgress";

export interface Section {
  id: string;
  title: string;
}

export type TabType = "cover" | "letter" | "table-of-content" | "overall-progress" | "activities" | "qaqc-status" | "hses" | "resource";

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
}
