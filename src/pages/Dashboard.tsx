import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Settings,
  LayoutDashboard,
  FileText,
  LogOut,
  Plus,
  Calendar,
  TrendingUp,
  Clock,
  Loader2,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import { getAllUserReports, createNewReport, createBlankReport, getRecentReports } from "@/integrations/reportsApi";

interface Report {
  _id: string;
  projectName: string;
  reportDate: string;
  status: "draft" | "submitted";
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Google Docs-style: Show if recently edited
  isRecentlyEdited?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "submitted">("all");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Use new getRecentReports API - sorted by updatedAt automatically
        const userReports = await getRecentReports(50, filterStatus === "all" ? undefined : filterStatus);
        setReports(userReports.data || []);
        setFilteredReports(userReports.data || []);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
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
  }, [toast, filterStatus]);

  // Filter reports based on search query and status
  useEffect(() => {
    let filtered = reports;

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter(report => report.status === filterStatus);
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
  }, [reports, searchQuery, filterStatus]);

  const handleCreateReport = async () => {
    try {
      console.log("🚀 DASHBOARD: Creating new blank report (Google Docs style)");
      const result = await createBlankReport("Untitled Report");
      
      if (result.success && result.data) {
        console.log("🚀 DASHBOARD: Blank report created with ID:", result.data._id);
        // Navigate to the new report with its unique ID
        navigate(`/daily-report?reportId=${result.data._id}`);
        
        toast({
          title: "New Report Created",
          description: "Your blank report is ready. Start typing to begin!",
        });
      } else {
        throw new Error("Failed to create report");
      }
    } catch (error: any) {
      console.error("🚀 DASHBOARD: Error creating report:", error);
      toast({
        title: "Error",
        description: "Failed to create new report",
        variant: "destructive",
      });
    }
  };

  const handleOpenReport = (reportId: string) => {
    navigate(`/daily-report?reportId=${reportId}`);
  };

  const getWeeklyTotal = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return reports.filter(report => 
      new Date(report.reportDate) >= oneWeekAgo &&
      report.status === "submitted"
    ).length;
  };

  const getLastSubmitted = () => {
    const submittedReports = reports.filter(report => report.status === "submitted");
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

  // Notification handlers
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  // Initialize some sample notifications
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        title: 'Report Reminder',
        message: 'Don\'t forget to submit your daily report for today',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false,
      },
      {
        id: '2',
        title: 'Report Submitted',
        message: 'Your report for yesterday has been successfully submitted',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        read: true,
      },
    ];
    setNotifications(sampleNotifications);
  }, []);

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border">
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <span className="font-semibold">Daily Report</span>
              </div>
            </SidebarHeader>
          </Sidebar>
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
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span className="font-semibold">Daily Report</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive>
                      <Link to="/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleCreateReport}>
                      <Plus className="h-4 w-4" />
                      <span>New Report</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/daily-report">
                        <FileText className="h-4 w-4" />
                        <span>Daily Report</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <LogoutButton />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

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
              
              <NotificationsDropdown
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDeleteNotification}
                onClearAll={handleClearAllNotifications}
              />
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <span className="text-sm font-medium">U</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 space-y-6 p-6">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
              <p className="text-muted-foreground">
                Here's an overview of your daily reports.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                      <p className="text-xs text-muted-foreground">
                        Status: {getStatusBadge("not-started")}
                      </p>
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
            </div>

            {/* Recent Documents */}
            {filteredReports.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Recent Documents ({filteredReports.length})
                    </div>
                    {/* Filter Buttons */}
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
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredReports.map((report) => (
                      <div
                        key={report._id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleOpenReport(report._id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{report.projectName}</h4>
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
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatLastUpdated(report.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
