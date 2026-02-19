import { ResourceRow } from "@/components/ResourceTable";

export interface ProgressRow extends ResourceRow {
  extra?: string;
  rowType: "title" | "detail";
  displayIndex?: string;
}
