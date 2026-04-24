export interface CoverData {
  weekNumber: string;
  startDate: string;
  dateRange: string;
  projectName: string;
  employer: string;
  contractor: string;
  coverImage: string;
}

export interface WeeklyReportData {
  weekNumber?: string;
  dateRange?: string;
  projectName?: string;
  employer?: string;
  contractor?: string;
  coverImage?: string;
}
