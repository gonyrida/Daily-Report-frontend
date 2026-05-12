import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
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
  User,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileIcon from "@/components/ProfileIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectEvents, folderEvents } from "@/utils/eventEmitter";
import { createProject, updateProject, deleteProject, type Project } from "@/integrations/projectsApi";
import { getFoldersWithProjects, type Folder } from "@/integrations/foldersApi";
import { apiGet } from "@/lib/apiFetch";

const WeeklyReportProjects: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folderId");
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────────────────
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootProjects, setRootProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── UI ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // ── Project CRUD state ────────────────────────────────────────────────
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [renameConfirmOpen, setRenameConfirmOpen] = useState(false);
  const [renameData, setRenameData] = useState<{
    id: string;
    oldName: string;
    newName: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────
  const loadFoldersWithProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getFoldersWithProjects();
      if (response.success) {
        setFolders(response.data as Folder[]);
        setRootProjects(response.rootProjects ?? []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoldersWithProjects();
  }, [loadFoldersWithProjects]);

  // Reactive refresh when sidebar mutates folders/projects
  useEffect(() => {
    const handleChange = () => loadFoldersWithProjects();
    folderEvents.on("folderCreated", handleChange);
    folderEvents.on("folderUpdated", handleChange);
    folderEvents.on("folderDeleted", handleChange);
    projectEvents.on("projectAdded", handleChange);
    projectEvents.on("projectUpdated", handleChange);
    projectEvents.on("projectDeleted", handleChange);
    return () => {
      folderEvents.off("folderCreated", handleChange);
      folderEvents.off("folderUpdated", handleChange);
      folderEvents.off("folderDeleted", handleChange);
      projectEvents.off("projectAdded", handleChange);
      projectEvents.off("projectUpdated", handleChange);
      projectEvents.off("projectDeleted", handleChange);
    };
  }, [loadFoldersWithProjects]);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const response = await apiGet("/auth/profile");
        const data = await response.json();
        if (data.success && data.user?._id) {
          setCurrentUserId(data.user._id);
        }
      } catch (error) {
        console.error("Failed to get user info:", error);
      }
    };
    getUserInfo();
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────
  const currentFolder = folderId
    ? (folders.find((f) => f._id === folderId) ?? null)
    : null;

  const folderProjects = currentFolder?.projects ?? [];

  const getFolderReportCount = (folder: Folder): number => {
    if (folder.projects && folder.projects.length > 0) {
      return folder.projects.reduce((sum, p) => sum + (p.weeklyReportCount ?? 0), 0);
    }
    return folder.weeklyReportCount ?? folder.reportCount ?? 0;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // Filtered lists
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRootProjects = rootProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFolderProjects = folderProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Helpers ───────────────────────────────────────────────────────────
  const findProject = (projectName: string): Project | undefined => {
    for (const folder of folders) {
      const p = folder.projects?.find((p) => p.name === projectName);
      if (p) return p;
    }
    return rootProjects.find((p) => p.name === projectName);
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleAddProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    try {
      const response = await createProject(name, folderId ?? undefined);
      if (response.success) {
        await loadFoldersWithProjects();
        setNewProjectName("");
        setShowAddProject(false);
        const created = response.data as Project;
        toast({ title: "Project Created", description: `${created.name} created.` });
        projectEvents.emit("projectAdded", {
          projectName: created.name,
          createdBy: created.createdBy,
          createdByName: created.createdByName,
        });
        // Navigate exactly like the sidebar
        navigate(`/weekly-reports?projectId=${encodeURIComponent(created._id)}`);
      } else {
        toast({
          title: "Error",
          description: response.error ?? "Failed to create project",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create project", variant: "destructive" });
    }
  };

  const handleEditProject = (projectName: string) => {
    setEditingProject(projectName);
    setEditProjectName(projectName);
  };

  const handleSaveEdit = () => {
    const oldName = editingProject;
    const newName = editProjectName.trim();
    if (!oldName || !newName || newName === oldName) {
      setEditingProject(null);
      setEditProjectName("");
      return;
    }
    const project = findProject(oldName);
    if (project) {
      setRenameData({ id: project._id, oldName, newName });
      setRenameConfirmOpen(true);
    }
  };

  const confirmRename = async () => {
    if (!renameData) return;
    try {
      const response = await updateProject(renameData.id, renameData.newName);
      if (response.success) {
        await loadFoldersWithProjects();
        projectEvents.emit("projectUpdated", {
          oldName: renameData.oldName,
          newName: renameData.newName,
          projectId: renameData.id,
        });
        toast({ title: "Project Updated", description: `Renamed to "${renameData.newName}".` });
      } else {
        toast({
          title: "Error",
          description: response.error ?? "Failed to rename project",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to rename project", variant: "destructive" });
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
    const project = findProject(projectName);
    if (!project) return;
    try {
      const response = await deleteProject(project._id);
      if (response.success) {
        await loadFoldersWithProjects();
        projectEvents.emit("projectDeleted", { projectName });
        toast({ title: "Project Deleted", description: `${projectName} deleted.` });
      } else {
        toast({
          title: "Error",
          description: response.error ?? "Failed to delete project",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
    }
  };

  const handleDuplicateProject = async (projectName: string, projectFolderId?: string) => {
    const base = `${projectName} Copy`;
    let finalName = base;
    let counter = 1;
    const allNames = [
      ...folders.flatMap((f) => f.projects?.map((p) => p.name) ?? []),
      ...rootProjects.map((p) => p.name),
    ];
    while (allNames.includes(finalName)) {
      finalName = `${base} ${counter++}`;
    }
    try {
      const response = await createProject(finalName, projectFolderId);
      if (response.success) {
        await loadFoldersWithProjects();
        toast({ title: "Project Duplicated", description: `${finalName} created.` });
      }
    } catch {
      toast({ title: "Error", description: "Failed to duplicate project", variant: "destructive" });
    }
  };

  // ── Project card (reused in both folder detail and root projects) ──────
  const renderProjectCard = (project: Project) => (
    <Card
      key={project._id}
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01] group"
      onClick={() =>
        navigate(`/weekly-reports?projectId=${encodeURIComponent(project._id)}`)
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors flex-shrink-0">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              {editingProject === project.name ? (
                <Input
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveEdit();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCancelEdit();
                    }
                  }}
                  className="h-6 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <CardTitle className="text-base leading-tight truncate">
                  {project.name}
                </CardTitle>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {editingProject === project.name ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                >
                  ✓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
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
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateProject(project.name, project.folderId);
                    }}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {project.createdBy === currentUserId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(project.name);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onSelect={(e) => e.preventDefault()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently delete "{project.name}" and{" "}
                              <strong>ALL its reports.</strong> This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.name);
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
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Total Reports
            </span>
            <Badge variant="secondary">{project.weeklyReportCount ?? 0}</Badge>
          </div>
          {project.lastWeeklyReportDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Last Report
              </span>
              <span className="text-xs font-medium">{formatDate(project.lastWeeklyReportDate)}</span>
            </div>
          )}
          {project.createdByName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Created By
              </span>
              <span className="text-xs font-medium">
                {project.createdBy === currentUserId ? "You" : project.createdByName}
              </span>
            </div>
          )}
          <div className="pt-1">
            <Button
              variant="outline"
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/weekly-reports?projectId=${encodeURIComponent(project._id)}`);
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Open Project
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ── Single return — all views share sidebar + shell ───────────────────
  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <HierarchicalSidebar />

          <SidebarInset>
            {/* Shared header */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">Weekly Report Projects</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={folderId ? "Search projects..." : "Search folders..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <ThemeToggle />
                <ProfileIcon />
              </div>
            </header>

            <main className="flex-1 p-6">
              {isLoading ? (
                // ── Loading ──────────────────────────────────────────────
                <div className="flex items-center justify-center py-24">
                  <div className="text-muted-foreground">Loading projects...</div>
                </div>
              ) : folderId ? (
                // ── Folder detail view — ?folderId=xxx ───────────────────
                // Shows Master Report card + project cards inside the folder.
                // Mirrors what the sidebar shows when a folder is expanded.
                <div className="space-y-6">
                  {/* Breadcrumb — back to folder landing */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button
                      onClick={() => navigate("/weekly-report-projects")}
                      className="hover:text-foreground transition-colors"
                    >
                      Weekly Reports
                    </button>
                    <span>/</span>
                    <span className="text-foreground font-medium">
                      {currentFolder?.name ?? "Loading..."}
                    </span>
                  </div>

                  {/* Title row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {currentFolder?.name ?? "Folder"}
                      </h2>
                      <p className="text-muted-foreground">
                        Projects and reports inside this folder
                      </p>
                    </div>
                    <Button onClick={() => setShowAddProject(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </div>

                  {/* Add project input */}
                  {showAddProject && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Enter project name..."
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddProject();
                              else if (e.key === "Escape") {
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
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddProject(false);
                              setNewProjectName("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Master Report card — navigates exactly like the sidebar */}
                  {currentFolder && (
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01] group border-primary/30 bg-primary/5"
                      onClick={() =>
                        navigate(`/weekly-reports?folderId=${folderId}&type=master`)
                      }
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary group-hover:bg-primary/30 transition-colors">
                              <BarChart3 className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">📊 Master Report</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Aggregated report for all projects in {currentFolder.name}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Total Reports
                          </span>
                          <Badge variant="secondary">{getFolderReportCount(currentFolder)}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Project cards */}
                  {filteredFolderProjects.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
                      {filteredFolderProjects.map(renderProjectCard)}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8">
                          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">
                            {searchQuery.trim() ? "No projects found" : "No projects in this folder"}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {searchQuery.trim()
                              ? "Try adjusting your search terms"
                              : "Add a project to get started"}
                          </p>
                          {!searchQuery.trim() && (
                            <Button onClick={() => setShowAddProject(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Project
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                // ── Folder landing view (no params) ──────────────────────
                // Mirrors the sidebar's Weekly Report section hierarchy:
                // Folders first, then root projects (no folder).
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Weekly Reports</h2>
                    <p className="text-muted-foreground">
                      Select a folder to view its projects and reports
                    </p>
                  </div>

                  {/* Folder cards — click navigates into folder detail */}
                  {filteredFolders.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Folders
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
                        {filteredFolders.map((folder) => (
                          <Card
                            key={folder._id}
                            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01] group"
                            onClick={() =>
                              navigate(`/weekly-report-projects?folderId=${folder._id}`)
                            }
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                                    <FolderOpen className="h-5 w-5" />
                                  </div>
                                  <CardTitle className="text-base leading-tight">
                                    {folder.name}
                                  </CardTitle>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Total Reports
                                  </span>
                                  <Badge variant="secondary">
                                    {getFolderReportCount(folder)}
                                  </Badge>
                                </div>
                                {folder.projects && folder.projects.length > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <FolderOpen className="h-3.5 w-3.5" />
                                      Projects
                                    </span>
                                    <Badge variant="outline">{folder.projects.length}</Badge>
                                  </div>
                                )}
                                {folder.lastWeeklyReportDate && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      Last Report
                                    </span>
                                    <span className="text-xs font-medium">
                                      {formatDate(folder.lastWeeklyReportDate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Root project cards — navigate directly to project reports */}
                  {filteredRootProjects.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Projects (No Folder)
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
                        {filteredRootProjects.map(renderProjectCard)}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {filteredFolders.length === 0 && filteredRootProjects.length === 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8">
                          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">
                            {searchQuery.trim() ? "No results found" : "No projects yet"}
                          </h3>
                          <p className="text-muted-foreground">
                            {searchQuery.trim()
                              ? "Try adjusting your search terms"
                              : "Create a folder or project in the sidebar to get started"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* Rename confirmation — shared across both views */}
      <AlertDialog open={renameConfirmOpen} onOpenChange={setRenameConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rename "{renameData?.oldName}" to "
              {renameData?.newName}"? This will{" "}
              <strong>rename all reports</strong> inside to match the new project name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRenameConfirmOpen(false);
                setRenameData(null);
                setEditingProject(null);
                setEditProjectName("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRename}>Confirm Rename</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WeeklyReportProjects;
