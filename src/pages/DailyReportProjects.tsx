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
  Calendar,
  FolderOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  FileText,
  Clock,
  MoreVertical,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileIcon from "@/components/ProfileIcon";
import { getRecentReports, getCompanyReports } from "@/integrations/reportsApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  name: string;
  reportCount: number;
  lastReportDate?: string;
  lastReportId?: string;
  createdBy?: string;        // User ID who created project
  createdByName?: string;   // User's name for display
}

const DailyReportProjects: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Load projects from database reports
        const response = await getCompanyReports();
        const reports = response.reports as any[] || [];
        
        // Group reports by project name
        const projectMap = new Map<string, Project>();
        
        reports.forEach((report: any) => {
          const projectName = report.projectName;
          if (!projectName) return;
          
          if (!projectMap.has(projectName)) {
            // Get user info from the first report for this project
            const userId = report.userId?._id || report.userId;
            const userName = report.userId?.firstName && report.userId?.lastName 
              ? `${report.userId.firstName} ${report.userId.lastName}` 
              : 'Unknown';
            
            projectMap.set(projectName, {
              name: projectName,
              reportCount: 0,
              lastReportDate: report.reportDate,
              lastReportId: report._id,
              createdBy: userId,
              createdByName: userName,
            });
          }
          
          const project = projectMap.get(projectName)!;
          project.reportCount++;
          
          // Update last report date if this one is more recent
          if (report.reportDate && (!project.lastReportDate || new Date(report.reportDate) > new Date(project.lastReportDate))) {
            project.lastReportDate = report.reportDate;
            project.lastReportId = report._id;
          }
        });

        // Load locally added projects from sessionStorage
        const localProjects = sessionStorage.getItem('localProjects');
        const parsedLocalProjects = localProjects ? JSON.parse(localProjects) : [];
        
        // Add local projects that don't exist in database
        parsedLocalProjects.forEach((projectName: string) => {
          if (!projectMap.has(projectName)) {
            projectMap.set(projectName, {
              name: projectName,
              reportCount: 0,
              lastReportDate: undefined,
              lastReportId: undefined,
            });
          }
        });
        
        const projectList = Array.from(projectMap.values());
        setProjects(projectList);
        setFilteredProjects(projectList);
      } catch (error) {
        console.error("Failed to load projects:", error);
        toast({
          title: "Error",
          description: "Failed to load projects",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjects();
  }, [toast]);

  // Filter projects based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = projects.filter(project => 
        project.name.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [projects, searchQuery]);

  // Helper function to get current user ID from JWT token
  const getCurrentUserId = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    return null;
  };

  const handleAddProject = () => {
    if (newProjectName.trim() && !projects.find(p => p.name === newProjectName.trim())) {
      const newProject = newProjectName.trim();
      
      // Save to sessionStorage to persist across page refreshes (like the original sidebar)
      const localProjects = sessionStorage.getItem('localProjects') || '[]';
      const parsedLocalProjects = JSON.parse(localProjects);
      const updatedLocalProjects = [...parsedLocalProjects, newProject];
      sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
      
      // Navigate to daily report with the new project
      navigate(`/daily-report?project=${encodeURIComponent(newProject)}`);
      setNewProjectName("");
      setShowAddProject(false);
      
      toast({
        title: "Project Created",
        description: `${newProject} has been created.`,
      });
    }
  };

  const handleProjectClick = (projectName: string) => {
    navigate(`/dashboard?project=${encodeURIComponent(projectName)}&tab=company`);
  };

  const handleEditProject = (projectName: string) => {
    setEditingProject(projectName);
    setEditProjectName(projectName);
  };

  const handleSaveEdit = () => {
    if (editProjectName.trim() && editProjectName.trim() !== editingProject) {
      // Update sessionStorage
      const localProjects = sessionStorage.getItem('localProjects') || '[]';
      const parsedLocalProjects = JSON.parse(localProjects);
      const updatedLocalProjects = parsedLocalProjects.map((p: string) => p === editingProject ? editProjectName.trim() : p);
      sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
      
      toast({
        title: "Project Updated",
        description: `Project renamed to "${editProjectName.trim()}".`,
      });
      
      // Navigate with the new name
      navigate(`/daily-report?project=${encodeURIComponent(editProjectName.trim())}`);
    }
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleDeleteProject = (projectName: string) => {
    // Update sessionStorage
    const localProjects = sessionStorage.getItem('localProjects') || '[]';
    const parsedLocalProjects = JSON.parse(localProjects);
    const updatedLocalProjects = parsedLocalProjects.filter((p: string) => p !== projectName);
    sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
    
    toast({
      title: "Project Deleted",
      description: `${projectName} has been deleted.`,
    });
  };

  const handleDuplicateProject = (projectName: string) => {
    const duplicateName = `${projectName} Copy`;
    let finalName = duplicateName;
    let counter = 1;
    
    while (projects.find(p => p.name === finalName)) {
      finalName = `${duplicateName} ${counter}`;
      counter++;
    }
    
    // Save to sessionStorage
    const localProjects = sessionStorage.getItem('localProjects') || '[]';
    const parsedLocalProjects = JSON.parse(localProjects);
    const updatedLocalProjects = [...parsedLocalProjects, finalName];
    sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
    
    toast({
      title: "Project Duplicated",
      description: `${finalName} has been created.`,
    });
    
    navigate(`/daily-report?project=${encodeURIComponent(finalName)}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <HierarchicalSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-muted-foreground">Loading projects...</div>
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
              <h1 className="text-lg font-semibold">Daily Report Projects</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
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
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Daily Report Projects</h2>
                  <p className="text-muted-foreground">
                    Manage your daily report projects and access their reports
                  </p>
                </div>
                <Button onClick={() => setShowAddProject(!showAddProject)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>

              {/* Add Project Input */}
              {showAddProject && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter project name..."
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddProject();
                          } else if (e.key === 'Escape') {
                            setShowAddProject(false);
                            setNewProjectName("");
                          }
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button onClick={handleAddProject}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowAddProject(false);
                        setNewProjectName("");
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Projects Grid */}
              {filteredProjects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <Card 
                      key={project.name}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                      onClick={() => handleProjectClick(project.name)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                              <FolderOpen className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              {editingProject === project.name ? (
                                <Input
                                  value={editProjectName}
                                  onChange={(e) => setEditProjectName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit();
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  className="h-6 text-sm"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <CardTitle className="text-xl truncate">{project.name}</CardTitle>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingProject === project.name ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveEdit();
                                  }}
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelEdit();
                                  }}
                                >
                                  ×
                                </Button>
                              </>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditProject(project.name);
                                  }}>
                                    <Edit className="h-3 w-3 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateProject(project.name);
                                  }}>
                                    <Copy className="h-3 w-3 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteProject(project.name);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Total Reports
                            </span>
                            <Badge variant="secondary" className="font-semibold">
                              {project.reportCount}
                            </Badge>
                          </div>
                          
                          {project.lastReportDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Last Report
                              </span>
                              <span className="text-sm font-medium">
                                {formatDate(project.lastReportDate)}
                              </span>
                            </div>
                          )}
                          
                          {/* Project Creator */}
                          {project.createdByName && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Created By
                              </span>
                              <span className="text-sm font-medium">
                                {(() => {
                                  const currentUserId = getCurrentUserId();
                                  const isCurrentUser = project.createdBy === currentUserId || project.createdBy === currentUserId;
                                  return isCurrentUser ? 'You' : project.createdByName;
                                })()}
                              </span>
                            </div>
                          )}
                          
                          <div className="pt-2">
                            <Button 
                              variant="outline" 
                              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProjectClick(project.name);
                              }}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Open Project
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {searchQuery.trim() ? "No projects found" : "No projects yet"}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery.trim() 
                          ? "Try adjusting your search terms"
                          : "Create your first project to start managing daily reports"
                        }
                      </p>
                      {!searchQuery.trim() && (
                        <Button onClick={() => setShowAddProject(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Project
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DailyReportProjects;
