import { useState, useEffect, useCallback } from "react";

export interface IssueData {
  id: string;
  issueNumber: number;
  location: string;
  problem: string;
  actionBy: string;
  photo: File | string | null;
}

interface UseIssuesReturn {
  issuesData: IssueData[];
  setIssuesData: React.Dispatch<React.SetStateAction<IssueData[]>>;
  addIssue: () => void;
  removeIssue: (index: number) => void;
  updateIssue: (index: number, data: Partial<IssueData>) => void;
  clearIssuesData: () => void;
}

export const useIssues = (initialData?: IssueData[]): UseIssuesReturn => {
  const defaultData: IssueData[] = [
    { id: crypto.randomUUID(), issueNumber: 1, location: "", problem: "", actionBy: "", photo: null }
  ];

  // Use state only - no localStorage persistence (like other sections)
  const [issuesData, setIssuesData] = useState<IssueData[]>(() => {
    return initialData || defaultData;
  });

  // Sync with external data when it changes (e.g., after loading from database)
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setIssuesData(initialData);
    }
  }, [initialData]);

  const addIssue = useCallback((): void => {
    setIssuesData(prev => {
      const newIssue: IssueData = {
        id: crypto.randomUUID(),
        issueNumber: prev.length + 1,
        location: "",
        problem: "",
        actionBy: "",
        photo: null
      };
      return [...prev, newIssue];
    });
  }, []);

  const removeIssue = useCallback((index: number): void => {
    setIssuesData(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateIssue = useCallback((index: number, data: Partial<IssueData>): void => {
    setIssuesData(prev => 
      prev.map((issue, i) => 
        i === index ? { ...issue, ...data } : issue
      )
    );
  }, []);

  const clearIssuesData = useCallback((): void => {
    setIssuesData(defaultData);
  }, []);

  return {
    issuesData,
    setIssuesData,
    addIssue,
    removeIssue,
    updateIssue,
    clearIssuesData,
  };
};
