export interface ActivityRow {
  description: string;
  percent: number;
}

export interface ActivitiesProps {
  weeklyActivities?: ActivityRow[];
  setWeeklyActivities?: (rows: ActivityRow[]) => void;
  nextWeekPlan?: ActivityRow[];
  setNextWeekPlan?: (rows: ActivityRow[]) => void;
}
