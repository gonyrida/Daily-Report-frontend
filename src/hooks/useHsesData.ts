import { useState } from "react";
import { HsesData, HsesProps } from "@/types/hses.types";
import { createHSESections } from "@/utils/hseSectionUtils";

export const useHsesData = (initialData?: HsesData, isEditing: boolean = false) => {
  const [hsesData, setHsesData] = useState<HsesData>(
    initialData || {
      training: [
        { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
        { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" },
        { typeOfTraining: "", date: "", venue: "", trainer: "", attendee: "", remarks: "" }
      ],
      inspection: [
        { typeOfInspection: "", date: "", inspector: "", remarks: "" },
        { typeOfInspection: "", date: "", inspector: "", remarks: "" },
        { typeOfInspection: "", date: "", inspector: "", remarks: "" }
      ],
      permit: [
        { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
        { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" },
        { typeOfPermit: "", startDate: "", endDate: "", inspector: "", approver: "", remarks: "" }
      ],
      firstAidAccident: "",
      otherActivities: "",
      hsePhotoReferences: createHSESections(),
    },
  );

  const updateData = (section: keyof HsesData, value: any) => {
    const newData = { ...hsesData, [section]: value };
    setHsesData(newData);
  };

  return {
    hsesData,
    setHsesData,
    updateData,
  };
};
