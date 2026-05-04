import React, { useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import WeeklyReportContent from "@/components/weekly/WeeklyReportContent";
import WeeklyReportConstructionProgress from "@/components/weekly/WeeklyReportConstructionProgress";
import { Button } from "@/components/ui/button";
import { transformMasterToReportData } from "@/utils/masterReportTransform";
import { ConstructionProgressItem, ConstructionProgressData } from "@/types/constructionProgress";
import { MasterConstructionProgressItem } from "@/types/masterReport.types";
import { getMasterWeeklyReport } from "@/services/weeklyReportService";
import { TabType } from "@/types/weeklyReportContent.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Calendar,
  TrendingUp,
  Clock,
  FileText,
  Edit,
  Eye,
  Loader2,
  Building2,
  User,
  CheckCircle,
  LayoutDashboard,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import ProfileIcon from "@/components/ProfileIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeeklyReportSkeleton, SummaryCardSkeleton } from "@/components/WeeklyReportSkeleton";
import { getWeeklyReports, getWeeklyReportsMeta, getCompanyWeeklyReports, deleteWeeklyReport } from "@/services/weeklyReportService";
import { getProjectById } from "@/integrations/projectsApi";
import type { WeeklyReport } from "@/types/weeklyReport.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Helper function to format dates in DD-MMM-YY format
const formatDateRange = (dateString: string): string => {
  if (!dateString) return 'N/A';

  // Extract YYYY-MM-DD from ISO string (ignore time/timezone)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) return 'Invalid Date';

  // Create date using local components (avoid timezone shift)
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const formattedDay = day.toString().padStart(2, '0');
  const monthShort = date.toLocaleString('en-US', { month: 'short' });
  const yearShort = year.toString().slice(-2);

  return `${formattedDay}-${monthShort}-${yearShort}`;
};

// Helper function to get the ISO week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper function to count submitted reports this month
const getSubmittedReportsThisMonth = (reports: WeeklyReport[], currentUserId: string | null): number => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  return reports.filter(report => {
    const reportDate = new Date(report.createdAt || report.startDate);
    const isOwner = report.userId && (report.userId._id === currentUserId || report.userId.id === currentUserId);
    
    // For non-owners, only count submitted/approved reports
    // For owners, count submitted/approved reports
    return (
      (report.status === 'submitted' || report.status === 'approved') &&
      reportDate.getMonth() === currentMonth &&
      reportDate.getFullYear() === currentYear
    );
  }).length;
};

// Helper function to get last submitted report this month
const getLastSubmittedThisMonth = (reports: WeeklyReport[], currentUserId: string | null): WeeklyReport | null => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const submittedThisMonth = reports.filter(report => {
    const reportDate = new Date(report.createdAt || report.startDate);
    const isOwner = report.userId && (report.userId._id === currentUserId || report.userId.id === currentUserId);
    
    // For non-owners, only consider submitted/approved reports
    // For owners, consider submitted/approved reports
    return (
      (report.status === 'submitted' || report.status === 'approved') &&
      reportDate.getMonth() === currentMonth &&
      reportDate.getFullYear() === currentYear &&
      report.submittedAt // Must have a submitted date
    );
  });
  
  if (submittedThisMonth.length === 0) return null;
  
  // Sort by submittedAt date (most recent first)
  return submittedThisMonth.sort((a, b) => 
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )[0];
};

// Helper function to get the current week based on date ranges
const getCurrentWeekBasedOnDate = (reports: WeeklyReport[]): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison
  
  // Find all reports with valid date ranges
  const reportsWithDates = reports.filter(report => 
    report.startDate && report.endDate && 
    new Date(report.startDate) <= new Date(report.endDate)
  );
  
  // Sort reports by start date to find the most recent
  const sortedReports = reportsWithDates.sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  
  for (const report of sortedReports) {
    const startDate = new Date(report.startDate);
    const endDate = new Date(report.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999); // End of day
    
    // Check if today falls within this report's date range
    if (today >= startDate && today <= endDate) {
      return report.weekNumber;
    }
  }
  
  // If no matching date range found, find the next week number
  return getNextWeekNumber(reports);
};

// Helper function to get next week number from last submitted report
const getNextWeekNumber = (reports: WeeklyReport[]): number => {
  const submittedReports = reports.filter(report => 
    report.status === 'submitted' || report.status === 'approved'
  );
  
  if (submittedReports.length === 0) {
    // If no submitted reports, find the maximum week number from all reports
    const maxWeek = Math.max(...reports.map(report => report.weekNumber), 0);
    return maxWeek > 0 ? maxWeek + 1 : getWeekNumber(new Date());
  }
  
  // Find the report with the highest week number among submitted reports
  const lastSubmittedReport = submittedReports.reduce((latest, current) => 
    current.weekNumber > latest.weekNumber ? current : latest
  );
  
  let nextWeek = lastSubmittedReport.weekNumber + 1;
  
  // Make sure this week number doesn't conflict with any existing report
  while (reports.some(report => report.weekNumber === nextWeek)) {
    nextWeek++;
  }
  
  return nextWeek;
};

const WeeklyReportDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const folderId  = searchParams.get('folderId');
  const reportType = searchParams.get('type');
  
  // Current week for master report view
  const [currentWeek, setCurrentWeek] = useState(() => getWeekNumber(new Date()));
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "submitted">("all");
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const getCurrentUserId = useCallback(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id || user.userId;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return null;
  }, []);

  // Parallel data fetching with React Query
  const currentUserId = getCurrentUserId();
  const results = useQueries({
    queries: [
      {
        queryKey: ['weeklyReportsMeta', currentUserId, projectId, searchTerm, filterStatus],
        queryFn: () => getWeeklyReportsMeta({
          projectId: projectId || undefined,
          searchTerm,
          status: filterStatus === 'all' ? undefined : filterStatus,
          limit: 50
        }),
        staleTime: 0, // Always fetch fresh data
        refetchOnWindowFocus: true,
      },
      {
        queryKey: ['companyReports', projectId, searchTerm],
        queryFn: () => getCompanyWeeklyReports(1, 50, searchTerm, projectId || undefined),
        staleTime: 5 * 60 * 1000,
        enabled: !!projectId || activeTab === 'company',
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['project', projectId],
        queryFn: () => getProjectById(projectId),
        enabled: !!projectId,
        staleTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
      }
    ]
  });

  const [weeklyReportsQuery, companyReportsQuery, projectQuery] = results;
  
  const weeklyReports = weeklyReportsQuery.data?.data || [];
  const companyReports = companyReportsQuery.data?.data || [];
  const projectDisplayName = Array.isArray(projectQuery.data?.data) 
    ? projectQuery.data.data[0]?.name || ""
    : projectQuery.data?.data?.name || "";

    
  const isLoading = weeklyReportsQuery.isLoading;
  const isLoadingCompany = companyReportsQuery.isLoading;
  
  // Filter reports on client side
  const filteredReports = weeklyReports.filter(report => {
    // Backend already filters by userId, so all reports belong to current user
    // Just filter by project if specified
    if (projectId) {
      const reportProjectId = report.projectId;
      // If report has no projectId, show it (it's the owner's report with no project assigned)
      if (!reportProjectId) return true;
      
      const projectMatch = reportProjectId === projectId || 
             (reportProjectId && reportProjectId.toString() === projectId);
      if (!projectMatch) return false;
    }
    
    // Filter by status
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  });

  const filteredCompanyReports = companyReports.filter(report => {
    // Only show submitted reports in company tab
    if (report.status !== 'submitted' && report.status !== 'approved') {
      return false;
    }
    
    // Filter by project if specified
    if (projectId) {
      const reportProjectId = report.projectId;
      const projectMatch = reportProjectId === projectId || 
             (reportProjectId && reportProjectId.toString() === projectId);
      return projectMatch;
    }
    return true;
  });

  // Handle delete with optimistic updates
  const handleDeleteReport = async (reportId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await deleteWeeklyReport(reportId);
      
      toast({
        title: "Report Deleted",
        description: "The weekly report has been deleted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['weeklyReportsMeta'] });
      queryClient.invalidateQueries({ queryKey: ['companyReports'] });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const handleCreateWeeklyReport = async () => {
    try {
      // Find the most recent submitted report from both personal and company reports
      const personalSubmittedReports = weeklyReports.filter(r => r.status === 'submitted' || r.status === 'approved');
      const companySubmittedReports = filteredCompanyReports.filter(r => r.status === 'submitted' || r.status === 'approved');
      
      // Combine all submitted reports and find the most recent one
      const allSubmittedReports = [...personalSubmittedReports, ...companySubmittedReports];
      
      if (allSubmittedReports.length > 0) {
        // Sort by submittedAt date (most recent first)
        const mostRecentSubmitted = allSubmittedReports.sort((a, b) => 
          new Date(b.submittedAt || b.updatedAt).getTime() - new Date(a.submittedAt || a.updatedAt).getTime()
        )[0];
        
        // Navigate to weekly report with the most recent submitted report ID for data fetching
        const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
        navigate(`/weekly-report?reportId=${mostRecentSubmitted._id || mostRecentSubmitted.id}${projectIdParam}&createNew=true`);
      } else {
        // No submitted reports, create new from scratch
        if (projectId) {
          const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
          navigate(`/weekly-report?${projectIdParam}`);
        } else {
          navigate('/weekly-report');
        }
      }
    } catch (error) {
      console.error("Error handling create weekly report:", error);
      // Fallback to basic navigation
      if (projectId) {
        const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
        navigate(`/weekly-report?${projectIdParam}`);
      } else {
        navigate('/weekly-report');
      }
    }
  };

  const handleOpenReport = (reportId: string) => {
    const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    
    // Check if this is a company report and determine ownership
    const currentUserId = getCurrentUserId();
    const report = activeTab === 'company' 
      ? companyReports.find(r => (r._id || r.id) === reportId)
      : filteredReports.find(r => (r._id || r.id) === reportId);
    
    const isOwner = activeTab === 'personal' || (report?.userId && (report.userId._id === currentUserId || report.userId.id === currentUserId));
    const readOnlyParam = !isOwner ? '&readOnly=true' : '';
    
    navigate(`/weekly-report?reportId=${reportId}${projectIdParam}${readOnlyParam}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-100 text-green-800">Submitted</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  
  const weeklyTotal = weeklyReports.filter(r => r.status === 'submitted').length;
  const lastSubmitted = getLastSubmittedThisMonth(filteredReports, getCurrentUserId());

  // ── Master Report mode ──────────────────────────────────────────────────
  // When ?folderId=xxx&type=master is present, render the folder-level
  // aggregated view using WeeklyReportContent for unified interface
  const { data: masterReportData } = useQuery({
    queryKey: ['masterReport', folderId, currentWeek],
    queryFn: () => getMasterWeeklyReport(folderId!, currentWeek),
    enabled: !!folderId && reportType === 'master',
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (folderId && reportType === 'master') {
    const transformedData = masterReportData?.data 
      ? transformMasterToReportData(masterReportData.data)
      : null;

    // Tab state for master report
    const [masterActiveTab, setMasterActiveTab] = useState<TabType>('table-of-content');
    const [masterShowSecondNav, setMasterShowSecondNav] = useState(false);

    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <HierarchicalSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">
                  Master Weekly Report{transformedData ? `: ${transformedData.metadata.folderName}` : ''}
                </h1>
              </div>
              {/* Week selector for master report */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Week</span>
                <select
                  value={currentWeek}
                  onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
                  className="w-20 h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </header>
            
            {/* Tab Navigation */}
            {transformedData && (
              <>
                <div className="px-6 py-3 border-b bg-background">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button
                      variant={masterActiveTab === "construction-progress" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMasterActiveTab("construction-progress");
                        setMasterShowSecondNav(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                    >
                      Con.Prog
                    </Button>
                    <Button
                      variant={masterActiveTab === "cover" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMasterActiveTab("cover");
                        setMasterShowSecondNav(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                    >
                      Cover
                    </Button>
                    <Button
                      variant={masterActiveTab === "letter" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMasterActiveTab("letter");
                        setMasterShowSecondNav(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                    >
                      Letter
                    </Button>
                    <Button
                      variant={masterActiveTab === "table-of-content" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMasterActiveTab("table-of-content");
                        setMasterShowSecondNav(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                    >
                      Table of Content
                    </Button>
                  </div>
                </div>

                {/* Second Navigation Bar */}
                {masterShowSecondNav && (
                  <div className="w-full px-2 sm:px-4 py-3 sticky top-16 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
                    <div className="relative flex items-center justify-center gap-1">
                      {/* Left Arrow */}
                      <button
                        onClick={() => {
                          const el = document.getElementById("master-second-nav-scroll");
                          if (el) el.scrollBy({ left: -150, behavior: "smooth" });
                        }}
                        className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                      </button>

                      {/* Scrollable Tab Row */}
                      <div
                        id="master-second-nav-scroll"
                        className="flex flex-row items-center justify-center gap-1.5 overflow-x-auto overflow-y-hidden"
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
                        <style>{`#master-second-nav-scroll::-webkit-scrollbar { display: none; }`}</style>
                        {[
                          { id: 1, name: "Intro", tab: "table-of-content" },
                          { id: 2, name: "O.progress", tab: "overall-progress" },
                          { id: 3, name: "Activities", tab: "activities" },
                          { id: 4, name: "QAQC", tab: "qaqc-status" },
                          { id: 5, name: "HSES", tab: "hses" },
                          { id: 6, name: "Resources", tab: "resource" },
                          { id: 7, name: "Photos", tab: "photos" },
                          { id: 8, name: "Issues", tab: "issues" },
                          { id: 9, name: "Schedule", tab: "schedule" },
                        ].map((section) => {
                          const isActiveSection = masterActiveTab === section.tab;
                          return (
                            <Button
                              key={section.id}
                              variant={isActiveSection ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setMasterActiveTab(section.tab as TabType);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
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
                          const el = document.getElementById("master-second-nav-scroll");
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
              </>
            )}
            
            <main className="flex-1 p-6">
              {transformedData ? (
                <>
                  {/* Construction Progress Tab */}
                  {masterActiveTab === "construction-progress" && (() => {
                    const cpEntries = Object.values(transformedData.constructionProgress);
                    if (cpEntries.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-lg border">
                          <p className="text-lg font-medium">No Construction Progress Data</p>
                          <p className="text-sm">No construction progress data available for this week</p>
                        </div>
                      );
                    }
                    const ep = { qty: 0, amount: 0, percentage: 0 };
                    const allItems: ConstructionProgressItem[] = cpEntries.flatMap(
                      (projectData) => projectData.items.map(
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        ({ projectSource: _ps, ...item }: MasterConstructionProgressItem): ConstructionProgressItem => ({
                          ...item,
                          boQ: item.boQ ?? { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 },
                          previousWeek:     item.previousWeek     ?? ep,
                          thisWeek:         item.thisWeek         ?? ep,
                          upToThisWeek:     item.upToThisWeek     ?? ep,
                          remaining:        item.remaining        ?? ep,
                          nextWeekPlan:     item.nextWeekPlan     ?? ep,
                          upToNextWeekPlan: item.upToNextWeekPlan ?? ep,
                        })
                      )
                    );
                    const conProgData: ConstructionProgressData = {
                      projectInfo: {
                        project: transformedData.metadata.folderName,
                        subtitle: `Aggregated from ${transformedData.metadata.projectCount} project${transformedData.metadata.projectCount !== 1 ? 's' : ''}`,
                        date: '',
                        revision: '',
                      },
                      items: allItems,
                    };
                    return (
                      <WeeklyReportConstructionProgress
                        data={conProgData}
                        isCreateNewMode={false}
                      />
                    );
                  })()}

                  {/* Other Tabs - Use WeeklyReportContent */}
                  {masterActiveTab !== "construction-progress" && (
                    <WeeklyReportContent
                      mode="master"
                      masterMetadata={transformedData.metadata}
                      coverData={transformedData.coverData}
                      weeklyActivities={transformedData.weeklyActivities}
                      nextWeekPlan={transformedData.nextWeekPlan}
                      overallProgressData={{ rows: transformedData.overallProgressRows, setRows: () => {}, updateRows: () => {}, addTitleRow: () => {}, addDetailRow: () => {} }}
                      overallProgressRemark={transformedData.overallProgressRemark}
                      resourcesData={transformedData.resourcesData}
                      photosData={{ locations: transformedData.photosLocations }}
                      constructionIssues={transformedData.constructionIssues}
                      activeTab={masterActiveTab}
                      setActiveTab={setMasterActiveTab}
                      setShowSecondNav={() => {}}
                      sharedData={{
                        projectOverview: `Master report for ${transformedData.metadata.folderName} - Week ${transformedData.metadata.weekNumber}`,
                        designNConstruction: `Aggregated data from ${transformedData.metadata.projectCount} projects`
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />

        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Weekly Reports</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search weekly reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <ProfileIcon />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 space-y-6 p-6">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {projectDisplayName ? `${projectDisplayName} Weekly Reports` : 'Weekly Reports'}
              </h2>
              <p className="text-muted-foreground">
                {projectDisplayName 
                  ? `Here's an overview of weekly reports for ${projectDisplayName}.`
                  : 'Here\'s an overview of your weekly reports.'
                }
              </p>
            </div>

            {/* Breadcrumb Navigation */}
            {projectDisplayName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <button 
                  onClick={() => navigate('/weekly-reports')}
                  className="hover:text-foreground transition-colors"
                >
                  Weekly Reports
                </button>
                <span>/</span>
                <span className="text-foreground">{projectDisplayName}</span>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <>
                  <Card><CardContent className="pt-6"><SummaryCardSkeleton /></CardContent></Card>
                  <Card><CardContent className="pt-6"><SummaryCardSkeleton /></CardContent></Card>
                  <Card><CardContent className="pt-6"><SummaryCardSkeleton /></CardContent></Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        This Week
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">
                            Week {getCurrentWeekBasedOnDate(filteredReports)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            {getStatusBadge("not-started")}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Submitted This Month
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getSubmittedReportsThisMonth(filteredReports, getCurrentUserId())}</div>
                      <p className="text-xs text-muted-foreground">
                        Weekly reports submitted this month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Last Submitted
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {lastSubmitted ? new Date(lastSubmitted.submittedAt).toLocaleDateString() : "None"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Most recent submission this month
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Create New Report Button - Show when there are submitted reports (for all users) */}
            {(weeklyReports.filter(r => r.status === 'submitted').length > 0 || filteredCompanyReports.filter(r => r.status === 'submitted' || r.status === 'approved').length > 0) && (
              <div className="mb-6">
                <Button onClick={handleCreateWeeklyReport}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Weekly Report
                </Button>
              </div>
            )}
                        {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'personal'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      My Weekly Reports
                      {filteredReports.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          {filteredReports.length}
                        </span>
                      )}
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('company')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'company'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Weekly Reports
                      {filteredCompanyReports.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          {filteredCompanyReports.length}
                        </span>
                      )}
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Recent Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Documents ({activeTab === 'personal' ? filteredReports.length : filteredCompanyReports.length})
                  </div>
                  {/* Filter Buttons - Only show in Personal tab */}
                  {activeTab === 'personal' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterStatus === 'draft' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('draft')}
                      >
                        Draft
                      </Button>
                      <Button
                        variant={filterStatus === 'submitted' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('submitted')}
                      >
                        Submitted
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTab === 'personal' && (
                  isLoading ? (
                    <WeeklyReportSkeleton />
                  ) : filteredReports.length > 0 ? (
                    <div className="space-y-3">
                      {filteredReports.map((report) => {
                        const currentUserId = getCurrentUserId();
                        const isOwner = true; // In personal tab, user is always owner
                        const userName = report.userId ? `${report.userId.firstName} ${report.userId.lastName}` : 'Unknown';
                        return (
                          <div
                            key={report._id || report.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleOpenReport(report._id || report.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{projectDisplayName}</h4>
                                {getStatusBadge(report.status)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {report.sections?.cover?.dateRange || `${formatDateRange(report.startDate)} - ${formatDateRange(report.endDate)}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(report.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReport(report._id || report.id);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Weekly Report</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete Week {report.weekNumber} report? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={(e) => handleDeleteReport(report._id || report.id, e)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {projectDisplayName 
                          ? `No Reports for ${projectDisplayName}` 
                          : 'No Reports Found'
                        }
                      </h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {projectDisplayName 
                          ? `No weekly reports found for ${projectDisplayName}. Create your first report for this project.` 
                          : 'Create your first weekly report to get started.'
                        }
                      </p>
                      <Button onClick={handleCreateWeeklyReport}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Weekly Report
                      </Button>
                    </div>
                  )
                )}

                {activeTab === 'company' && (
                  isLoadingCompany ? (
                    <WeeklyReportSkeleton />
                  ) : filteredCompanyReports.length > 0 ? (
                    <div className="space-y-3">
                      {filteredCompanyReports.map((report) => {
                        const currentUserId = getCurrentUserId();
                        const isOwner = report.userId && (report.userId._id === currentUserId || report.userId.id === currentUserId);
                        const userName = report.userId ? `${report.userId.firstName} ${report.userId.lastName}` : 'Unknown';
                        return (
                          <div
                            key={report._id || report.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleOpenReport(report._id || report.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{projectDisplayName}</h4>
                                {getStatusBadge(report.status)}
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {userName}
                                </Badge>
                                {!isOwner && (
                                  <Badge variant="secondary" className="text-xs ml-2">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Only
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {report.sections?.cover?.dateRange || `${formatDateRange(report.startDate)} - ${formatDateRange(report.endDate)}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(report.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReport(report._id || report.id);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {projectDisplayName 
                          ? `No Company Reports for ${projectDisplayName}` 
                          : 'No Company Reports Found'
                        }
                      </h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {projectDisplayName
                          ? `No submitted company reports found for ${projectDisplayName}.`
                          : 'No submitted weekly reports from your company yet.'
                        }
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default WeeklyReportDashboard;
