export interface ActivityRow {
  description: string;
  percent: number;                        // Same as backend
  percentage?: string;                     // Legacy field - matches backend
  source?: "manual" | "bulk";           // Same as backend
  bulkImportId?: string;                  // Same as backend
  addedAt?: Date;                        // Same as backend
}

export interface ActivitiesProps {
  weeklyActivities?: ActivityRow[];
  setWeeklyActivities?: (rows: ActivityRow[]) => void;
  nextWeekPlan?: ActivityRow[];
  setNextWeekPlan?: (rows: ActivityRow[]) => void;
  reportId?: string; // NEW: Report ID for bulk import API
}
