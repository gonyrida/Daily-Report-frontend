export interface SubRow {
  description: string;
  dailyData: string[];
  previousWeek: string;
  thisWeek: string;
  upToThisWeek: string;
}

export interface Section {
  title: string;
  subtitle: string;
  subRows: SubRow[];
}

export interface ResourceTableComponentProps {
  sharedData?: any;
  showTitles?: boolean;
  sections?: any[];
  setSections?: any;
  handleInputChange?: any;
  removeSubRow?: any;
  monthYearDisplay?: string;
  dates?: string[];
}
