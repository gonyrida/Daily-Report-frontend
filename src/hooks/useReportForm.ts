// src/hooks/useReportForm.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { ResourceRow } from "@/components/ResourceTable";
import { ReportData } from "@/types/report";
import { loadReportFromDB } from "@/integrations/reportsApi";
import {
  loadDraftLocally,
  saveDraftLocally,
  dateKey,
} from "@/lib/storageUtils";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel, exportToZIP } from "@/lib/exportUtils";
import { saveReportToDB, submitReportToDB, createBlankReport, autoSaveReport } from "@/integrations/reportsApi";
import { generateCombinedExcel } from "@/integrations/reportsApi";
import { apiGet } from "@/lib/apiFetch";
import { getAutoSavePreference } from "@/lib/notificationUtils";

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

  // Google Docs-style state
  const [reportId, setReportId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Helper to package all state into the ReportData format
  const getReportData = useCallback(
    (): ReportData => ({
      projectName,
      // Fixed logic: ensures we return a string or null as per your Interface
      reportDate: reportDate
        ? reportDate.toISOString()
        : new Date().toISOString(),
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
    if (!reportDate || initialLoadDoneRef.current) {
      console.log("🔒 LOAD INITIAL: Skipping - no date or already loaded");
      return;
    }
    
    // CRITICAL: Only load after authentication is confirmed
    console.log("🔒 LOAD INITIAL: Starting report load for date:", reportDate);
    initialLoadDoneRef.current = true;

    try {
      const dbReport = await loadReportFromDB(reportDate);
      if (dbReport) {
        console.log("🔒 LOAD INITIAL: Found DB report, filling form");
        fillForm(dbReport);
      } else {
        console.log("🔒 LOAD INITIAL: No DB report, checking local draft");
        const localDraft = loadDraftLocally(reportDate);
        if (localDraft) {
          console.log("🔒 LOAD INITIAL: Found local draft, filling form");
          fillForm(localDraft);
        } else {
          console.log("🔒 LOAD INITIAL: No draft found, using defaults");
        }
      }
    } catch (e) {
      console.error("🔒 LOAD INITIAL: Failed to load report:", e);
      const localDraft = loadDraftLocally(reportDate);
      if (localDraft) {
        console.log("🔒 LOAD INITIAL: Fallback to local draft");
        fillForm(localDraft);
      }
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
    setReportId(null);
    setLastSavedAt(null);
  }, []);

  // Google Docs-style: Create blank report immediately
  const createNewBlankReport = useCallback(async (projectName?: string) => {
    try {
      setIsSaving(true);
      console.log("🔒 CREATE BLANK: Creating new blank report");
      
      const result = await createBlankReport(projectName);
      
      if (result.success && result.data) {
        setReportId(result.data._id);
        setProjectName(result.data.projectName);
        setReportDate(new Date(result.data.reportDate));
        setLastSavedAt(new Date(result.data.updatedAt));
        
        console.log("🔒 CREATE BLANK: Success, reportId:", result.data._id);
        
        toast({
          title: "New Report Created",
          description: "Your blank report is ready. Start typing to begin!",
        });
        
        return result.data;
      }
    } catch (error: any) {
      console.error("🔒 CREATE BLANK: Error:", error);
      toast({
        title: "Failed to Create Report",
        description: error.message || "Could not create new report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Google Docs-style: Auto-save with debounce
  const debouncedAutoSave = useRef<NodeJS.Timeout | null>(null);
  
  const triggerAutoSave = useCallback((partialData: Partial<ReportData>) => {
    if (!reportId) {
      console.log("🔒 AUTO-SAVE: No reportId, skipping auto-save");
      return;
    }

    if (debouncedAutoSave.current) {
      clearTimeout(debouncedAutoSave.current);
    }

    debouncedAutoSave.current = setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        console.log("🔒 AUTO-SAVE: Triggering auto-save for reportId:", reportId);
        
        const result = await autoSaveReport(reportId, partialData);
        
        if (result.success) {
          setLastSavedAt(new Date());
          console.log("🔒 AUTO-SAVE: Success");
        }
      } catch (error: any) {
        console.error("🔒 AUTO-SAVE: Error:", error);
        // Silent fail for auto-save to not interrupt user
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000); // 1 second debounce
  }, [reportId]);

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (!reportId) return;

    const currentData = {
      projectName,
      reportDate: reportDate?.toISOString(),
      weather,
      weatherPeriod,
      temperature,
      activityToday,
      workPlanNextDay,
      managementTeam,
      workingTeam,
      materials,
      machinery,
    };

    triggerAutoSave(currentData);
  }, [
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
    triggerAutoSave,
  ]);

  // Your logic moved into the hook
  useEffect(() => {
    const newDateStr = reportDate?.toISOString().slice(0, 10) || null;
    const prevDateStr = lastDateRef.current;

    if (prevDateStr && newDateStr && prevDateStr !== newDateStr) {
      // Date changed: save current date draft locally
      saveDraftLocally(new Date(prevDateStr), getReportData());

      // Carry forward logic
      const prevReport = getReportData();
      const carryForward = (items: any[]) =>
        items.map((r) => ({
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

  // CRITICAL: Only load data after auth success
  useEffect(() => {
    console.log("🔒 USE FORM: Component mounted, waiting for auth confirmation");
    // Note: This will only execute if component is wrapped in ProtectedRoute
    // which ensures authentication is confirmed before rendering
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

  // 1. Auto-save logic (Now hidden from Index.tsx) - Enhanced with user preferences
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const setupAutoSave = async () => {
      const autoSaveEnabled = await getAutoSavePreference();
      
      if (autoSaveEnabled) {
        interval = setInterval(() => {
          saveDraft(true); // Silent save
        }, 30000); // 30 seconds
        console.log("🔧 Auto-save enabled (30-second interval)");
      } else {
        console.log("🔧 Auto-save disabled by user preference");
      }
    };

    setupAutoSave();
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [saveDraft]);

  // Debounced auto-save on resource changes - Enhanced with user preferences
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSaveDraft = useCallback(async () => {
    const autoSaveEnabled = await getAutoSavePreference();
    
    if (!autoSaveEnabled) {
      console.log("🔧 Debounced auto-save skipped - disabled by user preference");
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      saveDraft(true); // silent save
    }, 2000); // 2 seconds debounce
  }, [saveDraft]);

  useEffect(() => {
    debouncedSaveDraft();
  }, [managementTeam, workingTeam, materials, machinery, debouncedSaveDraft]);

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
        reportDate: rawData.reportDate
          ? new Date(rawData.reportDate)
          : new Date(),
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
        reportDate: rawData.reportDate
          ? new Date(rawData.reportDate)
          : new Date(),
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

  // Reuse the PDF logic for the download button in the preview modal
  const handleDownloadFromPreview = useCallback(async () => {
    // We can literally just call the function we already wrote!
    await handleExportPDF();
  }, [handleExportPDF]);

  // Helper function for save → export flow
  const saveAndExport = useCallback(
    async (exportFunction: (data: any) => void | Promise<void>) => {
      if (!validateReport()) return;

      setIsExporting(true);
      try {
        // 1. Prepare and clean data for saving
        const rawData = getReportData();

        // FIX: Create the perfect UTC date string (YYYY-MM-DD)
        const d = new Date(rawData.reportDate!);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const perfectDateStr = `${year}-${month}-${day}`;

        const cleanedData = {
          ...rawData,
          reportDate: perfectDateStr, // Use the clean string here!
          managementTeam: cleanResourceRows(rawData.managementTeam),
          workingTeam: cleanResourceRows(rawData.workingTeam),
          materials: cleanResourceRows(rawData.materials),
          machinery: cleanResourceRows(rawData.machinery),
        };

        // 2. Save to database first
        console.log("DEBUG FRONTEND: About to save report to DB:", cleanedData);
        await saveReportToDB(cleanedData);
        console.log("DEBUG FRONTEND: Save to DB completed successfully");

        // 3. If save succeeds, proceed with export
        // Map weather and temperature based on weatherPeriod for export utilities
        const dataForExport = {
          ...rawData,
          reportDate: rawData.reportDate
            ? new Date(rawData.reportDate)
            : new Date(),
          weatherAM: rawData.weatherPeriod === "AM" ? rawData.weather : "",
          weatherPM: rawData.weatherPeriod === "PM" ? rawData.weather : "",
          tempAM: rawData.weatherPeriod === "AM" ? rawData.temperature : "",
          tempPM: rawData.weatherPeriod === "PM" ? rawData.temperature : "",
        };

        await exportFunction(dataForExport as any);

        toast({
          title: "Export Completed",
          description: "Your report has been saved and exported successfully.",
        });
      } catch (e: any) {
        console.error("Export Error:", e);
        toast({
          title: "Export Failed",
          description:
            e.message || "Could not save and export. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [validateReport, getReportData, toast, cleanResourceRows]
  );

  const handleExportExcel = useCallback(async () => {
    await saveAndExport(exportToExcel);
  }, [saveAndExport]);

  const handleExportAll = useCallback(async () => {
    await saveAndExport(exportToZIP);
  }, [saveAndExport]);

  // Helper function for combined Excel export with save → export flow
  const saveAndExportCombinedExcel = useCallback(
    async (referenceSections: any[], tableTitle: string, fileName: string) => {
      if (!validateReport()) return;

      setIsExporting(true);
      try {
        // 1. Prepare and clean data for saving
        const rawData = getReportData();

        // FIX: Create the perfect UTC date string (YYYY-MM-DD)
        const d = new Date(rawData.reportDate!);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const perfectDateStr = `${year}-${month}-${day}`;

        const cleanedData = {
          ...rawData,
          reportDate: perfectDateStr, // Use the clean string here!
          managementTeam: cleanResourceRows(rawData.managementTeam),
          workingTeam: cleanResourceRows(rawData.workingTeam),
          materials: cleanResourceRows(rawData.materials),
          machinery: cleanResourceRows(rawData.machinery),
        };

        // 2. Save to database first
        await saveReportToDB(cleanedData);

        // 3. If save succeeds, proceed with export
        // Map weather and temperature based on weatherPeriod for export utilities
        const dataForExport = {
          projectName: rawData.projectName,
          reportDate: rawData.reportDate
            ? new Date(rawData.reportDate)
            : new Date(),
          weatherAM: rawData.weatherPeriod === "AM" ? rawData.weather : "",
          weatherPM: rawData.weatherPeriod === "PM" ? rawData.weather : "",
          tempAM: rawData.weatherPeriod === "AM" ? rawData.temperature : "",
          tempPM: rawData.weatherPeriod === "PM" ? rawData.temperature : "",
          activityToday: rawData.activityToday,
          workPlanNextDay: rawData.workPlanNextDay,
          managementTeam: rawData.managementTeam,
          workingTeam: rawData.workingTeam,
          materials: rawData.materials,
          machinery: rawData.machinery,
        };

        // 4. Process images for reference sections
        const toBase64DataUrl = async (
          img: unknown
        ): Promise<string | null> => {
          if (!img) return null;

          // Case 1: already a string (blob URL, data URL, http URL, etc.)
          if (typeof img === "string") {
            if (!img.startsWith("blob:")) return img;

            const resp = await apiGet(img);
            const blob = await resp.blob();

            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }

          // Case 2: File object (common)
          if (img instanceof File) {
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(img);
            });
          }

          // Case 3: unknown object shape (skip it safely)
          return null;
        };

        const processImages = async (sectionsArr: any[]) => {
          return await Promise.all(
            sectionsArr.map(async (sec: any) => {
              const newEntries = await Promise.all(
                (sec.entries ?? []).map(async (entry: any) => {
                  const newSlots = await Promise.all(
                    (entry.slots ?? []).map(async (slot: any) => ({
                      ...slot,
                      image: await toBase64DataUrl(slot.image),
                    }))
                  );
                  return { ...entry, slots: newSlots };
                })
              );
              return { ...sec, entries: newEntries };
            })
          );
        };

        const processedSections = await processImages(referenceSections);

        // 5. Generate combined Excel
        await generateCombinedExcel(
          dataForExport,
          processedSections,
          tableTitle,
          fileName
        );

        toast({
          title: "Combined Excel Exported",
          description: "Your report has been saved and exported successfully.",
        });
      } catch (e: any) {
        console.error("Combined Export Error:", e);
        toast({
          title: "Export Failed",
          description:
            e.message || "Could not save and export. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [validateReport, getReportData, toast, cleanResourceRows]
  );

  const handleExportCombinedExcel = useCallback(
    async (
      referenceSections: any[],
      tableTitle: string = "HSE Toolbox Meeting",
      fileName: string
    ) => {
      await saveAndExportCombinedExcel(referenceSections, tableTitle, fileName);
    },
    [saveAndExportCombinedExcel]
  );

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
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
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
        description:
          "Your report has been submitted successfully. Tomorrow's report is ready with carried-forward totals.",
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
    projectName,
    setProjectName,
    reportDate,
    setReportDate,
    weather,
    setWeather,
    weatherPeriod,
    setWeatherPeriod,
    temperature,
    setTemperature,
    activityToday,
    setActivityToday,
    workPlanNextDay,
    setWorkPlanNextDay,
    managementTeam,
    setManagementTeam,
    workingTeam,
    setWorkingTeam,
    materials,
    setMaterials,
    machinery,
    setMachinery,

    // UI State
    isSaving,
    setIsSaving,
    isExporting,
    setIsExporting,
    isPreviewing,
    setIsPreviewing,
    isSubmitting,
    setIsSubmitting,

    // Google Docs-style State
    reportId,
    setReportId,
    lastSavedAt,
    isAutoSaving,

    // Helper
    getReportData,

    loadInitialReport,
    fillForm,
    clearForm,
    previewUrl,
    setPreviewUrl,
    showPreview,
    setShowPreview,
    saveDraft,
    validateReport,
    handleExportPDF,
    handlePreview,
    handleDownloadFromPreview,
    handleExportExcel,
    cleanResourceRows,
    handleExportAll,
    handleExportCombinedExcel,
    handleClear,
    handleSubmit,

    // Google Docs-style Functions
    createNewBlankReport,
    triggerAutoSave,
  };
};
