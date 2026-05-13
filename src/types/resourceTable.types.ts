export interface SubRow {
  description: string;
  unit?: string; // Optional unit field for materials
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
  showUnit?: boolean; // Add prop to show unit column for materials
}
