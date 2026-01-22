import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Calendar, 
  FileText, 
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getAllUserReports, 
  createNewReport
} from "@/integrations/reportsApi";

interface Report {
  projectName: string;
  reportDate: string;
}

interface Project {
  name: string;
  reportCount: number;
  lastReportDate?: string;
}

interface DailyReportProjectsViewProps {
  className?: string;
}

const DailyReportProjectsView: React.FC<DailyReportProjectsViewProps> = ({ className }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // View state - always show projects
  const viewMode = 'projects';
  
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all reports and group by project
      const response = await getAllUserReports();
      const allReports = response.data || [];
      
      // Group reports by project
      const projectMap = new Map<string, Project>();
      
      allReports.forEach((report: Report) => {
        const projectName = report.projectName || 'Untitled Project';
        
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, {
            name: projectName,
            reportCount: 0,
            lastReportDate: report.reportDate
          });
        }
        
        const project = projectMap.get(projectName)!;
        project.reportCount++;
        
        // Update last report date if this one is more recent
        if (!project.lastReportDate || report.reportDate > project.lastReportDate) {
          project.lastReportDate = report.reportDate;
        }
      });
      
      setProjects(Array.from(projectMap.values()));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check URL params on mount and when they change
  useEffect(() => {
    const reportIdParam = searchParams.get('reportId');
    
    if (reportIdParam) {
      // If there's a reportId, don't show this view - let the main component handle it
      return;
    }
    
    // Always refresh data when URL params change
    fetchData();
  }, [searchParams]);

  // Also refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (!searchParams.get('reportId')) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [searchParams]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [toast]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a blank report for the new project to establish it
      await createNewReport(newProjectName.trim());
      
      toast({
        title: "Success",
        description: `Project "${newProjectName.trim()}" created successfully.`,
      });
      
      setNewProjectName('');
      setShowCreateProject(false);
      
      // Refresh the projects list
      const response = await getAllUserReports();
      const allReports = response.data || [];
      
      const projectMap = new Map<string, Project>();
      allReports.forEach((report: Report) => {
        const projectName = report.projectName || 'Untitled Project';
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, {
            name: projectName,
            reportCount: 0,
            lastReportDate: report.reportDate
          });
        }
        const project = projectMap.get(projectName)!;
        project.reportCount++;
      });
      
      setProjects(Array.from(projectMap.values()));
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateReport = async () => {
    // Create a new report and navigate to it
    try {
      const result = await createNewReport("New Project");
      
      toast({
        title: "Success",
        description: "New report created successfully.",
      });
      
      // Navigate to the newly created report
      navigate(`/daily-report?reportId=${result.data._id}`);
    } catch (error) {
      console.error('Failed to create report:', error);
      toast({
        title: "Error",
        description: "Failed to create report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProjectClick = (projectName: string) => {
    navigate(`/daily-report?project=${encodeURIComponent(projectName)}`);
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
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <p className="text-muted-foreground">
            Manage your daily report projects
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Project
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Create Project Dialog */}
      {showCreateProject && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject();
                } else if (e.key === 'Escape') {
                  setShowCreateProject(false);
                  setNewProjectName('');
                }
              }}
              autoFocus
            />
            <Button onClick={handleCreateProject}>Create</Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateProject(false);
                setNewProjectName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Projects View */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first project to start managing daily reports.
                </p>
                <Button onClick={() => setShowCreateProject(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => (
              <Card 
                key={project.name}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleProjectClick(project.name)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reports</span>
                      <Badge variant="secondary">{project.reportCount}</Badge>
                    </div>
                    {project.lastReportDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Report</span>
                        <span className="text-sm">{formatDate(project.lastReportDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
    </div>
  );
};

export default DailyReportProjectsView;
