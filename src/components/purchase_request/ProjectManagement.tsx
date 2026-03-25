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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailProject, setDetailProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false); // New state for create modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
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

  const handleViewDetails = (project) => {
    setDetailProject(project);
    setShowDetailsModal(true);
  };

  const handleCreateProject = () => {
    setShowCreateModal(true);
  };
 
  const handleProjectCreated = (newProject) => {
    setShowCreateModal(false);
    if (onRefresh) {
      onRefresh(); // Refresh parent data if using props
    }
    toast({
      title: "Success",
      description: "Project created successfully"
    });
  };

  // Update handler for viewing/editing
  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowEditModal(true);
  };
  
  const handleProjectUpdated = (updatedProject) => {
    setShowEditModal(false);
    setSelectedProjects([]);
    setEditingProject(null);
    onRefresh(); // Refresh the projects list
    toast({
      title: "Success",
      description: "Project updated successfully"
    });
  };

  // console.log('I am rendering');

  return (
    <div className="space-y-6">
      {/* Card Container */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">Project(s)</CardTitle>
          {/* You can add action buttons here later */}
          <div className="flex gap-2">
            {/* Placeholder for future buttons like "New Project" */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCreateProject}
            >
              New Project
            </Button>
            <Button 
              variant="outline" 
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
                  return project?.status === 'completed' || project?.status === 'on_hold' || false;
                }
                return false;
              })()}
            >
              Edit Project
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

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
          </DialogHeader>
          {detailProject && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                <div className="text-lg font-semibold">{detailProject.name || 'N/A'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <div className="text-sm">{detailProject.description || '-'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="text-sm">{detailProject.status || 'Unknown'}</div>
              </div>
              {/* Add more project details here */}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Modal */}
      <PRProjectForm
        isOpen={showCreateModal}
        setIsOpen={setShowCreateModal}
        onProjectCreated={handleProjectCreated}
      />

      {/* Edit Project Modal */}
      <PRProjectForm
        isOpen={showEditModal}
        setIsOpen={setShowEditModal}
        mode='edit'
        onProjectCreated={handleProjectUpdated}
        initialData={editingProject}
      />

      {/* Project Details Modal */}
      <PRProjectForm
        isOpen={showDetailsModal}
        setIsOpen={setShowDetailsModal}
        mode='view'
        onProjectCreated={handleProjectUpdated}
        initialData={detailProject}
      />
    </div>
  );
};

export default ProjectManagement;