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

interface ReportType {
  name: string;
  icon: React.ReactNode;
  description: string;
  path: string;
  count: number;
  lastReportDate?: string;
}

const ReportDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const response = await getAllUserReports();
        const allReports = response.data || [];
        
        // Group reports by type (currently only daily reports exist)
        const dailyReports = allReports.filter((report: any) => 
          report.reportDate // Daily reports have reportDate
        );
        
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
            description: "Create and manage daily project reports",
            path: "/daily-report",
            count: dailyReports.length,
            lastReportDate: dailyReports.length > 0 
              ? Math.max(...dailyReports.map((r: any) => new Date(r.reportDate).getTime()))
                ? new Date(Math.max(...dailyReports.map((r: any) => new Date(r.reportDate).getTime()))).toISOString()
                : undefined
              : undefined
          },
          {
            name: "Weekly Report", 
            icon: <BarChart3 className="h-6 w-6" />,
            description: "Weekly summaries and progress reports",
            path: "/weekly-report",
            count: weeklyReports.length,
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
  }, [toast]);

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
                            Total Reports
                          </span>
                          <Badge variant="secondary" className="font-semibold">
                            {reportType.count}
                          </Badge>
                        </div>
                        
                        {reportType.lastReportDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Report</span>
                            <span className="text-sm font-medium">
                              {formatDate(reportType.lastReportDate)}
                            </span>
                          </div>
                        )}
                        
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
              <Card>
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
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ReportDashboard;
