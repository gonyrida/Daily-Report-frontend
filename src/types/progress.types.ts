import { ResourceRow } from "@/components/ResourceTable";

export interface ProgressRow extends ResourceRow {
  rowType: "title" | "detail";
  displayIndex?: string;
}
