import { ProgressRow } from "@/types/progress.types";
import OverallProgressTable from "./OverallProgressTable";

interface OverallProgressProps {
  rows?: ProgressRow[];
  setRows?: (rows: ProgressRow[]) => void;
  updateRows?: (newRows: ProgressRow[]) => void;
  addTitleRow?: () => void;
  addDetailRow?: () => void;
  descriptionsReadOnly?: boolean;
  remark?: string;
  setRemark?: (remark: string) => void;
  mode?: 'single' | 'master'; // NEW: Master mode support
}

export default function OverallProgress({ descriptionsReadOnly = false, remark, setRemark, mode, ...props }: OverallProgressProps) {
  return <OverallProgressTable {...props} descriptionsReadOnly={descriptionsReadOnly} remark={remark} setRemark={setRemark} mode={mode} />;
}
