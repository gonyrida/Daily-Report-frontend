import { QaqcRow } from "@/types/qaqc.types";

export const makeRow = (): QaqcRow => ({
  id: crypto.randomUUID(),
  code: "",
  description: "",
  status: "",
  dateResponse: "",
  comment: "",
});
