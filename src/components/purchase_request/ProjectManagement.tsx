// ProjectManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/apiFetch';
import PRProjectForm from './PRProjectForm';

const ProjectManagement = ({ projects, loadingProjects, onRefresh }) => {
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create');
  const { toast } = useToast();
  const { profile } = useProfileContext();

  // Fetch users data (similar to PendingApprovalsTab)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiGet('/purchase-requests/users');
        const result = await response.json();
        if (result.success) {
          // Handle users data
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    
    fetchUsers();
  }, []);

  const handleViewDetails = async (project) => {
    setMode('view');
    setLoadingProject(true);
    setShowModal(true);
    try {
      const response = await apiGet(`/purchase-requests/pr-projects/${project._id}`);
      const result = await response.json();
      if (result.success) {
        setProject(result.data);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to load project data"
        });
      }

    } catch (error) {
      console.error('Failed to fetch project details:', error);
      toast({
        title: "Error",
        description: "Failed to load project data"
      });
    } finally {
      setLoadingProject(false);
    }
  };

  const handleCreateProject = () => {
    setProject(null);
    setMode('create');
    setShowModal(true);
  };

  const handleEditProject = async (project) => {
    setMode('edit')
    setLoadingProject(true);
    setShowModal(true);
    try {
      const response = await apiGet(`/purchase-requests/pr-projects/${project._id}`);
      const result = await response.json();
      if (result.success) {
        setProject(result.data);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to load project data"
        });
      }

    } catch (error) {
      console.error('Failed to fetch project details:', error);
      toast({
        title: "Error",
        description: "Failed to load project data"
      });
    } finally {
      setLoadingProject(false);
    }
  };

  const handleRefresh = () => {
    if (mode === 'create') {
      setShowModal(false);
      if (onRefresh) {
        onRefresh(); // Refresh parent data if using props
      }
      toast({
        title: "Success",
        description: "Project created successfully"
      });
    } else if (mode === 'edit') {
      setShowModal(false);
      setSelectedProjects([]);
      setProject(null);
      onRefresh(); // Refresh the projects list
      toast({
        title: "Success",
        description: "Project updated successfully"
      });
    }
  };

  // console.log('I am rendering');

  return (
    <div className="space-y-6">
      {/* Card Container */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">Project(s)</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={handleCreateProject}
            >
              New Project
            </Button>
            <Button 
              variant="default"
              size="sm"
              onClick={() => {
                if (selectedProjects.length === 1) {
                  const project = projects.find(p => p.id === selectedProjects[0] || p._id === selectedProjects[0]);
                  if (project) handleEditProject(project);
                }
              }}
              disabled={selectedProjects.length !== 1 || (() => {
                if (selectedProjects.length === 1) {
                  const project = projects.find(p => p.id === selectedProjects[0] || p._id === selectedProjects[0]);
                  return project?.status === 'completed' || project?.status === 'on_hold' || project?.createdBy?._id !== profile?.id || false;
                }
                return false;
              })()}
            >
              Edit Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh()}
              disabled={loadingProjects}
            >
              {loadingProjects ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium w-8">
                    <input
                      type="checkbox"
                      checked={selectedProjects.length === projects.length && projects.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjects(projects.map(p => p._id));
                        } else {
                          setSelectedProjects([]);
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-3 text-sm font-medium">No</th>
                  <th className="text-left p-3 text-sm font-medium">Project Code</th>
                  <th className="text-left p-3 text-sm font-medium">Project Name</th>
                  <th className="text-left p-3 text-sm font-medium">Creator</th>
                  <th className="text-left p-3 text-sm font-medium">Visibility</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Created At</th>
                </tr>
              </thead>
              <tbody>
                {loadingProjects ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted-foreground">
                      Loading projects...
                    </td>
                  </tr>
                ) : projects && projects.length > 0 ? (
                  projects.map((project, index) => (
                    <tr 
                      key={project._id || index} 
                      className="border-t cursor-pointer"
                      onClick={(e) => {
                        // If clicking checkbox, don't toggle
                        if (e.target instanceof HTMLInputElement) return;
                        // Optional: row click opens details
                        handleViewDetails(project);
                      }}
                    >
                      <td className="p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects([...selectedProjects, project._id]);
                            } else {
                              setSelectedProjects(selectedProjects.filter(id => id !== project._id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-3 text-sm">{index + 1}</td>
                      <td className="p-3 text-sm font-medium">{project.projectCode || 'N/A'}</td>
                      <td className="p-3 text-sm font-medium">{project.name || 'N/A'}</td>
                      <td className="p-3 text-sm">
                        {project.createdBy ? 
                          `${project.createdBy.firstName || ''} ${project.createdBy.lastName || ''}`.trim() || 'Unknown' 
                          : 'Unknown'
                        }
                      </td>
                      <td className="p-3 text-sm font-medium">{project.visibility || 'N/A'}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                          project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {project.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {project.createdAt ? new Date(project.createdAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  // Empty State
                  <tr>
                    <td colSpan={8} className="text-center p-12">
                      <div className="text-muted-foreground">
                        <p className="text-lg font-medium mb-2">No projects found</p>
                        <p className="text-sm">Start by creating your first project with "New Project"</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PRProjectForm
        isOpen={showModal}
        setIsOpen={setShowModal}
        mode={mode}
        onProjectCreated={handleRefresh}
        initialData={project}
        isLoading={loadingProject}
      />
    </div>
  );
};

export default ProjectManagement;