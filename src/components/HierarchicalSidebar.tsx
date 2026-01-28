import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Calendar,
  ClipboardList,
  UserCheck,
  LogOut,
  Building2,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import { getRecentReports, getCompanyProjects } from "@/integrations/reportsApi";
import { getProjects, createProject, updateProject, deleteProject, Project } from "@/integrations/projectsApi"; // ← ADD THIS
import { projectEvents } from '@/utils/eventEmitter';
import { apiFetch, apiGet } from '@/lib/apiFetch';

interface HierarchicalSidebarProps {
  className?: string;
}

const HierarchicalSidebar: React.FC<HierarchicalSidebarProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // State for expand/collapse
  const [reportSectionOpen, setReportSectionOpen] = useState(true);
  const [dailyReportOpen, setDailyReportOpen] = useState(true);
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // State for project list
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch projects from API
      const response = await getProjects();
      
      if (response.success) {
        const projectList = (response.data as Project[]);
        setProjects(projectList);
      } else {
        console.error("Failed to load projects:", response.error);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current user info on mount
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const response = await apiGet('/api/auth/profile');
        const data = await response.json();  // ← ADD THIS LINE

        console.log("DEBUG: Full user response:", data);  // ← ADD THIS

        if (data.success && data.user?._id) {
          console.log("DEBUG: Setting currentUserId to:", data.user._id);
          setCurrentUserId(data.user._id);  // ← Use _id instead of userId
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    };
    
    getUserInfo();
  }, []);

  // Load projects from existing reports
  useEffect(() => {
    loadProjects();
  }, [loadProjects]); // Change from [] to [loadProjects]

  // // Merge database projects with any locally added projects
  // useEffect(() => {
  //   // Load any locally added projects from sessionStorage
  //   const localProjects = sessionStorage.getItem('localProjects');
  //   const parsedLocalProjects = localProjects ? JSON.parse(localProjects) : [];
  //   const allProjects = Array.from(new Set([...dbProjects, ...parsedLocalProjects]));
  //   setProjects(allProjects);
  // }, [dbProjects]);

  // Wrap event handlers with useCallback
  const handleProjectDeleted = useCallback(({ projectName }: { projectName: string }) => {
    setProjects(currentProjects => currentProjects.filter(p => p.name !== projectName));
    
    toast({
      title: "Project Synced",
      description: `${projectName} removed from projects page.`,
    });
  }, []);
  const handleProjectAdded = useCallback(({ projectName }: { projectName: string }) => {
    loadProjects();
    
    toast({
      title: "Project Synced", 
      description: `${projectName} added from projects page.`,
    });
  }, [loadProjects]);
  const handleProjectUpdated = useCallback(({ oldName, newName }: { oldName: string, newName: string }) => {
    setProjects(currentProjects => currentProjects.map(p => p.name === oldName ? { ...p, name: newName } : p));
    
    toast({
      title: "Project Synced",
      description: `Project renamed from ${oldName} to ${newName}.`,
    });
  }, []);
  useEffect(() => {
    // Subscribe to events
    projectEvents.on('projectDeleted', handleProjectDeleted);
    projectEvents.on('projectAdded', handleProjectAdded);
    projectEvents.on('projectUpdated', handleProjectUpdated);
    // Cleanup on unmount
    return () => {
      projectEvents.off('projectDeleted', handleProjectDeleted);
      projectEvents.off('projectAdded', handleProjectAdded);
      projectEvents.off('projectUpdated', handleProjectUpdated);
    };
  }, [handleProjectDeleted, handleProjectAdded, handleProjectUpdated]);

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      try {
        const response = await createProject(newProjectName.trim());
        
        if (response.success) {
          // Refresh projects list
          await loadProjects();
          
          setNewProjectName("");
          setShowAddProject(false);
          
          toast({
            title: "Project Added",
            description: `${newProjectName.trim()} has been added to your project list.`,
          });

          // Emit event to other components
          projectEvents.emit('projectAdded', { 
            projectName: (response.data as Project).name,
            createdBy: (response.data as Project).createdBy,
            createdByName: (response.data as Project).createdByName
          });
          
          // Navigate to daily report with the new project
          navigate(`/dashboard?project=${encodeURIComponent(newProjectName.trim())}&tab=company`);
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to create project",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error creating project:', error);
        toast({
          title: "Error",
          description: "Failed to create project",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditProject = (projectName: string) => {
    setEditingProject(projectName);
    setEditProjectName(projectName);
  };

  const handleSaveEdit = async () => {
    if (editProjectName.trim() && editProjectName.trim() !== editingProject) {
      try {
        // Find the project to get its ID
        const project = projects.find(p => p.name === editingProject);
        if (!project) {
          toast({
            title: "Error",
            description: "Project not found",
            variant: "destructive",
          });
          return;
        }

        const response = await updateProject(project._id, editProjectName.trim());
        
        if (response.success) {
          // Refresh projects list
          await loadProjects();
          
          // Emit event to other components
          projectEvents.emit('projectUpdated', { 
            oldName: editingProject, 
            newName: editProjectName.trim() 
          });
          
          toast({
            title: "Project Updated",
            description: `Project renamed to "${editProjectName.trim()}".`,
          });
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to update project",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error updating project:', error);
        toast({
          title: "Error",
          description: "Failed to update project",
          variant: "destructive",
        });
      }
    }
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleDeleteProject = async (projectName: string) => {
    try {
      const project = projects.find(p => p.name === projectName);
      if (!project) return;

      const response = await deleteProject(project._id);
      
      if (response.success) {
        await loadProjects();
        projectEvents.emit('projectDeleted', { projectName });
        
        toast({
          title: "Project Deleted",
          description: `${projectName} has been removed.`,
        });
        
        navigate('/daily-report-projects');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
    }
  };

  const handleDuplicateProject = async (projectName: string) => {
    const duplicateName = `${projectName} Copy`;
    let finalName = duplicateName;
    let counter = 1;
    
    // Find unique name
    while (projects.some(p => p.name === finalName)) {
      finalName = `${duplicateName} ${counter}`;
      counter++;
    }
    
    try {
      const response = await createProject(finalName);
      if (response.success) {
        await loadProjects();
        toast({ title: "Project Duplicated", description: `${finalName} created.` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate project", variant: "destructive" });
    }
  };

  const handleProjectClick = (projectName: string, reportType: 'daily' | 'weekly') => {
    if (reportType === 'daily') {
      navigate(`/dashboard?project=${encodeURIComponent(projectName)}`);
    } else {
      // For weekly report, we'll navigate to a weekly report page (to be implemented)
      toast({
        title: "Weekly Report",
        description: `Weekly report for ${projectName} will be available soon.`,
      });
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "?");
  };

  return (
    <Sidebar className={className}>
      {/* Logo Section */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div 
          className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-sidebar-accent transition-colors rounded-lg"
          // onClick={() => navigate('/dashboard')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">Report System</span>
            <span className="text-xs text-muted-foreground">CACPM</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        {/* Report Section */}
        <SidebarGroup>
          <Collapsible open={reportSectionOpen} onOpenChange={setReportSectionOpen}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton 
                className="w-full justify-between px-4 py-2 font-medium"
                onClick={() => navigate('/reports')}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Report
                </span>
                {reportSectionOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {/* Daily Report Subsection */}
                  <Collapsible open={dailyReportOpen} onOpenChange={setDailyReportOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between pl-6 text-sm">
                        <span 
                          className="flex items-center gap-2 flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/daily-report-projects');
                          }}
                        >
                          <Calendar className="h-3 w-3" />
                          Daily Report
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!dailyReportOpen) {
                                setDailyReportOpen(true); // Auto-expand if collapsed
                              }
                              setShowAddProject(true);   // Always show input
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {dailyReportOpen ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Add Project Input */}
                        {showAddProject && (
                          <SidebarMenuSubItem>
                            <div className="flex items-center gap-1 px-1 py-1">
                              <Input
                                placeholder="Project name..."
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
                                className="h-7 text-xs"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={handleAddProject}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </SidebarMenuSubItem>
                        )}
                        
                        {/* Project List */}
                        {projects.map((project) => (
                          <SidebarMenuSubItem key={project._id}>
                            <div className="flex items-center justify-between w-full px-2 py-1 group">
                              {editingProject === project.name ? (
                                <div className="flex items-center gap-1 flex-1">
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
                                    className="h-6 text-xs flex-1"
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={handleCancelEdit}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <SidebarMenuSubButton
                                    onClick={() => handleProjectClick(project.name, 'daily')}
                                    isActive={isActive('/daily-report') && new URLSearchParams(location.search).get('project') === project.name}
                                    className="flex-1 text-xs cursor-pointer"
                                  >
                                    {project.name}
                                  </SidebarMenuSubButton>
                                  {/* DEBUG: Add this logging */}
                                  {console.log(`DEBUG: Project ${project.name} - createdBy: ${project.createdBy}, currentUserId: ${currentUserId}, match: ${project.createdBy === currentUserId}`)}
                                    {project.createdBy === currentUserId && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32">
                                          <DropdownMenuItem onClick={() => handleEditProject(project.name)}>
                                            <Edit className="h-3 w-3 mr-2" />
                                            Rename
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDuplicateProject(project.name)}>
                                            <Copy className="h-3 w-3 mr-2" />
                                            Duplicate
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            onClick={() => handleDeleteProject(project.name)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-3 w-3 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                </>
                              )}
                            </div>
                          </SidebarMenuSubItem>
                        ))}
                        
                        {projects.length === 0 && !showAddProject && (
                          <SidebarMenuSubItem>
                            <div className="px-3 py-1 text-xs text-muted-foreground italic">
                              No projects yet. Click + to add one.
                            </div>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Weekly Report Subsection */}
                  <Collapsible open={weeklyReportOpen} onOpenChange={setWeeklyReportOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between pl-6 text-sm">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Weekly Report
                        </span>
                        {weeklyReportOpen ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Same project list as Daily Report (read-only) */}
                        {projects.map((project) => (
                          <SidebarMenuSubItem key={`weekly-${project}`}>
                            <SidebarMenuSubButton
                              onClick={() => handleProjectClick(project.name, 'weekly')}
                              className="text-muted-foreground"
                            >
                              <span className="text-xs">{project.name}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        
                        {projects.length === 0 && (
                          <SidebarMenuSubItem>
                            <div className="px-3 py-1 text-xs text-muted-foreground italic">
                              No projects available
                            </div>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Other Forms Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/request-form" className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    <span>Request Form</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin-form" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Admin Form</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Logout Section */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default HierarchicalSidebar;
