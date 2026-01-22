import React, { useState, useEffect } from "react";
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
import { getRecentReports } from "@/integrations/reportsApi";

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
  
  // State for project list
  const [projects, setProjects] = useState<string[]>([]);
  const [dbProjects, setDbProjects] = useState<string[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");

  // Load projects from existing reports
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await getRecentReports(100);
        const reports = response.data as any[] || [];
        const reportProjects = reports
          .map((report: any) => report.projectName)
          .filter((name: unknown): name is string => Boolean(name) && typeof name === 'string');
        const uniqueProjects = Array.from(new Set(reportProjects));
        setDbProjects(uniqueProjects);
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    };
    
    loadProjects();
  }, []);

  // Merge database projects with any locally added projects
  useEffect(() => {
    // Load any locally added projects from sessionStorage
    const localProjects = sessionStorage.getItem('localProjects');
    const parsedLocalProjects = localProjects ? JSON.parse(localProjects) : [];
    const allProjects = Array.from(new Set([...dbProjects, ...parsedLocalProjects]));
    setProjects(allProjects);
  }, [dbProjects]);

  const handleAddProject = () => {
    if (newProjectName.trim() && !projects.includes(newProjectName.trim())) {
      const newProject = newProjectName.trim();
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      
      // Save to sessionStorage to persist across page refreshes
      const localProjects = sessionStorage.getItem('localProjects') || '[]';
      const parsedLocalProjects = JSON.parse(localProjects);
      const updatedLocalProjects = [...parsedLocalProjects, newProject];
      sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
      
      setNewProjectName("");
      setShowAddProject(false);
      
      toast({
        title: "Project Added",
        description: `${newProject} has been added to your project list.`,
      });
      
      // Navigate to daily report with the new project
      navigate(`/daily-report?project=${encodeURIComponent(newProject)}`);
    }
  };

  const handleEditProject = (projectName: string) => {
    setEditingProject(projectName);
    setEditProjectName(projectName);
  };

  const handleSaveEdit = () => {
    if (editProjectName.trim() && editProjectName.trim() !== editingProject) {
      const updatedProjects = projects.map(p => p === editingProject ? editProjectName.trim() : p);
      setProjects(updatedProjects);
      
      // Update sessionStorage
      const localProjects = sessionStorage.getItem('localProjects') || '[]';
      const parsedLocalProjects = JSON.parse(localProjects);
      const updatedLocalProjects = parsedLocalProjects.map((p: string) => p === editingProject ? editProjectName.trim() : p);
      sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
      
      toast({
        title: "Project Updated",
        description: `Project renamed to "${editProjectName.trim()}".`,
      });
    }
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleDeleteProject = (projectName: string) => {
    const updatedProjects = projects.filter(p => p !== projectName);
    setProjects(updatedProjects);
    
    // Update sessionStorage
    const localProjects = sessionStorage.getItem('localProjects') || '[]';
    const parsedLocalProjects = JSON.parse(localProjects);
    const updatedLocalProjects = parsedLocalProjects.filter((p: string) => p !== projectName);
    sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
    
    toast({
      title: "Project Deleted",
      description: `${projectName} has been removed from your project list.`,
    });
  };

  const handleDuplicateProject = (projectName: string) => {
    const duplicateName = `${projectName} Copy`;
    let finalName = duplicateName;
    let counter = 1;
    
    while (projects.includes(finalName)) {
      finalName = `${duplicateName} ${counter}`;
      counter++;
    }
    
    const updatedProjects = [...projects, finalName];
    setProjects(updatedProjects);
    
    // Save to sessionStorage
    const localProjects = sessionStorage.getItem('localProjects') || '[]';
    const parsedLocalProjects = JSON.parse(localProjects);
    const updatedLocalProjects = [...parsedLocalProjects, finalName];
    sessionStorage.setItem('localProjects', JSON.stringify(updatedLocalProjects));
    
    toast({
      title: "Project Duplicated",
      description: `${finalName} has been created.`,
    });
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
                            className="h-5 w-5 p-0 hover:bg-sidebar-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddProject(!showAddProject);
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
                          <SidebarMenuSubItem key={project}>
                            <div className="flex items-center justify-between w-full px-2 py-1 group">
                              {editingProject === project ? (
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
                                    onClick={handleSaveEdit}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
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
                                    onClick={() => handleProjectClick(project, 'daily')}
                                    isActive={isActive('/daily-report') && new URLSearchParams(location.search).get('project') === project}
                                    className="flex-1 text-xs"
                                  >
                                    {project}
                                  </SidebarMenuSubButton>
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
                                      <DropdownMenuItem onClick={() => handleEditProject(project)}>
                                        <Edit className="h-3 w-3 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDuplicateProject(project)}>
                                        <Copy className="h-3 w-3 mr-2" />
                                        Duplicate
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteProject(project)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                              onClick={() => handleProjectClick(project, 'weekly')}
                              className="text-muted-foreground"
                            >
                              <span className="text-xs">{project}</span>
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
