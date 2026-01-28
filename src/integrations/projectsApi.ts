// src/integrations/projectsApi.ts
// Project management API calls using existing infrastructure

import { API_ENDPOINTS } from "../config/api";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiFetch";

export interface Project {
  _id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  reportCount: number;
  lastReportDate?: string;
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

// Get all projects for current user
export const getProjects = async (): Promise<ProjectResponse> => {
  try {
    console.log("DEBUG FRONTEND: Fetching projects");
    
    const response = await apiGet(API_ENDPOINTS.PROJECTS.GET_ALL);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("DEBUG FRONTEND: Projects fetch error:", errorData);
      return { 
        success: false, 
        data: [], 
        error: errorData.error || 'Failed to fetch projects' 
      };
    }
    
    const data = await response.json();
    console.log("DEBUG FRONTEND: Projects fetched successfully:", data);
    
    return { success: true, data: data.data || data, count: data.count };
  } catch (error) {
    console.error("DEBUG FRONTEND: Projects fetch error:", error);
    return { 
      success: false, 
      data: [], 
      error: 'Network error while fetching projects' 
    };
  }
};

// Create new project
export const createProject = async (projectName: string): Promise<ProjectResponse> => {
  try {
    console.log("DEBUG FRONTEND: Creating project:", projectName);
    
    const response = await apiPost(API_ENDPOINTS.PROJECTS.CREATE, { name: projectName });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("DEBUG FRONTEND: Project creation error:", errorData);
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to create project' 
      };
    }
    
    const data = await response.json();
    console.log("DEBUG FRONTEND: Project created successfully:", data);
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error("DEBUG FRONTEND: Project creation error:", error);
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
    console.log("DEBUG FRONTEND: Updating project:", projectId, projectName);
    
    const response = await apiPut(API_ENDPOINTS.PROJECTS.UPDATE(projectId), { name: projectName });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("DEBUG FRONTEND: Project update error:", errorData);
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to update project' 
      };
    }
    
    const data = await response.json();
    console.log("DEBUG FRONTEND: Project updated successfully:", data);
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error("DEBUG FRONTEND: Project update error:", error);
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
    console.log("DEBUG FRONTEND: Deleting project:", projectId);
    
    const response = await apiDelete(API_ENDPOINTS.PROJECTS.DELETE(projectId));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("DEBUG FRONTEND: Project deletion error:", errorData);
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to delete project' 
      };
    }
    
    const data = await response.json();
    console.log("DEBUG FRONTEND: Project deleted successfully:", data);
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error("DEBUG FRONTEND: Project deletion error:", error);
    return { 
      success: false, 
      data: null, 
      error: 'Network error while deleting project' 
    };
  }
};