import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { projectEvents } from '@/utils/eventEmitter';
import { getProjects, createProject, updateProject, deleteProject, Project } from "@/integrations/projectsApi";
import { apiGet } from '@/lib/apiFetch';

// interface Project {
//   name: string;
//   reportCount: number;
//   lastReportDate?: string;
//   lastReportId?: string;
//   createdBy?: string;        // User ID who created project
//   createdByName?: string;   // User's name for display
// }

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [renameConfirmOpen, setRenameConfirmOpen] = useState(false);
  const [renameData, setRenameData] = useState<{ oldName: string; newName: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch projects from API
      const response = await getProjects();
      
      if (response.success) {
        // Transform API data to match component needs
        const transformedProjects = (response.data as Project[]).map((project: Project) => ({
          ...project,
          // Add lastReportId for compatibility (will be populated by reports later)
          lastReportId: undefined,
        }));
        
        setProjects(transformedProjects);
        setFilteredProjects(transformedProjects);
      } else {
        console.error("Failed to load projects:", response.error);
        toast({
          title: "Error",
          description: response.error || "Failed to load projects",
          variant: "destructive",
        });
      }
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
  }, [toast]);

  // Get current user info on mount
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const response = await apiGet('/api/auth/profile');
        const data = await response.json();
        
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

  useEffect(() => {
    loadProjects();
  }, [loadProjects]); // Changed from [toast] to [loadProjects]

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

  // Wrap event handlers with useCallback
  const handleProjectDeleted = useCallback(({ projectName }: { projectName: string }) => {
    setProjects(currentProjects => currentProjects.filter(p => p.name !== projectName));
    setFilteredProjects(currentProjects => currentProjects.filter(p => p.name !== projectName));
    
    toast({
      title: "Project Synced",
      description: `${projectName} removed from sidebar.`,
    });
  }, []);
  const handleProjectAdded = useCallback(({ projectName }: { projectName: string }) => {
    loadProjects();
    
    toast({
      title: "Project Synced", 
      description: `${projectName} added from sidebar.`,
    });
  }, [loadProjects]);
  const handleProjectUpdated = useCallback(({ oldName, newName }: { oldName: string, newName: string }) => {
    setProjects(currentProjects => currentProjects.map(p => 
      p.name === oldName ? { ...p, name: newName } : p
    ));
    setFilteredProjects(currentProjects => currentProjects.map(p => 
      p.name === oldName ? { ...p, name: newName } : p
    ));
    
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

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      try {
        const response = await createProject(newProjectName.trim());
        
        if (response.success) {
          // Refresh projects list
          await loadProjects();
          
          // Navigate to daily report with the new project
          navigate(`/dashboard?project=${encodeURIComponent(newProjectName.trim())}&tab=company`);
          setNewProjectName("");
          setShowAddProject(false);
          
          toast({
            title: "Project Created",
            description: `${newProjectName.trim()} has been created.`,
          });
          
          // Emit event to sidebar
          projectEvents.emit('projectAdded', { 
            name: (response.data as Project).name,
            createdBy: (response.data as Project).createdBy,
            createdByName: (response.data as Project).createdByName
          });
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

  const handleProjectClick = (projectName: string) => {
    navigate(`/dashboard?project=${encodeURIComponent(projectName)}&tab=company`);
  };

  const handleEditProject = (projectName: string) => {
    setEditingProject(projectName);
    setEditProjectName(projectName);
  };

  const handleSaveEdit = () => {
    if (editProjectName.trim() && editProjectName.trim() !== editingProject) {
      console.log('🔧 Setting rename data and opening dialog');
      setRenameData({
        oldName: editingProject,
        newName: editProjectName.trim()
      });
      setRenameConfirmOpen(true);
    } else {
      console.log('🔧 Clearing edit state');
      setEditingProject(null);
      setEditProjectName("");
    }
  };

  const confirmRename = async () => {
    if (renameData) {
      try {
        // Find the project to get its ID
        const project = projects.find(p => p.name === renameData.oldName);
        if (!project) {
          toast({
            title: "Error",
            description: "Project not found",
            variant: "destructive",
          });
          return;
        }

        const response = await updateProject(project._id, renameData.newName);
        
        if (response.success) {
          // Refresh projects list
          await loadProjects();
          
          // Emit event to sidebar
          projectEvents.emit('projectUpdated', { 
            oldName: renameData.oldName, 
            newName: renameData.newName 
          });
          
          toast({
            title: "Project Updated",
            description: `Project renamed to "${renameData.newName}".`,
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
    
    setRenameConfirmOpen(false);
    setRenameData(null);
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleDeleteProject = async (projectName: string) => {
    try {
      // Find the project to get its ID
      const project = projects.find(p => p.name === projectName);
      if (!project) {
        toast({
          title: "Error",
          description: "Project not found",
          variant: "destructive",
        });
        return;
      }

      const response = await deleteProject(project._id);
      
      if (response.success) {
        // Refresh projects list
        await loadProjects();
        
        // Emit event to sidebar
        projectEvents.emit('projectDeleted', { projectName });
        
        toast({
          title: "Project Deleted",
          description: `${projectName} has been deleted.`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
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
              </div>

              {filteredProjects.length > 0 && (
                <Button onClick={() => setShowAddProject(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Project
                </Button>
              )}

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
                                      e.preventDefault(); // ← ADD THIS
                                      e.stopPropagation(); // ← ADD THIS
                                      handleSaveEdit();
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault(); // ← ADD THIS
                                      e.stopPropagation(); // ← ADD THIS
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
                                  {/* Show Duplicate to everyone */}
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateProject(project.name);
                                  }}>
                                    <Copy className="h-3 w-3 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  
                                  {/* Only show Edit/Delete to project creator */}
                                  {project.createdBy === currentUserId && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditProject(project.name);
                                      }}>
                                        <Edit className="h-3 w-3 mr-2" />
                                        Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setProjectToDelete(project.name);
                                            }}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onSelect={(e) => {
                                              e.preventDefault();
                                              setDeleteConfirmOpen(true);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Are you sure you want to delete this project?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action will permanently delete "{project.name}" from your project list. This cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteConfirmOpen(false);
                                            }}>
                                              Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteProject(project.name);
                                                setDeleteConfirmOpen(false);
                                              }}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  )}
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
      {/* Rename Confirmation Dialog */}
      <AlertDialog open={renameConfirmOpen} onOpenChange={setRenameConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Rename Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rename "{renameData?.oldName}" to "{renameData?.newName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRenameConfirmOpen(false);
              setRenameData(null);
              setEditingProject(null);
              setEditProjectName("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRename}>
              Confirm Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default DailyReportProjects;
