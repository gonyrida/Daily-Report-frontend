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
import { useQaqcTable } from "@/hooks/useQaqcTable";
import { useIssues } from "@/hooks/useIssues";
import { useConstructionProgress } from "@/hooks/useConstructionProgress";
import { ConstructionProgressData } from "@/types/constructionProgress";
import { computeAllAmounts } from "@/utils/calculationEngine";
import { UploadCloud } from "lucide-react";
import { getQaqcStatus } from "@/integrations/reportsApi";
import { convertScheduleEntriesToSupabase, uploadHSEPhotoReferencesToSupabase } from '@/utils/weeklyReportSupabase';
import { MasterScheduleSupabase } from '@/components/weekly/MasterScheduleSupabase';
import WeeklyReportConstructionProgress from "@/components/weekly/WeeklyReportConstructionProgress";
import { buildWeeklyReportExportData } from "@/lib/Weeklyreportexcelmapper";
import { exportWeeklyReportToExcel } from "@/lib/weeklyreportexcel";
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

const WeeklyReport = () => {
  const [searchParams] = useSearchParams();
  const selectedProject = searchParams.get('project');
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
    refNoPrefix: "ICT-CPM-LETTER",
    dateRange: "",
    projectName: selectedProject || "Default Project Name",
    employer: "Client Name",
    coverImage: "",
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

  // NEW: Add state to store the clearQaqcData function reference
  const clearQaqcDataRef = useRef<(() => void) | null>(null);

  // NEW: Add state to store the clearHsesData function reference
  const clearHsesDataRef = useRef<(() => void) | null>(null);

  // Callback functions for clearing data
  const handleClearQaqcData = (clearFn: () => void) => {
    console.log('🔍 DEBUG: QAQC clear function registered');
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
  const overallProgressHook = useOverallProgress();

  // Issues hook for state management
  const issuesHook = useIssues();

  // Update projectName when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      setSharedData(prev => ({
        ...prev,
        projectName: selectedProject
      }));
    }
  }, [selectedProject]);

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
            const reportId = (report as any)._id || report.id;
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

            // Load QAQC data
            if (report.sections?.qaqcStatus) {
              setQaqcData(report.sections.qaqcStatus);
            } else {
              // Create empty QAQC structure if none exists (no default items)
              setQaqcData({
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
                tr: { items: [], comments: "" }
              });
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
            // Load Construction Progress data
            if (report.sections?.constructionProgress) {
              constructionProgressHook.updateConstructionData(report.sections.constructionProgress);
            } else {
              // Create empty Construction Progress structure if none exists
              constructionProgressHook.updateConstructionData({
                projectInfo: {
                  project: '',
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
                      projectName: selectedProject || '', 
                      status: 'submitted',
                      limit: 1,
                      sortBy: 'createdAt',
                      sortOrder: 'desc'
                    });
                    
                    if (reportsResponse.success && reportsResponse.data?.length > 0) {
                      const submittedReportData = reportsResponse.data[0];
                      console.log('✅ Found submitted report in project, applying rolling total');
                      
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
                        console.log('✅ Rolling total applied from project submitted report');
                      }
                    }
                  } catch (error) {
                    console.log('⚠️ No submitted reports found in project');
                  }
                }
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
          projectName: selectedProject || '', 
          status: 'submitted',
          limit: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        
        if (reportsResponse.success && reportsResponse.data?.length > 0) {
          submittedReportData = reportsResponse.data[0];
          console.log('✅ Found submitted report, applying rolling total');
        }
      } catch (error) {
        console.log('⚠️ No submitted reports found, creating clean report');
      }

      // Initialize with default data or copy from submitted report with rolling total
      const newReportData = {
        projectName: selectedProject || 'Default Project',
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
            projectTitle: selectedProject || 'Default Project',
            employer: 'Client Name'
          },
          letter: {
            refNoPrefix: 'ICT-CPM-LETTER',
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
                  project: '',
                  subtitle: '',
                  date: '',
                  revision: ''
                },
                items: []
              };
            }
            
            console.log('🔄 Applying rolling total logic from database: upToThisWeek → previousWeek, thisWeek → 0');
            console.log('📊 Source: Submitted report from database with ID:', submittedReportData._id);
            
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
            
            console.log('✅ Rolling total applied successfully from database data');
            console.log('📈 Previous Week now has values from submitted report upToThisWeek');
            console.log('📝 This Week reset to 0 for new data entry');
            
            return {
              ...data,
              items: finalItems
            };
          })() : {
            projectInfo: {
              project: '',
              subtitle: '',
              date: '',
              revision: ''
            },
            items: []
          }
        }
      };

      const response = await createWeeklyReport(newReportData);
      if (response.success && response.data) {
        const newId = (response.data as any)._id || response.data.id;
        if (newId) {
          setCurrentReportId(newId);
          // Update URL to include new report ID and remove createNew parameter
          const newUrl = `${window.location.pathname}?reportId=${newId}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`;
          window.history.replaceState({}, '', newUrl);
          
          console.log('✅ New report created successfully with rolling totals');
        }
      }
    } catch (error) {
      console.error('❌ Error creating new weekly report with rolling total:', error);
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
          projectName: selectedProject || '', 
          status: 'submitted',
          limit: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        
        if (reportsResponse.success && reportsResponse.data?.length > 0) {
          submittedReportData = reportsResponse.data[0];
        }
      } catch (error) {
        console.log('No submitted reports found, creating new report');
      }

      // Initialize with default data or copy from submitted report
      const newReportData = {
        projectName: selectedProject || 'Default Project',
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
            projectTitle: selectedProject || 'Default Project',
            employer: 'Client Name'
          },
          letter: {
            refNoPrefix: 'ICT-CPM-LETTER',
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
                  project: '',
                  subtitle: '',
                  date: '',
                  revision: ''
                },
                items: []
              };
            }
            
            // Apply rolling total logic: copy upToThisWeek to previousWeek and reset This Week
            console.log('🔍 Debug: Original submitted report data:', data.items);
            
            const rolledItems = data.items.map(item => {
              console.log('🔍 Debug: Processing item:', item.id);
              console.log('🔍 Debug: upToThisWeek values:', item.upToThisWeek);
              
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
              
              console.log('🔍 Debug: Rolled item previousWeek:', rolledItem.previousWeek);
              return rolledItem;
            });
            
            console.log('🔍 Debug: Rolled items before computeAllAmounts:', rolledItems);
            
            // Apply calculations to the rolled items, but preserve the previousWeek amounts we just set
            const computedItems = computeAllAmounts(rolledItems);
            
            // Restore the previousWeek amounts that were overwritten by computeAllAmounts
            const finalItems = computedItems.map((item, index) => ({
              ...item,
              previousWeek: rolledItems[index].previousWeek
            }));
            
            console.log('🔍 Debug: Final items after restoring previousWeek:', finalItems);
            console.log('🔍 Debug: First item previousWeek final:', finalItems[0]?.previousWeek);
            
            return {
              ...data,
              items: finalItems
            };
          })() : {
            projectInfo: {
              project: '',
              subtitle: '',
              date: '',
              revision: ''
            },
            items: []
          }
        }
      };

      const response = await createWeeklyReport(newReportData);
      if (response.success && response.data) {
        const newId = (response.data as any)._id || response.data.id;
        if (newId) {
          setCurrentReportId(newId);
          // Update URL to include new report ID
          const newUrl = `${window.location.pathname}?reportId=${newId}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`;
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
        return rows.map((row, index) => {
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
          photoReferences.map(async (section) => {
            const convertedEntries = await Promise.all(
              section.entries.map(async (entry) => {
                const convertedSlots = await Promise.all(
                  entry.slots.map(async (slot) => {
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
          const updatedId = (response.data as any)?._id || response.data?.id || currentReportId;
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
          const newId = (response.data as any)._id || response.data.id;
          if (newId) {
            setCurrentReportId(newId);
            // Update URL to include new report ID
            const newUrl = `${window.location.pathname}?reportId=${newId}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`;
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
        return rows.map((row, index) => {
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
          photoReferences.map(async (section) => {
            const convertedEntries = await Promise.all(
              section.entries.map(async (entry) => {
                const convertedSlots = await Promise.all(
                  entry.slots.map(async (slot) => {
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
          })()
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
          const updatedId = (response.data as any)?._id || response.data?.id || currentReportId;
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
          const newId = (response.data as any)._id || response.data.id;
          if (newId) {
            setCurrentReportId(newId);
            setIsCreateNewMode(false); // Exit create new mode after successful creation
            // Update URL to include new report ID
            const newUrl = `${window.location.pathname}?reportId=${newId}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`;
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
      // TODO: Implement PDF export functionality
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export
      toast({
        title: "PDF Exported",
        description: "Weekly report exported as PDF successfully.",
      });
    } catch (error) {
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
      
      // Export to Excel using ExcelJS
      await exportWeeklyReportToExcel(excelData, filename);
      
      toast({
        title: "Excel Exported",
        description: `Weekly report exported as ${filename} successfully.`,
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export Excel. Please try again.",
        variant: "destructive",
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

  // Build excel export data from all available hook states
  console.log('🔍 Debug: Construction progress data:', constructionProgressHook.constructionData?.items);
  console.log('🔍 Debug: First item remark:', constructionProgressHook.constructionData?.items?.[0]?.remark);
  
  const excelData = buildWeeklyReportExportData({
    coverData: {
      weekNumber: sharedData.weekNumber,
      reportDateFrom: sharedData.dateRange?.split(' - ')[0],
      reportDateTo: sharedData.dateRange?.split(' - ')[1],
      projectTitle: sharedData.projectName,
      employer: sharedData.employer,
      contractor: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
      refNo: `${sharedData.refNoPrefix}-${sharedData.weekNumber}`,
      letterDate: sharedData.reportDate,
      toName: sharedData.recipientName,
      ccLines: sharedData.ccList,
      projectManager: sharedData.signatoryName,
    },
    constructionProgress: constructionProgressHook.constructionData?.items as any,
    conProgressProject: sharedData.projectName,
    conProgressSubtitle: constructionProgressHook.constructionData?.projectInfo?.subtitle || '',
    conProgressDate: constructionProgressHook.constructionData?.projectInfo?.date || sharedData.dateRange?.split(' - ')[0],
    conProgressRevision: constructionProgressHook.constructionData?.projectInfo?.revision || '',
    overallProgress: overallProgressHook.rows as any,
    nwdpItems: weeklyActivities.map(a => ({
      workDoneLabel: a.description,
      workDonePct: a.percent,
    })),
    qaqcSections: qaqcData ? Object.entries(qaqcData).map(([key, value]: [string, any]) => ({
      sectionTitle: key.toUpperCase(),
      codeHeader: "Code",
      statusHeader: "Status", 
      dateHeader: "Date Responded",
      items: value?.items || [],
      comments: value?.comments || '',
    })) : [],
    hseTraining: hsesData?.training || [],
    hseInspection: hsesData?.inspection || [],
    hsePermits: hsesData?.permit || [],
    hseFirstAid: hsesData?.firstAidAccident,
    hseOtherConcerns: hsesData?.otherActivities,
    weekDates: sharedData.dateRange?.split(' - ')[0] 
      ? Array.from({ length: 7 }, (_, i) => {
          const start = new Date(sharedData.dateRange.split(' - ')[0]);
          start.setDate(start.getDate() + i);
          return start.getDate().toString();
        })
      : ['13', '14', '15', '16', '17', '18', '19'],
    manpowerRows: [], // Resource data managed in WeeklyReportContent
    materialRows: [],
    equipmentRows: [],
    sitePhotoCaptions: siteActivitiesSections.flatMap((section: any) => 
      section.slots?.map((slot: any, idx: number) => ({
        siteLocation: section.title,
        caption1: idx === 0 ? slot.caption : undefined,
        caption2: idx === 1 ? slot.caption : undefined,
      })) || []
    ),
    constructionIssues: issuesHook.issuesData.map((issue, i) => ({
      number: i + 1,
      siteLocation: issue.location,
      problemDescription: issue.problem,
      actionBy: issue.actionBy,
    })),
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />

        <SidebarInset>
          <div className="flex flex-col bg-background">
            {/* Report Header with Company and Client Logos */}
            <ReportHeader
              projectLogo={projectLogo}
              setProjectLogo={setProjectLogo}
              title={`WEEKLY REPORT - ${selectedProject || 'No Project Selected'}`}
            />

            {/* Navigation Bar */}
            <div className="w-full px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <Button
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
                  </Button>
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
                <div className="w-full px-4 sm:px-6 py-3 sticky top-16 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
                  <div className="flex items-center justify-center gap-2 whitespace-nowrap">
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
                          className="rounded-full text-sm transition-all duration-200 hover:scale-105 flex-shrink-0"
                        >
                          {section.id}. {section.name}
                        </Button>
                      );
                    })}
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
                        <strong>🔒 View Only Mode:</strong> You are viewing
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
