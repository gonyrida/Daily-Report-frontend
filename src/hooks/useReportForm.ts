// src/hooks/useReportForm.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { ResourceRow } from "@/components/ResourceTable";
import { ReportData } from "@/types/report";
import { loadReportFromDB } from "@/integrations/reportsApi";
import { loadDraftLocally, saveDraftLocally, dateKey } from "@/lib/storageUtils";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel, exportToZIP } from "@/lib/exportUtils";
import { saveReportToDB, submitReportToDB } from "@/integrations/reportsApi";

export const useReportForm = () => {
  // Project Info
  const [projectName, setProjectName] = useState("");
  const [reportDate, setReportDate] = useState<Date | undefined>(undefined);
  const [weather, setWeather] = useState("Sunny");
  const [weatherPeriod, setWeatherPeriod] = useState<"AM" | "PM">("AM");
  const [temperature, setTemperature] = useState("");

  // Activities
  const [activityToday, setActivityToday] = useState("");
  const [workPlanNextDay, setWorkPlanNextDay] = useState("");

  // Resources
  const [managementTeam, setManagementTeam] = useState<ResourceRow[]>([]);
  const [workingTeam, setWorkingTeam] = useState<ResourceRow[]>([]);
  const [materials, setMaterials] = useState<ResourceRow[]>([]);
  const [machinery, setMachinery] = useState<ResourceRow[]>([]);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to package all state into the ReportData format
  const getReportData = useCallback(
      (): ReportData => ({
        projectName,
        // Fixed logic: ensures we return a string or null as per your Interface
        reportDate: reportDate ? reportDate.toISOString() : new Date().toISOString(),
        weather,
        weatherPeriod,
        temperature,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      }),
      [
        projectName,
        reportDate,
        weather,
        weatherPeriod,
        temperature,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      ]
    );

  const initialLoadDoneRef = useRef(false);

  // Helper to fill all fields at once
  const fillForm = useCallback((data: Partial<ReportData>) => {
    setProjectName(data.projectName || "");
    setReportDate(data.reportDate ? new Date(data.reportDate) : new Date());
    setWeather(data.weather || "Sunny");
    setWeatherPeriod(data.weatherPeriod || "AM");
    setTemperature(data.temperature || "");
    setActivityToday(data.activityToday || "");
    setWorkPlanNextDay(data.workPlanNextDay || "");
    setManagementTeam(data.managementTeam || []);
    setWorkingTeam(data.workingTeam || []);
    setMaterials(data.materials || []);
    setMachinery(data.machinery || []);
  }, []);

  const loadInitialReport = useCallback(async () => {
    if (!reportDate || initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;

    try {
      const dbReport = await loadReportFromDB(reportDate);
      if (dbReport) {
        fillForm(dbReport);
      } else {
        const localDraft = loadDraftLocally(reportDate);
        if (localDraft) fillForm(localDraft);
      }
    } catch (e) {
      console.error("Failed to load report:", e);
      const localDraft = loadDraftLocally(reportDate);
      if (localDraft) fillForm(localDraft);
    }
  }, [reportDate, fillForm]);

  const lastDateRef = useRef<string | null>(null);

  // Helper to clear the form to defaults
  const clearForm = useCallback(() => {
    setProjectName("");
    setWeather("Sunny");
    setWeatherPeriod("AM");
    setTemperature("");
    setActivityToday("");
    setWorkPlanNextDay("");
    setManagementTeam([]);
    setWorkingTeam([]);
    setMaterials([]);
    setMachinery([]);
  }, []);

  // Your logic moved into the hook
  useEffect(() => {
    const newDateStr = reportDate?.toISOString().slice(0, 10) || null;
    const prevDateStr = lastDateRef.current;

    if (prevDateStr && newDateStr && prevDateStr !== newDateStr) {
      // Date changed: save current date draft locally
      saveDraftLocally(new Date(prevDateStr), getReportData());

      // Carry forward logic
      const prevReport = getReportData();
      const carryForward = (items: any[]) => items.map(r => ({
        ...r,
        prev: r.accumulated,
        today: 0,
        accumulated: r.accumulated,
      }));

      setManagementTeam(carryForward(prevReport.managementTeam));
      setWorkingTeam(carryForward(prevReport.workingTeam));
      setMaterials(carryForward(prevReport.materials));
      setMachinery(carryForward(prevReport.machinery));

    } else if (newDateStr && !prevDateStr) {
      // First selection logic
      const loadDataForDate = async () => {
        try {
          const dbReport = await loadReportFromDB(reportDate!);
          if (dbReport) {
            fillForm(dbReport);
            return;
          }
          const localDraft = loadDraftLocally(reportDate!);
          if (localDraft) {
            fillForm(localDraft);
            return;
          }
        } catch (e) {
          console.error("Failed to load report for date:", e);
        }
        clearForm();
      };
      loadDataForDate();
    }

    lastDateRef.current = newDateStr;
  }, [reportDate, getReportData, fillForm, clearForm]);

  // Move the "On Mount" trigger inside the hook!
  useEffect(() => {
    loadInitialReport();
  }, [loadInitialReport]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { toast } = useToast();
  const saveDraft = useCallback(
    (silent = false) => {
      setIsSaving(true);
      try {
        saveDraftLocally(reportDate, getReportData());
        if (!silent) {
          toast({
            title: "Draft Saved",
            description: "Your report has been saved locally.",
          });
        }
      } catch (e) {
        if (!silent) {
          toast({
            title: "Save Failed",
            description: "Could not save your draft. Please try again.",
            variant: "destructive",
          });
        }
      }
      // Give it a little delay for the UI "Saving..." state to feel real
      setTimeout(() => setIsSaving(false), 500);
    },
    [reportDate, getReportData, toast]
  );

// 1. Auto-save logic (Now hidden from Index.tsx)
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(true); // Silent save
    }, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  // 2. Validation logic
  const validateReport = useCallback((): boolean => {
    if (!projectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive",
      });
      return false;
    }
    if (!reportDate) {
      toast({
        title: "Validation Error",
        description: "Report date is required.",
        variant: "destructive",
      });
      return false;
    }
    if (!activityToday.trim()) {
      toast({
        title: "Validation Error",
        description: "Today's activity description is required.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [projectName, reportDate, activityToday, toast]);

  const handleExportPDF = useCallback(async () => {
    if (!validateReport()) return;

    setIsExporting(true);
    try {
      const rawData = getReportData();

      // Transform the string date into a Date object for the PDF utility
      const dataForExport = {
        ...rawData,
        reportDate: rawData.reportDate ? new Date(rawData.reportDate) : new Date(),
      };

      // Use "as any" here if the exportToPDF still complains about 
      // internal ResourceRow types, or just pass the transformed object
      await exportToPDF(dataForExport as any, false);

      toast({
        title: "PDF Exported",
        description: "Your report has been exported as PDF successfully.",
      });
    } catch (e) {
      console.error("PDF Export Error:", e);
      toast({
        title: "Export Failed",
        description: "Could not export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [validateReport, getReportData, toast]);

  const handlePreview = useCallback(async () => {
    if (!validateReport()) return;

    setIsPreviewing(true);
    try {
      const rawData = getReportData();
      
      // Convert date to Date object for the utility, same as export
      const dataForPreview = {
        ...rawData,
        reportDate: rawData.reportDate ? new Date(rawData.reportDate) : new Date(),
      };

      // Call utility with 'true' for the preview argument
      const url = (await exportToPDF(dataForPreview as any, true)) as string;

      setPreviewUrl(url);
      setShowPreview(true);
    } catch (e) {
      console.error("Preview Error:", e);
      toast({
        title: "Preview Failed",
        description: "Could not generate preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  }, [validateReport, getReportData, toast]);

// Reuse the PDF logic for the download button in the preview modal
  const handleDownloadFromPreview = useCallback(async () => {
    // We can literally just call the function we already wrote!
    await handleExportPDF();
  }, [handleExportPDF]);

  const handleExportExcel = useCallback(() => {
    if (!validateReport()) return;

    setIsExporting(true);
    try {
      const rawData = getReportData();
      
      // Transform date for Excel utility
      const dataForExcel = {
        ...rawData,
        reportDate: rawData.reportDate ? new Date(rawData.reportDate) : new Date(),
      };

      exportToExcel(dataForExcel as any);

      toast({
        title: "Excel Exported",
        description: "Your report has been exported as Excel successfully.",
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "Could not export Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [validateReport, getReportData, toast]);

  // 1. Add this helper inside the hook (before the handleExport methods)
  const cleanResourceRows = (rows: ResourceRow[]) => {
    return rows
      .filter(
        (r) =>
          (r.description && r.description.trim() !== "") ||
          (r.prev && r.prev > 0) ||
          (r.today && r.today > 0) ||
          (r.accumulated && r.accumulated > 0)
      )
      .map((r) => ({
        id: r.id,
        description: r.description?.trim() || "",
        unit: r.unit || "",
        prev: r.prev || 0,
        today: r.today || 0,
        accumulated: r.accumulated || 0,
      }));
  };

  // 2. Add the Export All logic
  const handleExportAll = useCallback(async () => {
    if (!validateReport()) return;

    setIsExporting(true);
    try {
      const rawData = getReportData();
      const dataForExport = {
        ...rawData,
        reportDate: rawData.reportDate ? new Date(rawData.reportDate) : new Date(),
      };

      // Export as ZIP containing both PDF and Excel
      await exportToZIP(dataForExport as any);

      toast({
        title: "Export Completed",
        description: "Your report has been exported as a ZIP file containing both PDF and Excel files.",
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "Could not export ZIP file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [validateReport, getReportData, toast]);

  // 3. Add the Clear logic
  const handleClear = useCallback(() => {
    // Reset all states
    setProjectName("");
    setReportDate(new Date());
    setWeather("Sunny");
    setWeatherPeriod("AM");
    setTemperature("");
    setActivityToday("");
    setWorkPlanNextDay("");
    setManagementTeam([]);
    setWorkingTeam([]);
    setMaterials([]);
    setMachinery([]);

    // Clear storage
    if (reportDate) {
      localStorage.removeItem(dateKey(reportDate));
    }

    toast({
      title: "Data Cleared",
      description: "All form data has been cleared.",
    });
  }, [reportDate, toast]);

  const handleSubmit = useCallback(async () => {
    if (!validateReport()) return;

    setIsSubmitting(true);
    try {
      // 1. Prepare and clean data
      const rawData = getReportData();
      
      // FIX: Create the perfect UTC date string (YYYY-MM-DD)
      const d = new Date(rawData.reportDate!);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const perfectDateStr = `${year}-${month}-${day}`; 

      const cleanedData = {
        ...rawData,
        reportDate: perfectDateStr, // Use the clean string here!
        managementTeam: cleanResourceRows(rawData.managementTeam),
        workingTeam: cleanResourceRows(rawData.workingTeam),
        materials: cleanResourceRows(rawData.materials),
        machinery: cleanResourceRows(rawData.machinery),
      };

      // 2. Database Actions
      // Now both calls use the EXACT same date string
      await saveReportToDB(cleanedData);
      await submitReportToDB(
        cleanedData.projectName,
        new Date(perfectDateStr) // This matches what saveReportToDB just sent
      );

      // 3. Cleanup current day
      localStorage.removeItem(dateKey(reportDate));

      // 4. Carry-Forward Logic for Tomorrow - Safely increment to UTC Midnight
      const nextDay = new Date(reportDate!);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      nextDay.setUTCHours(0, 0, 0, 0);

      const carryForwardData = {
        projectName: cleanedData.projectName,
        reportDate: nextDay.toISOString(), // Cleanly formatted for tomorrow
        weather: "Sunny" as const,
        weatherPeriod: "AM" as "AM" | "PM",
        temperature: "",
        activityToday: "",
        workPlanNextDay: "",
        managementTeam: cleanedData.managementTeam.map((r: any) => ({
          ...r,
          prev: r.accumulated, // Move today's totals to tomorrow's "previous"
          today: 0,
          accumulated: r.accumulated,
        })),
        workingTeam: cleanedData.workingTeam.map((r: any) => ({
          ...r,
          prev: r.accumulated,
          today: 0,
          accumulated: r.accumulated,
        })),
        materials: cleanedData.materials.map((r: any) => ({
          ...r,
          prev: r.accumulated,
          today: 0,
          accumulated: r.accumulated,
        })),
        machinery: cleanedData.machinery.map((r: any) => ({
          ...r,
          prev: r.accumulated,
          today: 0,
          accumulated: r.accumulated,
        })),
      };

      // Save the template for the next user session
      saveDraftLocally(nextDay, carryForwardData);

      toast({
        title: "Report Submitted",
        description: "Your report has been submitted successfully. Tomorrow's report is ready with carried-forward totals.",
        duration: 5000,
      });
    } catch (e: any) {
      toast({
        title: "Submission Failed",
        description: e.message || "Could not submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [reportDate, validateReport, getReportData, toast]);

  return {
    // Data State
    projectName, setProjectName,
    reportDate, setReportDate,
    weather, setWeather,
    weatherPeriod, setWeatherPeriod,
    temperature, setTemperature,
    activityToday, setActivityToday,
    workPlanNextDay, setWorkPlanNextDay,
    managementTeam, setManagementTeam,
    workingTeam, setWorkingTeam,
    materials, setMaterials,
    machinery, setMachinery,
    
    // UI State
    isSaving, setIsSaving,
    isExporting, setIsExporting,
    isPreviewing, setIsPreviewing,
    isSubmitting, setIsSubmitting,
    
    // Helper
    getReportData,

    loadInitialReport,
    fillForm,
    clearForm,
    previewUrl, setPreviewUrl,
    showPreview, setShowPreview,
    saveDraft, validateReport,
    handleExportPDF, handlePreview,
    handleDownloadFromPreview, handleExportExcel,
    cleanResourceRows, handleExportAll,
    handleClear, handleSubmit
  };
};