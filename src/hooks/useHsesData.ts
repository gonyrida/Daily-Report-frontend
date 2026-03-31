import { useState, useEffect } from "react";
import { HsesData } from "@/types/hses.types";
import { createHSESections } from "@/utils/hseSectionUtils";

export const defaultHsesData: HsesData = {
  training: [
    { id: crypto.randomUUID(), typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
    { id: crypto.randomUUID(), typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
    { id: crypto.randomUUID(), typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" }
  ],
  inspection: [
    { id: crypto.randomUUID(), typeOfInspection: "", date: "", inspector: "", remarks: "" },
    { id: crypto.randomUUID(), typeOfInspection: "", date: "", inspector: "", remarks: "" },
    { id: crypto.randomUUID(), typeOfInspection: "", date: "", inspector: "", remarks: "" }
  ],
  permit: [
    { id: crypto.randomUUID(), typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
    { id: crypto.randomUUID(), typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
    { id: crypto.randomUUID(), typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" }
  ],
  firstAidAccident: "",
  otherActivities: "",
  hsePhotoReferences: createHSESections(),
};

export const useHsesData = (initialData?: HsesData, isEditing: boolean = false) => {
  const [hsesData, setHsesData] = useState<HsesData>(() => {
    return initialData || defaultHsesData;
  });

  // Sync with external data when it changes (e.g., after loading from database)
  useEffect(() => {
    if (initialData) {
      setHsesData(initialData);
    }
  }, [initialData]);

  const updateData = (section: keyof HsesData, value: any) => {
    const newData = { ...hsesData, [section]: value };
    setHsesData(newData);
  };

  const clearHsesData = () => {
    setHsesData(defaultHsesData);
  };

  return {
    hsesData,
    setHsesData,
    updateData,
    clearHsesData,
  };
};
