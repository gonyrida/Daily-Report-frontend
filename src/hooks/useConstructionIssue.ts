import { useState } from "react";
import { ConstructionIssueProps } from "@/types/constructionIssue.types";

export const useConstructionIssue = (initialProps: ConstructionIssueProps) => {
  const [fields, setFields] = useState({
    siteLocation: initialProps.siteLocation || "",
    photoReference: initialProps.photoReference || "",
    problems: initialProps.problems || "",
    actionBy: initialProps.actionBy || "",
  });

  const [slots, setSlots] = useState([
    { id: "construction-issue-photo", image: null, caption: "" },
  ]);

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const onUpdateSlot = (updatedSlot: any) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)),
    );
  };

  const onDeleteSlot = (slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, image: null, caption: "" } : slot,
      ),
    );
  };

  return {
    fields,
    setFields,
    slots,
    setSlots,
    update,
    onUpdateSlot,
    onDeleteSlot,
  };
};
