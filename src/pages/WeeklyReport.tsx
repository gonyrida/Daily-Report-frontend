import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ReportHeader from "@/components/ReportHeader";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import WeeklyReportCover from "@/components/weekly/WeeklyReportCover";
import WeeklyReportLetter from "@/components/weekly/WeeklyReportLetter";
import { ActivityRow } from "@/types/activity.types";
import WeeklyReportContent from "@/components/weekly/WeeklyReportContent";
import ReferenceSection from "@/components/ReferenceSection";
import ConstructionIssueComponent from "@/components/weekly/content/ConstructionIssue";
import { createDefaultSiteActivitiesSections } from "@/utils/referenceHelpers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { useConstructionIssue } from "@/hooks/useConstructionIssue";
import { useHsesData } from "@/hooks/useHsesData";
import { useIntroductionText } from "@/hooks/useIntroductionText";
import { useOverallProgress } from "@/hooks/useOverallProgress";
import { toRoman } from "@/lib/numberUtils";
import { useIssues } from "@/hooks/useIssues";
import { useConstructionProgress } from "@/hooks/useConstructionProgress";
import { ConstructionProgressData } from "@/types/constructionProgress";
import { computeAllAmounts } from "@/utils/calculationEngine";
import { UploadCloud } from "lucide-react";
import { getProjectById } from "@/integrations/projectsApi";
import { convertScheduleEntriesToSupabase, uploadHSEPhotoReferencesToSupabase } from '@/utils/weeklyReportSupabase';
import { MasterScheduleSupabase } from '@/components/weekly/MasterScheduleSupabase';
import WeeklyReportConstructionProgress from "@/components/weekly/WeeklyReportConstructionProgress";
import { buildWeeklyReportExportData } from "@/lib/Weeklyreportexcelmapper";
import { exportWeeklyReportToExcel } from "@/lib/weeklyreportexcel";
import { exportWeeklyReportToPdf } from "@/lib/weeklyreportpdf";
import {
  createWeeklyReport,
  updateWeeklyReport,
  submitWeeklyReport,
  getWeeklyReportById,
  getWeeklyReports
} from "@/services/weeklyReportService";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Save,
  Eye,
  FileDown,
  FileText,
  FileSpreadsheet,
  Send,
  CheckCircle,
  Lock,
} from "lucide-react";
import { transformQaqcData, buildQaqcPayload } from "@/utils/qaqcUtils";

const WeeklyReport = () => {
  const [searchParams] = useSearchParams();
  const selectedProject = searchParams.get('project');
  const projectId = searchParams.get('projectId');
  const reportId = searchParams.get('reportId');
  const createNew = searchParams.get('createNew');
  const readOnly = searchParams.get('readOnly') === 'true';

  const [projectLogo, setProjectLogo] = useState<string>("/koica_logo.png");
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(
    (reportId && reportId !== 'undefined' && reportId !== 'null') ? reportId : null
  );
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const [isCreateNewMode, setIsCreateNewMode] = useState(false); // Track if we're creating a new report
  const [currentProjectName, setCurrentProjectName] = useState<string>(selectedProject || "");

  // Fetch current project name from API (to handle renamed projects)
  useEffect(() => {
    const fetchProjectName = async () => {
      if (projectId) {
        const response = await getProjectById(projectId);
        if (response.success && response.data && !Array.isArray(response.data)) {
          const fetchedName = response.data.name;
          if (fetchedName !== selectedProject) {
            // Use API value if different from URL parameter
          }
          setCurrentProjectName(fetchedName);
        } else {
          setCurrentProjectName(selectedProject || "");
        }
      } else {
        setCurrentProjectName(selectedProject || "");
      }
    };

    fetchProjectName();
  }, [projectId, selectedProject]);

  // Use currentProjectName instead of selectedProject for all operations
  const effectiveProjectName = currentProjectName || selectedProject || "";

  // Sync currentReportId with URL searchParams and handle createNew
  useEffect(() => {
    const urlReportId = searchParams.get('reportId');
    const urlCreateNew = searchParams.get('createNew');
    const urlReadOnly = searchParams.get('readOnly');

    // Handle createNew parameter
    if (urlCreateNew === 'true' && !urlReportId) {
      handleCreateNewWeeklyReport();
      setIsCreateNewMode(true);
      return;
    }

    // Handle case where both reportId and createNew=true are provided
    // This means we should load the existing report data but create a new one
    if (urlCreateNew === 'true' && urlReportId) {
      // Set the reportId to load the data, but we'll create a new report after loading
      const normalizedUrlId = urlReportId === 'undefined' || urlReportId === 'null' || !urlReportId ? null : urlReportId;
      if (normalizedUrlId !== currentReportId) {
        setCurrentReportId(normalizedUrlId);
      }
      // Disable read-only mode when creating new report from existing data
      setIsReadOnly(false);
      setIsCreateNewMode(true);
      return;
    }

    // Convert 'undefined' string to null for proper comparison
    const normalizedUrlId = urlReportId === 'undefined' || urlReportId === 'null' || !urlReportId ? null : urlReportId;
    if (normalizedUrlId !== currentReportId) {
      setCurrentReportId(normalizedUrlId);
      // Set read-only mode based on URL parameter
      setIsReadOnly(urlReadOnly === 'true');
      setIsCreateNewMode(false); // Viewing existing report, not creating new
    } else {
    }
  }, [searchParams]);

  // Active tab state for section filtering
  const [activeTab, setActiveTab] = useState<
    | "construction-progress"
    | "cover"
    | "letter"
    | "table-of-content"
    | "overall-progress"
    | "activities"
    | "qaqc-status"
    | "hses"
    | "resource"
    | "photos"
    | "issues"
    | "schedule"
  >("construction-progress");


  // State for second navigation bar visibility
  const [showSecondNav, setShowSecondNav] = useState(false);

  // Table of content sections for second navigation
  const tableOfContentSections = [
    { id: 1, name: "Intro", href: "#introduction" },
    {
      id: 2,
      name: "O.progress",
      href: "#overall-progress-of-this-week-and-next-week",
    },
    {
      id: 3,
      name: "Activities",
      href: "#activities-of-work-done--next-week-plan",
    },
    { id: 4, name: "QAQC", href: "#qaqc-status" },
    {
      id: 5,
      name: "HSES",
      href: "#health-safety-environmental--security-hses",
    },
    { id: 6, name: "Resources", href: "#resources-status" },
    { id: 7, name: "Photos", href: "#site-activity-photos" },
    { id: 8, name: "Issues", href: "#construction-issue" },
    { id: 9, name: "Schedule", href: "#master-schedule" },
  ];

  // Shared data state between tabs
  const [sharedData, setSharedData] = useState({
    weekNumber: "",
    refNoPrefix: "ICT-CPM-WRP",
    dateRange: "",
    projectName: (selectedProject || "Default Project Name").trim(),
    projectId: projectId || "",
    employer: "Client Name",
    coverImage: "",
    clientLogo: "",
    // Introduction fields
    projectOverview: "",
    designNConstruction: "",
    // Letter data fields
    reportDate: "",
    recipientCompany: "",
    recipientLocation: "",
    recipientName: "",
    ccList: [],
    letterBody: "",
    signatureImage: "",
    signatoryName: "",
    signatoryPosition: "",
    constructorName: "",
    companyLocation: "",
    companyPhone1: "",
    companyPhone2: "",
    companyEmail1: "",
    companyEmail2: ""
  });

  // Site Activities Photos state
  const [siteActivitiesSections, setSiteActivitiesSections] = useState(
    createDefaultSiteActivitiesSections()
  );
  const [siteActivitiesTitle, setSiteActivitiesTitle] = useState(
    "Site Activities Photos"
  );
  const [isExportingSiteActivities, setIsExportingSiteActivities] = useState(false);

  // Construction Issues state - managed by useIssues hook
  // const [constructionIssues, setConstructionIssues] = useState([
  //   { id: crypto.randomUUID(), issueNumber: 1 }
  // ]);

  // Construction Progress hook - use this as the single source of truth
  const constructionProgressHook = useConstructionProgress({ reportId: currentReportId });

  // Schedule sections state
  const [scheduleSections, setScheduleSections] = useState([
    { id: crypto.randomUUID(), title: "Master Schedule", entries: [] }
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);

  // Save, Preview, Export states
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Helper function to format date to yyyy-MM-dd
  const formatDateToYYYYMMDD = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];

    // If already in correct format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try to parse DD-MMM-YY format
    const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (match) {
      const day = match[1].padStart(2, "0");
      const monthMap: { [key: string]: string } = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
      };
      const month = monthMap[match[2]] || "01";
      const year = "20" + match[3];
      return `${year}-${month}-${day}`;
    }

    // Fallback to today's date
    return new Date().toISOString().split("T")[0];
  };

  // NEW: Add activities state to WeeklyReport page
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>([]);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>([]);
  const [reportStatus, setReportStatus] = useState<string>("draft");

  // NEW: Add QAQC state to WeeklyReport page (like other sections)
  const [qaqcData, setQaqcData] = useState<any>(null);

  // NEW: Add HSES state to WeeklyReport page (like other sections)
  const [hsesData, setHsesData] = useState<any>(null);

  // NEW: Add Photos state to WeeklyReport page (like other sections)
  const [photosData, setPhotosData] = useState<any>(null);

  // NEW: Add Issues state to WeeklyReport page (like other sections)
  const [issuesData, setIssuesData] = useState<any>(null);

  // NEW: Add Schedule state to WeeklyReport page (like other sections)
  const [scheduleData, setScheduleData] = useState<any>(null);

  // NEW: Add Resources state to WeeklyReport page (for rolling total logic)
  const [resourcesData, setResourcesData] = useState<any>(null);

  // NEW: Add state to store the clearQaqcData function reference
  const clearQaqcDataRef = useRef<(() => void) | null>(null);

  // NEW: Add state to store the clearHsesData function reference
  const clearHsesDataRef = useRef<(() => void) | null>(null);

  // Callback functions for clearing data
  const handleClearQaqcData = (clearFn: () => void) => {
    clearQaqcDataRef.current = clearFn;
  };

  const handleClearHsesData = (clearFn: () => void) => {
    clearHsesDataRef.current = clearFn;
  };

  // Callback function for handling construction progress data changes
  const handleConstructionProgressChange = (data: any) => {
    // Update the construction data in the hook
    constructionProgressHook.updateConstructionData(data);
  };

  // Overall Progress hook
  const overallProgressHook = useOverallProgress(currentReportId || '');

  // Issues hook for state management
  const issuesHook = useIssues();

  // Update projectName and projectId when effectiveProjectName changes (using API-fetched name)
  useEffect(() => {
    if (effectiveProjectName) {
      setSharedData(prev => ({
        ...prev,
        projectName: effectiveProjectName.trim(),  // Trim whitespace/tabs
        projectId: projectId || ""
      }));
    }
  }, [effectiveProjectName, currentProjectName, selectedProject, projectId]);

  // Initialize construction progress when no reportId exists but project is selected
  useEffect(() => {
    // Only initialize if: no reportId, has effectiveProjectName, and construction data is empty
    if (!currentReportId && effectiveProjectName && !constructionProgressHook.constructionData) {
      constructionProgressHook.updateConstructionData({
        projectInfo: {
          project: effectiveProjectName,
          subtitle: '',
          date: new Date().toISOString().split('T')[0],
          revision: '0'
        },
        items: []
      });
    }
  }, [currentReportId, effectiveProjectName, constructionProgressHook.constructionData, currentProjectName, selectedProject]);

  // Sync project name from construction progress to cover page
  useEffect(() => {
    if (constructionProgressHook.constructionData?.projectInfo?.project) {
      const constructionProgressProjectName = constructionProgressHook.constructionData.projectInfo.project;
      if (sharedData.projectName !== constructionProgressProjectName) {
        setSharedData(prev => ({
          ...prev,
          projectName: constructionProgressProjectName
        }));
      }
    }
  }, [constructionProgressHook.constructionData?.projectInfo?.project, sharedData.projectName]);

  // Load master schedule data when reportId changes or component mounts
  useEffect(() => {
    const loadMasterSchedule = async () => {
      if (currentReportId) {
        try {
          const response = await getWeeklyReportById(currentReportId);
          if (response.success && response.data) {
            const report = response.data;
            if (report.sections?.masterSchedule) {
              setScheduleSections([{
                id: crypto.randomUUID(),
                title: "Master Schedule",
                entries: report.sections.masterSchedule
              }]);
            }
          }
        } catch (error) {
          console.error('Error loading master schedule:', error);
        }
      }
    };

    loadMasterSchedule();
  }, [currentReportId]); // Reload when currentReportId changes

  // Load existing report data when reportId is present
  useEffect(() => {
    const loadExistingReport = async () => {
      if (currentReportId) {
        try {
          const response = await getWeeklyReportById(currentReportId);

          if (response.success && response.data) {
            const report = response.data;
            const reportId = String((report as any)._id || report.id);
            setCurrentReportId(reportId);
            setReportStatus(report.status || 'draft');

            // Check if we're in "createNew" mode - if so, we'll load data but create a new report
            const urlCreateNew = searchParams.get('createNew');
            const isCreateNewMode = urlCreateNew === 'true';

            // Update shared data with existing report data
            setSharedData(prev => ({
              ...prev,
              weekNumber: isCreateNewMode ? '' : (report.weekNumber?.toString() || ''), // Reset week number for new report
              projectName: report.projectName || selectedProject || 'Default Project Name',
              employer: report.sections?.cover?.employer || 'Client Name',
              coverImage: report.sections?.cover?.coverImage || '',
              clientLogo: report.sections?.cover?.clientLogo || '',
              dateRange: isCreateNewMode ? '' : (report.sections?.cover?.dateRange || ''), // Reset date range for new report
              // Load introduction data
              projectOverview: report.sections?.introduction?.projectOverview || '',
              designNConstruction: report.sections?.introduction?.designNConstruction || '',
              // Load letter data
              refNoPrefix: report.sections?.letter?.refNoPrefix || '',
              reportDate: isCreateNewMode ? new Date().toISOString().split('T')[0] : (report.sections?.letter?.reportDate ? formatDateToYYYYMMDD(report.sections?.letter?.reportDate) : ''), // Use current date for new report
              recipientCompany: report.sections?.letter?.recipientCompany || '',
              recipientLocation: report.sections?.letter?.recipientLocation || '',
              recipientName: report.sections?.letter?.recipientName || '',
              ccList: report.sections?.letter?.ccList || [],
              letterBody: report.sections?.letter?.letterBody || '',
              signatureImage: report.sections?.letter?.signatureImage || '',
              signatoryName: report.sections?.letter?.signatoryName || '',
              signatoryPosition: report.sections?.letter?.signatoryPosition || '',
              constructorName: report.sections?.letter?.constructorName || '',
              companyLocation: report.sections?.letter?.companyLocation || '',
              companyPhone1: report.sections?.letter?.companyPhone1 || '',
              companyPhone2: report.sections?.letter?.companyPhone2 || '',
              companyEmail1: report.sections?.letter?.companyEmail1 || '',
              companyEmail2: report.sections?.letter?.companyEmail2 || ''
            }));

            // Load overall progress data
            if (report.sections?.overallProgress?.rows) {
              overallProgressHook.setRows(report.sections.overallProgress.rows);
            }

            // Load activities data
            if (report.sections?.activities) {
              setWeeklyActivities(report.sections.activities.weeklyActivities || []);
              setNextWeekPlan(report.sections.activities.nextWeekPlan || []);
            } else {
              // Create empty activities structure if none exists
              setWeeklyActivities([]);
              setNextWeekPlan([]);
            }

            // Load master schedule data
            if (report.sections?.masterSchedule) {
              setScheduleSections([{
                id: crypto.randomUUID(),
                title: "Master Schedule",
                entries: report.sections.masterSchedule
              }]);
            }
            // Load QAQC data using transform function (no API call)
            if (report.sections?.qaqcStatus) {
                const transformedQaqcData = transformQaqcData(report.sections.qaqcStatus, [
                { id: "4.1", title: "Non-Conformity Report (NCR)" },
                { id: "4.2", title: "Corrective Action Request (CAR)" },
                { id: "4.3", title: "Safety Corrective Action Request (SCAR)" },
                { id: "4.4", title: "PM Site Instruction (SI)" },
                { id: "4.5", title: "Client Site Instruction (SI)" },
                { id: "4.6", title: "Inspection Request (IR)" },
                { id: "4.7", title: "Material for Approval (MFA)" },
                { id: "4.8", title: "Request for Information (RFI)" },
                { id: "4.9", title: "Request for Approval (RFA)" },
                { id: "4.10", title: "Field Change Request (FCR)" },
                { id: "4.11", title: "Variation Order (VO)" },
                { id: "4.12", title: "Transmittal (TR)" },
                { id: "4.13", title: "Material Inspection Approval (MIR)" }
              ]);
              setQaqcData(transformedQaqcData);
            } else {
              // Create empty QAQC structure if none exists (no default items)
              const emptyQaqcData = transformQaqcData({}, [
                { id: "4.1", title: "Non-Conformity Report (NCR)" },
                { id: "4.2", title: "Corrective Action Request (CAR)" },
                { id: "4.3", title: "Safety Corrective Action Request (SCAR)" },
                { id: "4.4", title: "PM Site Instruction (SI)" },
                { id: "4.5", title: "Client Site Instruction (SI)" },
                { id: "4.6", title: "Inspection Request (IR)" },
                { id: "4.7", title: "Material for Approval (MFA)" },
                { id: "4.8", title: "Request for Information (RFI)" },
                { id: "4.9", title: "Request for Approval (RFA)" },
                { id: "4.10", title: "Field Change Request (FCR)" },
                { id: "4.11", title: "Variation Order (VO)" },
                { id: "4.12", title: "Transmittal (TR)" },
                { id: "4.13", title: "Material Inspection Approval (MIR)" }
              ]);
              setQaqcData(emptyQaqcData);
            }

            // Load HSES data
            if (report.sections?.hses) {
              setHsesData(report.sections.hses);
            } else {
              // Create empty HSES structure if none exists (matching useHsesData structure)
              setHsesData({
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
                hsePhotoReferences: hsesData?.hsePhotoReferences || []
              });
            }

            // Load Photos data
            if (report.sections?.photos) {
              setPhotosData(report.sections.photos);
              // Also update the siteActivitiesSections to match loaded data
              if (report.sections.photos.locations) {
                const convertedSections = report.sections.photos.locations.map(location => ({
                  id: crypto.randomUUID(),
                  title: location.location,
                  entries: location.entries || []
                }));
                setSiteActivitiesSections(convertedSections);
              }
            } else {
              // Create empty Photos structure if none exists
              setPhotosData([]);
            }

            // Load Issues data
            if (report.sections?.constructionIssues) {
              setIssuesData(report.sections.constructionIssues);
              // Also update the useIssues hook state to match loaded data
              if (report.sections.constructionIssues.length > 0) {
                const convertedIssues = report.sections.constructionIssues.map(issue => ({
                  id: crypto.randomUUID(),
                  issueNumber: typeof issue.no === 'number' ? issue.no : (parseInt(issue.no) || 1),
                  location: issue.location || "",
                  problem: issue.problem || "",
                  actionBy: issue.actionBy || "",
                  photo: issue.photo || null
                }));
                issuesHook.setIssuesData(convertedIssues);
              }
            } else {
              // Create empty Issues structure if none exists
              setIssuesData([]);
              issuesHook.setIssuesData([{ id: crypto.randomUUID(), issueNumber: 1, location: "", problem: "", actionBy: "", photo: null }]);
            }

            // Load Schedule data
            if (report.sections?.masterSchedule) {
              setScheduleData(report.sections.masterSchedule);
              // Also update the scheduleSections state to match loaded data
              if (report.sections.masterSchedule.length > 0) {
                const convertedSchedule = report.sections.masterSchedule.map(item => ({
                  id: item.id,
                  type: item.type,
                  title: item.title || "",
                  description: item.description || "",
                  date: item.date || "",
                  file: item.fileData ? new File([item.fileData], item.fileName || "file") : null,
                  caption: item.title || ""
                }));
                setScheduleSections([{
                  id: crypto.randomUUID(),
                  title: "Master Schedule",
                  entries: convertedSchedule
                }]);
              }
            } else {
              // Create empty Schedule structure if none exists
              setScheduleData([]);
            }

            // Load Resources data (without rolling total - for viewing existing report)
            if (report.sections?.resources) {
              setResourcesData(report.sections.resources);
            } else {
              // Create empty Resources structure if none exists
              setResourcesData({
                manPower: {
                  dateRange: report.sections?.cover?.dateRange || "",
                  managementTeam: [],
                  workingTeamInterior: [],
                  workingTeamMEP: []
                },
                material: [],
                machinery: []
              });
            }

            // Load Construction Progress data
            if (report.sections?.constructionProgress) {
              constructionProgressHook.updateConstructionData(report.sections.constructionProgress);
            } else {
              // Create empty Construction Progress structure if none exists
              constructionProgressHook.updateConstructionData({
                projectInfo: {
                  project: sharedData.projectName || selectedProject || '',
                  subtitle: '',
                  date: '',
                  revision: ''
                },
                items: []
              });
            }

            // If we're in createNew mode, prepare the data but don't create report yet
            if (isCreateNewMode) {

              // Check if the loaded report is a submitted report - use its data for rolling total
              if (report.status === 'submitted' && report.sections?.constructionProgress?.items) {

                const data = report.sections.constructionProgress;

                // Apply rolling total logic: copy upToThisWeek to previousWeek and reset This Week
                const rolledItems = data.items.map(item => ({
                  ...item,
                  previousWeek: {
                    qty: item.upToThisWeek.qty,
                    amount: item.upToThisWeek.amount,
                    percentage: item.upToThisWeek.percentage
                  },
                  thisWeek: {
                    qty: 0,
                    amount: 0,
                    percentage: 0
                  }
                }));

                // Apply calculations and restore previousWeek amounts
                const computedItems = computeAllAmounts(rolledItems);
                const finalItems = computedItems.map((item, index) => ({
                  ...item,
                  previousWeek: rolledItems[index].previousWeek
                }));

                // Update the construction progress data with rolled values
                const updatedData = {
                  ...data,
                  items: finalItems
                };
                constructionProgressHook.updateConstructionData(updatedData);
              } else {
                // For non-submitted reports or no construction progress, check for any submitted reports in project
                if (constructionProgressHook.constructionData?.items) {
                  try {
                    const reportsResponse = await getWeeklyReports({
                      projectId: projectId || '',
                      status: 'submitted',
                      limit: 1,
                      sortBy: 'createdAt',
                      sortOrder: 'desc'
                    });

                    if (reportsResponse.success && reportsResponse.data?.length > 0) {
                      const submittedReportData = reportsResponse.data[0];

                      if (submittedReportData?.sections?.constructionProgress?.items) {
                        const data = submittedReportData.sections.constructionProgress;
                        const rolledItems = data.items.map(item => ({
                          ...item,
                          previousWeek: {
                            qty: item.upToThisWeek.qty,
                            amount: item.upToThisWeek.amount,
                            percentage: item.upToThisWeek.percentage
                          },
                          thisWeek: {
                            qty: 0,
                            amount: 0,
                            percentage: 0
                          }
                        }));

                        const computedItems = computeAllAmounts(rolledItems);
                        const finalItems = computedItems.map((item, index) => ({
                          ...item,
                          previousWeek: rolledItems[index].previousWeek
                        }));

                        const updatedData = {
                          ...constructionProgressHook.constructionData,
                          items: finalItems
                        };
                        constructionProgressHook.updateConstructionData(updatedData);
                      }
                    }
                  } catch (error) {
                    // No submitted reports found in project
                  }
                }
              }

              // Apply rolling total logic for resources if report has resources data
              if (report.sections?.resources?.manPower) {
                const resources = report.sections.resources;

                // Apply rolling total: copy accumulated to prevWeek, reset thisWeek
                const rolledManPower = {
                  dateRange: sharedData.dateRange || "",
                  managementTeam: resources.manPower.managementTeam?.map((item: any) => ({
                    ...item,
                    prevWeek: item.accumulated || 0,
                    thisWeek: 0,
                    accumulated: item.accumulated || 0
                  })) || [],
                  workingTeamInterior: resources.manPower.workingTeamInterior?.map((item: any) => ({
                    ...item,
                    prevWeek: item.accumulated || 0,
                    thisWeek: 0,
                    accumulated: item.accumulated || 0
                  })) || [],
                  workingTeamMEP: resources.manPower.workingTeamMEP?.map((item: any) => ({
                    ...item,
                    prevWeek: item.accumulated || 0,
                    thisWeek: 0,
                    accumulated: item.accumulated || 0
                  })) || []
                };

                // Apply rolling total to materials and machinery too
                const rolledMaterial = resources.material?.map((item: any) => ({
                  ...item,
                  prevWeek: item.accumulated || 0,
                  thisWeek: 0,
                  accumulated: item.accumulated || 0
                })) || [];

                const rolledMachinery = resources.machinery?.map((item: any) => ({
                  ...item,
                  prevWeek: item.accumulated || 0,
                  thisWeek: 0,
                  accumulated: item.accumulated || 0
                })) || [];

                setResourcesData({
                  manPower: rolledManPower,
                  material: rolledMaterial,
                  machinery: rolledMachinery
                });
              }

              // Reset reportId to indicate this is a new report (not saved yet)
              setCurrentReportId(null);
              setReportStatus('draft');
            }
          }
        } catch (error) {
          console.error('🔍 FRONTEND Error loading report:', error);
          console.error('🔍 FRONTEND Error details:', {
            message: error.message,
            stack: error.stack,
            currentReportId,
            timestamp: new Date().toISOString()
          });
          toast({
            title: "Error",
            description: "Failed to load existing report.",
            variant: "destructive",
          });
        }
      } else {
      }
    };

    loadExistingReport();
  }, [currentReportId, selectedProject, toast]);


  // Create new weekly report function with rolling total logic
  const handleCreateNewWeeklyReportWithRollingTotal = async () => {
    try {

      // First, check if there are any submitted reports for this project
      let submittedReportData = null;
      try {
        const reportsResponse = await getWeeklyReports({
          projectId: projectId || '',
          status: 'submitted',
          limit: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });

        if (reportsResponse.success && reportsResponse.data?.length > 0) {
          submittedReportData = reportsResponse.data[0];
        }
      } catch (error) {
        // No submitted reports found, creating clean report
      }

      // Initialize with default data or copy from submitted report with rolling total
      const newReportData = {
        projectName: effectiveProjectName || 'Default Project',
        projectId: projectId || null,  // ← add this
        weekNumber: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        sections: {
          cover: {
            projectName: selectedProject || 'Default Project',
            reportTitle: 'Weekly Progress Report',
            weekNumber: '1',
            dateRange: '',
            contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
            clientName: 'Client Name',
            contractNumber: '',
            coverImage: '',
            clientLogo: '',
            projectTitle: selectedProject || 'Default Project',
            employer: 'Client Name'
          },
          letter: {
            refNoPrefix: 'ICT-CPM-WRP',
            weekNumber: '1',
            reportDate: new Date().toISOString().split('T')[0],
            recipientCompany: '',
            recipientLocation: '',
            recipientName: '',
            ccList: [],
            letterBody: '',
            signatureImage: '',
            signatoryName: '',
            signatoryPosition: '',
            constructorName: '',
            companyLocation: '',
            companyPhone1: '',
            companyPhone2: '',
            companyEmail1: '',
            companyEmail2: ''
          },
          introduction: {
            projectOverview: '',
            designNConstruction: '',
            coverImage: ''
          },
          overallProgress: {
            rows: []
          },
          activities: {
            weeklyActivities: [],
            nextWeekPlan: []
          },
          qaqcStatus: {
            ncr: { items: [], comments: "" },
            car: { items: [], comments: "" },
            scar: { items: [], comments: "" },
            pmsi: { items: [], comments: "" },
            csi: { items: [], comments: "" },
            ir: { items: [], comments: "" },
            mfa: { items: [], comments: "" },
            rfi: { items: [], comments: "" },
            rfa: { items: [], comments: "" },
            fcr: { items: [], comments: "" },
            vo: { items: [], comments: "" },
            tr: { items: [], comments: "" },
            mir: { items: [], comments: "" }
          },
          hses: {
            training: [
              { typeOfTraining: '', date: '', venue: '', trainer: '', attendee: '', remarks: '' },
              { typeOfTraining: '', date: '', venue: '', trainer: '', attendee: '', remarks: '' },
              { typeOfTraining: '', date: '', venue: '', trainer: '', attendee: '', remarks: '' }
            ],
            inspection: [
              { typeOfInspection: '', date: '', inspector: '', remarks: '' },
              { typeOfInspection: '', date: '', inspector: '', remarks: '' },
              { typeOfInspection: '', date: '', inspector: '', remarks: '' }
            ],
            permit: [
              { typeOfPermit: '', startDate: '', endDate: '', inspector: '', approver: '', remarks: '' },
              { typeOfPermit: '', startDate: '', endDate: '', inspector: '', approver: '', remarks: '' },
              { typeOfPermit: '', startDate: '', endDate: '', inspector: '', approver: '', remarks: '' }
            ],
            firstAidAccident: '',
            otherActivities: '',
            hsePhotoReferences: hsesData?.hsePhotoReferences || []
          },
          photos: {
            title: 'Site Activities Photos',
            locations: []
          },
          constructionIssues: [],
          masterSchedule: [],
          constructionProgress: submittedReportData?.sections?.constructionProgress ? (() => {
            // Apply rolling total logic when creating new report from submitted report
            const data = submittedReportData.sections.constructionProgress;
            if (!data || !data.items) {
              return {
                projectInfo: {
                  project: effectiveProjectName || '',
                  subtitle: '',
                  date: new Date().toISOString().split('T')[0],
                  revision: '0'
                },
                items: []
              };
            }

            // Apply rolling total logic from database: upToThisWeek → previousWeek, thisWeek → 0

            // Apply rolling total logic: copy upToThisWeek to previousWeek and reset This Week
            const rolledItems = data.items.map(item => ({
              ...item,
              previousWeek: {
                qty: item.upToThisWeek.qty,
                amount: item.upToThisWeek.amount,
                percentage: item.upToThisWeek.percentage
              },
              thisWeek: {
                qty: 0,
                amount: 0,
                percentage: 0
              }
            }));

            // Apply calculations to the rolled items
            const computedItems = computeAllAmounts(rolledItems);

            // Restore the previousWeek amounts that were overwritten by computeAllAmounts
            const finalItems = computedItems.map((item, index) => ({
              ...item,
              previousWeek: rolledItems[index].previousWeek
            }));

            // Rolling total applied successfully from database data

            return {
              ...data,
              items: finalItems
            };
          })() : {
            projectInfo: {
              project: selectedProject || '',
              subtitle: '',
              date: new Date().toISOString().split('T')[0],
              revision: '0'
            },
            items: []
          }
        }
      };

      // Log the final construction progress project value
      
      
      

      const response = await createWeeklyReport(newReportData);
      if (response.success && response.data) {
        const newId = String((response.data as any)._id || response.data.id);
        if (newId) {
          setCurrentReportId(newId);
          // Update URL to include new report ID and remove createNew parameter
          const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
          const newUrl = `${window.location.pathname}?reportId=${newId}${projectIdParam}`;
          window.history.replaceState({}, '', newUrl);

        // New report created successfully with rolling totals
        }
      }
    } catch (error) {
      console.error('Error creating new weekly report with rolling total:', error);
      toast({
        title: "Error",
        description: "Failed to create new weekly report.",
        variant: "destructive"
      });
    }
  };

  // Create new weekly report function
  const handleCreateNewWeeklyReport = async () => {
    try {

      // First, check if there are any submitted reports for this project
      let submittedReportData = null;
      try {
        const reportsResponse = await getWeeklyReports({
          projectId: projectId || '',
          status: 'submitted',
          limit: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });

        if (reportsResponse.success && reportsResponse.data?.length > 0) {
          submittedReportData = reportsResponse.data[0];
        }
      } catch (error) {
        // No submitted reports found, creating clean report
      }

      // Initialize with default data or copy from submitted report
      const newReportData = {
        projectName: selectedProject || 'Default Project',
        projectId: projectId || null,  // ← add this
        weekNumber: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        sections: {
          cover: {
            projectName: selectedProject || 'Default Project',
            reportTitle: 'Weekly Progress Report',
            weekNumber: '1',
            dateRange: '',
            contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
            clientName: 'Client Name',
            contractNumber: '',
            coverImage: '',
            clientLogo: '',
            projectTitle: selectedProject || 'Default Project',
            employer: 'Client Name'
          },
          letter: {
            refNoPrefix: 'ICT-CPM-WRP',
            weekNumber: '1',
            reportDate: new Date().toISOString().split('T')[0],
            recipientCompany: '',
            recipientLocation: '',
            recipientName: '',
            ccList: [],
            letterBody: '',
            signatureImage: '',
            signatoryName: '',
            signatoryPosition: '',
            constructorName: '',
            companyLocation: '',
            companyPhone1: '',
            companyPhone2: '',
            companyEmail1: '',
            companyEmail2: ''
          },
          introduction: {
            projectOverview: '',
            designNConstruction: '',
            coverImage: ''
          },
          overallProgress: {
            rows: []
          },
          activities: {
            weeklyActivities: [],
            nextWeekPlan: []
          },
          qaqcStatus: {
            ncr: { items: [], comments: "" },
            car: { items: [], comments: "" },
            scar: { items: [], comments: "" },
            pmsi: { items: [], comments: "" },
            csi: { items: [], comments: "" },
            ir: { items: [], comments: "" },
            mfa: { items: [], comments: "" },
            rfi: { items: [], comments: "" },
            rfa: { items: [], comments: "" },
            fcr: { items: [], comments: "" },
            vo: { items: [], comments: "" },
            tr: { items: [], comments: "" },
            mir: { items: [], comments: "" }
          },
          hses: {
            training: [
              { typeOfTraining: '', date: '', venue: '', trainer: '', attendee: '', remarks: '' },
              { typeOfTraining: '', date: '', venue: '', trainer: '', attendee: '', remarks: '' },
              { typeOfTraining: '', date: '', venue: '', trainer: '', attendee: '', remarks: '' }
            ],
            inspection: [
              { typeOfInspection: '', date: '', inspector: '', remarks: '' },
              { typeOfInspection: '', date: '', inspector: '', remarks: '' },
              { typeOfInspection: '', date: '', inspector: '', remarks: '' }
            ],
            permit: [
              { typeOfPermit: '', startDate: '', endDate: '', inspector: '', approver: '', remarks: '' },
              { typeOfPermit: '', startDate: '', endDate: '', inspector: '', approver: '', remarks: '' },
              { typeOfPermit: '', startDate: '', endDate: '', inspector: '', approver: '', remarks: '' }
            ],
            firstAidAccident: '',
            otherActivities: '',
            hsePhotoReferences: hsesData?.hsePhotoReferences || []
          },
          photos: {
            title: 'Site Activities Photos',
            locations: []
          },
          constructionIssues: [],
          masterSchedule: [],
          constructionProgress: submittedReportData?.sections?.constructionProgress ? (() => {
            // Apply rolling total logic when creating new report from submitted report
            const data = submittedReportData.sections.constructionProgress;
            if (!data || !data.items) {
              return {
                projectInfo: {
                  project: selectedProject || '',
                  subtitle: '',
                  date: new Date().toISOString().split('T')[0],
                  revision: '0'
                },
                items: []
              };
            }

            // Apply rolling total logic: copy upToThisWeek to previousWeek and reset This Week
            const rolledItems = data.items.map(item => {

              const rolledItem = {
                ...item,
                previousWeek: {
                  qty: item.upToThisWeek.qty,
                  amount: item.upToThisWeek.amount,
                  percentage: item.upToThisWeek.percentage
                },
                thisWeek: {
                  qty: 0,
                  amount: 0,
                  percentage: 0
                }
              };

              
              return rolledItem;
            });

            

            // Apply calculations to the rolled items, but preserve the previousWeek amounts we just set
            const computedItems = computeAllAmounts(rolledItems);

            // Restore the previousWeek amounts that were overwritten by computeAllAmounts
            const finalItems = computedItems.map((item, index) => ({
              ...item,
              previousWeek: rolledItems[index].previousWeek
            }));

            
            

            return {
              ...data,
              items: finalItems
            };
          })() : {
            projectInfo: {
              project: selectedProject || '',
              subtitle: '',
              date: new Date().toISOString().split('T')[0],
              revision: '0'
            },
            items: []
          }
        }
      };

      // Log the final construction progress project value
      
      
      

      const response = await createWeeklyReport(newReportData);
      if (response.success && response.data) {
        const newId = String((response.data as any)._id || response.data.id);
        if (newId) {
          setCurrentReportId(newId);
          // Update URL to include new report ID
          const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
          const newUrl = `${window.location.pathname}?reportId=${newId}${projectIdParam}`;
          window.history.replaceState({}, '', newUrl);
        }
      }
    } catch (error) {
      console.error('❌ Error creating new weekly report:', error);
      toast({
        title: "Error",
        description: "Failed to create new weekly report.",
        variant: "destructive"
      });
    }
  };

  // Internal save logic for submitted reports with rolling total logic
  const handleSaveWithRollingTotal = async () => {
    // Prevent saving in read-only mode
    if (isReadOnly) {
      toast({
        title: "Read-Only Mode",
        description: "Cannot save another user's report.",
        variant: "destructive",
      });
      return;
    }

    let reportData: any;
    try {
      // Helper function to format rows with displayIndex
      const formatRowsWithDisplayIndex = (rows: any[]) => {
        let titleCount = 0;
        return (rows || []).map((row, index) => {
          if (row.rowType === "title") {
            titleCount++;
            return {
              ...row,
              displayIndex: `${toRoman(titleCount)}.`,
            };
          }
          if (row.rowType === "detail") {
            let detailCount = 0;
            for (let i = 0; i <= index; i++) {
              if (rows[i].rowType === "title") {
                detailCount = 0;
              } else if (rows[i].rowType === "detail") {
                detailCount++;
              }
            }
            return {
              ...row,
              displayIndex: `${detailCount}.`,
            };
          }
          return row;
        });
      };

      // Import toRoman function
      const toRoman = (num: number): string => {
        const romanNumerals = [
          { value: 1000, numeral: "M" },
          { value: 900, numeral: "CM" },
          { value: 500, numeral: "D" },
          { value: 400, numeral: "CD" },
          { value: 100, numeral: "C" },
          { value: 90, numeral: "XC" },
          { value: 50, numeral: "L" },
          { value: 40, numeral: "XL" },
          { value: 10, numeral: "X" },
          { value: 9, numeral: "IX" },
          { value: 5, numeral: "V" },
          { value: 4, numeral: "IV" },
          { value: 1, numeral: "I" },
        ];
        let result = "";
        let remaining = num;
        for (const { value, numeral } of romanNumerals) {
          while (remaining >= value) {
            result += numeral;
            remaining -= value;
          }
        }
        return result;
      };

      // Use QAQC data from state (like other sections)
      const qaqcDataForSave = qaqcData || {
        ncr: { items: [], comments: "" },
        car: { items: [], comments: "" },
        scar: { items: [], comments: "" },
        pmsi: { items: [], comments: "" },
        csi: { items: [], comments: "" },
        ir: { items: [], comments: "" },
        mfa: { items: [], comments: "" },
        rfi: { items: [], comments: "" },
        rfa: { items: [], comments: "" },
        fcr: { items: [], comments: "" },
        vo: { items: [], comments: "" },
        tr: { items: [], comments: "" },
        mir: { items: [], comments: "" }
      };

      // Helper function to convert File objects to base64 strings
      const convertImagesToBase64 = async (photoReferences: any[]) => {
        const converted = await Promise.all(
          (photoReferences || []).map(async (section) => {
            const convertedEntries = await Promise.all(
              (section.entries || []).map(async (entry) => {
                const convertedSlots = await Promise.all(
                  (entry.slots || []).map(async (slot) => {
                    if (slot.image instanceof File) {
                      const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(slot.image);
                      });
                      return { ...slot, image: base64 };
                    }
                    return slot;
                  })
                );
                return { ...entry, slots: convertedSlots };
              })
            );
            return { ...section, entries: convertedEntries };
          })
        );
        return converted;
      };

      // Use HSES data from state (like other sections)
      const hsesDataForSave = hsesData || {
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
        hsePhotoReferences: hsesData?.hsePhotoReferences || []
      };

      // Convert Photos images to base64 before saving
      let photosDataForSave = {
        title: "Site Activities Photos",
        locations: []
      };

      if (siteActivitiesSections && siteActivitiesSections.length > 0) {
        // Convert frontend format to backend format with base64 images
        const locations = await Promise.all(
          siteActivitiesSections.map(async (section) => {
            const convertedEntries = await Promise.all(
              (section.entries || []).map(async (entry) => {
                const convertedSlots = await Promise.all(
                  (entry.slots || []).map(async (slot) => {
                    if (slot.image instanceof File) {
                      const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(slot.image);
                      });
                      return { ...slot, image: base64 };
                    }
                    return slot;
                  })
                );
                return { ...entry, slots: convertedSlots };
              })
            );
            return {
              location: section.title,
              entries: convertedEntries
            };
          })
        );
        photosDataForSave = {
          title: "Site Activities Photos",
          locations: locations
        };
      }

      // Convert Issues data to backend format
      let issuesDataForSave = [];

      // Convert Schedule data to backend format using Supabase
      let scheduleDataForSave = [];

      if (scheduleSections && scheduleSections.length > 0 && scheduleSections[0].entries && scheduleSections[0].entries.length > 0) {
        // Filter out empty entries before conversion
        const validEntries = scheduleSections[0].entries.filter(entry =>
          entry.title || entry.file || entry.fileName || entry.supabaseUrl
        );

        if (validEntries.length > 0) {
          // Convert entries to Supabase URLs
          scheduleDataForSave = await convertScheduleEntriesToSupabase(
            validEntries,
            currentReportId || 'temp-report-id'
          );

          // Remove file objects that shouldn't be sent to backend
          scheduleDataForSave = scheduleDataForSave.map(entry => {
            const { file, ...entryWithoutFile } = entry;
            return entryWithoutFile;
          });
        }
      }

      if (issuesHook.issuesData && issuesHook.issuesData.length > 0) {
        // Convert frontend format to backend format with base64 images
        issuesDataForSave = await Promise.all(
          issuesHook.issuesData.map(async (issue) => {
            let photoBase64 = issue.photo || "";

            // Convert image to base64 if it's a File object
            if (issue.photo instanceof File) {
              photoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(issue.photo as File);
              });
            }

            return {
              no: issue.issueNumber || "",
              location: issue.location || "",
              problem: issue.problem || "",
              actionBy: issue.actionBy || "",
              photo: photoBase64
            };
          })
        );
      }

      // Collect all form data
      reportData = {
        projectName: sharedData.projectName || 'Default Project',
        weekNumber: parseInt(sharedData.weekNumber) || 1,
        startDate: new Date().toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        endDate: new Date().toISOString().split('T')[0],
        sections: {
          cover: {
            projectName: sharedData.projectName || 'Default Project',
            reportTitle: 'Weekly Progress Report',
            weekNumber: sharedData.weekNumber || '1',
            dateRange: sharedData.dateRange || '',
            contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
            clientName: sharedData.employer || 'Client Name',
            contractNumber: '', // Add contract number field if needed
            coverImage: sharedData.coverImage || '',
            clientLogo: sharedData.clientLogo || '',
            projectTitle: sharedData.projectName || 'Default Project',
            employer: sharedData.employer || 'Client Name'
          },
          letter: {
            refNoPrefix: sharedData.refNoPrefix || "",
            weekNumber: sharedData.weekNumber || "",
            reportDate: sharedData.reportDate || new Date().toISOString().split("T")[0],
            recipientCompany: sharedData.recipientCompany || "",
            recipientLocation: sharedData.recipientLocation || "",
            recipientName: sharedData.recipientName || "",
            ccList: sharedData.ccList || [],
            letterBody: sharedData.letterBody || "",
          },
          introduction: {
            projectName: sharedData.projectName || 'Default Project',
            reportTitle: 'Weekly Progress Report',
            weekNumber: sharedData.weekNumber || '1',
            dateRange: sharedData.dateRange || '',
            contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
            clientName: sharedData.employer || 'Client Name',
            contractNumber: '', // Add contract number field if needed
            coverImage: sharedData.coverImage || '',
            clientLogo: sharedData.clientLogo || '',
            projectTitle: sharedData.projectName || 'Default Project',
            employer: sharedData.employer || 'Client Name'
          },
          overallProgress: {
            rows: formatRowsWithDisplayIndex(overallProgressHook.rows)
          },
          // NEW: Add activities section to save payload
          activities: {
            weeklyActivities: weeklyActivities || [],
            nextWeekPlan: nextWeekPlan || []
          },
          // NEW: Add QAQC section to save payload (from state like other sections)
          qaqcStatus: qaqcDataForSave,
          // NEW: Add HSES section to save payload (from state like other sections)
          hses: hsesDataForSave,
          // NEW: Add Photos section to save payload (from state like other sections)
          photos: photosDataForSave,
          // NEW: Add Issues section to save payload (from state like other sections)
          constructionIssues: issuesDataForSave,
          // NEW: Add Schedule section to save payload
          masterSchedule: scheduleDataForSave,
          // NEW: Add Construction Progress section to save payload with rolling total logic for submitted reports
          constructionProgress: (() => {
            const data = constructionProgressHook.constructionData;
            if (!data || !data.items) {
              return {
                projectInfo: {
                  project: "",
                  subtitle: "",
                  date: "",
                  revision: ""
                },
                items: []
              };
            }

            // Apply rolling total logic: copy upToThisWeek to previousWeek and reset This Week
            return {
              ...data,
              items: data.items.map(item => ({
                ...item,
                previousWeek: {
                  qty: item.upToThisWeek.qty,
                  amount: item.upToThisWeek.amount,
                  percentage: item.upToThisWeek.percentage
                },
                thisWeek: {
                  qty: 0,
                  amount: 0,
                  percentage: 0
                }
              }))
            };
          })()
        }
      };

      // Convert HSES photo references to Supabase URLs before saving (submit handler)
      if (hsesDataForSave.hsePhotoReferences && hsesDataForSave.hsePhotoReferences.length > 0) {
        hsesDataForSave.hsePhotoReferences = await uploadHSEPhotoReferencesToSupabase(
          hsesDataForSave.hsePhotoReferences,
          currentReportId || 'temp-report-id'
        );
      }

      let response;
      if (currentReportId) {
        // Update existing report - only send sections that changed
        const updateData = {
          sections: reportData.sections,
          status: 'submitted' as const
        };
        response = await updateWeeklyReport(currentReportId, updateData);
        // Ensure currentReportId is set after successful update
        if (response.success) {
          const updatedId = String((response.data as any)?._id || response.data?.id || currentReportId);
          setCurrentReportId(updatedId);
          // Update URL to include the report ID
          const newUrl = `${window.location.pathname}?reportId=${updatedId}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`;
          window.history.replaceState({}, '', newUrl);

          // Update local construction progress state with rolling total and This Week reset for submitted reports
          const currentData = constructionProgressHook.constructionData;
          if (currentData && currentData.items) {
            const updatedData = {
              ...currentData,
              items: currentData.items.map(item => ({
                ...item,
                previousWeek: {
                  qty: item.upToThisWeek.qty,
                  amount: item.upToThisWeek.amount,
                  percentage: item.upToThisWeek.percentage
                },
                thisWeek: {
                  qty: 0,
                  amount: 0,
                  percentage: 0
                }
              }))
            };
            constructionProgressHook.updateConstructionData(updatedData);
          }
        }
      } else {
        // Create new report
        response = await createWeeklyReport(reportData);
        if (response.success && response.data) {
          const newId = String((response.data as any)._id || response.data.id);
          if (newId) {
            setCurrentReportId(newId);
            // Update URL to include new report ID
            const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
            const newUrl = `${window.location.pathname}?reportId=${newId}${projectIdParam}`;
            window.history.replaceState({}, '', newUrl);
          }
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Error saving weekly report with rolling total:', error);
      toast({
        title: "Error",
        description: "Failed to save weekly report.",
        variant: "destructive"
      });
    }
  };

  // Internal save logic that can be called from both save and submit functions
  const handleSaveAsDraftInternal = async () => {
    // Prevent saving in read-only mode
    if (isReadOnly) {
      toast({
        title: "Read-Only Mode",
        description: "Cannot save another user's report.",
        variant: "destructive",
      });
      return;
    }

    let reportData: any;
    try {
      // Helper function to format rows with displayIndex
      const formatRowsWithDisplayIndex = (rows: any[]) => {
        let titleCount = 0;
        return (rows || []).map((row, index) => {
          if (row.rowType === "title") {
            titleCount++;
            return {
              ...row,
              displayIndex: `${toRoman(titleCount)}.`,
            };
          }
          if (row.rowType === "detail") {
            let detailCount = 0;
            for (let i = 0; i <= index; i++) {
              if (rows[i].rowType === "title") {
                detailCount = 0;
              } else if (rows[i].rowType === "detail") {
                detailCount++;
              }
            }
            return {
              ...row,
              displayIndex: `${detailCount}.`,
            };
          }
          return row;
        });
      };

      // Import toRoman function
      const toRoman = (num: number): string => {
        const romanNumerals = [
          { value: 1000, numeral: "M" },
          { value: 900, numeral: "CM" },
          { value: 500, numeral: "D" },
          { value: 400, numeral: "CD" },
          { value: 100, numeral: "C" },
          { value: 90, numeral: "XC" },
          { value: 50, numeral: "L" },
          { value: 40, numeral: "XL" },
          { value: 10, numeral: "X" },
          { value: 9, numeral: "IX" },
          { value: 5, numeral: "V" },
          { value: 4, numeral: "IV" },
          { value: 1, numeral: "I" },
        ];
        let result = "";
        let remaining = num;
        for (const { value, numeral } of romanNumerals) {
          while (remaining >= value) {
            result += numeral;
            remaining -= value;
          }
        }
        return result;
      };

      // Use QAQC data from state (like other sections)
      const qaqcDataForSave = qaqcData || {
        ncr: { items: [], comments: "" },
        car: { items: [], comments: "" },
        scar: { items: [], comments: "" },
        pmsi: { items: [], comments: "" },
        csi: { items: [], comments: "" },
        ir: { items: [], comments: "" },
        mfa: { items: [], comments: "" },
        rfi: { items: [], comments: "" },
        rfa: { items: [], comments: "" },
        fcr: { items: [], comments: "" },
        vo: { items: [], comments: "" },
        tr: { items: [], comments: "" },
        mir: { items: [], comments: "" }
      };

      // Helper function to convert File objects to base64 strings
      const convertImagesToBase64 = async (photoReferences: any[]) => {
        const converted = await Promise.all(
          (photoReferences || []).map(async (section) => {
            const convertedEntries = await Promise.all(
              (section.entries || []).map(async (entry) => {
                const convertedSlots = await Promise.all(
                  (entry.slots || []).map(async (slot) => {
                    if (slot.image instanceof File) {
                      const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(slot.image);
                      });
                      return { ...slot, image: base64 };
                    }
                    return slot;
                  })
                );
                return { ...entry, slots: convertedSlots };
              })
            );
            return { ...section, entries: convertedEntries };
          })
        );
        return converted;
      };

      // Use HSES data from state (like other sections)
      const hsesDataForSave = hsesData || {
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
        hsePhotoReferences: hsesData?.hsePhotoReferences || []
      };

      // Convert Photos images to base64 before saving
      let photosDataForSave = {
        title: "Site Activities Photos",
        locations: []
      };

      if (siteActivitiesSections && siteActivitiesSections.length > 0) {
        // Convert frontend format to backend format with base64 images
        const locations = await Promise.all(
          siteActivitiesSections.map(async (section) => {
            const convertedEntries = await Promise.all(
              (section.entries || []).map(async (entry) => {
                const convertedSlots = await Promise.all(
                  (entry.slots || []).map(async (slot) => {
                    if (slot.image instanceof File) {
                      const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(slot.image);
                      });
                      return { ...slot, image: base64 };
                    }
                    return slot;
                  })
                );
                return { ...entry, slots: convertedSlots };
              })
            );
            return {
              location: section.title,
              entries: convertedEntries
            };
          })
        );
        photosDataForSave = {
          title: "Site Activities Photos",
          locations: locations
        };
      }

      // Convert Issues data to backend format
      let issuesDataForSave = [];

      // Convert Schedule data to backend format using Supabase
      let scheduleDataForSave = [];

      if (scheduleSections && scheduleSections.length > 0 && scheduleSections[0].entries && scheduleSections[0].entries.length > 0) {
        // Filter out empty entries before conversion
        const validEntries = scheduleSections[0].entries.filter(entry =>
          entry.title || entry.file || entry.fileName || entry.supabaseUrl
        );

        if (validEntries.length > 0) {
          // Convert entries to Supabase URLs
          scheduleDataForSave = await convertScheduleEntriesToSupabase(
            validEntries,
            currentReportId || 'temp-report-id'
          );

          // Remove file objects that shouldn't be sent to backend
          scheduleDataForSave = scheduleDataForSave.map(entry => {
            const { file, ...entryWithoutFile } = entry;
            return entryWithoutFile;
          });
        }
      }

      if (issuesHook.issuesData && issuesHook.issuesData.length > 0) {
        // Convert frontend format to backend format with base64 images
        issuesDataForSave = await Promise.all(
          issuesHook.issuesData.map(async (issue) => {
            let photoBase64 = issue.photo || "";

            // Convert image to base64 if it's a File object
            if (issue.photo instanceof File) {
              photoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(issue.photo as File);
              });
            }

            return {
              no: issue.issueNumber || "",
              location: issue.location || "",
              problem: issue.problem || "",
              actionBy: issue.actionBy || "",
              photo: photoBase64
            };
          })
        );
      }

      // Collect all form data
      reportData = {
        projectName: sharedData.projectName || 'Default Project',
        weekNumber: parseInt(sharedData.weekNumber) || 1,
        startDate: new Date().toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        endDate: new Date().toISOString().split('T')[0],
        sections: {
          cover: {
            projectName: sharedData.projectName || 'Default Project',
            reportTitle: 'Weekly Progress Report',
            weekNumber: sharedData.weekNumber || '1',
            dateRange: sharedData.dateRange || '',
            contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
            clientName: sharedData.employer || 'Client Name',
            contractNumber: '', // Add contract number field if needed
            coverImage: sharedData.coverImage || '',
            clientLogo: sharedData.clientLogo || '',
            projectTitle: sharedData.projectName || 'Default Project',
            employer: sharedData.employer || 'Client Name'
          },
          letter: {
            refNoPrefix: sharedData.refNoPrefix || "",
            weekNumber: sharedData.weekNumber || "",
            reportDate: sharedData.reportDate || new Date().toISOString().split("T")[0],
            recipientCompany: sharedData.recipientCompany || "",
            recipientLocation: sharedData.recipientLocation || "",
            recipientName: sharedData.recipientName || "",
            ccList: sharedData.ccList || [],
            letterBody: sharedData.letterBody || "",
            signatureImage: sharedData.signatureImage || "",
            signatoryName: sharedData.signatoryName || "",
            signatoryPosition: sharedData.signatoryPosition || "",
            constructorName: sharedData.constructorName || "",
            companyLocation: sharedData.companyLocation || "",
            companyPhone1: sharedData.companyPhone1 || "",
            companyPhone2: sharedData.companyPhone2 || "",
            companyEmail1: sharedData.companyEmail1 || "",
            companyEmail2: sharedData.companyEmail2 || ""
          },
          introduction: {
            projectOverview: sharedData.projectOverview || "",
            designNConstruction: sharedData.designNConstruction || "",
            coverImage: sharedData.coverImage || ""
          },
          overallProgress: {
            rows: formatRowsWithDisplayIndex(overallProgressHook.rows)
          },
          // NEW: Add activities section to save payload
          activities: {
            weeklyActivities: weeklyActivities || [],
            nextWeekPlan: nextWeekPlan || []
          },
          // NEW: Add QAQC section to save payload (from state like other sections)
          qaqcStatus: qaqcDataForSave,
          // NEW: Add HSES section to save payload (from state like other sections)
          hses: hsesDataForSave,
          // NEW: Add Photos section to save payload (from state like other sections)
          photos: photosDataForSave,
          // NEW: Add Issues section to save payload (from state like other sections)
          constructionIssues: issuesDataForSave,
          // NEW: Add Schedule section to save payload
          masterSchedule: scheduleDataForSave,
          // NEW: Add Construction Progress section to save payload
          // For drafts: save data as-is without rolling total logic
          // For submitted reports: apply rolling total logic (copy upToThisWeek to previousWeek and reset This Week)
          constructionProgress: (() => {
            const data = constructionProgressHook.constructionData;
            if (!data || !data.items) {
              return {
                projectInfo: {
                  project: "",
                  subtitle: "",
                  date: "",
                  revision: ""
                },
                items: []
              };
            }

            // For drafts, save data as-is without rolling total logic
            return {
              ...data,
              items: data.items.map(item => ({
                ...item,
                // Keep original values for draft - no rolling total logic applied
                previousWeek: item.previousWeek,
                thisWeek: item.thisWeek,
                upToThisWeek: item.upToThisWeek
              }))
            };
          })(),
          // NEW: Add Resources section to save payload
          resources: resourcesData || {
            manPower: {
              dateRange: sharedData.dateRange || "",
              managementTeam: [],
              workingTeamInterior: [],
              workingTeamMEP: []
            },
            material: [],
            machinery: []
          }
        }
      };

      // Convert HSES photo references to Supabase URLs before saving (draft handler)
      if (hsesDataForSave.hsePhotoReferences && hsesDataForSave.hsePhotoReferences.length > 0) {
        hsesDataForSave.hsePhotoReferences = await uploadHSEPhotoReferencesToSupabase(
          hsesDataForSave.hsePhotoReferences,
          currentReportId || 'temp-report-id'
        );
      }


      let response;
      // In create new mode, always create a new report instead of updating
      if (currentReportId && !isCreateNewMode) {
        // Update existing report - only send sections that changed
        const updateData = {
          sections: reportData.sections,
          status: 'draft' as const
        };

        response = await updateWeeklyReport(currentReportId, updateData);
        // Ensure currentReportId is set after successful update
        if (response.success) {
          const updatedId = String((response.data as any)?._id || response.data?.id || currentReportId);
          setCurrentReportId(updatedId);
          // Update URL to include the report ID
          const newUrl = `${window.location.pathname}?reportId=${updatedId}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`;
          window.history.replaceState({}, '', newUrl);


          // Update local construction progress state - for drafts, keep as-is without rolling total
          const currentData = constructionProgressHook.constructionData;
          if (currentData && currentData.items) {
            // For drafts, keep original data without applying rolling total logic
            const updatedData = currentData;
            constructionProgressHook.updateConstructionData(updatedData);
          }
        }
      } else {
        // Create new report (for create new mode or when no reportId exists)
        response = await createWeeklyReport(reportData);
        if (response.success && response.data) {
          const newId = String((response.data as any)._id || response.data.id);
          if (newId) {
            setCurrentReportId(newId);
            setIsCreateNewMode(false); // Exit create new mode after successful creation
            // Update URL to include new report ID
            const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
            const newUrl = `${window.location.pathname}?reportId=${newId}${projectIdParam}`;
            window.history.replaceState({}, '', newUrl);

            // Clear QAQC and HSES localStorage data on successful creation
            if (clearQaqcDataRef.current) {
              clearQaqcDataRef.current();
            }
            if (clearHsesDataRef.current) {
              clearHsesDataRef.current();
            }
          }
        }
      }

      if (response.success) {
        // Return the response for the calling function to handle
        return response;
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // Log specific validation errors
      if (error.message && error.message.includes('Validation failed')) {
        console.error('Validation error - checking data structure...');

        // Check each section for potential issues
        if (reportData.sections?.masterSchedule) {
          // Validate each master schedule entry
          reportData.sections.masterSchedule.forEach((entry, index) => {
            if (!entry.id) console.error(`Entry ${index}: Missing id`);
            if (!entry.type) console.error(`Entry ${index}: Missing type`);
            if (!entry.title) console.error(`Entry ${index}: Missing title`);
            if (!entry.date) console.error(`Entry ${index}: Missing date`);
            if (!entry.fileName) console.error(`Entry ${index}: Missing fileName`);
          });
        }

        // Check other required fields
        if (!reportData.projectName) console.error('Missing projectName');
        if (!reportData.weekNumber) console.error('Missing weekNumber');
        if (!reportData.startDate) console.error('Missing startDate');
        if (!reportData.endDate) console.error('Missing endDate');
      }

      // Re-throw the error for the calling function to handle
      throw error;
    }
  };

  // Public save function that includes loading state
  const handleSaveAsDraft = async () => {
    setIsSaving(true);
    try {
      await handleSaveAsDraftInternal();

      toast({
        title: "Saved",
        description: currentReportId
          ? "Weekly report updated successfully."
          : "Weekly report created successfully.",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Prevent submission in read-only mode
    if (isReadOnly) {
      toast({
        title: "Read-Only Mode",
        description: "Cannot submit another user's report.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let reportId = currentReportId;

      // For submitted reports, save WITHOUT rolling total logic (preserve original values)
      const saveResponse = await handleSaveAsDraftInternal();

      if (saveResponse?.success && saveResponse?.data) {
        reportId = (saveResponse.data as any)._id || saveResponse.data.id || currentReportId;
      } else {
        throw new Error('Failed to save report before submission');
      }

      const response = await submitWeeklyReport(reportId);

      if (response.success) {
        setReportStatus("submitted");
        // Clear QAQC and HSES localStorage data on successful submit
        if (clearQaqcDataRef.current) {
          clearQaqcDataRef.current();
        }
        if (clearHsesDataRef.current) {
          clearHsesDataRef.current();
        }
        toast({
          title: "Submitted",
          description: "Weekly report submitted successfully.",
        });
      } else {
        throw new Error(response.error || 'Submit failed');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Submit Failed",
        description: error instanceof Error ? error.message : "Could not submit weekly report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      // TODO: Implement preview functionality
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate preview
      toast({
        title: "Preview Generated",
        description: "Weekly report preview is ready.",
      });
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Could not generate preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const filename = `WeeklyReport_${sharedData.projectName?.replace(/\s+/g, '_') || 'Project'}_W${sharedData.weekNumber || 'XX'}.pdf`;
      
      // Convert File objects to base64 for construction issues
      const issuesWithBase64Photos = await Promise.all(
        issuesHook.issuesData.map(async (issue) => {
          let photo: string | undefined;
          if (issue.photo instanceof File) {
            photo = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(issue.photo as File); // Explicit type assertion
            });
          } else if (typeof issue.photo === 'string') {
            photo = issue.photo;
          }
          return { ...issue, photo };
        })
      );

      // Create export data with converted photos - include coverData and override constructionIssues
      const dateParts = sharedData.dateRange?.split(' ~ ') || [];
      const exportData = buildWeeklyReportExportData({
        coverData: {
          weekNumber: sharedData.weekNumber,
          reportDateFrom: dateParts[0],
          reportDateTo: dateParts[1],
          projectTitle: sharedData.projectName,
          employer: sharedData.employer || 'Client Name',
          contractor: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
          coverImage: sharedData.coverImage,
          clientLogo: sharedData.clientLogo,
          refNo: `${sharedData.refNoPrefix}-${sharedData.weekNumber}`,
        },
        constructionIssues: issuesWithBase64Photos.map((issue, i) => ({
          number: i + 1,
          siteLocation: issue.location,
          problemDescription: issue.problem,
          actionBy: issue.actionBy,
          photo: issue.photo,
        })),
      });

      await exportWeeklyReportToPdf(exportData, filename);
      toast({
        title: "PDF Exported",
        description: `Weekly report exported as ${filename} successfully.`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      
      // Generate filename with project name and week number
      const filename = `WeeklyReport_${sharedData.projectName?.replace(/\s+/g, '_') || 'Project'}_W${sharedData.weekNumber || 'XX'}.xlsx`;

      // Validate required data before processing
      if (!sharedData.weekNumber) {
        console.warn('Week number is missing, using default');
      }
      if (!sharedData.projectName) {
        console.warn('Project name is missing, using default');
      }

      // Convert File objects to base64 for construction issues with error handling
      const issuesWithBase64Photos = await Promise.all(
        issuesHook.issuesData.map(async (issue, index) => {
          try {
            let photo: string | undefined;
            if (issue.photo instanceof File) {
              console.log(`Converting photo ${index + 1} to base64...`);
              photo = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string;
                  if (result && result.startsWith('data:')) {
                    resolve(result);
                  } else {
                    reject(new Error('Failed to convert file to base64'));
                  }
                };
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.readAsDataURL(issue.photo as File);
              });
              console.log(`Photo ${index + 1} converted successfully`);
            } else if (typeof issue.photo === 'string') {
              photo = issue.photo;
              console.log(`Photo ${index + 1} is already a string`);
            }
            return { ...issue, photo };
          } catch (photoError) {
            console.error(`Failed to convert photo ${index + 1}:`, photoError);
            return { ...issue, photo: undefined }; // Continue without photo
          }
        })
      );

      // Create export data with converted photos - include all required data
      const dateParts = sharedData.dateRange?.split(' ~ ') || [];
      const exportData = buildWeeklyReportExportData({
        coverData: {
          weekNumber: sharedData.weekNumber,
          reportDateFrom: dateParts[0],
          reportDateTo: dateParts[1],
          projectTitle: sharedData.projectName,
          employer: sharedData.employer || 'Client Name',
          contractor: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
          coverImage: sharedData.coverImage,
          clientLogo: sharedData.clientLogo,
          signatureImage: sharedData.signatureImage || '/cacpm_logo.png', // Add signature image with fallback
          refNo: `${sharedData.refNoPrefix || 'WR'}-${sharedData.weekNumber}`,
          letterDate: new Date().toISOString().split('T')[0], // Current date
          projectManager: sharedData.signatoryName || 'Project Manager',
          companyLocation: sharedData.companyLocation || 'Phnom Penh, Cambodia',
          companyPhone1: sharedData.companyPhone1 || '+855 23 123 456',
          companyPhone2: sharedData.companyPhone2 || '+855 23 789 012',
          companyEmail1: sharedData.companyEmail1 || 'info@cacpm.com',
          companyEmail2: sharedData.companyEmail2,
          recipientCompany: sharedData.recipientCompany || sharedData.employer || 'Client Organization',
          recipientLocation: sharedData.recipientLocation || 'Phnom Penh, Cambodia',
          // Add missing fields for Att. and CC using actual user input
          recipientName: sharedData.recipientName || 'Project Manager',
          attName: sharedData.recipientName || 'Project Manager',
          toName: sharedData.recipientName || 'Project Manager',
          ccLines: sharedData.ccList || [],
        },
        // Add missing overall progress data
        overallProgress: formatRowsWithDisplayIndex(overallProgressHook.rows),
        overallProgressRemark: '', // Using empty string since property doesn't exist on sharedData
        // Add construction progress data - cast to any to bypass type mismatch
        constructionProgress: (constructionProgressHook.constructionData?.items || []) as any,
        conProgressProject: sharedData.projectName,
        conProgressDate: dateParts[0],
        // Add activities data - properly transform to match expected structure
        nwdpItems: (() => {
          // Create array to hold all individual rows
          const allItems = [];

          // First, add all weekly activities as individual items
          (weeklyActivities || []).forEach(a => {
            allItems.push({
              sourceId: a.sourceId || '',
              workDoneLabel: a.description,
              workDonePct: a.percent,
              nextWeekLabel: undefined,
              nextWeekPct: undefined
            });
          });

          // Then, try to match next week plan items with existing weekly activities
          // or add them as new items if no match found
          (nextWeekPlan || []).forEach(a => {
            const id = a.sourceId || '';

            // Try to find matching weekly activity by sourceId
            let matched = false;
            if (id) {
              // Only try to match if there's a non-empty ID
              for (let i = 0; i < allItems.length; i++) {
                if (allItems[i].sourceId === id && allItems[i].nextWeekLabel === undefined) {
                  // Found match, add next week data to this item
                  allItems[i].nextWeekLabel = a.description;
                  allItems[i].nextWeekPct = a.percent;
                  matched = true;
                  break;
                }
              }
            }

            // If no match found (or ID is empty), add as separate item
            if (!matched) {
              allItems.push({
                sourceId: id,
                workDoneLabel: undefined,
                workDonePct: undefined,
                nextWeekLabel: a.description,
                nextWeekPct: a.percent
              });
            }
          });

          // Filter out items that have both workDoneLabel and nextWeekLabel as undefined
          return allItems.filter(item =>
            item.workDoneLabel !== undefined || item.nextWeekLabel !== undefined
          );
        })(),
        // Add construction issues with converted photos
        constructionIssues: issuesWithBase64Photos.map((issue, i) => ({
          number: i + 1,
          siteLocation: issue.location || `Site Location ${i + 1}`,
          problemDescription: issue.problem || 'No description provided',
          actionBy: issue.actionBy || 'To be determined',
          photo: issue.photo,
        })),
        // Add other data if available
        projectOverview: sharedData.projectOverview || 'Project overview will be added here.',
        designConstruction: sharedData.designNConstruction || 'Design and construction details will be added here.',
        // Add resources data if available
        weekDates: ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
        manpowerRows: [],
        materialRows: [],
        equipmentRows: [],
        // Add site photos if available
        sitePhotoCaptions: [],
        // Add HSE data if available
        hseTraining: [],
        hseInspection: [],
        hsePermits: [],
        hseFirstAid: '',
        hseOtherConcerns: '',
        hsePhotos: [],
        // Add QAQC data if available
        qaqcSections: [],
      });

     
      // Validate export data
      if (!exportData.weekNumber) {
        console.warn('Week number is still missing in export data');
      }

      // Export to Excel using ExcelJS
      await exportWeeklyReportToExcel(exportData, filename);

      toast({
        title: "Excel Exported",
        description: `Weekly report exported as ${filename} successfully.`,
      });
    } catch (error) {
      
      // Provide more specific error messages
      let errorMessage = "Could not export Excel. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('saveAs') || error.message.includes('File save failed')) {
          errorMessage = "File save failed. Please check your browser's download settings and allow file downloads.";
        } else if (error.message.includes('buffer') || error.message.includes('empty')) {
          errorMessage = "Failed to generate Excel file content. Please check your data and try again.";
        } else if (error.message.includes('sheet')) {
          errorMessage = "Failed to build Excel sheets. Some data might be invalid. Please check your report data.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error occurred while loading images. Please check your internet connection and try again.";
        } else {
          errorMessage = `Excel export failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Retrying Excel export...');
              handleExportExcel();
            }}
          >
            Retry
          </Button>
        ),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZIP = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement ZIP export functionality
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate ZIP creation
      toast({
        title: "ZIP Exported",
        description: "Weekly report exported as ZIP containing both PDF and Excel files.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export ZIP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Schedule upload functionality
  const handleScheduleUpload = (files: FileList | null) => {
    if (!files) return;
    const validFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (validFiles.length === 0) {
      toast({ description: "No valid image or PDF files selected." });
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const allowed = validFiles.filter((f) => f.size <= MAX_SIZE);
    const rejectedCount = validFiles.length - allowed.length;

    if (allowed.length === 0) {
      toast({ description: "All selected files exceed the 10MB limit and were rejected." });
      return;
    }

    // Create new entries for uploaded files (1 file per entry for full width display)
    const newEntries: any[] = [];
    for (const file of allowed) {
      newEntries.push({
        id: crypto.randomUUID(),
        file: file,
        type: file.type.startsWith("image/") ? "image" : "pdf",
        caption: ""
      });
    }

    // Update the first schedule section with new entries
    const updatedSections = [...scheduleSections];
    updatedSections[0] = {
      ...updatedSections[0],
      entries: [...updatedSections[0].entries, ...newEntries]
    };
    setScheduleSections(updatedSections);

    toast({
      title: `${allowed.length} schedule file(s) uploaded`,
      description: `${newEntries.length} new entr${newEntries.length !== 1 ? "ies" : "y"} created.${rejectedCount ? ` ${rejectedCount} file(s) were too large and skipped.` : ""}`,
    });

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onScheduleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleScheduleUpload(e.target.files);
    e.currentTarget.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    handleScheduleUpload(files);
  };

  // Pre-compute overallProgress data to prevent race condition
  const formatRowsWithDisplayIndex = (rows: any[] | null) => {
    if (!rows || rows.length === 0) return [];
    let titleCount = 0;
    return (rows || []).map((row, index) => {
      if (row.rowType === "title") {
        titleCount++;
        return {
          ...row,
          displayIndex: `${toRoman(titleCount)}.`,
        };
      }
      if (row.rowType === "detail") {
        let detailCount = 0;
        for (let i = 0; i <= index; i++) {
          if (rows[i].rowType === "title") {
            detailCount = 0;
          } else if (rows[i].rowType === "detail") {
            detailCount++;
          }
        }
        return {
          ...row,
          displayIndex: `${detailCount}.`,
        };
      }
      if (row.rowType === "subDetail") {
        // Find parent detail number for this sub-detail
        let parentDetailNumber = 0;
        for (let i = index; i >= 0; i--) {
          if (rows[i].rowType === "detail") {
            let detailCount = 0;
            for (let j = 0; j <= i; j++) {
              if (rows[j].rowType === "detail") {
                detailCount++;
              }
            }
            parentDetailNumber = detailCount;
            break;
          }
        }

        // Count sub-details under the same parent
        let subDetailCount = 0;
        for (let i = 0; i <= index; i++) {
          if (rows[i].rowType === "detail") {
            let detailCount = 0;
            for (let j = 0; j <= i; j++) {
              if (rows[j].rowType === "detail") {
                detailCount++;
              }
            }
            if (detailCount === parentDetailNumber) {
              subDetailCount = 0;
            }
          } else if (rows[i].rowType === "subDetail") {
            let currentParentDetail = 0;
            for (let k = i; k >= 0; k--) {
              if (rows[k].rowType === "detail") {
                let detailCount = 0;
                for (let j = 0; j <= k; j++) {
                  if (rows[j].rowType === "detail") {
                    detailCount++;
                  }
                }
                currentParentDetail = detailCount;
                break;
              }
            }
            if (currentParentDetail === parentDetailNumber) {
              subDetailCount++;
            }
          }
        }

        return {
          ...row,
          displayIndex: `${parentDetailNumber}.${subDetailCount}`,
        };
      }
      return row;
    });
  };

  // Debug: Check what data we have
  const computedOverallProgress = formatRowsWithDisplayIndex(overallProgressHook.rows);

  // Build excel export data from all available hook states
  // Fix date parsing - handle the actual format '20-Mar-26 ~ 26-Mar-26'
  const dateParts = sharedData.dateRange?.split(' ~ ') || [];
  const excelData = buildWeeklyReportExportData({
    coverData: {
      weekNumber: sharedData.weekNumber,
      reportDateFrom: dateParts[0],
      reportDateTo: dateParts[1],
      projectTitle: sharedData.projectName,
      employer: sharedData.employer || 'Client Name',
      contractor: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
      coverImage: sharedData.coverImage,  // Add cover image
      clientLogo: sharedData.clientLogo,  // Add client logo
      refNo: `${sharedData.refNoPrefix}-${sharedData.weekNumber}`,
      letterDate: sharedData.reportDate,
      toName: sharedData.recipientName,
      attName: sharedData.recipientName,
      ccLines: sharedData.ccList,
      projectManager: sharedData.signatoryName,
      signatureImage: sharedData.signatureImage,  // Add signature image
      constructorName: sharedData.constructorName,
      companyLocation: sharedData.companyLocation,
      companyPhone1: sharedData.companyPhone1,
      companyPhone2: sharedData.companyPhone2,
      companyEmail1: sharedData.companyEmail1,
      companyEmail2: sharedData.companyEmail2,
      recipientCompany: sharedData.recipientCompany,
      recipientLocation: sharedData.recipientLocation,
    },
    constructionProgress: constructionProgressHook.constructionData?.items as any[],
    conProgressProject: sharedData.projectName,
    conProgressSubtitle: constructionProgressHook.constructionData?.projectInfo?.subtitle || '',
    conProgressDate: constructionProgressHook.constructionData?.projectInfo?.date || sharedData.dateRange?.split(' - ')[0],
    conProgressRevision: constructionProgressHook.constructionData?.projectInfo?.revision || '',
    overallProgress: computedOverallProgress,
    nwdpItems: (() => {
      // Create array to hold all individual rows
      const allItems = [];

      // First, add all weekly activities as individual items
      weeklyActivities.forEach(a => {
        allItems.push({
          sourceId: a.sourceId || '',
          workDoneLabel: a.description,
          workDonePct: a.percent,
          nextWeekLabel: undefined,
          nextWeekPct: undefined
        });
      });

      // Then, try to match next week plan items with existing weekly activities
      // or add them as new items if no match found
      nextWeekPlan.forEach(a => {
        const id = a.sourceId || '';

        // Try to find matching weekly activity by sourceId
        let matched = false;
        if (id) {
          // Only try to match if there's a non-empty ID
          for (let i = 0; i < allItems.length; i++) {
            if (allItems[i].sourceId === id && allItems[i].nextWeekLabel === undefined) {
              // Found match, add next week data to this item
              allItems[i].nextWeekLabel = a.description;
              allItems[i].nextWeekPct = a.percent;
              matched = true;
              break;
            }
          }
        }

        // If no match found (or ID is empty), add as separate item
        if (!matched) {
          allItems.push({
            sourceId: id,
            workDoneLabel: undefined,
            workDonePct: undefined,
            nextWeekLabel: a.description,
            nextWeekPct: a.percent
          });
        }
      });

      // Filter out items that have both workDoneLabel and nextWeekLabel as undefined
      return allItems.filter(item =>
        item.workDoneLabel !== undefined || item.nextWeekLabel !== undefined
      );
    })(),
    qaqcSections: qaqcData ? Object.entries(qaqcData).map(([key, value]: [string, any]) => ({
      sectionTitle: key,
      codeHeader: "Code",
      statusHeader: "Status",
      dateHeader: "Date Responded",
      items: Array.isArray(value) ? value : [],
      comments: Array.isArray(value) && value.length > 0 ? value[0]?.comment || '' : '',
    })) : [],
    hseTraining: hsesData?.training || [],
    hseInspection: hsesData?.inspection || [],
    hsePermits: hsesData?.permit || [],
    hseFirstAid: hsesData?.firstAidAccident,
    hseOtherConcerns: hsesData?.otherActivities,
    weekDates: (() => {
      // Parse "06-Mar-26 ~ 12-Mar-26" format from sharedData.dateRange
      if (!sharedData.dateRange) return ['', '', '', '', '', '', ''];
      const cleaned = sharedData.dateRange.trim().replace(/\s*~\s*/, '~');
      const [startStr] = cleaned.split('~');
      if (!startStr) return ['', '', '', '', '', '', ''];
      const monthMap: { [k: string]: number } = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      const [dayStr, monStr, yrStr] = startStr.trim().split('-');
      const start = new Date(2000 + parseInt(yrStr, 10), monthMap[monStr] ?? 0, parseInt(dayStr, 10));
      if (isNaN(start.getTime())) return ['', '', '', '', '', '', ''];
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d.getDate().toString();
      });
    })(),
    // Manpower: team-based groups with group header rows for Excel export
    manpowerRows: (() => {
      const mp = resourcesData?.manPower;
      if (!mp) return [];

      const dk = ['fri', 'sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const;
      const mapMember = (m: any) => {
        const daily = m.date
          ? dk.map(k => m.date?.[k] ?? 0)
          : Array.isArray(m.dailyData)
            ? m.dailyData
            : Array(7).fill(0);
        return {
          description: m.description ?? '',
          dailyCounts: daily,
          previousWeek: m.prevWeek ?? m.previousWeek ?? 0,
          thisWeek: m.thisWeek ?? 0,
          upToThisWeek: m.accumulated ?? m.upToThisWeek ?? 0,
          isGroupHeader: false,  // marker for renderer
        };
      };

      const groups: Array<{ title: string; members: any[] }> = [
        { title: 'I. Site Management Team',     members: mp.managementTeam ?? [] },
        { title: 'II. Site Working Team Interior', members: mp.workingTeamInterior ?? [] },
        { title: 'III. Site Working Team MEP',  members: mp.workingTeamMEP ?? [] },
      ];

      const out: any[] = [];
      for (const g of groups) {
        const realMembers = g.members.filter((m: any) => (m?.description ?? '').trim() !== '');
        if (realMembers.length === 0) continue;  // skip empty teams

        // Insert group header row
        out.push({
          description: g.title,
          dailyCounts: ['', '', '', '', '', '', ''],
          previousWeek: '',
          thisWeek: '',
          upToThisWeek: '',
          isGroupHeader: true,  // ← marker
        });

        // Then members
        realMembers.forEach(m => out.push(mapMember(m)));
      }
      return out;
    })(),
    materialRows: (resourcesData?.material ?? [])
      .filter((m: any) => (m?.description ?? m?.name ?? '').trim() !== '')
      .map((m: any) => {
        const dk = ['fri', 'sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const;
        const daily = m.date
          ? dk.map(k => m.date?.[k] ?? 0)
          : Array.isArray(m.dailyData)
            ? m.dailyData
            : Array(7).fill(0);
        return {
          description: m.description ?? m.name ?? '',
          unit: m.unit ?? '',
          dailyData: daily,
          previous: m.prevWeek ?? m.previous ?? 0,
          thisPeriod: m.thisWeek ?? m.thisPeriod ?? 0,
          accumulate: m.accumulated ?? m.accumulate ?? 0,
        };
      }),
    equipmentRows: (resourcesData?.machinery ?? [])
      .filter((m: any) => (m?.description ?? m?.name ?? '').trim() !== '')
      .map((m: any) => {
        const dk = ['fri', 'sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const;
        const daily = m.date
          ? dk.map(k => m.date?.[k] ?? 0)
          : Array.isArray(m.dailyData)
            ? m.dailyData
            : Array(7).fill(0);
        return {
          description: m.description ?? m.name ?? '',
          unit: m.unit ?? '',
          dailyData: daily,
          previous: m.prevWeek ?? m.previous ?? 0,
          thisPeriod: m.thisWeek ?? m.thisPeriod ?? 0,
          accumulate: m.accumulated ?? m.accumulate ?? 0,
        };
      }),
    sitePhotoCaptions: siteActivitiesSections.flatMap((section: any) =>
      (section.entries || []).flatMap((entry: any) =>
        (entry.slots || []).reduce((acc: any[], slot: any, idx: number) => {
          // Group slots in pairs (2 slots per row)
          if (idx % 2 === 0) {
            const nextSlot = entry.slots[idx + 1];
            acc.push({
              siteLocation: section.title,
              caption1: slot?.caption || '',
              caption2: nextSlot?.caption || '',
              image1: slot?.image || '',
              image2: nextSlot?.image || '',
            });
          }
          return acc;
        }, [])
      )
    ),
    constructionIssues: issuesHook.issuesData.map((issue, i) => ({
      number: i + 1,
      siteLocation: issue.location,
      problemDescription: issue.problem,
      actionBy: issue.actionBy,
      photo: issue.photo,
    })),
    // Introduction fields
    projectOverview: sharedData.projectOverview,
    designConstruction: sharedData.designNConstruction,
    designList: [], // Design list not available in current data structure
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />

        <SidebarInset>
          <div className="flex flex-col bg-background">
            {/* Report Header with Company and Client Logos */}
            <ReportHeader
              projectLogo={sharedData.clientLogo}
              setProjectLogo={(logo) => setSharedData(prev => ({ ...prev, clientLogo: logo }))}
              title={false}
            />

            {/* Navigation Bar */}
            <div className="w-full px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  {/* <Button
                    variant="ghost"
                    onClick={() => {
                      // Navigate back to dashboard
                      window.location.href = "/dashboard";
                    }}
                    className="justify-start whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-arrow-left h-4 w-4"
                    >
                      <path d="m12 19-7-7 7-7"></path>
                      <path d="M19 12H5"></path>
                    </svg>
                    Back to Dashboard
                  </Button> */}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={activeTab === "construction-progress" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActiveTab("construction-progress");
                      setShowSecondNav(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Con.Prog
                  </Button>
                  <Button
                    variant={activeTab === "cover" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActiveTab("cover");
                      setShowSecondNav(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Cover
                  </Button>
                  <Button
                    variant={activeTab === "letter" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActiveTab("letter");
                      setShowSecondNav(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Letter
                  </Button>
                  <Button
                    variant={
                      activeTab === "table-of-content" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setActiveTab("table-of-content");
                      setShowSecondNav(true);
                      setShowIntroduction(false); // Always reset intro view when switching to TOC tab
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Table of Content
                  </Button>
                </div>
                <div className="flex items-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            {/* Second Navigation Bar - Only shows when Table of Content is active and toggled, or when showing overall-progress or activities */}
            {(activeTab === "table-of-content" ||
              activeTab === "overall-progress" ||
              activeTab === "activities" ||
              activeTab === "hses" ||
              activeTab === "qaqc-status" ||
              activeTab === "resource" ||
              activeTab === "photos" ||
              activeTab === "issues" ||
              activeTab === "schedule") &&
              showSecondNav && (
                <div className="w-full px-2 sm:px-4 py-3 sticky top-16 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
                  <div className="relative flex items-center gap-1">
                    {/* Left Arrow */}
                    <button
                      onClick={() => {
                        const el = document.getElementById("second-nav-scroll");
                        if (el) el.scrollBy({ left: -150, behavior: "smooth" });
                      }}
                      className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>

                    {/* Scrollable Tab Row - hides scrollbar, supports mouse drag + touch */}
                    <div
                      id="second-nav-scroll"
                      className="flex flex-row items-center gap-1.5 overflow-x-auto overflow-y-hidden flex-1"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                      onMouseDown={(e) => {
                        const el = e.currentTarget;
                        el.dataset.isDown = "true";
                        el.dataset.startX = String(e.pageX - el.offsetLeft);
                        el.dataset.scrollLeft = String(el.scrollLeft);
                      }}
                      onMouseLeave={(e) => { e.currentTarget.dataset.isDown = "false"; }}
                      onMouseUp={(e) => { e.currentTarget.dataset.isDown = "false"; }}
                      onMouseMove={(e) => {
                        const el = e.currentTarget;
                        if (el.dataset.isDown !== "true") return;
                        e.preventDefault();
                        const x = e.pageX - el.offsetLeft;
                        const walk = (x - Number(el.dataset.startX)) * 1.5;
                        el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
                      }}
                    >
                      <style>{`#second-nav-scroll::-webkit-scrollbar { display: none; }`}</style>
                      {tableOfContentSections.map((section) => {
                        // Determine if this section is currently active
                        const isActiveSection =
                          (section.id === 1 && activeTab === "table-of-content" && showIntroduction) ||
                          (section.id === 2 && activeTab === "overall-progress") ||
                          (section.id === 3 && activeTab === "activities") ||
                          (section.id === 4 && activeTab === "qaqc-status") ||
                          (section.id === 5 && activeTab === "hses") ||
                          (section.id === 6 && activeTab === "resource") ||
                          (section.id === 7 && activeTab === "photos") ||
                          (section.id === 8 && activeTab === "issues") ||
                          (section.id === 9 && activeTab === "schedule");

                        return (
                          <Button
                            key={section.id}
                            variant={isActiveSection ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (section.id === 1) {
                                setShowIntroduction(true);
                                setActiveTab("table-of-content");
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 2) {
                                setShowIntroduction(false);
                                setActiveTab("overall-progress");
                                if (setShowSecondNav) setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 3) {
                                setShowIntroduction(false);
                                setActiveTab("activities");
                                if (setShowSecondNav) setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 4) {
                                setShowIntroduction(false);
                                setActiveTab("qaqc-status");
                                if (setShowSecondNav) setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 5) {
                                setShowIntroduction(false);
                                setActiveTab("hses");
                                setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 6) {
                                setShowIntroduction(false);
                                setActiveTab("resource");
                                setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 7) {
                                setShowIntroduction(false);
                                setActiveTab("photos");
                                setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 8) {
                                setShowIntroduction(false);
                                setActiveTab("issues");
                                setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (section.id === 9) {
                                setShowIntroduction(false);
                                setActiveTab("schedule");
                                setShowSecondNav(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else {
                                setShowIntroduction(false);
                                setActiveTab("table-of-content");
                                const element = document.querySelector(
                                  section.href,
                                );
                                if (element) {
                                  element.scrollIntoView({ behavior: "smooth" });
                                }
                              }
                            }}
                            className="px-3 py-1.5 text-xs rounded-full transition-all duration-200 hover:scale-105 flex-shrink-0 h-8 min-w-fit"
                          >
                            {section.id}. {section.name}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Right Arrow */}
                    <button
                      onClick={() => {
                        const el = document.getElementById("second-nav-scroll");
                        if (el) el.scrollBy({ left: 150, behavior: "smooth" });
                      }}
                      className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

            {/* Main Content */}
            <main className="w-full px-4 sm:px-6 pt-4 pb-6 flex flex-col">
                    {/* Implementation Notice Banner */}
                    <div className="bg-red-500 text-white px-4 py-3 rounded-lg text-center font-semibold">
                      This page is still implement
                    </div>

                    {/* Read-Only Banner */}
              {isReadOnly && (
                <div className="bg-background border-l-4 border-yellow-400 p-4 m-4">
                  <div className="flex items-center bg-background">
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>View Only Mode:</strong> You are viewing
                        another user's report.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab-based content rendering */}
              {activeTab === "cover" && (
                <>
                  <WeeklyReportCover
                    data={sharedData}
                    onDataChange={(data) =>
                      setSharedData((prev) => ({ ...prev, ...data }))
                    }
                  />
                </>
              )}

            {activeTab === "letter" && (
              <>
                <WeeklyReportLetter
                  data={sharedData}
                  onDataChange={(data) =>
                    setSharedData((prev) => ({ ...prev, ...data }))
                  }
                />
              </>
            )}

            {activeTab === "construction-progress" && (
              <>
                <div className="flex flex-col bg-card rounded-lg border">
                  <WeeklyReportConstructionProgress
                    data={constructionProgressHook.constructionData}
                    onDataChange={handleConstructionProgressChange}
                    reportId={currentReportId}
                    isCreateNewMode={isCreateNewMode}
                  />
                </div>
              </>
            )}

            {activeTab === "table-of-content" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <WeeklyReportContent
                    showIntroduction={showIntroduction}
                    setShowIntroduction={setShowIntroduction}
                    projectLogo={sharedData.coverImage}
                    setActiveTab={setActiveTab}
                    setShowSecondNav={setShowSecondNav}
                    activeTab={activeTab}
                    sharedData={sharedData}
                    setSharedData={setSharedData}
                    overallProgressData={overallProgressHook}
                    setOverallProgressData={overallProgressHook.setRows}
                    reportId={currentReportId}
                    weeklyActivities={weeklyActivities}
                    setWeeklyActivities={setWeeklyActivities}
                    nextWeekPlan={nextWeekPlan}
                    setNextWeekPlan={setNextWeekPlan}
                    qaqcData={qaqcData}
                    setQaqcData={setQaqcData}
                    hsesData={hsesData}
                    setHsesData={setHsesData}
                    onClearQaqcData={handleClearQaqcData}
                    onClearHsesData={handleClearHsesData}
                    constructionProgressItems={constructionProgressHook.constructionData?.items ?? []}
                  />
                </div>
              </>
            )}

            {activeTab === "activities" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <WeeklyReportContent
                    showIntroduction={showIntroduction}
                    setShowIntroduction={setShowIntroduction}
                    projectLogo={sharedData.coverImage}
                    setActiveTab={setActiveTab}
                    setShowSecondNav={setShowSecondNav}
                    activeTab={activeTab}
                    sharedData={sharedData}
                    setSharedData={setSharedData}
                    reportId={currentReportId}
                    weeklyActivities={weeklyActivities}
                    setWeeklyActivities={setWeeklyActivities}
                    nextWeekPlan={nextWeekPlan}
                    setNextWeekPlan={setNextWeekPlan}
                    constructionProgressItems={constructionProgressHook.constructionData?.items ?? []}
                  />
                </div>
              </>
            )}

            {activeTab === "overall-progress" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <WeeklyReportContent
                    showIntroduction={showIntroduction}
                    setShowIntroduction={setShowIntroduction}
                    projectLogo={sharedData.coverImage}
                    setActiveTab={setActiveTab}
                    setShowSecondNav={setShowSecondNav}
                    activeTab={activeTab}
                    sharedData={sharedData}
                    setSharedData={setSharedData}
                    overallProgressData={overallProgressHook}
                    setOverallProgressData={(rows) => overallProgressHook.setRows(rows)}
                    constructionProgressItems={constructionProgressHook.constructionData?.items ?? []}
                    weeklyActivities={weeklyActivities}
                    setWeeklyActivities={setWeeklyActivities}
                    nextWeekPlan={nextWeekPlan}
                    setNextWeekPlan={setNextWeekPlan}
                  />
                </div>
              </>
            )}

            {activeTab === "qaqc-status" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <WeeklyReportContent
                    showIntroduction={showIntroduction}
                    setShowIntroduction={setShowIntroduction}
                    projectLogo={sharedData.coverImage}
                    setActiveTab={setActiveTab}
                    setShowSecondNav={setShowSecondNav}
                    activeTab={activeTab}
                    sharedData={sharedData}
                    setSharedData={setSharedData}
                    reportId={currentReportId}
                    weeklyActivities={weeklyActivities}
                    setWeeklyActivities={setWeeklyActivities}
                    nextWeekPlan={nextWeekPlan}
                    setNextWeekPlan={setNextWeekPlan}
                    qaqcData={qaqcData}
                    setQaqcData={setQaqcData}
                    constructionProgressItems={constructionProgressHook.constructionData?.items ?? []}
                    onClearQaqcData={(fn) => { clearQaqcDataRef.current = fn; }}
                  />
                </div>
              </>
            )}

            {activeTab === "hses" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <WeeklyReportContent
                    showIntroduction={showIntroduction}
                    setShowIntroduction={setShowIntroduction}
                    projectLogo={sharedData.coverImage}
                    setActiveTab={setActiveTab}
                    setShowSecondNav={setShowSecondNav}
                    activeTab={activeTab}
                    sharedData={sharedData}
                    setSharedData={setSharedData}
                    reportId={currentReportId}
                    weeklyActivities={weeklyActivities}
                    setWeeklyActivities={setWeeklyActivities}
                    nextWeekPlan={nextWeekPlan}
                    setNextWeekPlan={setNextWeekPlan}
                    hsesData={hsesData}
                    setHsesData={setHsesData}
                    constructionProgressItems={constructionProgressHook.constructionData?.items ?? []}
                    onClearHsesData={(fn) => { clearHsesDataRef.current = fn; }}
                  />
                </div>
              </>
            )}

            {activeTab === "resource" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <WeeklyReportContent
                    showIntroduction={showIntroduction}
                    setShowIntroduction={setShowIntroduction}
                    projectLogo={sharedData.coverImage}
                    setActiveTab={setActiveTab}
                    setShowSecondNav={setShowSecondNav}
                    activeTab={activeTab}
                    sharedData={sharedData}
                    setSharedData={setSharedData}
                    reportId={currentReportId}
                    weeklyActivities={weeklyActivities}
                    setWeeklyActivities={setWeeklyActivities}
                    nextWeekPlan={nextWeekPlan}
                    setNextWeekPlan={setNextWeekPlan}
                    resourcesData={resourcesData}
                    setResourcesData={setResourcesData}
                  />
                </div>
              </>
            )}

            {activeTab === "photos" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">7. {siteActivitiesTitle}</h2>
                      <Button
                        onClick={() => {
                          const newSection = {
                            id: crypto.randomUUID(),
                            title: `Photo Section ${siteActivitiesSections.length + 1}`,
                            entries: []
                          };
                          setSiteActivitiesSections([...siteActivitiesSections, newSection]);
                        }}
                        className="flex items-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add Section
                      </Button>
                    </div>
                    <ReferenceSection
                      sections={siteActivitiesSections}
                      setSections={setSiteActivitiesSections}
                      onExportReference={() => { }}
                      isExporting={isExportingSiteActivities}
                      tableTitle={siteActivitiesTitle}
                      setTableTitle={setSiteActivitiesTitle}
                      hideTitle={false}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "issues" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">8. Construction Issues</h2>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            issuesHook.addIssue();
                          }}
                          className="flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Add Issue
                        </Button>
                      </div>
                    </div>
                    {issuesHook.issuesData.map((issue, index) => (
                      <ConstructionIssueComponent
                        key={issue.id}
                        issueNumber={index + 1}
                        location={issue.location}
                        problem={issue.problem}
                        actionBy={issue.actionBy}
                        photo={issue.photo as string | null}
                        onRemove={() => {
                          issuesHook.removeIssue(index);
                        }}
                        onDataChange={(data) => {
                          issuesHook.updateIssue(index, data);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "schedule" && (
              <>
                <div className="bg-card rounded-lg border p-6">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">9. Master Schedule</h2>
                    </div>

                    {/* New Supabase Master Schedule Component */}
                    <MasterScheduleSupabase
                      entries={scheduleSections[0].entries}
                      onChange={(entries) => {
                        const updatedSections = [...scheduleSections];
                        updatedSections[0] = {
                          ...updatedSections[0],
                          entries: entries
                        };
                        setScheduleSections(updatedSections);
                      }}
                      reportId={currentReportId || undefined}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </>
            )}
          </main>

          {/* Action Buttons */}
          <div className="flex items-center justify-center py-6 border-t border-border mt-6">
            <div className="flex items-center gap-3">
              {/* Save As Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-w-[140px]"
                    disabled={isSaving || isSubmitting || isReadOnly}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving || isSubmitting ? "Processing..." : (isReadOnly ? "Read-Only" : "Save As...")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[140px]"
                >
                  <DropdownMenuItem
                    onClick={handleSaveAsDraft}
                    disabled={
                      isSaving ||
                      reportStatus === "submitted" ||
                      isReadOnly
                    }
                    className={
                      reportStatus === "submitted" || isReadOnly
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Draft"}
                    {reportStatus === "submitted" && (
                      <Lock className="w-3 h-3 ml-auto" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSubmit}
                    disabled={isSubmitting || isReadOnly}
                    className={
                      reportStatus === "submitted" || isReadOnly
                        ? "bg-green-900/20 border-green-700 dark:bg-green-900/30 dark:border-green-600 hover:bg-green-900/40 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 dark:hover:bg-green-900/50 dark:hover:border-green-400 dark:hover:shadow-green-400/30 cursor-pointer"
                        : ""
                    }
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : reportStatus === "submitted" ? "Submit Again" : "Submit"}
                    {reportStatus === "submitted" && (
                      <CheckCircle className="w-3 h-3 ml-auto text-green-600" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Preview Button */}
              <Button
                variant="outline"
                className="min-w-[140px]"
                onClick={handlePreview}
                disabled={isPreviewing}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isPreviewing ? "Previewing..." : "Preview"}
              </Button>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="min-w-[160px] bg-primary hover:bg-primary/90"
                    disabled={isExporting}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleExportPDF}
                    disabled={isExporting}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export As PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportExcel}
                    disabled={isExporting}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export As Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportZIP}
                    disabled={isExporting}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export As ZIP
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </SidebarInset>
    </div>
  </SidebarProvider>
);
};

export default WeeklyReport;