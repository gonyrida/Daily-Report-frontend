export interface Section {
  id: string;
  title: string;
}

export type TabType = "cover" | "letter" | "table-of-content" | "overall-progress" | "activities" | "qaqc-status" | "hses" | "resource";

export interface WeeklyReportContentProps {
  showIntroduction?: boolean;
  setShowIntroduction?: React.Dispatch<React.SetStateAction<boolean>>;
  projectLogo?: string;
  setActiveTab?: (tab: TabType) => void;
  setShowSecondNav?: (show: boolean) => void;
  activeTab?: TabType;
  sharedData?: any;
}
