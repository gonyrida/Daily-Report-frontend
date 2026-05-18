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
  Settings,
  Users,
  FolderInput,
  FolderPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import { getRecentReports, getCompanyProjects } from "@/integrations/reportsApi";
import { getProjects, createProject, updateProject, deleteProject, moveProjectToFolder, Project } from "@/integrations/projectsApi";
import { getFoldersWithProjects, createFolder, updateFolder, deleteFolder, Folder } from "@/integrations/foldersApi";
import { projectEvents, folderEvents } from '@/utils/eventEmitter';
import { apiFetch, apiGet } from '@/lib/apiFetch';
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
import { Switch } from "@/components/ui/switch";

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
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [renameConfirmOpen, setRenameConfirmOpen] = useState(false);
  const [renameData, setRenameData] = useState<{ oldName: string; newName: string } | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'all'>('all');
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  
  // State for project list
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");

  // State for folders (new structure: folders contain projects)
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootProjects, setRootProjects] = useState<Project[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [weeklyExpandedFolders, setWeeklyExpandedFolders] = useState<Record<string, boolean>>({});
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [deleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false);
  const [renameFolderConfirmOpen, setRenameFolderConfirmOpen] = useState(false);
  const [renameFolderData, setRenameFolderData] = useState<{ folderId: string; oldName: string; newName: string } | null>(null);
  // Project under folder
  const [showAddProjectInFolder, setShowAddProjectInFolder] = useState<Record<string, boolean>>({});
  const [newProjectInFolderName, setNewProjectInFolderName] = useState<Record<string, string>>({});
  // Move project to folder
  const [projectToMove, setProjectToMove] = useState<Project | null>(null);
  const [moveProjectDialogOpen, setMoveProjectDialogOpen] = useState(false);
  const [selectedTargetFolder, setSelectedTargetFolder] = useState<string>('');

  // Load all folders with their projects
  const loadFoldersWithProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await getFoldersWithProjects();
      
      if (response.success) {
        setFolders(response.data as Folder[]);
        setRootProjects(response.rootProjects || []);
      } else {
        console.error("Failed to load folders:", response.error);
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Legacy: Load root projects (without folder)
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch root projects (without folder)
      const response = await getProjects('null');
      
      if (response.success) {
        const projectList = (response.data as Project[]);
        setRootProjects(projectList);
      } else {
        console.error("Failed to load projects:", response.error);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle folder expansion for Daily Report
  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Toggle folder expansion for Weekly Report (separate state)
  const toggleWeeklyFolderExpand = (folderId: string) => {
    setWeeklyExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Add folder handler
  const handleAddFolder = async () => {
    const folderName = newFolderName.trim();
    if (!folderName) return;

    try {
      const response = await createFolder(folderName);
      if (response.success) {
        await loadFoldersWithProjects();
        setShowAddFolderInput(false);
        setNewFolderName('');
        
        // Emit event for other components
        folderEvents.emit('folderCreated', { folderName });
        
        toast({
          title: "Folder Created",
          description: `"${folderName}" folder created successfully.`,
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
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder._id);
    setEditFolderName(folder.name);
  };

  const handleSaveFolderEdit = () => {
    if (editFolderName.trim() && editingFolder) {
      const folder = folders.find(f => f._id === editingFolder);
      if (folder && editFolderName.trim() !== folder.name) {
        setRenameFolderData({
          folderId: editingFolder,
          oldName: folder.name,
          newName: editFolderName.trim()
        });
        setRenameFolderConfirmOpen(true);
      } else {
        setEditingFolder(null);
        setEditFolderName("");
      }
    }
  };

  const confirmFolderRename = async () => {
    if (!renameFolderData) return;

    try {
      const response = await updateFolder(renameFolderData.folderId, renameFolderData.newName);
      if (response.success) {
        await loadFoldersWithProjects();
        
        // Emit event for other components
        folderEvents.emit('folderUpdated', { folderId: renameFolderData.folderId });
        
        toast({
          title: "Folder Updated",
          description: `Folder renamed to "${renameFolderData.newName}".`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update folder",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update folder",
        variant: "destructive",
      });
    }

    setRenameFolderConfirmOpen(false);
    setRenameFolderData(null);
    setEditingFolder(null);
    setEditFolderName("");
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await deleteFolder(folderId);
      if (response.success) {
        await loadFoldersWithProjects();
        
        // Emit event for other components
        folderEvents.emit('folderDeleted', { folderId });
        
        toast({
          title: "Folder Deleted",
          description: "Folder deleted successfully. Projects moved to root.",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete folder",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    }
    setDeleteFolderConfirmOpen(false);
    setFolderToDelete(null);
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

  // Add project inside a folder
  const handleAddProjectInFolder = async (folderId: string) => {
    const projectName = newProjectInFolderName[folderId]?.trim();
    if (!projectName) return;

    try {
      const response = await createProject(projectName, folderId);
      if (response.success) {
        await loadFoldersWithProjects();
        setShowAddProjectInFolder(prev => ({ ...prev, [folderId]: false }));
        setNewProjectInFolderName(prev => ({ ...prev, [folderId]: '' }));
        
        const createdProject = response.data as Project;
        
        toast({
          title: "Project Created",
          description: `"${createdProject.name}" created in folder.`,
        });
        // Navigate to the new project using projectId
        navigate(`/dashboard?projectId=${encodeURIComponent(createdProject._id)}`);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create project",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  // Get current user info on mount
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const response = await apiGet('/auth/profile');
        const data = await response.json();

        if (data.success && data.user?._id) {
          setCurrentUserId(data.user._id);  // ← Use _id instead of userId
          setUserRole(data.user.role); // ← Get user's role
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    };
    
    getUserInfo();
  }, []);

  // Helper functions
  const isActive = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "?");
  }, [location.pathname]);

  const isProjectActive = (projectId: string, reportType: 'daily' | 'weekly') => {
    const searchParams = new URLSearchParams(location.search);
    const currentProjectId = searchParams.get('projectId');

    if (reportType === 'daily') {
      return isActive('/dashboard') && currentProjectId === projectId;
    } else {
      return isActive('/weekly-reports') && currentProjectId === projectId;
    }
  };

  // Returns true when the master report for a specific folder is the active page
  const isMasterActive = (folderId: string) => {
    const searchParams = new URLSearchParams(location.search);
    return (
      isActive('/weekly-reports') &&
      searchParams.get('folderId') === folderId &&
      searchParams.get('type') === 'master'
    );
  };

  // Load folders with projects on mount
  useEffect(() => {
    loadFoldersWithProjects();
  }, []); // Change from [loadProjects] to []

  // Auto-expand folders containing active projects
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const currentProjectId = searchParams.get('projectId');
    const currentFolderId  = searchParams.get('folderId');
    const reportType       = searchParams.get('type');
    const isWeeklyReports  = location.pathname === '/weekly-reports' || location.pathname.startsWith('/weekly-reports?');
    const isDashboard      = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard?');

    // Auto-expand folder containing the active project
    if (currentProjectId && folders.length > 0) {
      const containingFolder = folders.find(folder =>
        folder.projects?.some(project => project._id === currentProjectId)
      );
      if (containingFolder) {
        if (isDashboard) {
          setExpandedFolders(prev => ({ ...prev, [containingFolder._id]: true }));
        } else if (isWeeklyReports) {
          setWeeklyExpandedFolders(prev => ({ ...prev, [containingFolder._id]: true }));
        }
      }
    }

    // Auto-expand folder when the master report for that folder is active
    if (currentFolderId && reportType === 'master' && isWeeklyReports) {
      setWeeklyExpandedFolders(prev => ({ ...prev, [currentFolderId]: true }));
    }
  }, [location.search, folders, location.pathname]);

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
  // Handle folder changes from other components
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

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      try {
        const response = await createProject(newProjectName.trim());
        
        if (response.success) {
          // Refresh projects list
          await loadFoldersWithProjects();
          
          setNewProjectName("");
          setShowAddProject(false);
          
          const createdProject = response.data as Project;
          
          toast({
            title: "Project Added",
            description: `${createdProject.name} has been added to your project list.`,
          });

          // Emit event to other components
          projectEvents.emit('projectAdded', { 
            projectName: createdProject.name,
            createdBy: createdProject.createdBy,
            createdByName: createdProject.createdByName
          });
          
          // Navigate to dashboard with the new project using projectId
          navigate(`/dashboard?projectId=${encodeURIComponent(createdProject._id)}`);
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

  const handleSaveEdit = () => {
    if (editProjectName.trim() && editProjectName.trim() !== editingProject) {
      // 🚀 Show dialog instead of direct API call
      setRenameData({
        oldName: editingProject,
        newName: editProjectName.trim()
      });
      setRenameConfirmOpen(true);
    } else {
      // Clear edit state if no change
      setEditingProject(null);
      setEditProjectName("");
    }
  };

  // 🚀 NEW: confirmRename function for dialog
  const confirmRename = async () => {
    if (!renameData) return;
    
    try {
      // Search everywhere, not just projects array
      let project: Project | undefined = rootProjects.find(p => p.name === renameData.oldName);
      if (!project) {
        for (const folder of folders) {
          project = folder.projects?.find(p => p.name === renameData.oldName);
          if (project) break;
        }
      }
      
      if (!project) {
        toast({ title: "Error", description: "Project not found", variant: "destructive" });
        return;
      }

      const response = await updateProject(project._id, renameData.newName);
      
      if (response.success) {
        await loadFoldersWithProjects();
        
        projectEvents.emit('projectUpdated', { 
          oldName: renameData.oldName, 
          newName: renameData.newName,
          projectId: project._id  // also emit projectId so Dashboard knows which one changed
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
      toast({ title: "Error", description: "Failed to update project", variant: "destructive" });
    }
    
    setRenameConfirmOpen(false);
    setRenameData(null);
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditProjectName("");
  };

  const handleDeleteProject = async (projectName: string) => {
    try {
      // Search in folders first
      let project = null;
      for (const folder of folders) {
        project = folder.projects?.find(p => p.name === projectName);
        if (project) break;
      }
      // If not found in folders, search in rootProjects
      if (!project) {
        project = rootProjects.find(p => p.name === projectName);
      }
      // Legacy: also check projects array (for backwards compatibility)
      if (!project) {
        project = projects.find(p => p.name === projectName);
      }
      
      if (!project) {
        console.log("🔥 SIDEBAR: Project not found, returning");
        return;
      }

      const response = await deleteProject(project._id);
      
      if (response.success) {
        await loadFoldersWithProjects();
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

  const handleProjectClick = (projectName: string, projectId: string, reportType: 'daily' | 'weekly') => {
    // Find which folder contains this project and keep it expanded
    const containingFolder = folders.find(folder => 
      folder.projects?.some(project => project._id === projectId)
    );
    
    if (containingFolder) {
      if (reportType === 'daily') {
        setExpandedFolders(prev => ({ ...prev, [containingFolder._id]: true }));
      } else {
        setWeeklyExpandedFolders(prev => ({ ...prev, [containingFolder._id]: true }));
      }
    }
    
    if (reportType === 'daily') {
      navigate(`/dashboard?projectId=${encodeURIComponent(projectId)}`);
    } else {
      // For weekly report, navigate to weekly reports dashboard with projectId only
      navigate(`/weekly-reports?projectId=${encodeURIComponent(projectId)}`);
    }
  };

  return (
    <>
      <Sidebar 
        className={`${className} bg-sidebar text-sidebar-foreground`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          [data-sidebar]::-webkit-scrollbar {
            display: none;
          }
        `}</style>
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
              <span className="text-xs opacity-80">CACPM</span>
            </div>
          </div>
        </SidebarHeader>

        {/* View Mode Toggle - Admin Only */}
        {userRole === 'admin' && (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="flex items-center justify-between w-full px-2 py-2">
                      <span className="text-sm font-medium">View Mode</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-80">All</span>
                        <Switch
                          checked={viewMode === 'admin'}
                          onCheckedChange={(checked) => setViewMode(checked ? 'admin' : 'all')}
                          className="scale-75"
                        />
                        <span className="text-xs opacity-80">Admin Only</span>
                      </div>
                    </div>
                  </SidebarMenuItem>

                  <SidebarMenu>
                    <Collapsible open={adminMenuOpen} onOpenChange={setAdminMenuOpen}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full justify-between px-4 py-2 font-medium">
                          <span 
                            className="flex items-center gap-2 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/admin');
                            }}
                          >
                            <UserCheck className="h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </span>
                          <div className="flex items-center gap-1">
                            {adminMenuOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu className="px-2">
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild>
                                  <Link to="/admin/user-management" className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>User Management</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </SidebarMenuSub>
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenu>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />
          </>
        )}


        <SidebarContent className="flex-1">
          {(userRole !== 'admin' || viewMode === 'all') && (
            <>
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
                                <div
                                  className="h-5 w-5 p-0 hover:bg-sidebar-accent hover:text-sidebar-foreground flex items-center justify-center rounded cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!dailyReportOpen) {
                                      setDailyReportOpen(true); // Auto-expand if collapsed
                                    }
                                    setShowAddProject(true);   // Always show input
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </div>
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
                          
                              {/* Add Folder Button */}
                              <SidebarMenuSubItem>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start pl-2 text-xs opacity-80 hover:text-primary-foreground"
                                  onClick={() => setShowAddFolderInput(true)}
                                >
                                  <Plus className="h-3 w-3 mr-2" />
                                  Create Folder
                                </Button>
                              </SidebarMenuSubItem>

                              {/* Add Folder Input */}
                              {showAddFolderInput && (
                                <SidebarMenuSubItem>
                                  <div className="flex items-center gap-1 pl-2 py-1">
                                    <FolderPlus className="h-3 w-3" />
                                    <Input
                                      placeholder="Folder name..."
                                      value={newFolderName}
                                      onChange={(e) => setNewFolderName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleAddFolder();
                                        } else if (e.key === 'Escape') {
                                          setShowAddFolderInput(false);
                                          setNewFolderName('');
                                        }
                                      }}
                                      className="h-6 text-xs flex-1"
                                      autoFocus
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0"
                                      onClick={handleAddFolder}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0"
                                      onClick={() => {
                                        setShowAddFolderInput(false);
                                        setNewFolderName('');
                                      }}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </SidebarMenuSubItem>
                              )}
                          
                              {/* Folder List */}
                              {folders.map((folder) => (
                                <React.Fragment key={folder._id}>
                                  {/* Folder Item with Expand/Collapse */}
                                  <SidebarMenuSubItem>
                                    <div className="flex items-center justify-between w-full px-2 py-1 group">
                                      {editingFolder === folder._id ? (
                                        <div className="flex items-center gap-1 flex-1">
                                          <FolderPlus className="h-3 w-3" />
                                          <Input
                                            value={editFolderName}
                                            onChange={(e) => setEditFolderName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSaveFolderEdit();
                                              } else if (e.key === 'Escape') {
                                                setEditingFolder(null);
                                                setEditFolderName('');
                                              }
                                            }}
                                            className="h-6 text-xs flex-1"
                                            autoFocus
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={() => {
                                              setEditingFolder(null);
                                              setEditFolderName('');
                                            }}
                                          >
                                            ×
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center gap-1 flex-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFolderExpand(folder._id);
                                              }}
                                            >
                                              {expandedFolders[folder._id] ? (
                                                <ChevronDown className="h-3 w-3" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3" />
                                              )}
                                            </Button>
                                            <FolderPlus className="h-3 w-3" />
                                            <span className="text-xs font-medium">{folder.name}</span>
                                          </div>
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
                                              <DropdownMenuItem onClick={() => {
                                                setShowAddProjectInFolder(prev => ({ ...prev, [folder._id]: true }));
                                                setExpandedFolders(prev => ({ ...prev, [folder._id]: true }));
                                              }}>
                                                <Plus className="h-3 w-3 mr-2" />
                                                Add Project
                                              </DropdownMenuItem>
                                              {folder.createdBy === currentUserId && (
                                                <>
                                                  <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                                                    <Edit className="h-3 w-3 mr-2" />
                                                    Rename
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                      <DropdownMenuItem 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setFolderToDelete(folder._id);
                                                        }}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onSelect={(e) => {
                                                          e.preventDefault();
                                                          setDeleteFolderConfirmOpen(true);
                                                        }}
                                                      >
                                                        <Trash2 className="h-3 w-3 mr-2" />
                                                        Delete
                                                      </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                          Delete Folder?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                          This will delete "{folder.name}". Projects will be moved to root.
                                                        </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setDeleteFolderConfirmOpen(false)}>
                                                          Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction 
                                                          onClick={() => handleDeleteFolder(folder._id)}
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
                                        </>
                                      )}
                                    </div>
                                  </SidebarMenuSubItem>

                                  {/* Projects under Folder */}
                                  {expandedFolders[folder._id] && (
                                    <>
                                      {/* Add Project Input inside Folder */}
                                      {showAddProjectInFolder[folder._id] && (
                                        <SidebarMenuSubItem>
                                          <div className="flex items-center gap-1 pl-8 py-1">
                                            <Input
                                              placeholder="Project name..."
                                              value={newProjectInFolderName[folder._id] || ''}
                                              onChange={(e) => setNewProjectInFolderName(prev => ({ ...prev, [folder._id]: e.target.value }))}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  handleAddProjectInFolder(folder._id);
                                                } else if (e.key === 'Escape') {
                                                  setShowAddProjectInFolder(prev => ({ ...prev, [folder._id]: false }));
                                                  setNewProjectInFolderName(prev => ({ ...prev, [folder._id]: '' }));
                                                }
                                              }}
                                              className="h-6 text-xs flex-1"
                                              autoFocus
                                            />
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0"
                                              onClick={() => handleAddProjectInFolder(folder._id)}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0"
                                              onClick={() => {
                                                setShowAddProjectInFolder(prev => ({ ...prev, [folder._id]: false }));
                                                setNewProjectInFolderName(prev => ({ ...prev, [folder._id]: '' }));
                                              }}
                                            >
                                              ×
                                            </Button>
                                          </div>
                                        </SidebarMenuSubItem>
                                      )}

                                      {/* Project List inside Folder */}
                                      {folder.projects?.map((project) => (
                                        <SidebarMenuSubItem key={project._id}>
                                          <div className="flex items-center justify-between w-full pl-8 pr-2 py-1 group">
                                            <SidebarMenuSubButton
                                              onClick={() => handleProjectClick(project.name, project._id, 'daily')}
                                              isActive={isProjectActive(project._id, 'daily')}
                                              className={`flex-1 text-xs cursor-pointer ${
                                                isProjectActive(project._id, 'daily') 
                                                  ? 'bg-primary text-primary-foreground font-medium' 
                                                  : ''
                                              }`}
                                            >
                                              {project.name}
                                            </SidebarMenuSubButton>
                                            {project.createdBy === currentUserId && (
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                  <DropdownMenuItem onClick={() => openMoveProjectDialog(project)}>
                                                    <FolderInput className="h-3 w-3 mr-2" />
                                                    Move to Folder
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
                                                          Delete Project?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                          This will delete "{project.name}" and ALL its reports.
                                                        </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>
                                                          Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction 
                                                          onClick={() => {
                                                            console.log("🔥 SIDEBAR ALERT: Delete clicked for project:", project.name);
                                                            handleDeleteProject(project.name);
                                                          }}
                                                          className="bg-red-600 hover:bg-red-700"
                                                        >
                                                          Delete
                                                        </AlertDialogAction>
                                                      </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                  </AlertDialog>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            )}
                                          </div>
                                        </SidebarMenuSubItem>
                                      ))}

                                      {(!folder.projects || folder.projects.length === 0) && !showAddProjectInFolder[folder._id] && (
                                        <SidebarMenuSubItem>
                                          <div className="px-8 py-1 text-xs opacity-80 italic">
                                            No projects in this folder
                                          </div>
                                        </SidebarMenuSubItem>
                                      )}
                                    </>
                                  )}
                                </React.Fragment>
                              ))}

                          {/* Root Projects (without folder) */}
                          {rootProjects.length > 0 && (
                            <>
                              <SidebarMenuSubItem>
                                <div className="px-2 py-1 text-xs font-medium opacity-80">
                                  (No Folder)
                                </div>
                              </SidebarMenuSubItem>
                              {rootProjects.map((project) => (
                                <SidebarMenuSubItem key={`root-${project._id}`}>
                                  <div className="flex items-center justify-between w-full pl-4 pr-2 py-1 group">
                                    {editingProject === project.name ? (
                                      <div className="flex items-center gap-1 flex-1">
                                        <Input
                                          value={editProjectName}
                                          onChange={(e) => setEditProjectName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
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
                                          onClick={() => handleProjectClick(project.name, project._id, 'daily')}
                                          isActive={isProjectActive(project._id, 'daily')}
                                          className={`flex-1 text-xs cursor-pointer ${
                                            isProjectActive(project._id, 'daily') 
                                              ? 'bg-primary text-primary-foreground font-medium' 
                                              : ''
                                          }`}
                                        >
                                          {project.name}
                                        </SidebarMenuSubButton>
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
                                              <DropdownMenuItem onClick={() => openMoveProjectDialog(project)}>
                                                <FolderInput className="h-3 w-3 mr-2" />
                                                Move to Folder
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
                                                      This action will permanently delete "{project.name}" and <strong>ALL its reports.</strong> This cannot be undone.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>
                                                      Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction 
                                                      onClick={() => handleDeleteProject(project.name)}
                                                      className="bg-red-600 hover:bg-red-700"
                                                    >
                                                      Delete
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </SidebarMenuSubItem>
                              ))}
                            </>
                          )}
                          
                          {folders.length === 0 && rootProjects.length === 0 && !showAddFolderInput && (
                            <SidebarMenuSubItem>
                              <div className="px-3 py-1 text-xs opacity-80 italic">
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
                          <span 
                            className="flex items-center gap-2 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/weekly-report-projects');
                            }}
                          >
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
                          {/* Same folder/project structure as Daily Report (read-only) */}
                          
                          {/* Folder List */}
                          {folders.map((folder) => (
                            <React.Fragment key={`weekly-folder-${folder._id}`}>
                              {/* Folder with Expand/Collapse */}
                              <SidebarMenuSubItem>
                                <div 
                                  className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-sidebar-accent rounded"
                                  onClick={() => toggleWeeklyFolderExpand(folder._id)}
                                >
                                  <div className="h-5 w-5 flex items-center justify-center">
                                    {weeklyExpandedFolders[folder._id] ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </div>
                                  <FolderPlus className="h-3 w-3" />
                                  <span className="text-xs font-medium opacity-80">{folder.name}</span>
                                </div>
                              </SidebarMenuSubItem>
                              
                              {/* Projects + Master Report – only show when folder is expanded */}
                              {weeklyExpandedFolders[folder._id] && (
                                <>
                                  {/* 📊 Master Report item – above individual projects */}
                                  <SidebarMenuSubItem key={`weekly-master-${folder._id}`}>
                                    <SidebarMenuSubButton
                                      onClick={() =>
                                        navigate(
                                          `/weekly-reports?folderId=${folder._id}&type=master`
                                        )
                                      }
                                      isActive={isMasterActive(folder._id)}
                                      className={`pl-8 ${
                                        isMasterActive(folder._id)
                                          ? 'bg-primary text-primary-foreground font-medium'
                                          : 'opacity-80'
                                      }`}
                                    >
                                      <span className="text-xs">📊 Master Report</span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>

                                  {/* Individual project items */}
                                  {folder.projects?.map((project) => (
                                    <SidebarMenuSubItem key={`weekly-proj-${project._id}`}>
                                      <SidebarMenuSubButton
                                        onClick={() =>
                                          handleProjectClick(project.name, project._id, 'weekly')
                                        }
                                        isActive={isProjectActive(project._id, 'weekly')}
                                        className={`pl-8 ${
                                          isProjectActive(project._id, 'weekly')
                                            ? 'bg-primary text-primary-foreground font-medium'
                                            : 'opacity-80'
                                        }`}
                                      >
                                        <span className="text-xs">{project.name}</span>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </>
                              )}
                            </React.Fragment>
                          ))}

                          {/* Root Projects (without folder) */}
                          {rootProjects.length > 0 && (
                            <>
                              <SidebarMenuSubItem>
                                <div className="px-2 py-1 text-xs font-medium opacity-80">
                                  (No Folder)
                                </div>
                              </SidebarMenuSubItem>
                              {rootProjects.map((project) => (
                                <SidebarMenuSubItem key={`weekly-root-${project._id}`}>
                                  <SidebarMenuSubButton
                                    onClick={() => handleProjectClick(project.name, project._id, 'weekly')}
                                    isActive={isProjectActive(project._id, 'weekly')}
                                    className={`${
                                      isProjectActive(project._id, 'weekly') 
                                        ? 'bg-primary text-primary-foreground font-medium' 
                                        : 'opacity-80'
                                    }`}
                                  >
                                    <span className="text-xs">{project.name}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </>
                          )}
                          
                          {folders.length === 0 && rootProjects.length === 0 && (
                            <SidebarMenuSubItem>
                              <div className="px-3 py-1 text-xs opacity-80 italic">
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
            </>
          )}

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
                      <ClipboardList className="h-4 w-4" />
                      <span>Other Form</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Settings & Logout Section */}
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <LogoutButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <AlertDialog open={renameConfirmOpen} onOpenChange={setRenameConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rename "{renameData?.oldName}" to "{renameData?.newName}"? This action <strong>will rename all reports</strong> inside to match the new project name.
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

      <AlertDialog open={renameFolderConfirmOpen} onOpenChange={setRenameFolderConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rename "{renameFolderData?.oldName}" to "{renameFolderData?.newName}"? This action <strong>will update all reports</strong> in this folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRenameFolderConfirmOpen(false);
              setRenameFolderData(null);
              setEditingFolder(null);
              setEditFolderName("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmFolderRename}>
              Confirm Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Project to Folder Dialog */}
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
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="">(No Folder - Root)</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setMoveProjectDialogOpen(false);
              setProjectToMove(null);
              setSelectedTargetFolder('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveProject}>
              Move Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HierarchicalSidebar;
