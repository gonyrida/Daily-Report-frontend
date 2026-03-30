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
  console.log('[OverallProgress] rows received:', props.rows);
  console.log('[OverallProgress] rows length:', props.rows?.length);
  console.log('[OverallProgress] first row:', props.rows?.[0]);
  return <OverallProgressTable {...props} descriptionsReadOnly={descriptionsReadOnly} />;
}
