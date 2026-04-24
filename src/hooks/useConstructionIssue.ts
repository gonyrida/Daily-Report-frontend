import { useState, useEffect } from "react";
import { getWeeklyReportById } from "@/services/weeklyReportService";

export interface ConstructionIssueData {
  location: string;
  photo: string | File | null;
  problem: string;
  actionBy: string;
}

export const useConstructionIssue = (reportId: string) => {
  const [data, setData] = useState<ConstructionIssueData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [slots, setSlots] = useState([
    { id: "construction-issue-photo", image: null, caption: "" },
  ]);

  // Load construction issue data
  const refetch = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeeklyReportById(reportId);

      if (response.success && response.data) {
        const issues = response.data.sections.constructionIssues;
        if (issues && issues.length > 0) {
          const firstIssue = issues[0];
          setData({
            location: firstIssue.location || "",
            photo: firstIssue.photo || "",
            problem: firstIssue.problem || "",
            actionBy: firstIssue.actionBy || "",
          });
        }
      } else {
        setError(response.error || 'Failed to load construction issues');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (reportId) {
      refetch();
    }
  }, [reportId]);

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((f) => f ? ({ ...f, [key]: e.target.value }) : null);

  const onUpdateSlot = (updatedSlot: any) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)),
    );
  };

  const onDeleteSlot = (slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, image: null, caption: "" } : slot,
      ),
    );
  };

  return {
    data,
    setData,
    isLoading,
    error,
    refetch,
    slots,
    setSlots,
    update,
    onUpdateSlot,
    onDeleteSlot,
  };
};
