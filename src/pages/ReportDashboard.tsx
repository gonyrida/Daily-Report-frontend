import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { 
  Calendar, 
  FileText, 
  BarChart3,
  Plus,
  ChevronRight,
  FolderOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileIcon from "@/components/ProfileIcon";
import { getAllUserReports } from "@/integrations/reportsApi";
import { getFoldersWithProjects } from "@/integrations/foldersApi"; // 🚀 Use folders instead of projects

interface ReportType {
  name: string;
  icon: React.ReactNode;
  description: string;
  path: string;
  count: number;
  folderCount?: number;
  lastReportDate?: string;
}

const ReportDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // 🚨 DEBUG: Confirm ReportDashboard is mounting
  console.log('🚨 REPORT DASHBOARD: Component mounting!');

  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // 🚨 DEBUG: Confirm useEffect is running
    console.log('🚨 REPORT DASHBOARD: useEffect running!');
    
    const fetchReportData = async () => {
      console.log('🚨 REPORT DASHBOARD: Starting fetchReportData!');
      try {
        setLoading(true);
        const response = await getAllUserReports();
        const allReports = Array.isArray(response) ? response : response.data || [];

        // 🚨 DEBUG: Check what we got
        console.log('🚨 REPORT DASHBOARD: Raw allReports:', allReports);
        console.log('🚨 REPORT DASHBOARD: allReports.length:', allReports.length);
        
        // Group reports by type (currently only daily reports exist)
        const dailyReports = allReports.filter((report: any) => 
          report.reportDate // Daily reports have reportDate
        );

        // 🚨 DEBUG: Check daily reports
        console.log('🚨 REPORT DASHBOARD: dailyReports:', dailyReports);
        console.log('🚨 REPORT DASHBOARD: dailyReports.length:', dailyReports.length);

        // 🚀 NEW: Fetch all folders with projects
        const foldersResponse = await getFoldersWithProjects();
        const allFolders = Array.isArray(foldersResponse.data) ? foldersResponse.data : [];
        const rootProjects = foldersResponse.rootProjects || [];
        const folderCount = allFolders.length;
        const totalProjects = allFolders.reduce((acc, folder) => acc + (folder.projects?.length || 0), 0) + rootProjects.length;
        // 🚨 DEBUG: Check folders
        console.log('🚨 REPORT DASHBOARD: All folders:', allFolders);
        console.log('🚨 REPORT DASHBOARD: Folder count:', folderCount);
        console.log('🚨 REPORT DASHBOARD: Total projects:', totalProjects);
        
        const weeklyReports = allReports.filter((report: any) => 
          report.weekNumber // Weekly reports would have weekNumber
        );
        
        const monthlyReports = allReports.filter((report: any) => 
          report.month // Monthly reports would have month
        );
        
        const reportTypesData: ReportType[] = [
          {
            name: "Daily Report",
            icon: <Calendar className="h-6 w-6" />,
            description: `Create and manage daily reports (${folderCount} folders, ${totalProjects} projects)`,
            path: "/daily-report-projects",
            count: totalProjects,
            folderCount: folderCount,
            lastReportDate: dailyReports.length > 0 
              ? Math.max(...dailyReports.map((r: any) => new Date(r.reportDate).getTime()))
                ? new Date(Math.max(...dailyReports.map((r: any) => new Date(r.reportDate).getTime()))).toISOString()
                : undefined
              : undefined
          },
          {
            name: "Weekly Report", 
            icon: <BarChart3 className="h-6 w-6" />,
            description: `Weekly summaries and project's progress (${folderCount} folders)`,
            path: "/weekly-report-projects",
            count: weeklyReports.length,
            folderCount: folderCount,
            lastReportDate: weeklyReports.length > 0 
              ? weeklyReports[0]?.reportDate
              : undefined
          },
          {
            name: "Monthly Report",
            icon: <FileText className="h-6 w-6" />,
            description: "Monthly comprehensive reports",
            path: "/monthly-report", 
            count: monthlyReports.length,
            lastReportDate: monthlyReports.length > 0 
              ? monthlyReports[0]?.reportDate
              : undefined
          }
        ];
        
        setReportTypes(reportTypesData);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
        toast({
          title: "Error",
          description: "Failed to load report data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const handleReportTypeClick = (path: string) => {
    navigate(path);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <HierarchicalSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-muted-foreground">Loading report types...</div>
            </div>
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
              <h1 className="text-lg font-semibold">Reports</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <ProfileIcon />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 space-y-6 p-6">
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
                <p className="text-muted-foreground">
                  Create and manage your project reports
                </p>
              </div>

              {/* Report Types Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {reportTypes.map((reportType) => (
                  <Card 
                    key={reportType.name}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                    onClick={() => handleReportTypeClick(reportType.path)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            {reportType.icon}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{reportType.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {reportType.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            {reportType.name === "Weekly Report" ? "Total Folder" : "Total Projects"}
                          </span>
                          <Badge variant="secondary" className="font-semibold">
                            {reportType.name === "Weekly Report" ? reportType.folderCount ?? 0 : reportType.count}
                          </Badge>
                        </div>
                        
                        {/* {reportType.lastReportDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Report</span>
                            <span className="text-sm font-medium">
                              {formatDate(reportType.lastReportDate)}
                            </span>
                          </div>
                        )} */}
                        
                        <div className="pt-2">
                          <Button 
                            variant="outline" 
                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReportTypeClick(reportType.path);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Open {reportType.name}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              {/* <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => navigate('/daily-report')}
                    >
                      <Calendar className="h-8 w-8" />
                      <span>Create Daily Report</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      disabled
                    >
                      <BarChart3 className="h-8 w-8" />
                      <span>Create Weekly Report</span>
                      <span className="text-xs text-muted-foreground">Coming Soon</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      disabled
                    >
                      <FileText className="h-8 w-8" />
                      <span>Create Monthly Report</span>
                      <span className="text-xs text-muted-foreground">Coming Soon</span>
                    </Button>
                  </div>
                </CardContent>
              </Card> */}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ReportDashboard;
