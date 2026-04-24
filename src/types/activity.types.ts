export interface ActivityRow {
  id?: string;                            // React key - unique identifier
  description: string;
  percent: number;                        // Same as backend
  percentage?: string;                     // Legacy field - matches backend
  source?: "manual" | "bulk" | "construction-progress";  // Same as backend + construction
  bulkImportId?: string;                  // Same as backend
  addedAt?: Date;                        // Same as backend
  sourceId?: string;                     // Original ID from construction progress (real ID for lookups)
  displayId?: string;                    // What the UI shows in the ID column ("-" for alpha rows)
  indentLevel?: number;                  // Hierarchy level for display indentation
}

export interface ActivitiesProps {
  weeklyActivities?: ActivityRow[];
  setWeeklyActivities?: (rows: ActivityRow[]) => void;
  nextWeekPlan?: ActivityRow[];
  setNextWeekPlan?: (rows: ActivityRow[]) => void;
  reportId?: string; // NEW: Report ID for bulk import API
  constructionProgressItems?: import('@/types/constructionProgress').ConstructionProgressItem[]; // NEW: Construction progress data
}
