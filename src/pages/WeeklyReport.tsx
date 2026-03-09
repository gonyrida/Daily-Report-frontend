import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ReportHeader from "@/components/ReportHeader";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import WeeklyReportCover from "@/components/weekly/WeeklyReportCover";
import WeeklyReportLetter from "@/components/weekly/WeeklyReportLetter";
import { ActivityRow } from "@/types/activity.types";
import WeeklyReportContent from "@/components/weekly/WeeklyReportContent";
import ReferenceSection from "@/components/ReferenceSection";
import ConstructionIssue from "@/components/weekly/content/ConstructionIssue";
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
import { UploadCloud } from "lucide-react";
import { getQaqcStatus } from "@/integrations/reportsApi";
import { convertScheduleEntriesToSupabase } from '@/utils/weeklyReportSupabase';
import { MasterScheduleSupabase } from '@/components/weekly/MasterScheduleSupabase';
import { 
  createWeeklyReport, 
  updateWeeklyReport, 
  submitWeeklyReport,
  getWeeklyReportById 
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
  const [projectLogo, setProjectLogo] = useState<string>("/koica_logo.png");
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(reportId || null);

  // Active tab state for section filtering
  const [activeTab, setActiveTab] = useState<
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
  >("cover");

  // Debug logging for activeTab changes
  const debugSetActiveTab = (tab: any) => {
    console.log("ActiveTab changing from", activeTab, "to", tab);
    setActiveTab(tab);
  };

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

  // Schedule sections state
  const [scheduleSections, setScheduleSections] = useState([
    { id: crypto.randomUUID(), title: "Master Schedule", entries: [] }
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);

  // Save, Preview, Export states
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  // Sync Issues data changes to parent state (like other sections)
  useEffect(() => {
    if (setIssuesData && issuesHook.issuesData) {
      setIssuesData(issuesHook.issuesData);
    }
  }, [issuesHook.issuesData]); // Remove setIssuesData to prevent infinite loop

  // Load master schedule data when reportId changes or component mounts
  useEffect(() => {
    const loadMasterSchedule = async () => {
      if (reportId) {
        try {
          const response = await getWeeklyReportById(reportId);
          if (response.success && response.data) {
            const report = response.data;
            if (report.sections?.masterSchedule) {
              console.log('DEBUG: Loading master schedule from saved report:', report.sections.masterSchedule);
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
  }, [reportId]); // Reload when reportId changes

  // Load existing report data when reportId is present
  useEffect(() => {
    const loadExistingReport = async () => {
      if (reportId) {
        try {
          const response = await getWeeklyReportById(reportId);
          if (response.success && response.data) {
            const report = response.data;
            setCurrentReportId(report.id);
            setReportStatus(report.status || 'draft');
            
            // Update shared data with existing report data
            setSharedData(prev => ({
              ...prev,
              weekNumber: report.weekNumber?.toString() || '',
              projectName: report.projectName || selectedProject || 'Default Project Name',
              employer: report.sections?.cover?.employer || 'Client Name',
              coverImage: report.sections?.cover?.coverImage || '',
              dateRange: report.sections?.cover?.dateRange || '',
              // Load introduction data
              projectOverview: report.sections?.introduction?.projectOverview || '',
              designNConstruction: report.sections?.introduction?.designNConstruction || '',
              // Load letter data
              refNoPrefix: report.sections?.letter?.refNoPrefix || '',
              reportDate: report.sections?.letter?.reportDate || '',
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
                hsePhotoReferences: []
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
                  issueNumber: issue.issueNumber || 1,
                  location: issue.siteLocation || "",
                  problem: issue.problems || "",
                  actionBy: issue.actionBy || "",
                  photo: issue.photoReference || null
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
          }
        } catch (error) {
          console.error('Error loading report:', error);
          toast({
            title: "Error",
            description: "Failed to load existing report.",
            variant: "destructive",
          });
        }
      }
    };

    loadExistingReport();
  }, [reportId, selectedProject, toast]);

  // Handler functions
  const handleSaveAsDraft = async () => {
        setIsSaving(true);
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
        tr: { items: [], comments: "" }
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
        hsePhotoReferences: []
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
      
      if (scheduleSections && scheduleSections.length > 0) {
        // Convert entries to Supabase URLs
        scheduleDataForSave = await convertScheduleEntriesToSupabase(
          scheduleSections[0].entries,
          currentReportId || 'temp-report-id'
        );
        
        // Remove file objects that shouldn't be sent to backend
        scheduleDataForSave = scheduleDataForSave.map(entry => {
          const { file, ...entryWithoutFile } = entry;
          return entryWithoutFile;
        });
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
        projectName: sharedData.projectName,
        weekNumber: parseInt(sharedData.weekNumber) || 1,
        startDate: new Date().toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        endDate: new Date().toISOString().split('T')[0],
        sections: {
          cover: {
            projectName: sharedData.projectName,
            reportTitle: 'Weekly Progress Report',
            weekNumber: sharedData.weekNumber,
            dateRange: sharedData.dateRange,
            contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
            clientName: sharedData.employer || 'Client Name',
            contractNumber: '', // Add contract number field if needed
            coverImage: sharedData.coverImage || '',
            projectTitle: sharedData.projectName,
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
          masterSchedule: scheduleDataForSave
        }
      };

      // Convert HSES photo references to base64 before saving
      if (hsesDataForSave.hsePhotoReferences && hsesDataForSave.hsePhotoReferences.length > 0) {
        hsesDataForSave.hsePhotoReferences = await convertImagesToBase64(hsesDataForSave.hsePhotoReferences);
      }

            
      let response;
      if (currentReportId) {
        // Update existing report - only send sections that changed
        const updateData = {
          sections: reportData.sections,
          status: 'draft' as const
        };
        response = await updateWeeklyReport(currentReportId, updateData);
      } else {
        // Create new report
        response = await createWeeklyReport(reportData);
        if (response.success && response.data?.id) {
          setCurrentReportId(response.data.id);
          // Update URL to include new report ID
          const newUrl = `${window.location.pathname}?reportId=${response.data.id}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`;
          window.history.replaceState({}, '', newUrl);
        }
      }

      if (response.success) {
        toast({
          title: "Saved",
          description: currentReportId 
            ? "Weekly report updated successfully." 
            : "Weekly report created successfully.",
        });
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Log specific validation errors
      if (error.message && error.message.includes('Validation failed')) {
        console.error('Validation error - checking data structure...');
        console.log('Report data being sent:', JSON.stringify(reportData, null, 2));
        
        // Check each section for potential issues
        if (reportData.sections?.masterSchedule) {
          console.log('Master schedule data:', JSON.stringify(reportData.sections.masterSchedule, null, 2));
        }
      }
      
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
    if (!currentReportId) {
      toast({
        title: "Cannot Submit",
        description: "Please save the report as draft first before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await submitWeeklyReport(currentReportId);
      
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
      setIsSaving(false);
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
      // TODO: Implement Excel export functionality
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export
      toast({
        title: "Excel Exported",
        description: "Weekly report exported as Excel successfully.",
      });
    } catch (error) {
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />

        <SidebarInset>
          <div className="min-h-screen bg-background">
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
                      debugSetActiveTab("table-of-content");
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
                <div className="w-full px-4 sm:px-6 py-3 sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b shadow-sm overflow-x-auto">
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
                          console.log(
                            "Second nav button clicked, section.id:",
                            section.id,
                          );
                          if (section.id === 1) {
                            setShowIntroduction(true);
                            debugSetActiveTab("table-of-content");
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 2) {
                            setShowIntroduction(false);
                            debugSetActiveTab("overall-progress");
                            if (setShowSecondNav) setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 3) {
                            setShowIntroduction(false);
                            debugSetActiveTab("activities");
                            if (setShowSecondNav) setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 4) {
                            setShowIntroduction(false);
                            debugSetActiveTab("qaqc-status");
                            if (setShowSecondNav) setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 5) {
                            setShowIntroduction(false);
                            debugSetActiveTab("hses");
                            setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 6) {
                            setShowIntroduction(false);
                            debugSetActiveTab("resource");
                            setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 7) {
                            setShowIntroduction(false);
                            debugSetActiveTab("photos");
                            setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 8) {
                            setShowIntroduction(false);
                            debugSetActiveTab("issues");
                            setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 9) {
                            setShowIntroduction(false);
                            debugSetActiveTab("schedule");
                            setShowSecondNav(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else {
                            setShowIntroduction(false);
                            debugSetActiveTab("table-of-content");
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
            <main className="w-full px-4 sm:px-6 pt-4 pb-6 space-y-6 overflow-x-hidden">
              {/* Implementation Notice Banner */}
              <div className="bg-red-500 text-white px-4 py-3 rounded-lg text-center font-semibold">
                This page is still implement
              </div>
              
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

              {activeTab === "table-of-content" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
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

              {activeTab === "activities" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
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
                      setActiveTab={debugSetActiveTab}
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
                      setActiveTab={debugSetActiveTab}
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
                      setActiveTab={debugSetActiveTab}
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
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Add Section
                        </Button>
                      </div>
                      <ReferenceSection
                        sections={siteActivitiesSections}
                        setSections={setSiteActivitiesSections}
                        onExportReference={() => {}}
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
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                            Add Issue
                          </Button>
                        </div>
                      </div>
                      {issuesHook.issuesData.map((issue, index) => (
                        <ConstructionIssue 
                          key={issue.id} 
                          issueNumber={index + 1} 
                          siteLocation={issue.location}
                          problems={issue.problem}
                          actionBy={issue.actionBy}
                          photoReference={issue.photo as string | null}
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
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Processing..." : "Save As..."}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[140px]"
                  >
                    <DropdownMenuItem
                      onClick={handleSaveAsDraft}
                      disabled={isSaving}
                      className={
                        reportStatus === "submitted"
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
                      disabled={isSaving}
                      className={
                        reportStatus === "submitted"
                          ? "bg-green-900/20 border-green-700 dark:bg-green-900/30 dark:border-green-600 hover:bg-green-900/40 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 dark:hover:bg-green-900/50 dark:hover:border-green-400 dark:hover:shadow-green-400/30 cursor-pointer"
                          : ""
                      }
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSaving ? "Submitting..." : "Submitted"}
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
