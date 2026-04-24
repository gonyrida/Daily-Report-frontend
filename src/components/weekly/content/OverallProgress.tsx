import { ProgressRow } from "@/types/progress.types";
import OverallProgressTable from "./OverallProgressTable";

interface OverallProgressProps {
  rows?: ProgressRow[];
  setRows?: (rows: ProgressRow[]) => void;
  updateRows?: (newRows: ProgressRow[]) => void;
  addTitleRow?: () => void;
  addDetailRow?: () => void;
  descriptionsReadOnly?: boolean;
}

export default function OverallProgress({ descriptionsReadOnly = false, ...props }: OverallProgressProps) {
  return <OverallProgressTable {...props} descriptionsReadOnly={descriptionsReadOnly} />;
}
