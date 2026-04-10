import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import { Button } from "@/components/ui/button";
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
import { getWeeklyReports, getCompanyWeeklyReports, deleteWeeklyReport } from "@/services/weeklyReportService";
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
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  
    const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<WeeklyReport[]>([]);
  const [companyReports, setCompanyReports] = useState<WeeklyReport[]>([]);
  const [filteredCompanyReports, setFilteredCompanyReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "submitted">("all");
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [projectDisplayName, setProjectDisplayName] = useState<string>("");

  // Load weekly reports from API (personal reports - all statuses)
  useEffect(() => {
    const loadWeeklyReports = async () => {
      try {
        setIsLoading(true);
        
        const params: any = {};
        if (projectId) {
          params.projectId = projectId;
        }
        
        const response = await getWeeklyReports(params);
        
                if (response.success && response.data) {
          setWeeklyReports(response.data);
        } else {
          console.error("Failed to load weekly reports:", response.error);
          toast({
            title: "Error",
            description: response.error || "Failed to load weekly reports",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to load weekly reports:", error);
        toast({
          title: "Error",
          description: "Failed to load weekly reports",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWeeklyReports();
  }, [projectId, toast]);

  // Fetch company reports when switching to company tab or when project filter changes
  useEffect(() => {
    const fetchCompanyReports = async () => {
      try {
        setIsLoadingCompany(true);
        const response = await getCompanyWeeklyReports(
          1,                    // page parameter
          20,                   // limit parameter  
          searchTerm,            // search parameter
          projectId || undefined // projectFilter parameter (using projectId)
        );
        
        if (response.success && response.data) {
          setCompanyReports(response.data);
        } else {
          console.error("Failed to load company weekly reports:", response.error);
          toast({
            title: "Error",
            description: response.error || "Failed to load company weekly reports",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to load company weekly reports:", error);
        toast({
          title: "Error",
          description: "Failed to load company weekly reports",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCompany(false);
      }
    };

    // Always fetch company reports when there's a projectId
    if (projectId) {
      fetchCompanyReports();
    } else if (activeTab === 'company') {
      // Also fetch when switching to company tab without project filter
      fetchCompanyReports();
    }
  }, [activeTab, projectId, toast]);

  // Fetch project display name using projectId
  useEffect(() => {
    const fetchProjectName = async () => {
      if (projectId) {
        try {
          const response = await getProjectById(projectId);
          if (response.success && response.data && !Array.isArray(response.data)) {
            setProjectDisplayName(response.data.name);
          }
        } catch (error) {
          console.error('Failed to fetch project name:', error);
        }
      } else {
        setProjectDisplayName("");
      }
    };
    
    fetchProjectName();
  }, [projectId]);

  // Filter personal reports based on search term and status
  useEffect(() => {
    let filtered = weeklyReports;
    const currentUserId = getCurrentUserId();

    
    
    // Filter by projectId if specified
    if (projectId) {
      filtered = filtered.filter(report => {
        // Handle both string and ObjectId formats
        const reportProjectId = report.projectId;
        return reportProjectId === projectId || 
               (reportProjectId && reportProjectId.toString() === projectId);
      });
    }

    // Show all reports for the project (both draft and submitted)
    // Remove userId-based filtering to show all project reports regardless of owner

    // Filter by status (case-insensitive) - only apply to user's own reports
    if (filterStatus !== "all") {
      filtered = filtered.filter(report => {
        // Only apply status filter to user's own reports
        const isOwner = report.userId && (
          typeof report.userId === 'string' 
            ? report.userId === currentUserId
            : report.userId._id === currentUserId || report.userId.id === currentUserId
        );
        if (!isOwner) return true; // Don't filter other users' reports by status
        
        return report.status.toLowerCase() === filterStatus.toLowerCase();
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(report => {
        const weekStr = report.weekNumber.toString();
        const dateRange = `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`;
        const projectName = report.projectName || '';
        
        return (
          weekStr.toLowerCase().includes(query) ||
          dateRange.toLowerCase().includes(query) ||
          projectName.toLowerCase().includes(query) ||
          report.status.toLowerCase().includes(query)
        );
      });
    }

    setFilteredReports(filtered);
  }, [weeklyReports, searchTerm, filterStatus, projectId]);

  // Filter company reports based on search term
  useEffect(() => {
    let filtered = companyReports;
    const currentUserId = getCurrentUserId();

    // Filter by projectId if specified
    if (projectId) {
      filtered = filtered.filter(report => {
        // Handle both string and ObjectId formats
        const reportProjectId = report.projectId;
        return reportProjectId === projectId || 
               (reportProjectId && reportProjectId.toString() === projectId);
      });
    }

    // Company reports: Only show submitted reports (no draft reports)
    filtered = filtered.filter(report => {
      return report.status === 'submitted' || report.status === 'approved';
    });

    // Filter by search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(report => {
        const weekStr = report.weekNumber.toString();
        const dateRange = `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`;
        const projectName = report.projectName || '';
        const userName = report.userId ? `${report.userId.firstName} ${report.userId.lastName}`.toLowerCase() : '';
        
        return (
          weekStr.toLowerCase().includes(query) ||
          dateRange.toLowerCase().includes(query) ||
          projectName.toLowerCase().includes(query) ||
          userName.includes(query)
        );
      });
    }

    setFilteredCompanyReports(filtered);
  }, [companyReports, searchTerm, projectId]);

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

  const getCurrentUserId = () => {
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
  };

  const handleDeleteReport = async (reportId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await deleteWeeklyReport(reportId);
      
      toast({
        title: "Report Deleted",
        description: "The weekly report has been deleted successfully",
      });
      
      // Refresh reports
      const params: any = {};
      if (projectId) {
        params.projectId = projectId;
      }
      const response = await getWeeklyReports(params);
      if (response.success && response.data) {
        setWeeklyReports(response.data);
      }
      
      // Refresh company reports if on company tab
      if (activeTab === 'company') {
        const companyResponse = await getCompanyWeeklyReports(1, 20, searchTerm, projectId || undefined);
        if (companyResponse.success && companyResponse.data) {
          setCompanyReports(companyResponse.data);
        }
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const weeklyTotal = weeklyReports.filter(r => r.status === 'submitted').length;
  const lastSubmitted = getLastSubmittedThisMonth(filteredReports, getCurrentUserId());

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
                {(activeTab === 'personal' ? filteredReports.length : filteredCompanyReports.length) > 0 ? (
                  <div className="space-y-3">
                    {(activeTab === 'personal' ? filteredReports : filteredCompanyReports).map((report) => {
                      const currentUserId = getCurrentUserId();
                      const isOwner = activeTab === 'personal' || (report.userId && (report.userId._id === currentUserId || report.userId.id === currentUserId));
                      const userName = report.userId ? `${report.userId.firstName} ${report.userId.lastName}` : 'Unknown';
                      const startRaw = report.reportDateFrom || report.startDate;
                      const endRaw = report.reportDateTo || report.endDate;
                      console.log('Raw start:', startRaw, 'Type:', typeof startRaw);
                      console.log('Raw end:', endRaw, 'Type:', typeof endRaw);

                      // Test different parsing methods
                      console.log('new Date(startRaw):', new Date(startRaw));
                      console.log('new Date(startRaw).getDate():', new Date(startRaw)?.getDate());
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
                              {/* User Info - Only show in Company tab */}
                              {activeTab === 'company' && (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {userName}
                                </Badge>
                              )}
                              {/* View-only indicator for company reports */}
                              {activeTab === 'company' && !isOwner && (
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
                            {/* Edit/Open Button - Only for owners */}
                            {isOwner && (
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
                            )}
                            
                            {/* View-only mode for non-owners in Company tab */}
                            {!isOwner && activeTab === 'company' && (
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
                            )}
                            
                            {/* Delete Button - Only for owners in Personal tab */}
                            {isOwner && activeTab === 'personal' && (
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
                            )}

                            {/* View Button for non-owners in Company tab */}
                            {!isOwner && activeTab === 'company' && (
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
                            )}
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
                      {activeTab === 'personal'
                        ? (projectDisplayName 
                            ? `No weekly reports found for ${projectDisplayName}. Create your first report for this project.`
                            : 'Create your first weekly report to get started.')
                        : (projectDisplayName
                            ? `No submitted company reports found for ${projectDisplayName}.`
                            : 'No submitted weekly reports from your company yet.')
                      }
                    </p>
                    {/* Show create button for all users when there are submitted reports in company */}
                    {(activeTab === 'personal' || filteredCompanyReports.filter(r => r.status === 'submitted' || r.status === 'approved').length > 0) && (
                      <Button onClick={handleCreateWeeklyReport}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Weekly Report
                      </Button>
                    )}
                  </div>
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
