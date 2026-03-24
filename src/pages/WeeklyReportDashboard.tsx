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
import { getWeeklyReports } from "@/services/weeklyReportService";
import type { WeeklyReport } from "@/types/weeklyReport.types";

// Helper function to get the ISO week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper function to count submitted reports this month
const getSubmittedReportsThisMonth = (reports: WeeklyReport[]): number => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  return reports.filter(report => {
    const reportDate = new Date(report.createdAt || report.startDate);
    return (
      (report.status === 'submitted' || report.status === 'approved') &&
      reportDate.getMonth() === currentMonth &&
      reportDate.getFullYear() === currentYear
    );
  }).length;
};

// Helper function to get last submitted report this month
const getLastSubmittedThisMonth = (reports: WeeklyReport[]): WeeklyReport | null => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const submittedThisMonth = reports.filter(report => {
    const reportDate = new Date(report.createdAt || report.startDate);
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
  const projectFilter = searchParams.get('project');
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal');

  // Load weekly reports from API
  useEffect(() => {
    const loadWeeklyReports = async () => {
      try {
        setIsLoading(true);
        
        const params: any = {};
        if (projectFilter) {
          params.projectName = projectFilter;
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
  }, [projectFilter, toast]);

  // Filter reports based on search term
  useEffect(() => {
    const filtered = weeklyReports.filter(report => {
      const weekStr = report.weekNumber.toString();
      const dateRange = `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`;
      const projectName = report.projectName || '';
      
      return (
        weekStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dateRange.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    setFilteredReports(filtered);
  }, [weeklyReports, searchTerm]);

  const handleCreateWeeklyReport = () => {
    if (projectFilter) {
      navigate(`/weekly-report?project=${encodeURIComponent(projectFilter)}`);
    } else {
      navigate('/weekly-report');
    }
  };

  const handleOpenReport = (reportId: string) => {
    const projectParam = projectFilter ? `&project=${encodeURIComponent(projectFilter)}` : '';
    navigate(`/weekly-report?reportId=${reportId}${projectParam}`);
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
  const lastSubmitted = getLastSubmittedThisMonth(filteredReports);

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
                {projectFilter ? `${projectFilter} Weekly Reports` : 'Weekly Reports'}
              </h2>
              <p className="text-muted-foreground">
                {projectFilter 
                  ? `Here's an overview of weekly reports for ${projectFilter}.`
                  : 'Here\'s an overview of your weekly reports.'
                }
              </p>
            </div>

            {/* Breadcrumb Navigation */}
            {projectFilter && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <button 
                  onClick={() => navigate('/weekly-reports')}
                  className="hover:text-foreground transition-colors"
                >
                  Weekly Reports
                </button>
                <span>/</span>
                <span className="text-foreground">{projectFilter}</span>
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
                  <div className="text-2xl font-bold">{getSubmittedReportsThisMonth(filteredReports)}</div>
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

            {/* Create New Report Button - Hide when no reports */}
            {filteredReports.length > 0 && (
              <div className="mb-6">
                <Button onClick={handleCreateWeeklyReport}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Weekly Report
                </Button>
              </div>
            )}
            {/* Implementation Notice Banner */}
            <div className="bg-red-500 text-white px-4 py-3 rounded-lg text-center font-semibold mb-6">
              This page is still implement
            </div>
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
                      {weeklyReports.length > 0 && (
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
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading weekly reports...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No weekly reports found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? "Try adjusting your search terms" : "Create your first weekly report to get started"}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleCreateWeeklyReport}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Weekly Report
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <Card key={report._id || report.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenReport(report._id || report.id)}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">Week {report.weekNumber}</h3>
                              {getStatusBadge(report.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last updated: {new Date(report.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default WeeklyReportDashboard;
