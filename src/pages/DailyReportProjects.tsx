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
import { projectEvents, folderEvents } from '@/utils/eventEmitter';
import { getProjects, createProject, updateProject, deleteProject, moveProjectToFolder, Project } from "@/integrations/projectsApi";
import { getFoldersWithProjects, createFolder, Folder } from "@/integrations/foldersApi";
import { apiGet } from '@/lib/apiFetch';
import { FolderInput } from "lucide-react";

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
  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootProjects, setRootProjects] = useState<Project[]>([]);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  // Move project state
  const [projectToMove, setProjectToMove] = useState<Project | null>(null);
  const [moveProjectDialogOpen, setMoveProjectDialogOpen] = useState(false);
  const [selectedTargetFolder, setSelectedTargetFolder] = useState<string>('');

  const loadFoldersWithProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch folders with projects from API
      const response = await getFoldersWithProjects();
      
      if (response.success) {
        const folderList = response.data as Folder[];
        const rootProjList = response.rootProjects || [];
        
        setFolders(folderList);
        setRootProjects(rootProjList);
        
        // Flatten all projects for search/filter
        const allProjects = [
          ...rootProjList,
          ...folderList.flatMap(f => f.projects || [])
        ];
        
        setProjects(allProjects);
        setFilteredProjects(allProjects);
      } else {
        console.error("Failed to load folders:", response.error);
        toast({
          title: "Error",
          description: response.error || "Failed to load folders",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
      toast({
        title: "Error",
        description: "Failed to load folders",
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
        const response = await apiGet('/auth/profile');
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
    loadFoldersWithProjects();
  }, []);

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
    loadFoldersWithProjects();
    
    toast({
      title: "Project Synced", 
      description: `${projectName} added from sidebar.`,
    });
  }, [loadFoldersWithProjects]);
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
  // Handle folder changes from sidebar
  const handleFolderChanged = useCallback(() => {
    loadFoldersWithProjects();
  }, [loadFoldersWithProjects]);

  useEffect(() => {
    // Subscribe to events
    projectEvents.on('projectDeleted', handleProjectDeleted);
    projectEvents.on('projectAdded', handleProjectAdded);
    projectEvents.on('projectUpdated', handleProjectUpdated);
    folderEvents.on('folderCreated', handleFolderChanged);
    folderEvents.on('folderUpdated', handleFolderChanged);
    folderEvents.on('folderDeleted', handleFolderChanged);
    // Cleanup on unmount
    return () => {
      projectEvents.off('projectDeleted', handleProjectDeleted);
      projectEvents.off('projectAdded', handleProjectAdded);
      projectEvents.off('projectUpdated', handleProjectUpdated);
      folderEvents.off('folderCreated', handleFolderChanged);
      folderEvents.off('folderUpdated', handleFolderChanged);
      folderEvents.off('folderDeleted', handleFolderChanged);
    };
  }, [handleProjectDeleted, handleProjectAdded, handleProjectUpdated, handleFolderChanged]);

  // Helper function to get current user ID from user context
  // No localStorage needed - user info comes from authentication context
  const getCurrentUserId = () => {
    // const token = localStorage.getItem('authToken');
    // if (token) {

    // Get user ID from localStorage user data (not auth token)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        // const payload = JSON.parse(atob(token.split('.')[1]));
        // return payload.userId;

        const user = JSON.parse(userStr);
        return user.id || user.userId;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return null;
  };

  // Handle add folder
  const handleAddFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const response = await createFolder(newFolderName.trim());
        
        if (response.success) {
          await loadFoldersWithProjects();
          setNewFolderName("");
          setShowAddFolder(false);
          
          // Emit event to sidebar
          folderEvents.emit('folderCreated', { folderName: newFolderName.trim() });
          
          toast({
            title: "Folder Created",
            description: `"${newFolderName.trim()}" folder created.`,
          });
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to create folder",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create folder",
          variant: "destructive",
        });
      }
    }
  };

  // Open move project dialog
  const openMoveProjectDialog = (project: Project) => {
    setProjectToMove(project);
    setSelectedTargetFolder(project.folderId || '');
    setMoveProjectDialogOpen(true);
  };

  // Handle move project to folder
  const handleMoveProject = async () => {
    if (!projectToMove) return;

    try {
      const response = await moveProjectToFolder(
        projectToMove._id, 
        selectedTargetFolder || null
      );
      
      if (response.success) {
        await loadFoldersWithProjects();
        toast({
          title: "Project Moved",
          description: selectedTargetFolder 
            ? `"${projectToMove.name}" moved to folder.`
            : `"${projectToMove.name}" moved to root.`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to move project",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move project",
        variant: "destructive",
      });
    }
    
    setMoveProjectDialogOpen(false);
    setProjectToMove(null);
    setSelectedTargetFolder('');
  };

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      try {
        const response = await createProject(newProjectName.trim());
        
        if (response.success) {
          // Refresh projects list
          await loadFoldersWithProjects();
          
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
            projectName: (response.data as Project).name,
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
          await loadFoldersWithProjects();
          
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
        await loadFoldersWithProjects();
        
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

              {/* {filteredProjects.length > 0 && (
                <Button onClick={() => setShowAddProject(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Project
                </Button>
              )} */}

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

              {/* Add Folder Card */}
              {!showAddFolder && (
                <Card 
                  className="cursor-pointer hover:shadow-md transition-all border-dashed border-2"
                  onClick={() => setShowAddFolder(true)}
                >
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="p-3 rounded-full bg-muted inline-flex mb-2">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">Create New Folder</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Folder Input */}
              {showAddFolder && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter folder name..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddFolder();
                          } else if (e.key === 'Escape') {
                            setShowAddFolder(false);
                            setNewFolderName("");
                          }
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button onClick={handleAddFolder}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowAddFolder(false);
                        setNewFolderName("");
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Folders with Projects */}
              {folders.map((folder) => (
                <div key={folder._id} className="space-y-4">
                  {/* Folder Header */}
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-2xl">📁</span>
                    <h3 className="text-lg font-semibold">{folder.name}</h3>
                    <Badge variant="secondary">{folder.projects?.length || 0} projects</Badge>
                  </div>
                  
                  {/* Projects in Folder */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-8">
                    {folder.projects?.map((project) => (
                      <Card 
                        key={project._id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                        onClick={() => navigate(`/dashboard?projectId=${encodeURIComponent(project._id)}`)}
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between min-w-0 gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                                <FolderOpen className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-xl truncate block">{project.name}</CardTitle>
                              </div>
                            </div>
                            {project.createdBy === currentUserId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateProject(project.name); }}>
                                    <Copy className="h-3 w-3 mr-2" /> Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProject(project.name); }}>
                                    <Edit className="h-3 w-3 mr-2" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openMoveProjectDialog(project); }}>
                                    <FolderInput className="h-3 w-3 mr-2" /> Move
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(project.name); setDeleteConfirmOpen(true); }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Total Reports
                              </span>
                              <Badge variant="secondary" className="font-semibold">{project.reportCount}</Badge>
                            </div>
                            {project.lastReportDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Last Report
                                </span>
                                <span className="text-sm font-medium">{new Date(project.lastReportDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {project.createdByName && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Created By
                                </span>
                                <span className="text-sm font-medium">{project.createdBy === currentUserId ? 'You' : project.createdByName}</span>
                              </div>
                            )}
                            <div className="pt-2">
                              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard?project=${encodeURIComponent(project.name)}&folder=${encodeURIComponent(folder._id)}&folderName=${encodeURIComponent(folder.name)}`); }}>
                                <Calendar className="h-4 w-4 mr-2" />
                                Open Project
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              {/* Root Projects (No Folder) */}
              {rootProjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-lg font-semibold text-muted-foreground">(No Folder)</span>
                    <Badge variant="secondary">{rootProjects.length} projects</Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-8">
                    {rootProjects.map((project) => (
                      <Card 
                        key={project._id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                        onClick={() => navigate(`/dashboard?project=${encodeURIComponent(project.name)}`)}
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between min-w-0 gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                                <FolderOpen className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-xl truncate block">{project.name}</CardTitle>
                              </div>
                            </div>
                            {project.createdBy === currentUserId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateProject(project.name); }}>
                                    <Copy className="h-3 w-3 mr-2" /> Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProject(project.name); }}>
                                    <Edit className="h-3 w-3 mr-2" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openMoveProjectDialog(project); }}>
                                    <FolderInput className="h-3 w-3 mr-2" /> Move
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(project.name); setDeleteConfirmOpen(true); }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Total Reports
                              </span>
                              <Badge variant="secondary" className="font-semibold">{project.reportCount}</Badge>
                            </div>
                            {project.lastReportDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Last Report
                                </span>
                                <span className="text-sm font-medium">{new Date(project.lastReportDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {project.createdByName && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Created By
                                </span>
                                <span className="text-sm font-medium">{project.createdBy === currentUserId ? 'You' : project.createdByName}</span>
                              </div>
                            )}
                            <div className="pt-2">
                              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard?project=${encodeURIComponent(project.name)}`); }}>
                                <Calendar className="h-4 w-4 mr-2" />
                                Open Project
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {folders.length === 0 && rootProjects.length === 0 && !showAddProject && (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No folders or projects</h3>
                  <p className="text-muted-foreground mb-4">Create a folder or project to get started</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setShowAddFolder(true)} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Folder
                    </Button>
                    <Button onClick={() => setShowAddProject(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Rename Confirmation Dialog */}
      <AlertDialog open={renameConfirmOpen} onOpenChange={setRenameConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rename "{renameData?.oldName}" to "{renameData?.newName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRenameConfirmOpen(false); setRenameData(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRename}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete}"? This will delete all reports in this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteConfirmOpen(false); setProjectToDelete(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteProject(projectToDelete || '')} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Project Dialog */}
      <AlertDialog open={moveProjectDialogOpen} onOpenChange={setMoveProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Project to Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Select a folder for "{projectToMove?.name}":
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <select
              value={selectedTargetFolder}
              onChange={(e) => setSelectedTargetFolder(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">📁 (No Folder - Root)</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  📁 {folder.name}
                </option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setMoveProjectDialogOpen(false); setProjectToMove(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveProject}>
              Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default DailyReportProjects;
