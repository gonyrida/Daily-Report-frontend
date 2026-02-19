import { useState } from "react";
import { ActivityRow } from "@/types/activity.types";

export const useActivities = (
  initialWeeklyActivities: ActivityRow[] = [],
  initialNextWeekPlan: ActivityRow[] = []
) => {
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>(initialWeeklyActivities);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>(initialNextWeekPlan);

  // Add a new empty row
  const addRow = (type: "weekly" | "next") => {
    const newRow: ActivityRow = { description: "", percent: 0 };
    if (type === "weekly") {
      setWeeklyActivities([...weeklyActivities, newRow]);
    } else {
      setNextWeekPlan([...nextWeekPlan, newRow]);
    }
  };

  // Delete a row
  const deleteRow = (type: "weekly" | "next", index: number) => {
    if (type === "weekly") {
      const updated = weeklyActivities.filter((_, idx) => idx !== index);
      setWeeklyActivities(updated);
    } else {
      const updated = nextWeekPlan.filter((_, idx) => idx !== index);
      setNextWeekPlan(updated);
    }
  };

  // Update a specific row
  const updateRow = (
    type: "weekly" | "next",
    index: number,
    field: "description" | "percent",
    value: string
  ) => {
    const target = type === "weekly" ? [...weeklyActivities] : [...nextWeekPlan];
    if (field === "percent") {
      // Handle empty string as 0, otherwise convert to number
      target[index][field] = value === "" ? 0 : Number(value);
    } else {
      target[index][field] = value;
    }
    type === "weekly" ? setWeeklyActivities(target) : setNextWeekPlan(target);
  };

  return {
    weeklyActivities,
    setWeeklyActivities,
    nextWeekPlan,
    setNextWeekPlan,
    addRow,
    deleteRow,
    updateRow,
  };
};
