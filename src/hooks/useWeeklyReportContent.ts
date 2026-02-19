import { useState } from "react";
import { Section, TabType } from "@/types/weeklyReportContent.types";

export const useWeeklyReportContent = (
  externalShowIntroduction?: boolean,
  externalSetShowIntroduction?: React.Dispatch<React.SetStateAction<boolean>>,
  projectLogo?: string,
  setActiveTab?: (tab: TabType) => void,
  setShowSecondNav?: (show: boolean) => void,
  activeTab?: TabType,
  sharedData?: any
) => {
  const [internalShowIntroduction, setInternalShowIntroduction] =
    useState<boolean>(false);

  const handleIntroductionToggle = () => {
    setInternalShowIntroduction(!internalShowIntroduction);
    externalSetShowIntroduction?.(!internalShowIntroduction);
    setActiveTab?.("cover");
    setShowSecondNav?.(false);
  };

  return {
    internalShowIntroduction,
    setInternalShowIntroduction,
    handleIntroductionToggle,
  };
};
