import { useState, useEffect } from "react";
import { WeeklyReportLetterProps } from "@/types/weeklyReportLetter.types";
import { formatDate } from "@/lib/dateUtils";
import { handleSignatureUpload } from "@/lib/fileUploadUtils";
import { handleFieldChange } from "@/lib/fieldUtils";

export const useWeeklyReportLetter = (data: WeeklyReportLetterProps["data"] = {}, onDataChange?: WeeklyReportLetterProps["onDataChange"]) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  const [letterData, setLetterData] = useState({
    weekNumber: data.weekNumber || "",
    dateRange: data.dateRange || "",
    projectName: data.projectName || "",
    reportDate: data.reportDate || new Date().toISOString().split("T")[0],
    recipientCompany: data.recipientCompany || "",
    recipientLocation: data.recipientLocation || "",
    recipientName: data.recipientName || "",
    ccList: data.ccList || [""],
    letterBody: data.letterBody || "",
    signatureImage: data.signatureImage || "",
    signatoryName: data.signatoryName || "",
    signatoryPosition: data.signatoryPosition || "Project Manager",
    constructorName:
      "Cambodian Advanced Construction Project Management (CACPM)",
    companyLocation:
      "8th floor, K1 Tower, No.148, Mao Tse Toung Blvd (245),Sangkat Toul Tumpong II, Khan Chamkamom, Phnom Penh, Cambodia",
    companyPhone1: "+855 (0) 23 964 417~8",
    companyPhone2: data.companyPhone2 || "",
    companyEmail1: data.companyEmail1 || "",
    companyEmail2: "info@cacpm.com.kh",
    refNoPrefix: data.refNoPrefix || "ICT-CPM-LETTER",
  });

  // Auto-generate letter body when key fields change
  useEffect(() => {
    // Parse date range to get start and end dates
    let dateRangeText = letterData.dateRange;
    if (letterData.dateRange && letterData.dateRange.includes("~")) {
      const dates = letterData.dateRange.split("~");
      if (dates.length === 2) {
        dateRangeText = `from ${dates[0].trim()} to ${dates[1].trim()}`;
      }
    }

    const generatedBody = `Dear Sir,<br>We are pleased to submit Weekly Progress Report No-${letterData.weekNumber} ${dateRangeText} for ${letterData.projectName}.<br><br>Sincerely Yours,`;
    if (generatedBody !== letterData.letterBody) {
      setLetterData((prev) => ({ ...prev, letterBody: generatedBody }));
    }
  }, [letterData.weekNumber, letterData.dateRange, letterData.projectName]);

  // Sync with shared data from parent
  useEffect(() => {
    setLetterData((prev) => {
      const updatedData = {
        ...prev,
        weekNumber: data.weekNumber || prev.weekNumber,
        dateRange: data.dateRange || prev.dateRange,
        projectName: data.projectName || prev.projectName,
        refNoPrefix: data.refNoPrefix || prev.refNoPrefix,
      };

      // Auto-update recipientCompany with employer data
      if (data.employer && data.employer !== prev.recipientCompany) {
        updatedData.recipientCompany = data.employer;
      }

      return updatedData;
    });
  }, [data]);

  // Auto-set report date based on date range
  useEffect(() => {
    if (letterData.dateRange && letterData.dateRange.includes("~")) {
      const dates = letterData.dateRange.split("~");
      if (dates.length === 2) {
        const [startDateStr] = dates[0].trim();
        const [startDay, startMonth, startYear] = startDateStr.split("-");
        const startDate = new Date(`${startMonth} ${startDay}, 20${startYear}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const reportDate = today.toISOString().split("T")[0];
        
        if (reportDate !== letterData.reportDate) {
          setLetterData((prev) => ({ ...prev, reportDate }));
          onDataChange?.({ ...letterData, reportDate });
        }
      }
    } else {
      // If no date range, use today's date
      const today = new Date().toISOString().split("T")[0];
      if (today !== letterData.reportDate) {
        setLetterData((prev) => ({ ...prev, reportDate }));
        onDataChange?.({ ...letterData, reportDate });
      }
    }
  }, [letterData.dateRange]);

  const handleCCChange = (index: number, value: string) => {
    const updatedCCList = [...letterData.ccList];
    updatedCCList[index] = value;
    setLetterData((prev) => ({ ...prev, ccList: updatedCCList }));
    onDataChange?.({ ...letterData, ccList: updatedCCList });
  };

  const addCCRow = () => {
    const updatedCCList = [...letterData.ccList, ""];
    setLetterData((prev) => ({ ...prev, ccList: updatedCCList }));
    onDataChange?.({ ...letterData, ccList: updatedCCList });
  };

  const removeCCRow = (index: number) => {
    if (letterData.ccList.length > 1) {
      const updatedCCList = letterData.ccList.filter((_, i) => i !== index);
      setLetterData((prev) => ({ ...prev, ccList: updatedCCList }));
      onDataChange?.({ ...letterData, ccList: updatedCCList });
    }
  };

  return {
    letterData,
    setLetterData,
    handleCCChange,
    addCCRow,
    removeCCRow,
  };
};
