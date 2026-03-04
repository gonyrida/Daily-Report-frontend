import { useState } from "react";

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

  const addIssue = (): void => {
    const newIssue: IssueData = {
      id: crypto.randomUUID(),
      issueNumber: issuesData.length + 1,
      location: "",
      problem: "",
      actionBy: "",
      photo: null
    };
    setIssuesData(prev => [...prev, newIssue]);
  };

  const removeIssue = (index: number): void => {
    setIssuesData(prev => prev.filter((_, i) => i !== index));
  };

  const updateIssue = (index: number, data: Partial<IssueData>): void => {
    setIssuesData(prev => 
      prev.map((issue, i) => 
        i === index ? { ...issue, ...data } : issue
      )
    );
  };

  const clearIssuesData = (): void => {
    setIssuesData(defaultData);
  };

  return {
    issuesData,
    setIssuesData,
    addIssue,
    removeIssue,
    updateIssue,
    clearIssuesData,
  };
};
