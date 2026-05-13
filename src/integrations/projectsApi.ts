// src/integrations/projectsApi.ts
// Project management API calls using existing infrastructure

import { API_ENDPOINTS } from "../config/api";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiFetch";

export interface Project {
  _id: string;
  name: string;
  folderId?: string;
  folderName?: string;
  createdBy: string;
  createdByName: string;
  reportCount: number;
  weeklyReportCount?: number;  // Count of weekly reports only (for Master Report)
  lastReportDate?: string;
  lastWeeklyReportDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectResponse {
  success: boolean;
  data: Project | Project[];
  count?: number;
  message?: string;
  error?: string;
}

// Get a single project by ID
export const getProjectById = async (projectId: string): Promise<ProjectResponse> => {
  try {
    const response = await apiGet(`${API_ENDPOINTS.PROJECTS.BASE}/${projectId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to fetch project' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while fetching project' 
    };
  }
};

// Get all projects for current user (optionally filtered by folder)
export const getProjects = async (folderId?: string): Promise<ProjectResponse> => {
  try {
    const url = folderId 
      ? `${API_ENDPOINTS.PROJECTS.GET_ALL}?folderId=${folderId}`
      : API_ENDPOINTS.PROJECTS.GET_ALL;
    const response = await apiGet(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: [], 
        error: errorData.error || 'Failed to fetch projects' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data || data, count: data.count };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error: 'Network error while fetching projects' 
    };
  }
};

// Create new project
export const createProject = async (projectName: string, folderId?: string): Promise<ProjectResponse> => {
  try {
    const payload: { name: string; folderId?: string } = { name: projectName };
    if (folderId) {
      payload.folderId = folderId;
    }
    
    const response = await apiPost(API_ENDPOINTS.PROJECTS.CREATE, payload);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to create project' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while creating project' 
    };
  }
};

// Update project
export const updateProject = async (projectId: string, projectName: string): Promise<ProjectResponse> => {
  try {
    const response = await apiPut(API_ENDPOINTS.PROJECTS.UPDATE(projectId), { name: projectName });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to update project' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while updating project' 
    };
  }
};

// Delete project (soft delete)
export const deleteProject = async (projectId: string): Promise<ProjectResponse> => {
  try {
    const response = await apiDelete(API_ENDPOINTS.PROJECTS.DELETE(projectId));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to delete project' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while deleting project' 
    };
  }
};

// Move project to folder
export const moveProjectToFolder = async (projectId: string, folderId: string | null): Promise<ProjectResponse> => {
  try {
    const response = await apiPut(
      `${API_ENDPOINTS.PROJECTS.BASE}/${projectId}/move-to-folder`, 
      { folderId }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to move project' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while moving project' 
    };
  }
};