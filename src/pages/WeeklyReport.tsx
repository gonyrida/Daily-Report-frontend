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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Calendar,
  TrendingUp,
  Clock,
  Loader2,
  Search,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText as FilePdf,
  ArrowLeft,
  Eye,
  Edit3,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import ProfileIcon from "@/components/ProfileIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { exportWeeklyToPDF } from "@/lib/weeklyExportUtils";

interface WeeklyReportData {
  startDate: string;
  endDate: string;
  totalReports: number;
  submittedReports: number;
  projectInfo: {
    projectName: string;
    client: string;
    contractor: string;
  };
  summary: {
    overallProgress: string;
    keyHighlights: string[];
    concerns: string[];
  };
  manpower: {
    daily: Array<{
      date: string;
      total: number;
      byRole: Array<{
        role: string;
        count: number;
      }>;
    }>;
    weeklyTotals: Array<{
      role: string;
      total: number;
    }>;
  };
  machinery: Array<{
    description: string;
    unit: string;
    totalUsage: number;
    dailyUsage: Array<{
      date: string;
      usage: number;
    }>;
  }>;
  materials: Array<{
    description: string;
    unit: string;
    totalDelivered: number;
    deliveries: Array<{
      date: string;
      quantity: number;
      status: string;
    }>;
  }>;
  activities: Array<{
    date: string;
    description: string;
    photos: string[];
  }>;
  issues: Array<{
    description: string;
    impact: string;
    mitigation: string;
    status: string;
    date: string;
  }>;
}

const WeeklyReport = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyReportData | null>(null);
  const [editedWeeklyData, setEditedWeeklyData] = useState<WeeklyReportData | null>(null);

  // Get current week dates as default
  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust for Sunday
    
    const monday = new Date(today.setDate(diff));
    const sunday = new Date(today.setDate(diff + 6));
    
    setDateRange({
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
    });
  }, []);

  const handlePreviewReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewing(true);
    try {
      // Generate weekly report data first
      const response = await fetch('/api/weekly-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dateRange),
      });

      if (!response.ok) {
        throw new Error('Failed to generate weekly report');
      }

      const data = await response.json();
      setWeeklyData(data.data);

      // Generate PDF preview using backend API (same structure as daily report)
      const pdfResponse = await fetch('/api/weekly-reports/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...dateRange,
          data: data.data,
          preview: true // Flag for preview mode
        }),
      });

      if (!pdfResponse.ok) {
        throw new Error('Failed to generate PDF preview');
      }

      const pdfBlob = await pdfResponse.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(pdfUrl);
      setShowPDFPreview(true);
      
      toast({
        title: "Success",
        description: "PDF preview generated successfully",
      });
    } catch (error) {
      console.error('Error previewing weekly report:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF preview",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Generate weekly report data from daily reports
      const response = await fetch('/api/weekly-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dateRange),
      });

      if (!response.ok) {
        throw new Error('Failed to generate weekly report');
      }

      const data = await response.json();
      setWeeklyData(data.data);
      setShowPreview(true); // Show summary/detail view
      
      toast({
        title: "Success",
        description: "Weekly report generated successfully. Review the content below.",
      });
    } catch (error) {
      console.error('Error generating weekly report:', error);
      toast({
        title: "Error",
        description: "Failed to generate weekly report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    if (!weeklyData) {
      toast({
        title: "Error",
        description: "Please generate a report first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/weekly-reports/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ...dateRange, data: weeklyData }),
      });

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Excel report downloaded successfully",
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Error",
        description: "Failed to export Excel report",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    if (!weeklyData) {
      toast({
        title: "Error",
        description: "Please generate a report first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/weekly-reports/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ...dateRange, data: weeklyData }),
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF report downloaded successfully",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF report",
        variant: "destructive",
      });
    }
  };

  const handleEditReport = () => {
    if (!weeklyData) {
      toast({
        title: "Error",
        description: "Please generate a report first",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    setEditedWeeklyData(JSON.parse(JSON.stringify(weeklyData)));
    setShowPreview(true);
    
    toast({
      title: "Edit Mode",
      description: "You can now edit the weekly report content",
    });
  };

  const handleSaveEdit = async () => {
    if (!editedWeeklyData) {
      return;
    }

    try {
      const response = await fetch('/api/weekly-reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          weekStart: dateRange.startDate,
          projectName: editedWeeklyData.projectInfo?.projectName,
          reportData: editedWeeklyData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save weekly report');
      }

      const data = await response.json();
      setWeeklyData(data.data);
      setIsEditing(false);
      setEditedWeeklyData(null);
      
      toast({
        title: "Success",
        description: "Weekly report saved successfully",
      });
    } catch (error) {
      console.error('Error saving weekly report:', error);
      toast({
        title: "Error",
        description: "Failed to save weekly report",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedWeeklyData(null);
    setShowPreview(false);
  };

  const handleExportZIP = async () => {
    if (!weeklyData) {
      toast({
        title: "Error",
        description: "Please generate a report first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/weekly-reports/export/zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ...dateRange, data: weeklyData }),
      });

      if (!response.ok) {
        throw new Error('Failed to export ZIP');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-${dateRange.startDate}-to-${dateRange.endDate}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "ZIP report downloaded successfully",
      });
    } catch (error) {
      console.error('Error exporting ZIP:', error);
      toast({
        title: "Error",
        description: "Failed to export ZIP report",
        variant: "destructive",
      });
    }
  };

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
                    <SidebarMenuButton asChild>
                      <Link to="/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
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

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive>
                      <Link to="/weekly-report">
                        <BarChart3 className="h-4 w-4" />
                        <span>Weekly Report</span>
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
              <h1 className="text-lg font-semibold">Weekly Report</h1>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ProfileIcon />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 space-y-6 p-6">
            {/* Date Range Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Select Date Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={handlePreviewReport} 
                    disabled={isPreviewing || !dateRange.startDate || !dateRange.endDate}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isPreviewing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Preview Report
                  </Button>
                  <Button 
                    onClick={handleGenerateReport} 
                    disabled={isGenerating || !dateRange.startDate || !dateRange.endDate}
                    className="flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            {weeklyData && showPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleExportExcel}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Export to Excel
                    </Button>
                    <Button 
                      onClick={handleExportPDF}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <FilePdf className="h-4 w-4" />
                      Export to PDF
                    </Button>
                    <Button 
                      onClick={handleExportZIP}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export to ZIP
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PDF Preview Modal */}
            {showPDFPreview && pdfPreviewUrl && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold">Weekly Report PDF Preview</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPDFPreview(false);
                        URL.revokeObjectURL(pdfPreviewUrl);
                        setPdfPreviewUrl(null);
                      }}
                    >
                      Close Preview
                    </Button>
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    <iframe
                      src={pdfPreviewUrl}
                      className="w-full h-full border-0"
                      title="Weekly Report PDF Preview"
                    />
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          const response = await fetch(pdfPreviewUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Weekly_Report_Preview_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          
                          toast({
                            title: "Success",
                            description: "PDF downloaded successfully",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to download PDF",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Report Summary/Detail View */}
            {weeklyData && showPreview && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Report Preview</span>
                      <div className="flex gap-2">
                        {!isEditing && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleEditReport}
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit Report
                          </Button>
                        )}
                        {isEditing && (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleSaveEdit}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              <ArrowLeft className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowPreview(false)}
                        >
                          Close Preview
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <h3 className="font-semibold">Period</h3>
                        <p>{dateRange.startDate} to {dateRange.endDate}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold">Total Reports</h3>
                        <p>{(isEditing ? editedWeeklyData : weeklyData)?.totalReports || 0} reports</p>
                      </div>
                      <div>
                        <h3 className="font-semibold">Submitted</h3>
                        <p>{(isEditing ? editedWeeklyData : weeklyData)?.submittedReports || 0} reports</p>
                      </div>
                      <div>
                        <h3 className="font-semibold">Project</h3>
                        <p>{(isEditing ? editedWeeklyData : weeklyData)?.projectInfo?.projectName || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Overall Progress</h4>
                        {isEditing ? (
                          <textarea
                            value={editedWeeklyData?.summary?.overallProgress || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setEditedWeeklyData(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  summary: {
                                    ...prev.summary,
                                    overallProgress: newValue
                                  }
                                };
                              });
                            }}
                            className="w-full p-3 border rounded-md text-sm"
                            rows={4}
                            placeholder="Enter overall progress summary..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {weeklyData?.summary?.overallProgress || 'No progress data available'}
                          </p>
                        )}
                      </div>
                      
                      {weeklyData?.summary?.keyHighlights && weeklyData.summary.keyHighlights.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Key Highlights</h4>
                          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            {weeklyData.summary.keyHighlights.slice(0, 5).map((highlight, index) => (
                              <li key={index}>{highlight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <h4 className="font-semibold mb-2">Manpower</h4>
                          <p className="text-sm text-muted-foreground">
                            {weeklyData?.manpower?.weeklyTotals?.reduce((sum, role) => sum + (role.total || 0), 0) || 0} total personnel
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Machinery</h4>
                          <p className="text-sm text-muted-foreground">
                            {weeklyData?.machinery?.length || 0} equipment types
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Materials</h4>
                          <p className="text-sm text-muted-foreground">
                            {weeklyData?.materials?.length || 0} material types
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default WeeklyReport;
