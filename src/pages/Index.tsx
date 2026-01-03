import React, { useCallback, useEffect, useRef, useState } from "react";
import ReportHeader from "@/components/ReportHeader";
import ProjectInfo from "@/components/ProjectInfo";
import ActivitySection from "@/components/ActivitySection";
import ResourcesSection from "@/components/ResourcesSection";
import ReportActions from "@/components/ReportActions";
import PDFPreviewModal from "@/components/PDFPreviewModal";
import ReferenceSection from "@/components/ReferenceSection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileType,
} from "lucide-react";
import { ResourceRow } from "@/components/ResourceTable";
import {
  exportToPDF,
  exportToExcel,
  exportToZIP,
  exportToWord,
} from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import {
  generatePythonExcel,
  generateReferenceExcel,
  generateCombinedExcel,
} from "@/integrations/reportsApi";
import { API_ENDPOINTS } from "@/config/api";

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// API functions
const saveReportToDB = async (reportData: ReportData) => {
  const response = await fetch(API_ENDPOINTS.DAILY_REPORTS.SAVE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(reportData),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to save report" }));
    throw new Error(error.message || "Failed to save report");
  }
  return response.json();
};

const submitReportToDB = async (projectName: string, reportDate: Date) => {
  const dateStr = reportDate.toISOString().split("T")[0];
  const response = await fetch(API_ENDPOINTS.DAILY_REPORTS.SUBMIT, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ projectName, date: dateStr }),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to submit report" }));
    throw new Error(error.message || "Failed to submit report");
  }
  return response.json();
};

// FIXED: Removed duplicate "daily-reports" from path
const loadReportFromDB = async (reportDate: Date) => {
  try {
    const dateStr = reportDate.toISOString().split("T")[0];
    const token = localStorage.getItem("token"); // get token from login

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const response = await fetch(
      API_ENDPOINTS.DAILY_REPORTS.GET_BY_DATE(dateStr),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // send token to backend
        },
      }
    );

    // 404 is expected when no report exists for this date - return null silently
    if (response.status === 404) {
      return null; // report not found - this is normal for new dates
    }

    if (!response.ok) {
      throw new Error(`Failed to load report: ${response.statusText}`);
    }

    return response.json(); // return report data
  } catch (err) {
    // Only log errors that are not 404 (which is expected)
    if (err instanceof Error && !err.message.includes("404")) {
      console.error("Error loading report:", err);
    }
    // Re-throw only if it's not a handled 404
    if (err instanceof Error && err.message.includes("404")) {
      return null;
    }
    throw err;
  }
};

// Local Storage helpers (for offline drafts)
const STORAGE_PREFIX = "daily-report:";
const dateKey = (date: Date | undefined): string => {
  if (!date) return STORAGE_PREFIX + "unknown";
  return STORAGE_PREFIX + date.toISOString().slice(0, 10);
};

function saveDraftLocally(date: Date | undefined, data: ReportData): void {
  try {
    localStorage.setItem(dateKey(date), JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

function loadDraftLocally(date: Date | undefined): ReportData | null {
  try {
    const raw = localStorage.getItem(dateKey(date));
    return raw ? (JSON.parse(raw) as ReportData) : null;
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
    return null;
  }
}

interface ReportData {
  projectName: string;
  reportDate: string | null;
  weatherAM?: string;
  weatherPM?: string;
  tempAM?: string;
  tempPM?: string;
  currentPeriod?: "AM" | "PM";
  // Backward compatibility properties
  weather?: string;
  weatherPeriod?: "AM" | "PM";
  temperature?: string;
  activityToday: string;
  workPlanNextDay: string;
  managementTeam: ResourceRow[];
  workingTeam: ResourceRow[];
  materials: ResourceRow[];
  machinery: ResourceRow[];
  // Optional merged-reference data (kept optional so export logic isn't changed yet)
  referenceSections?: any[];
}

const Index = () => {
  const { toast } = useToast();

  // Project Info
  const [projectName, setProjectName] = useState("");
  const [reportDate, setReportDate] = useState<Date | undefined>(new Date());
  const [weatherAM, setWeatherAM] = useState("");
  const [weatherPM, setWeatherPM] = useState("");
  const [tempAM, setTempAM] = useState("");
  const [tempPM, setTempPM] = useState("");
  const [currentPeriod, setCurrentPeriod] = useState<"AM" | "PM">("AM");

  // Activities
  const [activityToday, setActivityToday] = useState("");
  const [workPlanNextDay, setWorkPlanNextDay] = useState("");

  // Resources
  const [managementTeam, setManagementTeam] = useState<ResourceRow[]>([]);
  const [workingTeam, setWorkingTeam] = useState<ResourceRow[]>([]);
  const [materials, setMaterials] = useState<ResourceRow[]>([]);
  const [machinery, setMachinery] = useState<ResourceRow[]>([]);

  // Reference Section state
  const [referenceSections, setReferenceSections] = useState<any[]>([]);
  const [tableTitle, setTableTitle] = useState("SITE PHOTO EVIDENCE");
  const [isExportingReference, setIsExportingReference] = useState(false);

  // Combined Export state
  const [isExportingCombined, setIsExportingCombined] = useState(false);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Track previous date to detect changes
  const lastDateRef = useRef<string | null>(null);
  // Track if initial load has happened
  const initialLoadDoneRef = useRef(false);

  // Helper to ensure all rows have IDs (for data loaded from DB/localStorage)
  const ensureRowIds = (rows: ResourceRow[]): ResourceRow[] => {
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => ({
      ...row,
      id: row.id || crypto.randomUUID(), // Generate ID if missing
    }));
  };

  // Helper to get current report data
  const getReportData = useCallback(
    (): ReportData => ({
      projectName,
      reportDate: reportDate?.toISOString() || null,
      weatherAM,
      weatherPM,
      tempAM,
      tempPM,
      activityToday,
      workPlanNextDay,
      managementTeam,
      workingTeam,
      materials,
      machinery,
      // Keep reference sections in the object for future export mapping (no export logic changed yet)
      referenceSections,
    }),
    [
      projectName,
      reportDate,
      weatherAM,
      weatherPM,
      tempAM,
      tempPM,
      activityToday,
      workPlanNextDay,
      managementTeam,
      workingTeam,
      materials,
      machinery,
      referenceSections,
    ]
  );

  // Load report on mount - Try DB first, fallback to localStorage (only on first mount)
  useEffect(() => {
    const loadInitialReport = async () => {
      if (!reportDate || initialLoadDoneRef.current) return; // Only load on first mount

      initialLoadDoneRef.current = true;

      try {
        // Try to load from database first
        const dbReport = await loadReportFromDB(reportDate);

        if (dbReport) {
          // Load from database
          setProjectName(dbReport.projectName || "");
          setReportDate(
            dbReport.reportDate ? new Date(dbReport.reportDate) : new Date()
          );
          // Handle backward compatibility: convert old format to new
          if (dbReport.weatherAM !== undefined) {
            setWeatherAM(dbReport.weatherAM || "");
            setWeatherPM(dbReport.weatherPM || "");
            setTempAM(dbReport.tempAM || "");
            setTempPM(dbReport.tempPM || "");
            setCurrentPeriod(dbReport.currentPeriod || "AM");
          } else {
            // Old format: migrate to new format
            const oldWeather = dbReport.weather || "Sunny";
            const oldPeriod = dbReport.weatherPeriod || "AM";
            const oldTemp = dbReport.temperature || "";
            if (oldPeriod === "AM") {
              setWeatherAM(oldWeather);
              setWeatherPM("");
              setTempAM(oldTemp);
              setTempPM("");
            } else {
              setWeatherAM("");
              setWeatherPM(oldWeather);
              setTempAM("");
              setTempPM(oldTemp);
            }
            setCurrentPeriod("AM");
          }
          setActivityToday(dbReport.activityToday || "");
          setWorkPlanNextDay(dbReport.workPlanNextDay || "");
          setManagementTeam(ensureRowIds(dbReport.managementTeam || []));
          setWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
          setMaterials(ensureRowIds(dbReport.materials || []));
          setMachinery(ensureRowIds(dbReport.machinery || []));
        } else {
          // Fallback to localStorage
          const localDraft = loadDraftLocally(reportDate);
          if (localDraft) {
            setProjectName(localDraft.projectName || "");
            setReportDate(
              localDraft.reportDate
                ? new Date(localDraft.reportDate)
                : new Date()
            );
            // Handle backward compatibility
            if (localDraft.weatherAM !== undefined) {
              setWeatherAM(localDraft.weatherAM || "");
              setWeatherPM(localDraft.weatherPM || "");
              setTempAM(localDraft.tempAM || "");
              setTempPM(localDraft.tempPM || "");
              setCurrentPeriod(localDraft.currentPeriod || "AM");
            } else {
              const oldWeather = localDraft.weather || "Sunny";
              const oldPeriod = localDraft.weatherPeriod || "AM";
              const oldTemp = localDraft.temperature || "";
              if (oldPeriod === "AM") {
                setWeatherAM(oldWeather);
                setWeatherPM("");
                setTempAM(oldTemp);
                setTempPM("");
              } else {
                setWeatherAM("");
                setWeatherPM(oldWeather);
                setTempAM("");
                setTempPM(oldTemp);
              }
              setCurrentPeriod("AM");
            }
            setActivityToday(localDraft.activityToday || "");
            setWorkPlanNextDay(localDraft.workPlanNextDay || "");
            setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
            setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
            setMaterials(ensureRowIds(localDraft.materials || []));
            setMachinery(ensureRowIds(localDraft.machinery || []));
          }
        }
      } catch (e) {
        console.error("Failed to load report:", e);
        // Fallback to localStorage if DB fails
        const localDraft = loadDraftLocally(reportDate);
        if (localDraft) {
          setProjectName(localDraft.projectName || "");
          setReportDate(
            localDraft.reportDate ? new Date(localDraft.reportDate) : new Date()
          );
          // Handle backward compatibility
          if (localDraft.weatherAM !== undefined) {
            setWeatherAM(localDraft.weatherAM || "");
            setWeatherPM(localDraft.weatherPM || "");
            setTempAM(localDraft.tempAM || "");
            setTempPM(localDraft.tempPM || "");
            setCurrentPeriod(localDraft.currentPeriod || "AM");
          } else {
            const oldWeather = localDraft.weather || "Sunny";
            const oldPeriod = localDraft.weatherPeriod || "AM";
            const oldTemp = localDraft.temperature || "";
            if (oldPeriod === "AM") {
              setWeatherAM(oldWeather);
              setWeatherPM("");
              setTempAM(oldTemp);
              setTempPM("");
            } else {
              setWeatherAM("");
              setWeatherPM(oldWeather);
              setTempAM("");
              setTempPM(oldTemp);
            }
            setCurrentPeriod("AM");
          }
          setActivityToday(localDraft.activityToday || "");
          setWorkPlanNextDay(localDraft.workPlanNextDay || "");
          setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
          setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
          setMaterials(ensureRowIds(localDraft.materials || []));
          setMachinery(ensureRowIds(localDraft.machinery || []));
        }
      }
    };

    loadInitialReport();
  }, []); // Only run on mount

  // Handle date change: save current, carry forward between dates, load or clear on first selection
  useEffect(() => {
    const newDateStr = reportDate?.toISOString().slice(0, 10) || null;
    const prevDateStr = lastDateRef.current;

    if (prevDateStr && newDateStr && prevDateStr !== newDateStr) {
      // Date changed: save current date draft locally and carry forward
      saveDraftLocally(new Date(prevDateStr), getReportData());

      // Load the target date
      const loadTargetDate = async () => {
        try {
          // Try database first
          const dbReport = await loadReportFromDB(reportDate!);

          if (dbReport) {
            // Found report in database
            setProjectName(dbReport.projectName || "");
            // Handle backward compatibility: convert old format to new
            if (dbReport.weatherAM !== undefined) {
              setWeatherAM(dbReport.weatherAM || "");
              setWeatherPM(dbReport.weatherPM || "");
              setTempAM(dbReport.tempAM || "");
              setTempPM(dbReport.tempPM || "");
              setCurrentPeriod(dbReport.currentPeriod || "AM");
            } else {
              // Old format: migrate to new format
              const oldWeather = dbReport.weather || "Sunny";
              const oldPeriod = dbReport.weatherPeriod || "AM";
              const oldTemp = dbReport.temperature || "";
              if (oldPeriod === "AM") {
                setWeatherAM(oldWeather);
                setWeatherPM("");
                setTempAM(oldTemp);
                setTempPM("");
              } else {
                setWeatherAM("");
                setWeatherPM(oldWeather);
                setTempAM("");
                setTempPM(oldTemp);
              }
              setCurrentPeriod("AM");
            }
            setActivityToday(dbReport.activityToday || "");
            setWorkPlanNextDay(dbReport.workPlanNextDay || "");
            setManagementTeam(ensureRowIds(dbReport.managementTeam || []));
            setWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
            setMaterials(ensureRowIds(dbReport.materials || []));
            setMachinery(ensureRowIds(dbReport.machinery || []));
          } else {
            // No DB report, try localStorage
            const localDraft = loadDraftLocally(reportDate);

            if (localDraft) {
              // Found local draft
              setProjectName(localDraft.projectName || "");
              // Handle backward compatibility
              if (localDraft.weatherAM !== undefined) {
                setWeatherAM(localDraft.weatherAM || "");
                setWeatherPM(localDraft.weatherPM || "");
                setTempAM(localDraft.tempAM || "");
                setTempPM(localDraft.tempPM || "");
                setCurrentPeriod(localDraft.currentPeriod || "AM");
              } else {
                const oldWeather = localDraft.weather || "Sunny";
                const oldPeriod = localDraft.weatherPeriod || "AM";
                const oldTemp = localDraft.temperature || "";
                if (oldPeriod === "AM") {
                  setWeatherAM(oldWeather);
                  setWeatherPM("");
                  setTempAM(oldTemp);
                  setTempPM("");
                } else {
                  setWeatherAM("");
                  setWeatherPM(oldWeather);
                  setTempAM("");
                  setTempPM(oldTemp);
                }
                setCurrentPeriod("AM");
              }
              setActivityToday(localDraft.activityToday || "");
              setWorkPlanNextDay(localDraft.workPlanNextDay || "");
              setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
              setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
              setMaterials(ensureRowIds(localDraft.materials || []));
              setMachinery(ensureRowIds(localDraft.machinery || []));
            } else {
              // No saved report: prefill from yesterday
              const yesterday = new Date(reportDate!.getTime() - 86400000);
              const prevData = loadDraftLocally(yesterday);

              if (prevData) {
                // Copy prev-day accumulated -> today's prev
                const mapPrevFromAccum = (rows: ResourceRow[]) =>
                  ensureRowIds(rows).map((r) => ({
                    ...r,
                    prev: r.accumulated,
                    today: 0,
                    accumulated: r.accumulated,
                  }));

                setManagementTeam(
                  mapPrevFromAccum(prevData.managementTeam || [])
                );
                setWorkingTeam(mapPrevFromAccum(prevData.workingTeam || []));
                setMaterials(mapPrevFromAccum(prevData.materials || []));
                setMachinery(mapPrevFromAccum(prevData.machinery || []));

                // Reset other fields for new day
                setProjectName("");
                setWeatherAM("");
                setWeatherPM("");
                setTempAM("");
                setTempPM("");
                setCurrentPeriod("AM");
                setActivityToday("");
                setWorkPlanNextDay("");
              }
            }
          }
        } catch (e) {
          console.error("Failed to load report for new date:", e);
        }
      };

      loadTargetDate();
    } else if (newDateStr && !prevDateStr) {
      // First date selection: try to load existing data for this date, otherwise clear
      const loadDataForDate = async () => {
        try {
          // Try to load from database first
          const dbReport = await loadReportFromDB(reportDate!);
          if (dbReport) {
            setProjectName(dbReport.projectName || "");
            // Handle backward compatibility: convert old format to new
            if (dbReport.weatherAM !== undefined) {
              setWeatherAM(dbReport.weatherAM || "");
              setWeatherPM(dbReport.weatherPM || "");
              setTempAM(dbReport.tempAM || "");
              setTempPM(dbReport.tempPM || "");
              setCurrentPeriod(dbReport.currentPeriod || "AM");
            } else {
              // Old format: migrate to new format
              const oldWeather = dbReport.weather || "Sunny";
              const oldPeriod = dbReport.weatherPeriod || "AM";
              const oldTemp = dbReport.temperature || "";
              if (oldPeriod === "AM") {
                setWeatherAM(oldWeather);
                setWeatherPM("");
                setTempAM(oldTemp);
                setTempPM("");
              } else {
                setWeatherAM("");
                setWeatherPM(oldWeather);
                setTempAM("");
                setTempPM(oldTemp);
              }
              setCurrentPeriod("AM");
            }
            setActivityToday(dbReport.activityToday || "");
            setWorkPlanNextDay(dbReport.workPlanNextDay || "");
            setManagementTeam(ensureRowIds(dbReport.managementTeam || []));
            setWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
            setMaterials(ensureRowIds(dbReport.materials || []));
            setMachinery(ensureRowIds(dbReport.machinery || []));
            return;
          }

          // Fallback to localStorage
          const localDraft = loadDraftLocally(reportDate);
          if (localDraft) {
            setProjectName(localDraft.projectName || "");
            // Handle backward compatibility
            if (localDraft.weatherAM !== undefined) {
              setWeatherAM(localDraft.weatherAM || "");
              setWeatherPM(localDraft.weatherPM || "");
              setTempAM(localDraft.tempAM || "");
              setTempPM(localDraft.tempPM || "");
              setCurrentPeriod(localDraft.currentPeriod || "AM");
            } else {
              const oldWeather = localDraft.weather || "Sunny";
              const oldPeriod = localDraft.weatherPeriod || "AM";
              const oldTemp = localDraft.temperature || "";
              if (oldPeriod === "AM") {
                setWeatherAM(oldWeather);
                setWeatherPM("");
                setTempAM(oldTemp);
                setTempPM("");
              } else {
                setWeatherAM("");
                setWeatherPM(oldWeather);
                setTempAM("");
                setTempPM(oldTemp);
              }
              setCurrentPeriod("AM");
            }
            setActivityToday(localDraft.activityToday || "");
            setWorkPlanNextDay(localDraft.workPlanNextDay || "");
            setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
            setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
            setMaterials(ensureRowIds(localDraft.materials || []));
            setMachinery(ensureRowIds(localDraft.machinery || []));
            return;
          }
        } catch (e) {
          console.error("Failed to load report for date:", e);
        }

        // No existing data: clear form to defaults
        setProjectName("");
        setWeatherAM("");
        setWeatherPM("");
        setTempAM("");
        setTempPM("");
        setCurrentPeriod("AM");
        setActivityToday("");
        setWorkPlanNextDay("");
        setManagementTeam([]);
        setWorkingTeam([]);
        setMaterials([]);
        setMachinery([]);
      };

      loadDataForDate();
    }

    lastDateRef.current = newDateStr;
  }, [reportDate, getReportData]);

  // Save draft to localStorage (silent mode for auto-save)
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
      setTimeout(() => setIsSaving(false), 500);
    },
    [reportDate, getReportData, toast]
  );

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const validateReport = (): boolean => {
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
  };

  const handleExportPDF = async () => {
    if (!validateReport()) return;

    setIsExporting(true);
    try {
      await exportToPDF({
        projectName,
        reportDate,
        weatherAM,
        weatherPM,
        tempAM,
        tempPM,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      });
      toast({
        title: "PDF Exported",
        description: "Your report has been exported as PDF successfully.",
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "Could not export PDF. Please try again.",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  const handlePreview = async () => {
    if (!validateReport()) return;

    setIsPreviewing(true);
    try {
      const url = (await exportToPDF(
        {
          projectName,
          reportDate,
          weatherAM,
          weatherPM,
          tempAM,
          tempPM,
          activityToday,
          workPlanNextDay,
          managementTeam,
          workingTeam,
          materials,
          machinery,
        },
        true
      )) as string;

      setPreviewUrl(url);
      setShowPreview(true);
    } catch (e) {
      toast({
        title: "Preview Failed",
        description: "Could not generate preview. Please try again.",
        variant: "destructive",
      });
    }
    setIsPreviewing(false);
  };

  const handleDownloadFromPreview = async () => {
    try {
      await exportToPDF({
        projectName,
        reportDate,
        weatherAM,
        weatherPM,
        tempAM,
        tempPM,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      });
      toast({
        title: "PDF Exported",
        description: "Your report has been exported as PDF successfully.",
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "Could not export PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    if (!validateReport()) return;

    setIsExporting(true);
    try {
      // Prepare payload for Python backend
      const payload = {
        projectName,
        reportDate: reportDate?.toISOString(),
        weatherAM,
        weatherPM,
        tempAM,
        tempPM,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      };

      // Call Python API instead of Node.js exportToExcel
      await generatePythonExcel(payload, "report");

      toast({
        title: "Excel Exported",
        description: "Your report has been exported successfully.",
      });
    } catch (error) {
      console.error("Export Error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description:
          "Could not connect to Python server. Ensure it's running on port 5001.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReference = async () => {
    setIsExportingReference(true);
    try {
      // Check if there are any reference sections
      if (!referenceSections || referenceSections.length === 0) {
        toast({
          title: "No Reference Data",
          description: "Please add reference sections before exporting.",
          variant: "destructive",
        });
        return;
      }

      const toBase64DataUrl = async (img: unknown): Promise<string | null> => {
        if (!img) return null;

        // Case 1: already a string (blob URL, data URL, http URL, etc.)
        if (typeof img === "string") {
          if (!img.startsWith("blob:")) return img;

          const resp = await fetch(img);
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
          sectionsArr.map(async (sec) => {
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
      await generateReferenceExcel(processedSections, tableTitle);

      toast({
        title: "Reference Exported",
        description: "Reference section exported successfully.",
      });
    } catch (error) {
      console.error("Reference Export Error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description:
          "Could not generate reference. Ensure Python server is running.",
      });
    } finally {
      setIsExportingReference(false);
    }
  };

  const handleExportCombinedExcel = async () => {
    if (!validateReport()) return;

    setIsExportingCombined(true);
    try {
      const toBase64DataUrl = async (img: unknown): Promise<string | null> => {
        if (!img) return null;

        // Case 1: already a string (blob URL, data URL, http URL, etc.)
        if (typeof img === "string") {
          if (!img.startsWith("blob:")) return img;

          const resp = await fetch(img);
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
          sectionsArr.map(async (sec) => {
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

      const reportPayload = {
        projectName,
        reportDate: reportDate?.toISOString(),
        weatherAM,
        weatherPM,
        tempAM,
        tempPM,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      };

      await generateCombinedExcel(reportPayload, processedSections, tableTitle);

      toast({
        title: "Combined Excel Exported",
        description: "Report + Reference exported successfully.",
      });
    } catch (e) {
      console.error("Combined Export Error:", e);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description:
          "Could not generate combined Excel. Ensure Python server is running.",
      });
    } finally {
      setIsExportingCombined(false);
    }
  };

  const handleExportDocs = async () => {
    if (!validateReport()) return;

    setIsExporting(true);
    try {
      await exportToWord({
        projectName,
        reportDate,
        weatherAM,
        weatherPM,
        tempAM,
        tempPM,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      });
      toast({
        title: "Word Document Exported",
        description:
          "Your report has been exported as Word document successfully.",
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "Could not export Word document. Please try again.",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  const handleExportAll = async () => {
    if (!validateReport()) return;

    setIsExporting(true);
    try {
      await exportToZIP({
        projectName,
        reportDate,
        weatherAM,
        weatherPM,
        tempAM,
        tempPM,
        activityToday,
        workPlanNextDay,
        managementTeam,
        workingTeam,
        materials,
        machinery,
      });

      toast({
        title: "Export Completed",
        description:
          "Your report has been exported as a ZIP file containing both PDF and Excel files.",
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "Could not export ZIP file. Please try again.",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  const handleClear = () => {
    setProjectName("");
    setReportDate(new Date());
    setWeatherAM("");
    setWeatherPM("");
    setTempAM("");
    setTempPM("");
    setCurrentPeriod("AM");
    setActivityToday("");
    setWorkPlanNextDay("");
    setManagementTeam([]);
    setWorkingTeam([]);
    setMaterials([]);
    setMachinery([]);
    // Clear localStorage for current date
    localStorage.removeItem(dateKey(reportDate));
    toast({
      title: "Data Cleared",
      description: "All form data has been cleared.",
    });
  };

  const cleanResourceRows = (rows: ResourceRow[]) => {
    return rows
      .filter(
        (r) =>
          // Keep row if it has description OR any numeric values
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

  const handleSubmit = async () => {
    if (!validateReport()) return;

    setIsSubmitting(true);
    try {
      // Prepare report data and clean empty rows
      const rawData = getReportData();
      const cleanedData = {
        ...rawData,
        managementTeam: cleanResourceRows(rawData.managementTeam),
        workingTeam: cleanResourceRows(rawData.workingTeam),
        materials: cleanResourceRows(rawData.materials),
        machinery: cleanResourceRows(rawData.machinery),
      };

      // Step 1: Save the report data to database
      await saveReportToDB(cleanedData);

      // Step 2: Mark it as submitted (changes status)
      await submitReportToDB(
        cleanedData.projectName,
        new Date(cleanedData.reportDate!)
      );

      // Step 3: Clear localStorage after successful submission
      localStorage.removeItem(dateKey(reportDate));

      // Step 4: Prepare next day's data (Running Total / Carry-Forward)
      const nextDay = new Date(reportDate!.getTime() + 86400000);
      const carryForwardData = {
        projectName: cleanedData.projectName,
        reportDate: nextDay.toISOString(),
        weatherAM: "",
        weatherPM: "",
        tempAM: "",
        tempPM: "",
        activityToday: "",
        workPlanNextDay: "",
        managementTeam: cleanedData.managementTeam.map((r) => ({
          ...r,
          prev: r.accumulated, // ✅ Carry forward accumulated to prev
          today: 0,
          accumulated: r.accumulated,
        })),
        workingTeam: cleanedData.workingTeam.map((r) => ({
          ...r,
          prev: r.accumulated,
          today: 0,
          accumulated: r.accumulated,
        })),
        materials: cleanedData.materials.map((r) => ({
          ...r,
          prev: r.accumulated,
          today: 0,
          accumulated: r.accumulated,
        })),
        machinery: cleanedData.machinery.map((r) => ({
          ...r,
          prev: r.accumulated,
          today: 0,
          accumulated: r.accumulated,
        })),
      };

      // Save next day's template locally
      saveDraftLocally(nextDay, carryForwardData);

      toast({
        title: "Report Submitted",
        description:
          "Your report has been submitted successfully. Tomorrow's report is ready with carried-forward totals.",
        duration: 5000,
      });
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Could not submit report. Please try again.";
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <ReportHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <ProjectInfo
          projectName={projectName}
          setProjectName={setProjectName}
          reportDate={reportDate}
          setReportDate={setReportDate}
          weatherAM={weatherAM}
          setWeatherAM={setWeatherAM}
          weatherPM={weatherPM}
          setWeatherPM={setWeatherPM}
          tempAM={tempAM}
          setTempAM={setTempAM}
          tempPM={tempPM}
          setTempPM={setTempPM}
          currentPeriod={currentPeriod}
          setCurrentPeriod={setCurrentPeriod}
        />

        {/* Report section label for clarity */}
        <div className="mb-2 mt-2">
          <h2 className="text-sm font-semibold text-foreground/80">Report</h2>
        </div>

        <ActivitySection
          activityToday={activityToday}
          setActivityToday={setActivityToday}
          workPlanNextDay={workPlanNextDay}
          setWorkPlanNextDay={setWorkPlanNextDay}
        />

        <ResourcesSection
          managementTeam={managementTeam}
          setManagementTeam={setManagementTeam}
          workingTeam={workingTeam}
          setWorkingTeam={setWorkingTeam}
          materials={materials}
          setMaterials={setMaterials}
          machinery={machinery}
          setMachinery={setMachinery}
        />

        <ReportActions
          onPreview={handlePreview}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          onExportDocs={handleExportDocs}
          onExportAll={handleExportAll}
          onClear={handleClear}
          onSubmit={handleSubmit}
          isPreviewing={isPreviewing}
          isExporting={isExporting}
          isSubmitting={isSubmitting}
        />

        {/* Reference section (renders below Report content) */}
        <div className="mt-8 pt-6 border-t border-muted-foreground/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-sm font-semibold text-foreground/70 mb-4">
              Reference
            </h2>
            <ReferenceSection
              sections={referenceSections}
              setSections={setReferenceSections}
              onExportReference={handleExportReference}
              isExporting={isExportingReference}
              tableTitle={tableTitle}
              setTableTitle={setTableTitle}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-muted-foreground/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Export combined:{" "}
              <span className="font-medium text-foreground">Report</span> =
              Sheet 1,{" "}
              <span className="font-medium text-foreground">Reference</span> =
              Sheet 2
            </div>
            <div className="flex items-center gap-3">
              {/* DISABLED: Preview Combined button - commented out to disable
              <Button variant="outline" className="min-w-[140px]">
                <Eye className="w-4 h-4 mr-2" />
                Preview Combined
              </Button>
              */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="min-w-[160px] bg-primary hover:bg-primary/90"
                    disabled={isExportingCombined}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    {isExportingCombined
                      ? "Exporting Combined..."
                      : "Export Combined Excel"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* DISABLED: Export Combined PDF - commented out
                  <DropdownMenuItem>
                    <FileText className="w-4 h-4 mr-2" />
                    Export Combined PDF
                  </DropdownMenuItem>
                  */}
                  <DropdownMenuItem
                    onClick={handleExportCombinedExcel}
                    disabled={isExportingCombined}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Combined Excel
                  </DropdownMenuItem>
                  {/* DISABLED: Export Combined Docs - commented out
                  <DropdownMenuItem>
                    <FileType className="w-4 h-4 mr-2" />
                    Export Combined Docs (Word)
                  </DropdownMenuItem>
                  */}
                  {/* DISABLED: Download Combined (ZIP) - commented out
                  <DropdownMenuItem>
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Combined (ZIP)
                  </DropdownMenuItem>
                  */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <PDFPreviewModal
          open={showPreview}
          onClose={() => {
            setShowPreview(false);
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }
          }}
          pdfUrl={previewUrl}
        />
      </main>
    </div>
  );
};

export default Index;
