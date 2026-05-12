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
import {
  LayoutDashboard,
  FileText,
  Plus,
  Calendar,
  TrendingUp,
  Clock,
  Loader2,
  Search,
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import ProfileIcon from "@/components/ProfileIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAllUserReports, createNewReport, createBlankReport, getRecentReports, deleteReport, getCompanyReports } from "@/integrations/reportsApi";
import { getProjectById } from "@/integrations/projectsApi";
import { projectEvents } from '@/utils/eventEmitter';

interface Report {
  _id: string;
  projectId?: string;
  projectName: string;
  folderId?: string;
  folderName?: string;
  reportDate: string;
  status: "draft" | "submitted";
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Google Docs-style: Show if recently edited
  isRecentlyEdited?: boolean;
  // ADD USER INFO
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const folderId = searchParams.get('folder');
  const folderName = searchParams.get('folderName');
  const [companyReports, setCompanyReports] = useState([]);
  const [filteredCompanyReports, setFilteredCompanyReports] = useState([]); // ← ADD THIS
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "submitted">("all");
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal');
  const [currentProjectName, setCurrentProjectName] = useState<string>("");

  // Helper function for unified project matching
  const matchesProject = (report: Report, projectId: string | null, projectName: string) => {
    if (!projectId && !projectName) return true; // No filter, show all
    
    // Match by projectId (most reliable, for new reports)
    if (projectId && report.projectId === projectId) return true;
    
    // Match by projectName (fallback for old reports OR reports where projectId wasn't saved)
    if (projectName && report.projectName === projectName) return true;
    
    return false;
  };

  // Fetch current project name when projectId changes (to handle renamed projects)
  useEffect(() => {
    const fetchProjectName = async () => {
      if (projectId) {
        const response = await getProjectById(projectId);
        if (response.success && response.data && !Array.isArray(response.data)) {
          setCurrentProjectName(response.data.name);
        } else {
          setCurrentProjectName("");
        }
      } else {
        setCurrentProjectName("");
      }
    };

    fetchProjectName();
  }, [projectId]);

  useEffect(() => {
    const handleProjectUpdated = async ({ projectId: updatedId, newName }: any) => {
      if (updatedId === projectId) {
        setCurrentProjectName(newName);
        // Also refresh reports since their projectName may have been updated server-side
        const userReports = await getRecentReports(50, undefined, projectId || undefined);
        setReports(userReports.data || []);
      }
    };
    
    projectEvents.on('projectUpdated', handleProjectUpdated);
    return () => {
      projectEvents.off('projectUpdated', handleProjectUpdated);
    };
  }, [projectId]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
       
        
        // Use new getRecentReports API - fetch reports with projectId filter if available
        const userReports = await getRecentReports(50, undefined, projectId || undefined);
        
        
        
        setReports(userReports.data || []);
        setFilteredReports(userReports.data || []);
      } catch (error) {
        console.error("❌ DEBUG DASHBOARD: Failed to fetch reports:", error);
        toast({
          title: "Error",
          description: "Failed to load your reports",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [toast, projectId]);

  // Filter reports based on search query and status
  useEffect(() => {
    let filtered = reports;

    // Filter by project - unified logic
    if (projectId || currentProjectName) {
      filtered = filtered.filter(report => matchesProject(report, projectId, currentProjectName));
    }

    // Filter by folder if specified
    if (folderId) {
      filtered = filtered.filter(report => report.folderId === folderId);
    }

    // Filter by status (case-insensitive)
    if (filterStatus !== "all") {
      filtered = filtered.filter(report => report.status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => 
        report.projectName.toLowerCase().includes(query) ||
        new Date(report.reportDate).toLocaleDateString().toLowerCase().includes(query) ||
        report.status.toLowerCase().includes(query)
      );
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery, filterStatus, projectId, currentProjectName, folderId]);

  useEffect(() => {
    // Always fetch company reports when there's a projectId
    if (projectId) {
      fetchCompanyReports();
    } else if (activeTab === 'company') {
      // Also fetch when switching to company tab without projectId
      fetchCompanyReports();
    }
  }, [activeTab, projectId]);

  // Filter company reports based on search query, status, and folder
  useEffect(() => {
    let filtered = companyReports;

    // Filter by project - unified logic
    if (projectId || currentProjectName) {
      filtered = filtered.filter(report => matchesProject(report, projectId, currentProjectName));
    }

    // Filter by folder if specified
    if (folderId) {
      filtered = filtered.filter(report => report.folderId === folderId);
    }

    // Filter by status (case-insensitive)
    if (filterStatus !== "all") {
      filtered = filtered.filter(report => report.status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => 
        report.projectName.toLowerCase().includes(query) ||
        report.folderName?.toLowerCase().includes(query) ||
        new Date(report.reportDate).toLocaleDateString().toLowerCase().includes(query) ||
        report.status.toLowerCase().includes(query)
      );
    }

    setFilteredCompanyReports(filtered);
  }, [companyReports, searchQuery, filterStatus, projectId, currentProjectName, folderId]);

  // Helper function to get current user ID from user context
  // No localStorage needed - user info comes from authentication context
  const getCurrentUserId = () => {
    // const token = localStorage.getItem('authToken');
    // if (token) {
    // Get user ID from authenticated user context or profile
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        // const payload = JSON.parse(atob(token.split('.')[1]));
        // return payload.userId;
        const user = JSON.parse(userStr);
        return user.id || user.userId;
      } catch (error) {
        console.error('Error parsing user data:', error);
        //  console.error('Error parsing token:', error);
      }
    }
    return null;
  };

  const fetchCompanyReports = async (
    page: number = 1,
    search: string = ""
  ) => {
    try {
      setIsLoadingCompany(true);
      // ADD PROJECT FILTER - Pass both project name (for display) and projectId (for reliable lookup)
      const response = await getCompanyReports(page, 20, search, currentProjectName, projectId || undefined);
      setCompanyReports(response.reports || []);
    } catch (error) {
      console.error("Failed to fetch company reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch company reports",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      if (projectId) {
        // Navigate to daily report with projectId only
        let url = `/daily-report?projectId=${encodeURIComponent(projectId)}`;
        if (folderId) {
          url += `&folder=${encodeURIComponent(folderId)}&folderName=${encodeURIComponent(folderName || '')}`;
        }
        navigate(url);
      } else {
        // Navigate to projects overview to select/create a project
        navigate('/daily-report-projects');
      }
    } catch (error: any) {
      console.error("🚀 DASHBOARD: Error navigating to report:", error);      toast({
        title: "Error",
        description: "Failed to navigate to report creation",
        variant: "destructive",
      });
    }
  };

  const handleOpenReport = (reportId: string) => {
    const projectIdParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    const folderParam = folderId ? `&folder=${encodeURIComponent(folderId)}&folderName=${encodeURIComponent(folderName || '')}` : '';
    navigate(`/daily-report?reportId=${reportId}${projectIdParam}${folderParam}`);
  };

  const handleDeleteReport = async (reportId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    
    console.log("🔥 DASHBOARD: handleDeleteReport called with reportId:", reportId);
    
    try {
      console.log("🔥 DASHBOARD: Calling deleteReport API...");
      await deleteReport(reportId);
      console.log("🔥 DASHBOARD: deleteReport API success!");
      
      toast({
        title: "Report Deleted",
        description: "The report has been deleted successfully",
      });
      
      // Refresh the reports list
      console.log("🔥 DASHBOARD: Refreshing reports list...");
      const userReports = await getRecentReports(50, undefined, projectId || undefined);
      setReports(userReports.data || []);
      setFilteredReports(userReports.data || []);
      // Always refresh company reports to keep counts in sync
      await fetchCompanyReports();
      console.log("🔥 DASHBOARD: Reports list refreshed");
    } catch (error) {
      console.error("🔥 DASHBOARD: Delete error:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  // 🚀 NEW: Get weekly total reports
  const getWeeklyTotal = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const reportsToCheck = activeTab === 'personal' ? reports : companyReports;
    
    return reportsToCheck.filter(report => 
      matchesProject(report, projectId, currentProjectName) &&
      new Date(report.reportDate) >= oneWeekAgo &&
      report.status === "submitted"
    ).length;
  };

  // 🚀 NEW: Get today's report status
  const getTodayReportStatus = () => {
    const today = new Date().toDateString();
    const reportsToCheck = activeTab === 'personal' ? reports : companyReports;
      
    const todayReport = reportsToCheck.find(report => 
      matchesProject(report, projectId, currentProjectName) && 
      new Date(report.reportDate).toDateString() === today
    );
      
    return todayReport?.status || null;
  };

  // 🚀 NEW: Get last submitted report
  const getLastSubmitted = () => {
    const reportsToCheck = activeTab === 'personal' ? reports : companyReports;
    
    const submittedReports = reportsToCheck.filter(report => 
      matchesProject(report, projectId, currentProjectName) && 
      report.status === "submitted"
    );
    
    if (submittedReports.length === 0) return null;
    return submittedReports.reduce((latest, report) => 
      new Date(report.submittedAt || report.updatedAt) > new Date(latest.submittedAt || latest.updatedAt) ? report : latest
    );
  };

  const formatLastUpdated = (updatedAt: string) => {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return updated.toLocaleDateString();
};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="default" className="bg-green-500">Submitted</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <HierarchicalSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const weeklyTotal = getWeeklyTotal();
  const lastSubmitted = getLastSubmitted();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />

        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                {currentProjectName || currentProjectName 
                  ? folderName
                    ? <span className="flex items-center gap-2">📁 {folderName} / {currentProjectName || currentProjectName}</span>
                    : `${currentProjectName || currentProjectName} Reports`
                  : 'Welcome back!'}
              </h2>
              <p className="text-muted-foreground">
                {(currentProjectName || currentProjectName)
                  ? folderName
                    ? `Reports for "${currentProjectName || currentProjectName}" project in "${folderName}" folder.`
                    : `Here's an overview of reports for ${currentProjectName || currentProjectName}.`
                  : folderName
                    ? `Reports in "${folderName}" folder.`
                    : 'Here\'s an overview of your daily reports.'
                }
              </p>
            </div>

            {/* Create New Report Button - Hide when no reports */}
            {(activeTab === 'personal' ? filteredReports.length : filteredCompanyReports.length) > 0 && (
              <div className="mb-6">
                <Button onClick={handleCreateReport}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Report
                </Button>
              </div>
            )}

            {/* Breadcrumb Navigation */}
            {currentProjectName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="hover:text-foreground transition-colors"
                >
                  Dashboard
                </button>
                {folderName && (
                  <>
                    <span>/</span>
                    <button
                      onClick={() => navigate(`/dashboard?folder=${encodeURIComponent(folderId || '')}&folderName=${encodeURIComponent(folderName)}`)}
                      className="hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <span>📁</span>
                      {folderName}
                    </button>
                  </>
                )}
                <span>/</span>
                <span className="text-foreground">{currentProjectName || currentProjectName}</span>
              </div>
            )}

            {/* Summary Cards */}
            {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today's Report
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {new Date().toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        {getStatusBadge(getTodayReportStatus() || "not-started")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    This Week
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{weeklyTotal}</div>
                  <p className="text-xs text-muted-foreground">
                    Reports submitted
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
                    {lastSubmitted ? new Date(lastSubmitted.submittedAt || lastSubmitted.updatedAt).toLocaleDateString() : "None"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Most recent submission
                  </p>
                </CardContent>
              </Card>
            </div> */}
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
                      My Reports
                      {reports.length > 0 && (
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
                      Project Reports
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {companyReports.length}
                      </span>
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
                        variant={filterStatus === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("all")}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterStatus === "draft" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("draft")}
                      >
                        Draft
                      </Button>
                      <Button
                        variant={filterStatus === "submitted" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("submitted")}
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
                    {(activeTab === 'personal' ? filteredReports : filteredCompanyReports).map((report) => (
                      <div
                        key={report._id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleOpenReport(report._id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{currentProjectName || report.projectName}</h4>
                            {report.folderName && !folderId && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <span>📁</span>
                                {report.folderName}
                              </Badge>
                            )}
                            {getStatusBadge(report.status)}
                            {new Date(report.updatedAt).getTime() > Date.now() - 5 * 60 * 1000 && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                Recently edited
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(report.reportDate).toLocaleDateString()}
                            </span>
                            {/* User Info - Only show in Company tab */}
                            {activeTab === 'company' && report.userId && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {(() => {
                                  const currentUserId = getCurrentUserId();
                                  const isCurrentUser = report.userId._id === currentUserId || report.userId === currentUserId;
                                  
                                  return isCurrentUser ? 'You' : `${report.userId.firstName} ${report.userId.lastName}`;
                                })()}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatLastUpdated(report.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Check if current user is the owner */}
                          {(() => {
                            const currentUserId = getCurrentUserId();
                            
                            // For "My Reports" tab, assume ownership (since these are user's own reports)
                            // For "Project Reports" tab, check actual ownership
                            const isOwner = activeTab === 'personal' || report.userId?._id === currentUserId || report.userId === currentUserId;
                            
                            return (
                              <>
                                {/* Edit/Open Button - Only for owners */}
                                {isOwner && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenReport(report._id);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                
                                {/* Delete Button - Only for owners */}
                                {isOwner && (
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
                                        <AlertDialogTitle>
                                          Are you sure you want to delete this report?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action will permanently delete the report "{report.projectName}" and all its data. This cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={(e) => {
                                            console.log("🔥 ALERT ACTION: Clicked! report._id:", report._id);
                                            handleDeleteReport(report._id, e);
                                          }}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete Report
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}

                                {/* View Button for non-owners in Project Reports only */}
                                {!isOwner && activeTab === 'company' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenReport(report._id);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {currentProjectName 
                        ? `No Reports for ${currentProjectName}` 
                        : 'No Reports Found'
                      }
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {currentProjectName 
                        ? `No reports found for ${currentProjectName}. Create your first report for this project.`
                        : 'Create your first report to get started.'
                      }
                    </p>
                    <Button onClick={handleCreateReport}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Report
                    </Button>
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

export default Dashboard;
