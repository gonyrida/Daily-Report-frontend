import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReportHeader from "@/components/ReportHeader";
import ProjectInfo from "@/components/ProjectInfo";
import ActivitySection from "@/components/ActivitySection";
import ResourcesSection from "@/components/ResourcesSection";
import ReportActions from "@/components/ReportActions";
import PDFPreviewModal from "@/components/PDFPreviewModal";
import ReferenceSection from "@/components/ReferenceSection";
import CARSection from "@/components/CARSection";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import { createEmptyCarSheet } from "@/utils/carHelpers";
import { createDefaultHSESections } from "@/utils/referenceHelpers";
import FileNameDialog from "@/components/FileNameDialog";
import DailyReportProjectsView from "@/components/DailyReportProjectsView";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileType,
  ArrowLeft,
  Save,
  Send,
  Lock,
  CheckCircle,
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
  generateCombinedPDF,
} from "@/integrations/reportsApi";
import {
  saveReportToDB,
  loadReportFromDB,
  loadReportById,
  submitReportToDB,
  deleteReport,
  autoSaveReport,
} from "@/integrations/reportsApi";
import { API_ENDPOINTS, PYTHON_API_BASE_URL } from "@/config/api";
import { pythonApiPost } from "../lib/pythonApiFetch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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

interface Slot {
  image: File | string | null;
  [key: string]: unknown;
}

interface Entry {
  slots: Slot[];
  [key: string]: unknown;
}

interface Section {
  entries: Entry[];
  [key: string]: unknown;
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
  interiorTeam: ResourceRow[];
  mepTeam: ResourceRow[];
  materials: ResourceRow[];
  machinery: ResourceRow[];
  // Optional merged-reference data (kept optional so export logic isn't changed yet)
  referenceSections?: Section[];
  tableTitle?: string;
  siteActivitiesSections?: Section[];
  siteActivitiesTitle?: string;
  carSheet?: {
    description: string;
    photo_groups: Array<{
      date: string;
      images: string[];
      footers: string[];
    }>;
  };
  projectLogo?: string;
}

// NEW: Validate and correct project context
const validateAndSetProjectContext = (loadedProjectName: string, urlProjectName: string | null, setProjectName: (name: string) => void) => {
  // For new reports with URL context, always prioritize URL
  if (urlProjectName && (!loadedProjectName || loadedProjectName !== urlProjectName)) {
    console.log(`🔧 PROJECT CONTEXT: Prioritizing URL context "${urlProjectName}" over loaded "${loadedProjectName}"`);
    setProjectName(urlProjectName);
    return urlProjectName;
  }
  
  // For existing reports without URL context, use loaded data
  if (!urlProjectName && loadedProjectName) {
    setProjectName(loadedProjectName);
    return loadedProjectName;
  }
  
  // Fallback to URL context if available
  if (urlProjectName) {
    setProjectName(urlProjectName);
    return urlProjectName;
  }
  
  return loadedProjectName;
};

// UPDATED: Enhanced detection logic with project history awareness
const isNewReportCreation = async (reportIdFromUrl: string | null, projectFromUrl: string | null, dbReport: any): Promise<boolean> => {
  // If no reportId and has project context → Check project history
  if (!reportIdFromUrl && projectFromUrl) {
    const projectHasReports = await checkIfProjectHasReports(projectFromUrl);
    return !projectHasReports; // Only clean state if project has NO reports
  }
  
  // If reportId exists but project context doesn't match → New report for different project
  if (reportIdFromUrl && projectFromUrl && dbReport && dbReport.projectName !== projectFromUrl) {
    return true;
  }
  
  // If no reportId and no project context → Main dashboard new report
  if (!reportIdFromUrl && !projectFromUrl) {
    return true;
  }
  
  // Otherwise → Existing report edit
  return false;
};

// NEW: Initialize clean state for new reports
const initializeCleanReportState = (projectName: string, setProjectName: (name: string) => void, setReportStatus: (status: string) => void) => {
  console.log(`🔧 CLEAN STATE: Initializing new report for project "${projectName}"`);
  
  // Set project name from URL context
  setProjectName(projectName);
  // ADD THIS: Reset status to draft for new reports
  setReportStatus('draft');
  
  // Smart defaults based on current time and date
  const currentHour = new Date().getHours();
  const defaultPeriod = currentHour < 12 ? "AM" : "PM";
  
  return {
    weatherAM: "",
    weatherPM: "",
    tempAM: "",
    tempPM: "",
    currentPeriod: defaultPeriod,
    activityToday: "",
    workPlanNextDay: "",
    managementTeam: [],
    workingTeam: [],
    interiorTeam: [],
    mepTeam: [],
    materials: [],
    machinery: [],
    referenceSections: createDefaultHSESections(),
    siteActivitiesSections: createDefaultHSESections(),
    siteActivitiesTitle: "Site Activities Photos",
    carSheet: { description: "", photo_groups: [] },
    projectLogo: ""
  };
};

// FIXED: Use existing API endpoint instead of non-existent APIs
const checkIfProjectHasReports = async (projectName: string): Promise<boolean> => {
  try {
    // Use existing API endpoint that actually exists
    const response = await fetch('/api/daily-reports/');
    if (!response.ok) return false;
    
    const allReports = await response.json();
    const projectReports = allReports.filter(report => report.projectName === projectName);
    return projectReports.length > 0;
  } catch (error) {
    console.error("Failed to check project reports:", error);
    return false;
  }
};

// FIXED: Use existing API endpoint instead of non-existent APIs
const loadMostRecentReportForProject = async (projectName: string): Promise<any> => {
  try {
    // Use existing API endpoint that actually exists
    const response = await fetch('/api/daily-reports/');
    if (!response.ok) return null;
    
    const allReports = await response.json();
    const projectReports = allReports
      .filter(report => report.projectName === projectName)
      .sort((a, b) => {
        const dateA = new Date(a.reportDate || a.createdAt || 0);
        const dateB = new Date(b.reportDate || b.createdAt || 0);
        
        // Handle invalid dates
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
    
    return projectReports.length > 0 ? projectReports[0] : null;
  } catch (error) {
    console.error("Failed to load project's most recent report:", error);
    return null;
  }
};

const DailyReport = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportIdFromUrl = searchParams.get("reportId");
  const projectFromUrl = searchParams.get("project");

  // Project Info
  const [projectLogo, setProjectLogo] = useState<string>("");
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
  const [interiorTeam, setInteriorTeam] = useState<ResourceRow[]>([]);
  const [mepTeam, setMepTeam] = useState<ResourceRow[]>([]);
  const [materials, setMaterials] = useState<ResourceRow[]>([]);
  const [machinery, setMachinery] = useState<ResourceRow[]>([]);

  // Reference Section state
  const [referenceSections, setReferenceSections] = useState<Section[]>(createDefaultHSESections());
  const [tableTitle, setTableTitle] = useState("HSE Toolbox Meeting");
  const [isExportingReference, setIsExportingReference] = useState(false);

  // Site Activities Photos state
  const [siteActivitiesSections, setSiteActivitiesSections] = useState<Section[]>(createDefaultHSESections());
  const [siteActivitiesTitle, setSiteActivitiesTitle] = useState("Site Activities Photos");
  const [isExportingSiteActivities, setIsExportingSiteActivities] = useState(false);

  // CAR Sheet state
  const [carSheet, setCarSheet] = useState<any>(createEmptyCarSheet());

  // Combined Export state
  const [isExportingCombined, setIsExportingCombined] = useState(false);
  const [isPreviewingCombined, setIsPreviewingCombined] = useState(false);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportStatus, setReportStatus] = useState<string>('draft');

  // Google Docs-style auto-save state
  const [reportId, setReportId] = useState<string | null>(reportIdFromUrl);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // File name dialog state
  const [showFileNameDialog, setShowFileNameDialog] = useState(false);
  const [defaultFileName, setDefaultFileName] = useState<string>("");
  const [pendingExportType, setPendingExportType] = useState<
    "excel" | "combined" | "reference" | "combined-pdf" | "combined-zip"
  >(null);

  // Active tab state for section filtering
  const [activeTab, setActiveTab] = useState<
    "site-activities" | "hse" | "site-activities-photos" | "car"
  >("site-activities");

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

  // Helper to split working team into interior and MEP teams
  const splitWorkingTeam = (workingTeam: ResourceRow[]): { interior: ResourceRow[]; mep: ResourceRow[] } => {
    const interiorOptions = ["Site Manager", "Site Engineer", "Foreman", "Skill Workers", "General Workers"];
    const mepOptions = ["MEP Engineer", "MEP Workers"];
    
    const interior = workingTeam.filter(row => 
      interiorOptions.includes(row.description) || 
      (!mepOptions.includes(row.description) && row.description !== "")
    );
    
    const mep = workingTeam.filter(row => 
      mepOptions.includes(row.description)
    );
    
    return { interior, mep };
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
      interiorTeam,
      mepTeam,
      materials,
      machinery,
      // Keep reference sections in the object for future export mapping (no export logic changed yet)
      referenceSections,
      tableTitle,
      siteActivitiesSections,
      siteActivitiesTitle,
      carSheet,
      projectLogo,
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
      interiorTeam,
      mepTeam,
      materials,
      machinery,
      referenceSections,
      tableTitle,
      siteActivitiesSections,
      siteActivitiesTitle,
      carSheet,
      projectLogo,
    ]
  );

  // Simple date change notification
  const handleDateChange = (newDate: Date | null) => {
    setReportDate(newDate);
    // Just set the date - no automatic loading/saving
  };

  // Load report on mount - Try ID first, then DB by date, fallback to localStorage (only on first mount)
  useEffect(() => {
    const loadInitialReport = async () => {
      if (initialLoadDoneRef.current) return; // Only load on first mount

      initialLoadDoneRef.current = true;

      try {
        let dbReport = null;

        // First, try to load by reportId if provided in URL
        if (reportIdFromUrl) {
          console.log(
            "🔍 DAILY REPORT: Loading report by ID:",
            reportIdFromUrl
          );
          dbReport = await loadReportById(reportIdFromUrl);
          console.log(
            "🔍 DAILY REPORT: Report by ID result:",
            dbReport ? "FOUND" : "NOT FOUND"
          );
        }

        // If no report by ID, try loading by date
        if (!dbReport && reportDate) {
          console.log("Loading report by date:", reportDate);
          dbReport = await loadReportFromDB(reportDate);
        }

        if (dbReport) {
          const isNewReport = await isNewReportCreation(reportIdFromUrl, projectFromUrl, dbReport);
          
          if (isNewReport) {
            // NEW: Initialize clean state for new report
            console.log("🔧 NEW REPORT: Detected new report creation, using clean state");
            const cleanState = initializeCleanReportState(projectFromUrl || "", setProjectName, setReportStatus);
            
            // Set only project name, leave everything else empty/default
            setReportId("");
            setReportDate(new Date());
            setWeatherAM(cleanState.weatherAM);
            setWeatherPM(cleanState.weatherPM);
            setTempAM(cleanState.tempAM);
            setTempPM(cleanState.tempPM);
            setCurrentPeriod(cleanState.currentPeriod as "AM" | "PM");
            setActivityToday(cleanState.activityToday);
            setWorkPlanNextDay(cleanState.workPlanNextDay);
            setManagementTeam(cleanState.managementTeam);
            setWorkingTeam(cleanState.workingTeam);
            setInteriorTeam(cleanState.interiorTeam);
            setMepTeam(cleanState.mepTeam);
            setMaterials(cleanState.materials);
            setMachinery(cleanState.machinery);
            setReferenceSections(cleanState.referenceSections);
            setSiteActivitiesSections(cleanState.siteActivitiesSections);
            setSiteActivitiesTitle(cleanState.siteActivitiesTitle);
            setCarSheet(cleanState.carSheet);
            setProjectLogo(cleanState.projectLogo);
            
          } else {
            // SMART: Check if we should load project's most recent report
            if (!reportIdFromUrl && projectFromUrl) {
              // Always try smart loading for new reports with project context
              console.log("🔧 SMART LOAD: Creating new report for project:", projectFromUrl);
              const projectRecentReport = await loadMostRecentReportForProject(projectFromUrl);
              
              if (projectRecentReport) {
                // Load project's most recent report as template
                console.log("🔧 SMART LOAD: Found project report, using as template");
                setReportId(""); // Keep as new report
                setProjectName(projectFromUrl);
                setReportDate(new Date());

                // ADD THIS: Reset status to draft for new reports based on templates
                setReportStatus('draft');
                
                // Load data from project's most recent report
                setWeatherAM(projectRecentReport.weatherAM || "");
                setWeatherPM(projectRecentReport.weatherPM || "");
                setTempAM(projectRecentReport.tempAM || "");
                setTempPM(projectRecentReport.tempPM || "");
                setCurrentPeriod(projectRecentReport.currentPeriod || "AM");
                setActivityToday(projectRecentReport.activityToday || "");
                setWorkPlanNextDay(projectRecentReport.workPlanNextDay || "");
                setManagementTeam(ensureRowIds(projectRecentReport.managementTeam || []));
                setWorkingTeam(ensureRowIds(projectRecentReport.workingTeam || []));
                
                // Handle interior and MEP team migration
                if (projectRecentReport.interiorTeam && projectRecentReport.mepTeam) {
                  setInteriorTeam(ensureRowIds(projectRecentReport.interiorTeam));
                  setMepTeam(ensureRowIds(projectRecentReport.mepTeam));
                } else {
                  const { interior, mep } = splitWorkingTeam(ensureRowIds(projectRecentReport.workingTeam || []));
                  setInteriorTeam(interior);
                  setMepTeam(mep);
                }
                
                setMaterials(ensureRowIds(projectRecentReport.materials || []));
                setMachinery(ensureRowIds(projectRecentReport.machinery || []));
                setReferenceSections(projectRecentReport.referenceSections && projectRecentReport.referenceSections.length > 0 ? projectRecentReport.referenceSections : createDefaultHSESections());
                setSiteActivitiesSections(projectRecentReport.siteActivitiesSections && projectRecentReport.siteActivitiesSections.length > 0 ? projectRecentReport.siteActivitiesSections : createDefaultHSESections());
                setSiteActivitiesTitle(projectRecentReport.siteActivitiesTitle || "Site Activities Photos");
                setCarSheet(projectRecentReport.carSheet || { description: "", photo_groups: [] });
                setProjectLogo(projectRecentReport.projectLogo || "");
                
              } else {
                // Clean state for projects with no history
                console.log("🔧 CLEAN STATE: No project history found, using clean state");
                const cleanState = initializeCleanReportState(projectFromUrl, setProjectName, setReportStatus);
                setReportId("");
                setReportDate(new Date());
                setWeatherAM(cleanState.weatherAM);
                setWeatherPM(cleanState.weatherPM);
                setTempAM(cleanState.tempAM);
                setTempPM(cleanState.tempPM);
                setCurrentPeriod(cleanState.currentPeriod as "AM" | "PM");
                setActivityToday(cleanState.activityToday);
                setWorkPlanNextDay(cleanState.workPlanNextDay);
                setManagementTeam(cleanState.managementTeam);
                setWorkingTeam(cleanState.workingTeam);
                setInteriorTeam(cleanState.interiorTeam);
                setMepTeam(cleanState.mepTeam);
                setMaterials(cleanState.materials);
                setMachinery(cleanState.machinery);
                setReferenceSections(cleanState.referenceSections);
                setSiteActivitiesSections(cleanState.siteActivitiesSections);
                setSiteActivitiesTitle(cleanState.siteActivitiesTitle);
                setCarSheet(cleanState.carSheet);
                setProjectLogo(cleanState.projectLogo);
              }
            } else {
              // EXISTING REPORT EDITING - Load normally
              console.log("🔧 EXISTING REPORT: Loading existing report data");
              setReportId(dbReport._id || reportIdFromUrl);
              validateAndSetProjectContext(dbReport.projectName || "", projectFromUrl, setProjectName);
              setReportDate(dbReport.reportDate ? new Date(dbReport.reportDate) : new Date());
              setReportStatus(dbReport.status || 'draft');
              
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
              
              // Handle interior and MEP team migration
              if (dbReport.interiorTeam && dbReport.mepTeam) {
                // New format: use separate teams
                setInteriorTeam(ensureRowIds(dbReport.interiorTeam));
                setMepTeam(ensureRowIds(dbReport.mepTeam));
              } else {
                // Old format: split working team
                const { interior, mep } = splitWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
                setInteriorTeam(interior);
                setMepTeam(mep);
              }
              
              setMaterials(ensureRowIds(dbReport.materials || []));
              setMachinery(ensureRowIds(dbReport.machinery || []));
              setReferenceSections(dbReport.referenceSections && dbReport.referenceSections.length > 0 ? dbReport.referenceSections : createDefaultHSESections());
              setTableTitle(dbReport.tableTitle || "HSE Toolbox Meeting");
              setSiteActivitiesSections(dbReport.siteActivitiesSections && dbReport.siteActivitiesSections.length > 0 ? dbReport.siteActivitiesSections : createDefaultHSESections());
              setSiteActivitiesTitle(dbReport.siteActivitiesTitle || "Site Activities Photos");
              setCarSheet(dbReport.carSheet || { description: "", photo_groups: [] });
              setProjectLogo(dbReport.projectLogo || "");
            }
          }
        } else {
          // Fallback to localStorage
          const localDraft = loadDraftLocally(reportDate);
          if (localDraft) {
            const isNewReport = await isNewReportCreation(reportIdFromUrl, projectFromUrl, null);
            
            if (isNewReport) {
              // NEW: Initialize clean state for new report (no project history)
              console.log("🔧 NEW REPORT: Project has no history in localStorage, using clean state");
              const cleanState = initializeCleanReportState(projectFromUrl || "", setProjectName, setReportStatus);
              
              // Set only project name, ignore localStorage data for new reports
              setReportDate(new Date());
              setWeatherAM(cleanState.weatherAM);
              setWeatherPM(cleanState.weatherPM);
              setTempAM(cleanState.tempAM);
              setTempPM(cleanState.tempPM);
              setCurrentPeriod(cleanState.currentPeriod as "AM" | "PM");
              setActivityToday(cleanState.activityToday);
              setWorkPlanNextDay(cleanState.workPlanNextDay);
              setManagementTeam(cleanState.managementTeam);
              setWorkingTeam(cleanState.workingTeam);
              setInteriorTeam(cleanState.interiorTeam);
              setMepTeam(cleanState.mepTeam);
              setMaterials(cleanState.materials);
              setMachinery(cleanState.machinery);
              setReferenceSections(cleanState.referenceSections);
              setSiteActivitiesSections(cleanState.siteActivitiesSections);
              setSiteActivitiesTitle(cleanState.siteActivitiesTitle);
              setCarSheet(cleanState.carSheet);
              setProjectLogo(cleanState.projectLogo);
              
            } else {
              // SMART: Check if we should load project's most recent report
              if (!reportIdFromUrl && projectFromUrl) {
                // Always try smart loading for new reports with project context
                console.log("🔧 SMART LOAD: Creating new report for project:", projectFromUrl);
                const projectRecentReport = await loadMostRecentReportForProject(projectFromUrl);
                
                if (projectRecentReport) {
                  // Load project's most recent report as template
                  console.log("🔧 SMART LOAD: Found project report, using as template");
                  setReportId(""); // Keep as new report
                  setProjectName(projectFromUrl);
                  setReportDate(new Date());

                  // ADD THIS: Reset status to draft for new reports based on templates
                  setReportStatus('draft');
                  
                  // Load data from project's most recent report
                  setWeatherAM(projectRecentReport.weatherAM || "");
                  setWeatherPM(projectRecentReport.weatherPM || "");
                  setTempAM(projectRecentReport.tempAM || "");
                  setTempPM(projectRecentReport.tempPM || "");
                  setCurrentPeriod(projectRecentReport.currentPeriod || "AM");
                  setActivityToday(projectRecentReport.activityToday || "");
                  setWorkPlanNextDay(projectRecentReport.workPlanNextDay || "");
                  setManagementTeam(ensureRowIds(projectRecentReport.managementTeam || []));
                  setWorkingTeam(ensureRowIds(projectRecentReport.workingTeam || []));
                  
                  // Handle interior and MEP team migration
                  if (projectRecentReport.interiorTeam && projectRecentReport.mepTeam) {
                    setInteriorTeam(ensureRowIds(projectRecentReport.interiorTeam));
                    setMepTeam(ensureRowIds(projectRecentReport.mepTeam));
                  } else {
                    const { interior, mep } = splitWorkingTeam(ensureRowIds(projectRecentReport.workingTeam || []));
                    setInteriorTeam(interior);
                    setMepTeam(mep);
                  }
                  
                  setMaterials(ensureRowIds(projectRecentReport.materials || []));
                  setMachinery(ensureRowIds(projectRecentReport.machinery || []));
                  setReferenceSections(projectRecentReport.referenceSections && projectRecentReport.referenceSections.length > 0 ? projectRecentReport.referenceSections : createDefaultHSESections());
                  setSiteActivitiesSections(projectRecentReport.siteActivitiesSections && projectRecentReport.siteActivitiesSections.length > 0 ? projectRecentReport.siteActivitiesSections : createDefaultHSESections());
                  setSiteActivitiesTitle(projectRecentReport.siteActivitiesTitle || "Site Activities Photos");
                  setCarSheet(projectRecentReport.carSheet || { description: "", photo_groups: [] });
                  setProjectLogo(projectRecentReport.projectLogo || "");
                  
                } else {
                  // Clean state for projects with no history
                  console.log("🔧 CLEAN STATE: No project history found, using clean state");
                  const cleanState = initializeCleanReportState(projectFromUrl, setProjectName, setReportStatus);
                  setReportId("");
                  setReportDate(new Date());
                  setWeatherAM(cleanState.weatherAM);
                  setWeatherPM(cleanState.weatherPM);
                  setTempAM(cleanState.tempAM);
                  setTempPM(cleanState.tempPM);
                  setCurrentPeriod(cleanState.currentPeriod as "AM" | "PM");
                  setActivityToday(cleanState.activityToday);
                  setWorkPlanNextDay(cleanState.workPlanNextDay);
                  setManagementTeam(cleanState.managementTeam);
                  setWorkingTeam(cleanState.workingTeam);
                  setInteriorTeam(cleanState.interiorTeam);
                  setMepTeam(cleanState.mepTeam);
                  setMaterials(cleanState.materials);
                  setMachinery(cleanState.machinery);
                  setReferenceSections(cleanState.referenceSections);
                  setSiteActivitiesSections(cleanState.siteActivitiesSections);
                  setSiteActivitiesTitle(cleanState.siteActivitiesTitle);
                  setCarSheet(cleanState.carSheet);
                  setProjectLogo(cleanState.projectLogo);
                }
              } else {
                // EXISTING REPORT EDITING - Load normally
                console.log("🔧 EXISTING REPORT: Loading existing report data");
                setReportId(dbReport._id || reportIdFromUrl);
                validateAndSetProjectContext(dbReport.projectName || "", projectFromUrl, setProjectName);
                setReportDate(dbReport.reportDate ? new Date(dbReport.reportDate) : new Date());
                setReportStatus(dbReport.status || 'draft');
                
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
                
                // Handle interior and MEP team migration
                if (dbReport.interiorTeam && dbReport.mepTeam) {
                  // New format: use separate teams
                  setInteriorTeam(ensureRowIds(dbReport.interiorTeam));
                  setMepTeam(ensureRowIds(dbReport.mepTeam));
                } else {
                  // Old format: split working team
                  const { interior, mep } = splitWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
                  setInteriorTeam(interior);
                  setMepTeam(mep);
                }
                
                setMaterials(ensureRowIds(dbReport.materials || []));
                setMachinery(ensureRowIds(dbReport.machinery || []));
                setReferenceSections(dbReport.referenceSections && dbReport.referenceSections.length > 0 ? dbReport.referenceSections : createDefaultHSESections());
                setTableTitle(dbReport.tableTitle || "HSE Toolbox Meeting");
                setSiteActivitiesSections(dbReport.siteActivitiesSections && dbReport.siteActivitiesSections.length > 0 ? dbReport.siteActivitiesSections : createDefaultHSESections());
                setSiteActivitiesTitle(dbReport.siteActivitiesTitle || "Site Activities Photos");
                setCarSheet(dbReport.carSheet || { description: "", photo_groups: [] });
                setProjectLogo(dbReport.projectLogo || "");
              }
            }
          } else {
            // NEW: Set project name from URL context for new reports
            if (projectFromUrl) {
              setProjectName(projectFromUrl);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load report:", e);
        // Fallback to localStorage if DB fails
        const localDraft = loadDraftLocally(reportDate);
        if (localDraft) {
          const isNewReport = await isNewReportCreation(reportIdFromUrl, projectFromUrl, null);
          
          if (isNewReport) {
            // NEW: Initialize clean state for new report (no project history)
            console.log("🔧 ERROR FALLBACK: Project has no history, using clean state");
            const cleanState = initializeCleanReportState(projectFromUrl || "", setProjectName, setReportStatus);
            
            // Set only project name, ignore localStorage data for new reports
            setReportDate(new Date());
            setWeatherAM(cleanState.weatherAM);
            setWeatherPM(cleanState.weatherPM);
            setTempAM(cleanState.tempAM);
            setTempPM(cleanState.tempPM);
            setCurrentPeriod(cleanState.currentPeriod as "AM" | "PM");
            setActivityToday(cleanState.activityToday);
            setWorkPlanNextDay(cleanState.workPlanNextDay);
            setManagementTeam(cleanState.managementTeam);
            setWorkingTeam(cleanState.workingTeam);
            setInteriorTeam(cleanState.interiorTeam);
            setMepTeam(cleanState.mepTeam);
            setMaterials(cleanState.materials);
            setMachinery(cleanState.machinery);
            setReferenceSections(cleanState.referenceSections);
            setSiteActivitiesSections(cleanState.siteActivitiesSections);
            setSiteActivitiesTitle(cleanState.siteActivitiesTitle);
            setCarSheet(cleanState.carSheet);
            setProjectLogo(cleanState.projectLogo);
            
          } else {
            // SMART: Check if we should load project's most recent report
            if (!reportIdFromUrl && projectFromUrl) {
              // Always try smart loading for new reports with project context
              console.log("🔧 SMART LOAD: Creating new report for project:", projectFromUrl);
              const projectRecentReport = await loadMostRecentReportForProject(projectFromUrl);
              
              if (projectRecentReport) {
                // Load project's most recent report as template
                console.log("🔧 SMART LOAD: Found project report, using as template");
                setReportId(""); // Keep as new report
                setProjectName(projectFromUrl);
                setReportDate(new Date());

                // ADD THIS: Reset status to draft for new reports based on templates
                setReportStatus('draft');
                
                // Load data from project's most recent report
                setWeatherAM(projectRecentReport.weatherAM || "");
                setWeatherPM(projectRecentReport.weatherPM || "");
                setTempAM(projectRecentReport.tempAM || "");
                setTempPM(projectRecentReport.tempPM || "");
                setCurrentPeriod(projectRecentReport.currentPeriod || "AM");
                setActivityToday(projectRecentReport.activityToday || "");
                setWorkPlanNextDay(projectRecentReport.workPlanNextDay || "");
                setManagementTeam(ensureRowIds(projectRecentReport.managementTeam || []));
                setWorkingTeam(ensureRowIds(projectRecentReport.workingTeam || []));
                
                // Handle interior and MEP team migration
                if (projectRecentReport.interiorTeam && projectRecentReport.mepTeam) {
                  setInteriorTeam(ensureRowIds(projectRecentReport.interiorTeam));
                  setMepTeam(ensureRowIds(projectRecentReport.mepTeam));
                } else {
                  const { interior, mep } = splitWorkingTeam(ensureRowIds(projectRecentReport.workingTeam || []));
                  setInteriorTeam(interior);
                  setMepTeam(mep);
                }
                
                setMaterials(ensureRowIds(projectRecentReport.materials || []));
                setMachinery(ensureRowIds(projectRecentReport.machinery || []));
                setReferenceSections(projectRecentReport.referenceSections && projectRecentReport.referenceSections.length > 0 ? projectRecentReport.referenceSections : createDefaultHSESections());
                setSiteActivitiesSections(projectRecentReport.siteActivitiesSections && projectRecentReport.siteActivitiesSections.length > 0 ? projectRecentReport.siteActivitiesSections : createDefaultHSESections());
                setSiteActivitiesTitle(projectRecentReport.siteActivitiesTitle || "Site Activities Photos");
                setCarSheet(projectRecentReport.carSheet || { description: "", photo_groups: [] });
                setProjectLogo(projectRecentReport.projectLogo || "");
                
              } else {
                // Clean state for projects with no history
                console.log("🔧 CLEAN STATE: No project history found, using clean state");
                const cleanState = initializeCleanReportState(projectFromUrl, setProjectName, setReportStatus);
                setReportId("");
                setReportDate(new Date());
                setWeatherAM(cleanState.weatherAM);
                setWeatherPM(cleanState.weatherPM);
                setTempAM(cleanState.tempAM);
                setTempPM(cleanState.tempPM);
                setCurrentPeriod(cleanState.currentPeriod as "AM" | "PM");
                setActivityToday(cleanState.activityToday);
                setWorkPlanNextDay(cleanState.workPlanNextDay);
                setManagementTeam(cleanState.managementTeam);
                setWorkingTeam(cleanState.workingTeam);
                setInteriorTeam(cleanState.interiorTeam);
                setMepTeam(cleanState.mepTeam);
                setMaterials(cleanState.materials);
                setMachinery(cleanState.machinery);
                setReferenceSections(cleanState.referenceSections);
                setSiteActivitiesSections(cleanState.siteActivitiesSections);
                setSiteActivitiesTitle(cleanState.siteActivitiesTitle);
                setCarSheet(cleanState.carSheet);
                setProjectLogo(cleanState.projectLogo);
              }
            } else {
              // EXISTING REPORT EDITING - Load normally
              console.log("🔧 EXISTING REPORT: Loading existing report data");
              setReportId("");
              validateAndSetProjectContext(localDraft.projectName || "", projectFromUrl, setProjectName);
              setReportDate(localDraft.reportDate ? new Date(localDraft.reportDate) : new Date());
              
              // Handle backward compatibility: convert old format to new
              if (localDraft.weatherAM !== undefined) {
                setWeatherAM(localDraft.weatherAM || "");
                setWeatherPM(localDraft.weatherPM || "");
                setTempAM(localDraft.tempAM || "");
                setTempPM(localDraft.tempPM || "");
                setCurrentPeriod(localDraft.currentPeriod || "AM");
              } else {
                // Old format: migrate to new format
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
              
              // Handle interior and MEP team migration
              if (localDraft.interiorTeam && localDraft.mepTeam) {
                // New format: use separate teams
                setInteriorTeam(ensureRowIds(localDraft.interiorTeam));
                setMepTeam(ensureRowIds(localDraft.mepTeam));
              } else {
                // Old format: split working team
                const { interior, mep } = splitWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
                setInteriorTeam(interior);
                setMepTeam(mep);
              }
              
              setMaterials(ensureRowIds(localDraft.materials || []));
              setMachinery(ensureRowIds(localDraft.machinery || []));
              setReferenceSections(localDraft.referenceSections && localDraft.referenceSections.length > 0 ? localDraft.referenceSections : createDefaultHSESections());
              setTableTitle(localDraft.tableTitle || "HSE Toolbox Meeting");
              setSiteActivitiesSections(localDraft.siteActivitiesSections && localDraft.siteActivitiesSections.length > 0 ? localDraft.siteActivitiesSections : createDefaultHSESections());
              setSiteActivitiesTitle(localDraft.siteActivitiesTitle || "Site Activities Photos");
              setCarSheet(localDraft.carSheet || { description: "", photo_groups: [] });
              setProjectLogo(localDraft.projectLogo || "");
            }
          }
        } else {
          // NEW: Set project name from URL context for new reports (error fallback)
          if (projectFromUrl) {
            setProjectName(projectFromUrl);
          }
        }
      }
    };

    loadInitialReport();
  }, [reportDate, reportIdFromUrl]); // Include reportDate and reportIdFromUrl to satisfy ESLint

  // // Load report on mount - Try ID first, then DB by date, fallback to localStorage (only on first mount)
  // useEffect(() => {
  //   const loadInitialReport = async () => {
  //     if (initialLoadDoneRef.current) return; // Only load on first mount

  //     initialLoadDoneRef.current = true;

  //     try {
  //       let dbReport = null;

  //       // First, try to load by reportId if provided in URL
  //       if (reportIdFromUrl) {
  //         console.log("🔍 DAILY REPORT: Loading report by ID:", reportIdFromUrl);
  //         dbReport = await loadReportById(reportIdFromUrl);
  //         console.log("🔍 DAILY REPORT: Report by ID result:", dbReport ? "FOUND" : "NOT FOUND");
  //         originalReportDataRef.current = dbReport;
  //       }

  //       // If no report by ID, try loading by date
  //       if (!dbReport && reportDate) {
  //         console.log("Loading report by date:", reportDate);
  //         dbReport = await loadReportFromDB(reportDate);
  //       }

  //       if (dbReport) {
  //         // Load from database
  //         setReportId(dbReport._id || reportIdFromUrl);
  //         setProjectName(dbReport.projectName || "");
  //         setReportDate(
  //           dbReport.reportDate ? new Date(dbReport.reportDate) : new Date()
  //         );
  //         // Handle backward compatibility: convert old format to new
  //         if (dbReport.weatherAM !== undefined) {
  //           setWeatherAM(dbReport.weatherAM || "");
  //           setWeatherPM(dbReport.weatherPM || "");
  //           setTempAM(dbReport.tempAM || "");
  //           setTempPM(dbReport.tempPM || "");
  //           setCurrentPeriod(dbReport.currentPeriod || "AM");
  //         } else {
  //           // Old format: migrate to new format
  //           const oldWeather = dbReport.weather || "Sunny";
  //           const oldPeriod = dbReport.weatherPeriod || "AM";
  //           const oldTemp = dbReport.temperature || "";
  //           if (oldPeriod === "AM") {
  //             setWeatherAM(oldWeather);
  //             setWeatherPM("");
  //             setTempAM(oldTemp);
  //             setTempPM("");
  //           } else {
  //             setWeatherAM("");
  //             setWeatherPM(oldWeather);
  //             setTempAM("");
  //             setTempPM(oldTemp);
  //           }
  //           setCurrentPeriod("AM");
  //         }
  //         setActivityToday(dbReport.activityToday || "");
  //         setWorkPlanNextDay(dbReport.workPlanNextDay || "");
  //         setManagementTeam(ensureRowIds(dbReport.managementTeam || []));
  //         setWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
  //         setMaterials(ensureRowIds(dbReport.materials || []));
  //         setMachinery(ensureRowIds(dbReport.machinery || []));
  //       } else {
  //         // Fallback to localStorage
  //         const localDraft = loadDraftLocally(reportDate);
  //         if (localDraft) {
  //           setProjectName(localDraft.projectName || "");
  //           setReportDate(
  //             localDraft.reportDate
  //               ? new Date(localDraft.reportDate)
  //               : new Date()
  //           );
  //           // Handle backward compatibility
  //           if (localDraft.weatherAM !== undefined) {
  //             setWeatherAM(localDraft.weatherAM || "");
  //             setWeatherPM(localDraft.weatherPM || "");
  //             setTempAM(localDraft.tempAM || "");
  //             setTempPM(localDraft.tempPM || "");
  //             setCurrentPeriod(localDraft.currentPeriod || "AM");
  //           } else {
  //             const oldWeather = localDraft.weather || "Sunny";
  //             const oldPeriod = localDraft.weatherPeriod || "AM";
  //             const oldTemp = localDraft.temperature || "";
  //             if (oldPeriod === "AM") {
  //               setWeatherAM(oldWeather);
  //               setWeatherPM("");
  //               setTempAM(oldTemp);
  //               setTempPM("");
  //             } else {
  //               setWeatherAM("");
  //               setWeatherPM(oldWeather);
  //               setTempAM("");
  //               setTempPM(oldTemp);
  //             }
  //             setCurrentPeriod("AM");
  //           }
  //           setActivityToday(localDraft.activityToday || "");
  //           setWorkPlanNextDay(localDraft.workPlanNextDay || "");
  //           setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
  //           setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
  //           setMaterials(ensureRowIds(localDraft.materials || []));
  //           setMachinery(ensureRowIds(localDraft.machinery || []));
  //         }
  //       }
  //     } catch (e) {
  //       console.error("Failed to load report:", e);
  //       // Fallback to localStorage if DB fails
  //       const localDraft = loadDraftLocally(reportDate);
  //       if (localDraft) {
  //         setProjectName(localDraft.projectName || "");
  //         setReportDate(
  //           localDraft.reportDate ? new Date(localDraft.reportDate) : new Date()
  //         );
  //         // Handle backward compatibility
  //         if (localDraft.weatherAM !== undefined) {
  //           setWeatherAM(localDraft.weatherAM || "");
  //           setWeatherPM(localDraft.weatherPM || "");
  //           setTempAM(localDraft.tempAM || "");
  //           setTempPM(localDraft.tempPM || "");
  //           setCurrentPeriod(localDraft.currentPeriod || "AM");
  //         } else {
  //           const oldWeather = localDraft.weather || "Sunny";
  //           const oldPeriod = localDraft.weatherPeriod || "AM";
  //           const oldTemp = localDraft.temperature || "";
  //           if (oldPeriod === "AM") {
  //             setWeatherAM(oldWeather);
  //             setWeatherPM("");
  //             setTempAM(oldTemp);
  //             setTempPM("");
  //           } else {
  //             setWeatherAM("");
  //             setWeatherPM(oldWeather);
  //             setTempAM("");
  //             setTempPM(oldTemp);
  //           }
  //           setCurrentPeriod("AM");
  //         }
  //         setActivityToday(localDraft.activityToday || "");
  //         setWorkPlanNextDay(localDraft.workPlanNextDay || "");
  //         setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
  //         setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
  //         setMaterials(ensureRowIds(localDraft.materials || []));
  //         setMachinery(ensureRowIds(localDraft.machinery || []));
  //       }
  //     }
  //   };

  //   loadInitialReport();
  // }, [reportDate, reportIdFromUrl]); // Include reportDate and reportIdFromUrl to satisfy ESLint

  // Handle date change: save current, carry forward between dates, load or clear on first selection
  // useEffect(() => {
  //   const newDateStr = reportDate?.toISOString().slice(0, 10) || null;
  //   const prevDateStr = lastDateRef.current;

  //   if (!reportIdFromUrl && reportDate && prevDateStr && newDateStr && prevDateStr !== newDateStr) {
  //     // Date changed: save current date draft locally and carry forward
  //     saveDraftLocally(new Date(prevDateStr), getReportData());

  //     // Load the target date
  //     const loadTargetDate = async () => {
  //       try {
  //         // Try database first
  //         const dbReport = await loadReportFromDB(reportDate!);

  //         if (dbReport) {
  //           // Found report in database
  //           setProjectName(dbReport.projectName || "");
  //           // Handle backward compatibility: convert old format to new
  //           if (dbReport.weatherAM !== undefined) {
  //             setWeatherAM(dbReport.weatherAM || "");
  //             setWeatherPM(dbReport.weatherPM || "");
  //             setTempAM(dbReport.tempAM || "");
  //             setTempPM(dbReport.tempPM || "");
  //             setCurrentPeriod(dbReport.currentPeriod || "AM");
  //           } else {
  //             // Old format: migrate to new format
  //             const oldWeather = dbReport.weather || "Sunny";
  //             const oldPeriod = dbReport.weatherPeriod || "AM";
  //             const oldTemp = dbReport.temperature || "";
  //             if (oldPeriod === "AM") {
  //               setWeatherAM(oldWeather);
  //               setWeatherPM("");
  //               setTempAM(oldTemp);
  //               setTempPM("");
  //             } else {
  //               setWeatherAM("");
  //               setWeatherPM(oldWeather);
  //               setTempAM("");
  //               setTempPM(oldTemp);
  //             }
  //             setCurrentPeriod("AM");
  //           }
  //           setActivityToday(dbReport.activityToday || "");
  //           setWorkPlanNextDay(dbReport.workPlanNextDay || "");
  //           setManagementTeam(ensureRowIds(dbReport.managementTeam || []));
  //           setWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
  //           setMaterials(ensureRowIds(dbReport.materials || []));
  //           setMachinery(ensureRowIds(dbReport.machinery || []));
  //         } else {
  //           // No DB report, try localStorage
  //           const localDraft = loadDraftLocally(reportDate);

  //           if (localDraft) {
  //             // Found local draft
  //             setProjectName(localDraft.projectName || "");
  //             // Handle backward compatibility
  //             if (localDraft.weatherAM !== undefined) {
  //               setWeatherAM(localDraft.weatherAM || "");
  //               setWeatherPM(localDraft.weatherPM || "");
  //               setTempAM(localDraft.tempAM || "");
  //               setTempPM(localDraft.tempPM || "");
  //               setCurrentPeriod(localDraft.currentPeriod || "AM");
  //             } else {
  //               const oldWeather = localDraft.weather || "Sunny";
  //               const oldPeriod = localDraft.weatherPeriod || "AM";
  //               const oldTemp = localDraft.temperature || "";
  //               if (oldPeriod === "AM") {
  //                 setWeatherAM(oldWeather);
  //                 setWeatherPM("");
  //                 setTempAM(oldTemp);
  //                 setTempPM("");
  //               } else {
  //                 setWeatherAM("");
  //                 setWeatherPM(oldWeather);
  //                 setTempAM("");
  //                 setTempPM(oldTemp);
  //               }
  //               setCurrentPeriod("AM");
  //             }
  //             setActivityToday(localDraft.activityToday || "");
  //             setWorkPlanNextDay(localDraft.workPlanNextDay || "");
  //             setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
  //             setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
  //             setMaterials(ensureRowIds(localDraft.materials || []));
  //             setMachinery(ensureRowIds(localDraft.machinery || []));
  //           } else {
  //             // No saved report: prefill from yesterday
  //             const yesterday = new Date(reportDate!.getTime() - 86400000);
  //             const prevData = loadDraftLocally(yesterday);

  //             if (prevData) {
  //               // Copy prev-day accumulated -> today's prev
  //               const mapPrevFromAccum = (rows: ResourceRow[]) =>
  //                 ensureRowIds(rows).map((r) => ({
  //                   ...r,
  //                   prev: r.accumulated,
  //                   today: 0,
  //                   accumulated: r.accumulated,
  //                 }));

  //               setManagementTeam(
  //                 mapPrevFromAccum(prevData.managementTeam || [])
  //               );
  //               setWorkingTeam(mapPrevFromAccum(prevData.workingTeam || []));
  //               setMaterials(mapPrevFromAccum(prevData.materials || []));
  //               setMachinery(mapPrevFromAccum(prevData.machinery || []));

  //               // Reset other fields for new day
  //               setProjectName("");
  //               setWeatherAM("");
  //               setWeatherPM("");
  //               setTempAM("");
  //               setTempPM("");
  //               setCurrentPeriod("AM");
  //               setActivityToday("");
  //               setWorkPlanNextDay("");
  //             }
  //           }
  //         }
  //       } catch (e) {
  //         console.error("Failed to load report for new date:", e);
  //       }
  //     };

  //     loadTargetDate();
  //   } else if (newDateStr && !prevDateStr) {
  //     console.log("🐛 DEBUG: First date selection");
  //     console.log("🐛 DEBUG: newDateStr:", newDateStr);
  //     console.log("🐛 DEBUG: prevDateStr:", prevDateStr);
  //     console.log("🐛 DEBUG: reportIdFromUrl:", reportIdFromUrl);
  //     // First date selection: try to load existing data for this date, otherwise clear
  //     const loadDataForDate = async () => {
  //       console.log("🐛 DEBUG: loadDataForDate called");
  //       console.log("🐛 DEBUG: reportDate object:", reportDate);
  //       console.log("🐛 DEBUG: reportDate type:", typeof reportDate);
  //       console.log("🐛 DEBUG: reportDate toISOString:", reportDate?.toISOString());
  //       try {
  //         // Try to load from database first
  //         const dbReport = await loadReportFromDB(reportDate!);
  //         console.log("🐛 DEBUG: dbReport from loadReportFromDB:", dbReport);
  //         if (dbReport) {
  //           setProjectName(dbReport.projectName || "");
  //           // Handle backward compatibility: convert old format to new
  //           if (dbReport.weatherAM !== undefined) {
  //             setWeatherAM(dbReport.weatherAM || "");
  //             setWeatherPM(dbReport.weatherPM || "");
  //             setTempAM(dbReport.tempAM || "");
  //             setTempPM(dbReport.tempPM || "");
  //             setCurrentPeriod(dbReport.currentPeriod || "AM");
  //           } else {
  //             // Old format: migrate to new format
  //             const oldWeather = dbReport.weather || "Sunny";
  //             const oldPeriod = dbReport.weatherPeriod || "AM";
  //             const oldTemp = dbReport.temperature || "";
  //             if (oldPeriod === "AM") {
  //               setWeatherAM(oldWeather);
  //               setWeatherPM("");
  //               setTempAM(oldTemp);
  //               setTempPM("");
  //             } else {
  //               setWeatherAM("");
  //               setWeatherPM(oldWeather);
  //               setTempAM("");
  //               setTempPM(oldTemp);
  //             }
  //             setCurrentPeriod("AM");
  //           }
  //           setActivityToday(dbReport.activityToday || "");
  //           setWorkPlanNextDay(dbReport.workPlanNextDay || "");
  //           setManagementTeam(ensureRowIds(dbReport.managementTeam || []));
  //           setWorkingTeam(ensureRowIds(dbReport.workingTeam || []));
  //           setMaterials(ensureRowIds(dbReport.materials || []));
  //           setMachinery(ensureRowIds(dbReport.machinery || []));
  //           setReferenceSections(dbReport.referenceSections || []);
  //           setTableTitle(dbReport.tableTitle || "HSE Toolbox Meeting");
  //           setCarSheet(dbReport.carSheet || { description: "", photo_groups: [] });
  //           setProjectLogo(dbReport.projectLogo || "");
  //           return;
  //         }

  //         // Fallback to localStorage
  //         const localDraft = loadDraftLocally(reportDate);
  //         if (localDraft) {
  //           setProjectName(localDraft.projectName || "");
  //           // Handle backward compatibility
  //           if (localDraft.weatherAM !== undefined) {
  //             setWeatherAM(localDraft.weatherAM || "");
  //             setWeatherPM(localDraft.weatherPM || "");
  //             setTempAM(localDraft.tempAM || "");
  //             setTempPM(localDraft.tempPM || "");
  //             setCurrentPeriod(localDraft.currentPeriod || "AM");
  //           } else {
  //             const oldWeather = localDraft.weather || "Sunny";
  //             const oldPeriod = localDraft.weatherPeriod || "AM";
  //             const oldTemp = localDraft.temperature || "";
  //             if (oldPeriod === "AM") {
  //               setWeatherAM(oldWeather);
  //               setWeatherPM("");
  //               setTempAM(oldTemp);
  //               setTempPM("");
  //             } else {
  //               setWeatherAM("");
  //               setWeatherPM(oldWeather);
  //               setTempAM("");
  //               setTempPM(oldTemp);
  //             }
  //             setCurrentPeriod("AM");
  //           }
  //           setActivityToday(localDraft.activityToday || "");
  //           setWorkPlanNextDay(localDraft.workPlanNextDay || "");
  //           setManagementTeam(ensureRowIds(localDraft.managementTeam || []));
  //           setWorkingTeam(ensureRowIds(localDraft.workingTeam || []));
  //           setMaterials(ensureRowIds(localDraft.materials || []));
  //           setMachinery(ensureRowIds(localDraft.machinery || []));
  //           return;
  //         }
  //       } catch (e) {
  //         console.error("Failed to load report for date:", e);
  //       }

  //       // No existing data: clear form to defaults
  //       setProjectName("");
  //       setWeatherAM("");
  //       setWeatherPM("");
  //       setTempAM("");
  //       setTempPM("");
  //       setCurrentPeriod("AM");
  //       setActivityToday("");
  //       setWorkPlanNextDay("");
  //       setManagementTeam([]);
  //       setWorkingTeam([]);
  //       setMaterials([]);
  //       setMachinery([]);
  //     };

  //     loadDataForDate();
  //   }

  //   lastDateRef.current = newDateStr;
  // }, [reportDate, getReportData]);

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
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     saveDraft(true);
  //   }, 30000);
  //   return () => clearInterval(interval);
  // }, [saveDraft]);

  // Google Docs-style: Auto-save with debounce
  const debouncedAutoSave = useRef<NodeJS.Timeout | null>(null);

  // const triggerAutoSave = useCallback((partialData: Partial<ReportData>) => {
  //   if (!reportId) {
  //     console.log("🔒 AUTO-SAVE: No reportId, skipping auto-save");
  //     return;
  //   }

  //   if (debouncedAutoSave.current) {
  //     clearTimeout(debouncedAutoSave.current);
  //   }

  //   debouncedAutoSave.current = setTimeout(async () => {
  //     try {
  //       setIsAutoSaving(true);
  //       console.log("🔒 AUTO-SAVE: Triggering auto-save for reportId:", reportId);

  //       const result = await autoSaveReport(reportId, partialData);

  //       if (result.success) {
  //         setLastSavedAt(new Date());
  //         console.log("🔒 AUTO-SAVE: Success");
  //       }
  //     } catch (error: any) {
  //       console.error("🔒 AUTO-SAVE: Error:", error);
  //       // Silent fail for auto-save to not interrupt user
  //     } finally {
  //       setIsAutoSaving(false);
  //     }
  //   }, 1000); // 1 second debounce
  // }, [reportId]);

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (!reportId) return;

    const currentData = {
      projectName,
      reportDate: reportDate?.toISOString(),
      weatherAM,
      weatherPM,
      tempAM,
      tempPM,
      currentPeriod,
      activityToday,
      workPlanNextDay,
      managementTeam,
      workingTeam,
      materials,
      machinery,
    };

    // triggerAutoSave(currentData);
  }, [
    projectName,
    reportDate,
    weatherAM,
    weatherPM,
    tempAM,
    tempPM,
    currentPeriod,
    activityToday,
    workPlanNextDay,
    managementTeam,
    workingTeam,
    materials,
    machinery,
    // triggerAutoSave,
  ]);

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

    // Generate default filename
    const defaultFileName = `${projectName || "Report"}_${
      reportDate?.toISOString().split("T")[0] || "export"
    }`;

    // Show file name dialog
    setPendingExportType("excel");
    setShowFileNameDialog(true);
  };

  const handleExportExcelWithFilename = async (fileName: string) => {
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

      // Call Python API with custom filename
      await generatePythonExcel(payload, "report", fileName);

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
    // Generate default filename
    const defaultFileName = `reference_${
      reportDate?.toISOString().split("T")[0] || "export"
    }`;

    // Show file name dialog
    setPendingExportType("reference");
    setShowFileNameDialog(true);
  };

  const handleExportReferenceWithFilename = async (fileName: string) => {
    setIsExportingReference(true);
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

      const processImages = async (sectionsArr: Section[]) => {
        return await Promise.all(
          sectionsArr.map(async (sec: Section) => {
            const newEntries = await Promise.all(
              (sec.entries ?? []).map(async (entry: Entry) => {
                const newSlots = await Promise.all(
                  (entry.slots ?? []).map(async (slot: Slot) => ({
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

      await generateReferenceExcel(processedSections, tableTitle, fileName);

      toast({
        title: "Reference Excel Exported",
        description: "Reference section exported successfully.",
      });
    } catch (e) {
      console.error("Reference Export Error:", e);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description:
          "Could not generate reference Excel. Ensure Python server is running.",
      });
    } finally {
      setIsExportingReference(false);
    }
  };

  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      console.log("🔒 SAVE: Saving report to database");

      // Get current report data
      const rawData = getReportData();

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

      const processImages = async (sectionsArr: Section[]) => {
        return await Promise.all(
          sectionsArr.map(async (sec: Section) => {
            const newEntries = await Promise.all(
              (sec.entries ?? []).map(async (entry: Entry) => {
                const newSlots = await Promise.all(
                  (entry.slots ?? []).map(async (slot: Slot) => ({
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

      // Process CAR data
      const processedCar = await Promise.all(
        (carSheet.photo_groups || []).map(async (g: any) => {
          const imgs = await Promise.all(
            (g.images || []).map(
              async (img: any) => (await toBase64DataUrl(img)) || ""
            )
          );
          return {
            date: g.date || "",
            images: [imgs[0] || "", imgs[1] || ""],
            footers: [g.footers?.[0] || "", g.footers?.[1] || ""],
          };
        })
      );

      const processedLogo = await toBase64DataUrl(projectLogo);

      const cleanedData = {
        ...rawData,
        managementTeam: cleanResourceRows(rawData.managementTeam),
        workingTeam: cleanResourceRows(rawData.workingTeam),
        interiorTeam: cleanResourceRows(rawData.interiorTeam),
        mepTeam: cleanResourceRows(rawData.mepTeam),
        materials: cleanResourceRows(rawData.materials),
        machinery: cleanResourceRows(rawData.machinery),
        referenceSections: processedSections,
        carSheet: {
          ...carSheet,
          photo_groups: processedCar,
        },
        projectLogo: processedLogo,
      };
      // Save to database
      await saveReportToDB(cleanedData);

      toast({
        title: "Report Saved",
        description: "Your report has been saved successfully.",
      });
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Save Failed",
        description: "Could not save report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsDraft = async () => {
    setIsSaving(true);
    try {
      console.log("🔒 DRAFT SAVE: Saving report as draft");

      // Get current report data
      const rawData = getReportData();
      const cleanedData = {
        ...rawData,
        managementTeam: cleanResourceRows(rawData.managementTeam),
        workingTeam: cleanResourceRows(rawData.workingTeam),
        interiorTeam: cleanResourceRows(rawData.interiorTeam),
        mepTeam: cleanResourceRows(rawData.mepTeam),
        materials: cleanResourceRows(rawData.materials),
        machinery: cleanResourceRows(rawData.machinery),
      };

      // Save to database (keeps status as "draft")
      await saveReportToDB(cleanedData);
      // ADD THIS: Update local status
      setReportStatus('draft');

      toast({
        title: "Draft Saved",
        description: "Your report has been saved as draft successfully.",
      });
    } catch (error) {
      console.error("Draft Save Error:", error);
      toast({
        title: "Draft Save Failed",
        description: "Could not save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCombinedExcel = async () => {
    if (!validateReport()) return;

    // Generate default filename
    const defaultFileName = `combined-${projectName || "Report"}_${
      reportDate?.toISOString().split("T")[0] || "export"
    }`;

    // Show file name dialog
    setPendingExportType("combined");
    setShowFileNameDialog(true);
  };

  const handleExportCombinedExcelWithFilename = async (fileName: string) => {
    setIsExportingCombined(true);
    try {
      // DEBUG: Add frontend log before saving
      console.log(
        "DEBUG FRONTEND: About to save report to DB before combined export"
      );

      // Step 1: Save report to database first (same logic as submit)
      const rawData = getReportData();

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

      const processImages = async (sectionsArr: Section[]) => {
        return await Promise.all(
          sectionsArr.map(async (sec: Section) => {
            const newEntries = await Promise.all(
              (sec.entries ?? []).map(async (entry: Entry) => {
                const newSlots = await Promise.all(
                  (entry.slots ?? []).map(async (slot: Slot) => ({
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

      // Process CAR data
      const processedCar = await Promise.all(
        (carSheet.photo_groups || []).map(async (g: any) => {
          const imgs = await Promise.all(
            (g.images || []).map(
              async (img: any) => (await toBase64DataUrl(img)) || ""
            )
          );
          return {
            date: g.date || "",
            images: [imgs[0] || "", imgs[1] || ""],
            footers: [g.footers?.[0] || "", g.footers?.[1] || ""],
          };
        })
      );

      const processedLogo = await toBase64DataUrl(projectLogo);

      const cleanedData = {
        ...rawData,
        managementTeam: cleanResourceRows(rawData.managementTeam),
        workingTeam: cleanResourceRows(rawData.workingTeam),
        interiorTeam: cleanResourceRows(rawData.interiorTeam),
        mepTeam: cleanResourceRows(rawData.mepTeam),
        materials: cleanResourceRows(rawData.materials),
        machinery: cleanResourceRows(rawData.machinery),
        referenceSections: processedSections,
        carSheet: {
          ...carSheet,
          photo_groups: processedCar,
        },
        projectLogo: processedLogo,
      };

      console.log(
        "🔍 FRONTEND: About to save data with referenceSections:",
        cleanedData.referenceSections
          ? "YES (" + cleanedData.referenceSections.length + " sections)"
          : "NO"
      );

      // Save to database
      try {
        console.log("🔍 FRONTEND: About to save to DB");
        await saveReportToDB(cleanedData);
        console.log("🔍 FRONTEND: Save completed successfully");
      } catch (error) {
        console.error("🔍 FRONTEND: Save failed:", error);
        // Don't proceed with export if save failed
        throw new Error("Database save failed");
      }

      // DEBUG: Confirm save completed
      console.log(
        "DEBUG FRONTEND: Save to DB completed successfully, proceeding with export"
      );

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
        description: carSheet.description || "",
        photo_groups: processedCar,
      };

      await generateCombinedExcel(
        reportPayload,
        processedSections,
        tableTitle,
        fileName,
        processedLogo
      );

      toast({
        title: "Combined Excel Exported",
        description: "Report saved to database and exported successfully.",
      });
    } catch (e) {
      console.error("Combined Export Error:", e);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description:
          "Could not save report or generate combined Excel. Please try again.",
      });
    } finally {
      setIsExportingCombined(false);
    }
  };

  const handleExportCombinedPDF = async () => {
    if (!validateReport()) return;

    const defaultFileName = `Combined_Report_${
      projectName?.replace(/\s+/g, "_") || "Report"
    }_${
      reportDate?.toISOString().split("T")[0] ||
      new Date().toISOString().split("T")[0]
    }`;

    setPendingExportType("combined-pdf");
    setDefaultFileName(defaultFileName);
    setShowFileNameDialog(true);
  };

  const handleExportCombinedPDFWithFilename = async (fileName: string) => {
    setIsExportingCombined(true);
    try {
      // Step 1: Save report to database first (same logic as combined Excel)
      const rawData = getReportData();

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

      const processImages = async (sectionsArr: Section[]) => {
        return await Promise.all(
          sectionsArr.map(async (sec: Section) => {
            const newEntries = await Promise.all(
              (sec.entries ?? []).map(async (entry: Entry) => {
                const newSlots = await Promise.all(
                  (entry.slots ?? []).map(async (slot: Slot) => ({
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

      // Process CAR data
      const processedCar = await Promise.all(
        (carSheet.photo_groups || []).map(async (g: any) => {
          const imgs = await Promise.all(
            (g.images || []).map(
              async (img: any) => (await toBase64DataUrl(img)) || ""
            )
          );
          return {
            date: g.date || "",
            images: [imgs[0] || "", imgs[1] || ""],
            footers: [g.footers?.[0] || "", g.footers?.[1] || ""],
          };
        })
      );

      const processedLogo = await toBase64DataUrl(projectLogo);

      const cleanedData = {
        ...rawData,
        managementTeam: cleanResourceRows(rawData.managementTeam),
        workingTeam: cleanResourceRows(rawData.workingTeam),
        interiorTeam: cleanResourceRows(rawData.interiorTeam),
        mepTeam: cleanResourceRows(rawData.mepTeam),
        materials: cleanResourceRows(rawData.materials),
        machinery: cleanResourceRows(rawData.machinery),
        referenceSections: processedSections,
        carSheet: {
          ...carSheet,
          photo_groups: processedCar,
        },
      };

      // Save to database
      await saveReportToDB(cleanedData);

      await generateCombinedPDF(
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
          description: carSheet.description || "",
          photo_groups: processedCar,
        },
        processedSections,
        tableTitle,
        fileName,
        processedLogo
      );

      toast({
        title: "Combined PDF Exported",
        description:
          "Your combined report has been exported as PDF successfully.",
      });
    } catch (error) {
      console.error("Combined PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate combined PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExportingCombined(false);
    }
  };

  const handlePreviewCombined = async () => {
    if (!validateReport()) return;
    setIsPreviewingCombined(true); // Start loading
    try {
      // Process images to base64 data URLs (same as export)
      const toBase64DataUrl = async (img: unknown): Promise<string | null> => {
        if (!img) return null;

        // Case 1: already a string (blob URL, data URL, http URL, etc.)
        if (typeof img === "string") {
          if (img.startsWith("data:")) return img; // Already a data URL
          if (img.startsWith("blob:")) {
            // Convert blob URL to data URL
            try {
              const response = await fetch(img);
              const blob = await response.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            } catch {
              return null;
            }
          }
          return img; // Return as-is for http URLs etc.
        }

        // Case 2: File object
        if (img instanceof File) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(img);
          });
        }

        return null;
      };

      const processImages = async (sectionsArr: Section[]) => {
        return await Promise.all(
          sectionsArr.map(async (sec: Section) => {
            const newEntries = await Promise.all(
              (sec.entries ?? []).map(async (entry: any) => {
                const newSlots = await Promise.all(
                  (entry.slots ?? []).map(async (slot: Slot) => ({
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

      // Process CAR data
      const processedCar = await Promise.all(
        (carSheet.photo_groups || []).map(async (g: any) => {
          const imgs = await Promise.all(
            (g.images || []).map(
              async (img: any) => (await toBase64DataUrl(img)) || ""
            )
          );
          return {
            date: g.date || "",
            images: [imgs[0] || "", imgs[1] || ""],
            footers: [g.footers?.[0] || "", g.footers?.[1] || ""],
          };
        })
      );

      const processedLogo = await toBase64DataUrl(projectLogo);

      // Use same payload as export
      const payload = {
        mode: "combined",
        data: {
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
          table_title: tableTitle,
          reference: processedSections.flatMap((section: any) =>
            (section.entries ?? []).map((entry: any) => {
              const slots = entry.slots ?? [];
              return {
                section_title: section.title || "",
                images: slots
                  .map((s: any) => s.image)
                  .filter(Boolean)
                  .slice(0, 2),
                footers: slots
                  .map((s: any) => s.caption)
                  .filter(Boolean)
                  .slice(0, 2),
              };
            })
          ),
          description: carSheet.description || "",
          photo_groups: processedCar,
          logos: {
            cacpm: null,
            koica: processedLogo,
          },
        },
      };

      // Get Excel data as blob
      const response = await pythonApiPost(
        `${PYTHON_API_BASE_URL}/generate-combined-pdf`,
        payload
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        // This will show PDF in browser
        setPreviewUrl(url);
        setShowPreview(true);
      }
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Could not generate preview.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewingCombined(false); // End loading
    }
  };

  const handleExportCombinedZIP = async () => {
    if (!validateReport()) return;

    const defaultFileName = `Combined_Report_${
      projectName?.replace(/\s+/g, "_") || "Report"
    }_${
      reportDate?.toISOString().split("T")[0] ||
      new Date().toISOString().split("T")[0]
    }`;

    setPendingExportType("combined-zip");
    setDefaultFileName(defaultFileName);
    setShowFileNameDialog(true);
  };

  const handleExportCombinedZIPWithFilename = async (fileName: string) => {
    setIsExportingCombined(true);
    try {
      // Step 1: Save report to database first (same logic as combined Excel)
      const rawData = getReportData();
      const cleanedData = {
        ...rawData,
        managementTeam: cleanResourceRows(rawData.managementTeam),
        workingTeam: cleanResourceRows(rawData.workingTeam),
        interiorTeam: cleanResourceRows(rawData.interiorTeam),
        mepTeam: cleanResourceRows(rawData.mepTeam),
        materials: cleanResourceRows(rawData.materials),
        machinery: cleanResourceRows(rawData.machinery),
      };

      // Save to database
      await saveReportToDB(cleanedData);
      // Process images for both exports
      const toBase64DataUrl = async (img: unknown): Promise<string | null> => {
        if (!img) return null;

        if (typeof img === "string") {
          if (img.startsWith("data:")) return img;
          if (img.startsWith("blob:")) {
            try {
              const response = await fetch(img);
              const blob = await response.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            } catch {
              return null;
            }
          }
          return img;
        }

        if (img instanceof File) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(img);
          });
        }

        return null;
      };

      const processImages = async (sectionsArr: Section[]) => {
        return await Promise.all(
          sectionsArr.map(async (sec: Section) => {
            const newEntries = await Promise.all(
              (sec.entries ?? []).map(async (entry: any) => {
                const newSlots = await Promise.all(
                  (entry.slots ?? []).map(async (slot: Slot) => ({
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

      // Process CAR data
      const processedCar = await Promise.all(
        (carSheet.photo_groups || []).map(async (g: any) => {
          const imgs = await Promise.all(
            (g.images || []).map(
              async (img: any) => (await toBase64DataUrl(img)) || ""
            )
          );
          return {
            date: g.date || "",
            images: [imgs[0] || "", imgs[1] || ""],
            footers: [g.footers?.[0] || "", g.footers?.[1] || ""],
          };
        })
      );

      const processedLogo = await toBase64DataUrl(projectLogo);

      // Generate both files
      const reportPayload = {
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
        description: carSheet.description || "",
        photo_groups: processedCar,
      };

      // Generate PDF
      const pdfResponse = await pythonApiPost(
        `${PYTHON_API_BASE_URL}/generate-combined-pdf`,
        {
          mode: "combined",
          data: {
            ...reportPayload,
            table_title: tableTitle,
            reference: processedSections.flatMap((section: any) =>
              (section.entries ?? []).map((entry: any) => {
                const slots = entry.slots ?? [];
                return {
                  section_title: section.title || "",
                  images: slots
                    .map((s: any) => s.image)
                    .filter(Boolean)
                    .slice(0, 2),
                  footers: slots
                    .map((s: any) => s.caption)
                    .filter(Boolean)
                    .slice(0, 2),
                };
              })
            ),
            logos: {
              cacpm: null,
              koica: processedLogo,
            },
          },
        }
      );

      // Generate Excel
      const excelResponse = await pythonApiPost(
        `${PYTHON_API_BASE_URL}/generate-combined`,
        {
          ...reportPayload,
          table_title: tableTitle,
          reference: processedSections.flatMap((section: any) =>
            (section.entries ?? []).map((entry: any) => {
              const slots = entry.slots ?? [];
              return {
                section_title: section.title || "",
                images: slots
                  .map((s: any) => s.image)
                  .filter(Boolean)
                  .slice(0, 2),
                footers: slots
                  .map((s: any) => s.caption)
                  .filter(Boolean)
                  .slice(0, 2),
              };
            })
          ),
          logos: {
            cacpm: null,
            koica: processedLogo,
          },
        }
      );

      if (!pdfResponse.ok || !excelResponse.ok) {
        throw new Error("Failed to generate files");
      }

      // Create ZIP file
      const JSZip = await import("jszip");
      const zip = new JSZip.default();

      const pdfBlob = await pdfResponse.blob();
      const excelBlob = await excelResponse.blob();

      zip.file(`${fileName}.pdf`, pdfBlob);
      zip.file(`${fileName}.xlsm`, excelBlob);

      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Download ZIP
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Combined ZIP Exported",
        description: "Both PDF and Excel files have been exported as ZIP.",
      });
    } catch (error) {
      console.error("Combined ZIP export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate combined ZIP.",
        variant: "destructive",
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
        interiorTeam: cleanResourceRows(rawData.interiorTeam),
        mepTeam: cleanResourceRows(rawData.mepTeam),
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
      // ADD THIS: Update local status
      setReportStatus('submitted');

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
        interiorTeam: cleanedData.interiorTeam.map((r) => ({
          ...r,
          prev: r.accumulated,
          today: 0,
          accumulated: r.accumulated,
        })),
        mepTeam: cleanedData.mepTeam.map((r) => ({
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

  const handleDelete = async () => {
    if (!reportIdFromUrl) {
      toast({
        title: "Error",
        description: "Cannot delete: No report ID found",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteReport(reportIdFromUrl);

      toast({
        title: "Report Deleted",
        description: "The report has been deleted successfully",
      });

      // Navigate back to dashboard after deletion
      navigate("/dashboard");
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Deletion Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />
        
        <SidebarInset>
          <div className="min-h-screen bg-background">
            <ReportHeader
              isAutoSaving={isAutoSaving}
              lastSavedAt={lastSavedAt}
              projectLogo={projectLogo}
              setProjectLogo={setProjectLogo}
            />

            {/* Show Projects View when no specific report is selected */}
            {!reportIdFromUrl && !projectFromUrl ? (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <DailyReportProjectsView />
              </div>
            ) : (
              <>
            {/* Navigation Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (projectFromUrl) {
                        navigate(`/dashboard?project=${encodeURIComponent(projectFromUrl)}`);
                      } else {
                        navigate("/dashboard");
                      }
                    }}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </div>

                {/* Section Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              variant={activeTab === "site-activities" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("site-activities")}
              className="rounded-full whitespace-nowrap"
            >
              Site Activities
            </Button>
            <Button
              variant={activeTab === "hse" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("hse")}
              className="rounded-full whitespace-nowrap"
            >
              HSE
            </Button>
            <Button
              variant={
                activeTab === "site-activities-photos" ? "default" : "outline"
              }
              size="sm"
              onClick={() => setActiveTab("site-activities-photos")}
              className="rounded-full whitespace-nowrap"
            >
              Site Activities Photos
            </Button>
            <Button
              variant={activeTab === "car" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("car")}
              className="rounded-full whitespace-nowrap"
            >
              CAR
            </Button>
                </div>

                <div className="flex items-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tab-based content rendering */}
            {activeTab === "site-activities" && (
              <>
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
              interiorTeam={interiorTeam}
              setInteriorTeam={setInteriorTeam}
              mepTeam={mepTeam}
              setMepTeam={setMepTeam}
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
              onDelete={handleDelete}
              reportId={reportIdFromUrl}
              isPreviewing={isPreviewing}
              isExporting={isExporting}
              isSubmitting={isSubmitting}
            />
          </>
        )}

        {activeTab === "hse" && (
          <>
            <div className="mt-2 pt-2">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h1 className="text-2xl text-center underline decoration-primary font-semibold text-foreground mb-4">
                  HSE ACTIVITIES PHOTO
                </h1>
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
          </>
        )}

        {activeTab === "site-activities-photos" && (
          <>
            <div className="mt-2 pt-2">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h1 className="text-2xl text-center underline decoration-primary font-semibold text-foreground mb-4">
                  SITE ACTIVITIES PHOTOS
                </h1>
                <ReferenceSection
                  sections={siteActivitiesSections}
                  setSections={setSiteActivitiesSections}
                  onExportReference={handleExportReference}
                  isExporting={isExportingSiteActivities}
                  tableTitle={siteActivitiesTitle}
                  setTableTitle={setSiteActivitiesTitle}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "car" && (
          <>
            {/* CAR section */}
            <div className="mt-2 pt-2">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h1 className="text-2xl text-center underline decoration-primary font-semibold text-foreground mb-4">
                  Corrective Action Request
                </h1>
                <CARSection car={carSheet} setCar={setCarSheet} />
              </div>
            </div>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-muted-foreground/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Export combined:{" "}
              <span className="font-medium text-foreground">Report</span> =
              Sheet 1,{" "}
              <span className="font-medium text-foreground">Reference</span> =
              Sheet 2,{" "}
              <span className="font-medium text-foreground">
                Corrective Action Request
              </span>{" "}
              = Sheet 3
            </div>
            <div className="flex items-center gap-3">
              {/* ADD THIS: Simple Save Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-w-[140px]"
                    disabled={isSaving || isSubmitting}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {(isSaving || isSubmitting) ? "Processing..." : "Save As..."}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[140px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem 
                          onClick={handleSaveAsDraft} 
                          disabled={isSaving || reportStatus === 'submitted'}
                          className={reportStatus === 'submitted' ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isSaving ? "Saving..." : "Draft"}
                          {reportStatus === 'submitted' && (
                            <Lock className="w-3 h-3 ml-auto" />
                          )}
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      {reportStatus === 'submitted' && (
                        <TooltipContent>
                          <p>Submitted reports cannot be reverted to draft status</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuItem 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className={reportStatus === 'submitted' ? 'bg-green-50 border-green-200' : ''}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submitted"}
                    {reportStatus === 'submitted' && (
                      <CheckCircle className="w-3 h-3 ml-auto text-green-600" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                className="min-w-[140px]"
                onClick={handlePreviewCombined}
                disabled={isPreviewingCombined}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isPreviewingCombined
                  ? "Previewing ..."
                  : "Preview"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="min-w-[130px] bg-primary hover:bg-primary/90"
                    disabled={isExportingCombined}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    {isExportingCombined
                      ? "Exporting ..."
                      : "Export"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleExportCombinedPDF}
                    disabled={isExportingCombined}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export As PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportCombinedExcel}
                    disabled={isExportingCombined}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export As Excel
                  </DropdownMenuItem>
                  {/* DISABLED: Export Combined Docs - commented out
                  <DropdownMenuItem>
                    <FileType className="w-4 h-4 mr-2" />
                    Export Combined Docs (Word)
                  </DropdownMenuItem>
                  */}
                  <DropdownMenuItem
                    onClick={handleExportCombinedZIP}
                    disabled={isExportingCombined}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export As (ZIP)
                  </DropdownMenuItem>
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

        <FileNameDialog
          open={showFileNameDialog}
          onClose={() => {
            setShowFileNameDialog(false);
            setPendingExportType(null);
          }}
          onConfirm={(fileName) => {
            if (pendingExportType === "excel") {
              handleExportExcelWithFilename(fileName);
            } else if (pendingExportType === "combined") {
              handleExportCombinedExcelWithFilename(fileName);
            } else if (pendingExportType === "reference") {
              handleExportReferenceWithFilename(fileName);
            } else if (pendingExportType === "combined-pdf") {
              handleExportCombinedPDFWithFilename(fileName);
            } else if (pendingExportType === "combined-zip") {
              handleExportCombinedZIPWithFilename(fileName);
            }
            setPendingExportType(null);
          }}
          defaultFileName={
            pendingExportType === "combined"
              ? `combined-${projectName || "Report"}_${
                  reportDate?.toISOString().split("T")[0] || "export"
                }`
              : pendingExportType === "reference"
              ? `reference_${
                  reportDate?.toISOString().split("T")[0] || "export"
                }`
              : `${projectName || "Report"}_${
                  reportDate?.toISOString().split("T")[0] || "export"
                }`
          }
          title={
            pendingExportType === "combined"
              ? "Export Combined Excel File"
              : pendingExportType === "reference"
              ? "Export Reference Excel File"
              : "Export Excel File"
          }
          description={
            pendingExportType === "combined"
              ? "Enter a name for your combined Excel export file (Report + Reference)."
              : pendingExportType === "reference"
              ? "Enter a name for your reference Excel export file."
              : "Enter a name for your Excel export file."
          }
        />
      </main>
      </>
            )}
    </div>
  </SidebarInset>
</div>
</SidebarProvider>
  );
};

export default DailyReport;
