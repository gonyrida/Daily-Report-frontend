import { useState, useEffect } from "react";
import { WeeklyReportLetterProps } from "@/types/weeklyReportLetter.types";
import { formatDate } from "@/lib/dateUtils";
import { handleSignatureUpload } from "@/lib/fileUploadUtils";
import { handleFieldChange } from "@/lib/fieldUtils";
import { useTheme } from "@/contexts/ThemeContext";
import { getWeeklyReportById } from "@/services/weeklyReportService";

export interface WeeklyReportLetterData {
  refNoPrefix: string;
  weekNumber: string;
  reportDate: string;
  recipientCompany: string;
  recipientLocation: string;
  recipientName: string;
  ccList: string[];
  letterBody: string;
  signatureImage: string;
  signatoryName: string;
  signatoryPosition: string;
  constructorName: string;
  companyLocation: string;
  companyPhone1: string;
  companyPhone2: string;
  companyEmail1: string;
  companyEmail2: string;
  dateRange: string;
  projectName: string;
}

export const useWeeklyReportLetter = (reportId: string) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [data, setData] = useState<WeeklyReportLetterData>({
    refNoPrefix: "",
    weekNumber: "",
    reportDate: new Date().toISOString().split("T")[0],
    recipientCompany: "",
    recipientLocation: "",
    recipientName: "",
    ccList: [""],
    letterBody: "",
    signatureImage: "",
    signatoryName: "",
    signatoryPosition: "",
    constructorName: "",
    companyLocation: "",
    companyPhone1: "",
    companyPhone2: "",
    companyEmail1: "",
    companyEmail2: "",
    dateRange: "",
    projectName: "",
  });

  // Load letter data from API
  const refetch = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeeklyReportById(reportId);

      if (response.success && response.data) {
        const letter = response.data.sections.letter;
        if (letter) {
          setData({
            refNoPrefix: letter.refNoPrefix || "",
            weekNumber: letter.weekNumber || "",
            reportDate: letter.reportDate || new Date().toISOString().split("T")[0],
            recipientCompany: letter.recipientCompany || "",
            recipientLocation: letter.recipientLocation || "",
            recipientName: letter.recipientName || "",
            ccList: letter.ccList || [""],
            letterBody: letter.letterBody || "",
            signatureImage: letter.signatureImage || "",
            signatoryName: letter.signatoryName || "",
            signatoryPosition: letter.signatoryPosition || "",
            constructorName: letter.constructorName || "",
            companyLocation: letter.companyLocation || "",
            companyPhone1: letter.companyPhone1 || "",
            companyPhone2: letter.companyPhone2 || "",
            companyEmail1: letter.companyEmail1 || "",
            companyEmail2: letter.companyEmail2 || "",
            dateRange: letter.dateRange || "",
            projectName: letter.projectName || "",
          });
        }
      } else {
        setError(response.error || 'Failed to load letter data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (reportId) {
      refetch();
    }
  }, [reportId]);

  // Auto-generate letter body when key fields change
  useEffect(() => {
    // Parse date range to get start and end dates
    let dateRangeText = data.dateRange;
    if (data.dateRange && data.dateRange.includes("~")) {
      const dates = data.dateRange.split("~");
      if (dates.length === 2) {
        dateRangeText = `from ${dates[0].trim()} to ${dates[1].trim()}`;
      }
    }

    const generatedBody = `Dear Sir,<br>We are pleased to submit Weekly Progress Report No-${data.weekNumber} ${dateRangeText} for ${data.projectName}.<br><br>Sincerely Yours,`;
    if (generatedBody !== data.letterBody) {
      setData((prev) => ({ ...prev, letterBody: generatedBody }));
    }
  }, [data.weekNumber, data.dateRange, data.projectName]);

  // Auto-set report date based on date range
  useEffect(() => {
    if (data.dateRange && data.dateRange.includes("~")) {
      const dates = data.dateRange.split("~");
      if (dates.length === 2) {
        const [startDateStr] = dates[0].trim();
        const [startDay, startMonth, startYear] = startDateStr.split("-");
        const startDate = new Date(`${startMonth} ${startDay}, 20${startYear}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newReportDate = today.toISOString().split("T")[0];
        
        if (newReportDate !== data.reportDate) {
          setData((prev) => ({ ...prev, reportDate: newReportDate }));
        }
      }
    } else {
      // If no date range, use today's date
      const newReportDate = new Date().toISOString().split("T")[0];
      if (newReportDate !== data.reportDate) {
        setData((prev) => ({ ...prev, reportDate: newReportDate }));
      }
    }
  }, [data.dateRange]);

  const handleCCChange = (index: number, value: string) => {
    const updatedCCList = [...data.ccList];
    updatedCCList[index] = value;
    setData((prev) => ({ ...prev, ccList: updatedCCList }));
  };

  const addCCRow = () => {
    const updatedCCList = [...data.ccList, ""];
    setData((prev) => ({ ...prev, ccList: updatedCCList }));
  };

  const removeCCRow = (index: number) => {
    if (data.ccList.length > 1) {
      const updatedCCList = data.ccList.filter((_, i) => i !== index);
      setData((prev) => ({ ...prev, ccList: updatedCCList }));
    }
  };

  return {
    data,
    setData,
    isLoading,
    error,
    refetch,
    handleCCChange,
    addCCRow,
    removeCCRow,
  };
};
