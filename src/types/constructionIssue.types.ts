export interface ConstructionIssueProps {
  issueNumber?: number;
  location?: string;
  photo?: string | File | null;
  problem?: string;
  actionBy?: string;
  onRemove?: () => void;
}
