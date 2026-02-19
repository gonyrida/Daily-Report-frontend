import { ProgressRow } from "@/types/progress.types";
import OverallProgressTable from "./OverallProgressTable";

interface OverallProgressProps {
  rows?: ProgressRow[];
  setRows?: (rows: ProgressRow[]) => void;
  updateRows?: (newRows: ProgressRow[]) => void;
  addTitleRow?: () => void;
  addDetailRow?: () => void;
}

export default function OverallProgress({
  rows = [],
  setRows = () => {},
  updateRows = () => {},
  addTitleRow = () => {},
  addDetailRow = () => {}
}: OverallProgressProps) {
  return (
    <OverallProgressTable
      rows={rows}
      setRows={setRows}
      updateRows={updateRows}
      addTitleRow={addTitleRow}
      addDetailRow={addDetailRow}
    />
  );
}
