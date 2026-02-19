export interface ConstructionIssueProps {
  issueNumber?: number;
  siteLocation?: string;
  photoReference?: string;
  problems?: string;
  actionBy?: string;
  onRemove?: () => void;
}
