// src/integrations/foldersApi.ts
// Folder management API calls - Folders contain Projects

import { API_ENDPOINTS } from "../config/api";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiFetch";
import { Project } from "./projectsApi";

export interface Folder {
  _id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  companyId: string;
  reportCount: number;
  lastReportDate?: string;
  weeklyReportCount?: number;
  lastWeeklyReportDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projects?: Project[]; // Projects under this folder
}

export interface FolderResponse {
  success: boolean;
  data: Folder | Folder[];
  count?: number;
  message?: string;
  error?: string;
  rootProjects?: Project[]; // Projects not in any folder
}

// Get all folders with their projects
export const getFoldersWithProjects = async (): Promise<FolderResponse> => {
  try {
    const response = await apiGet(API_ENDPOINTS.FOLDERS.GET_ALL);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: [], 
        error: errorData.error || 'Failed to fetch folders',
        rootProjects: []
      };
    }
    
    const data = await response.json();
    
    return { 
      success: true, 
      data: data.data || data, 
      count: data.count,
      rootProjects: data.rootProjects || []
    };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error: 'Network error while fetching folders',
      rootProjects: []
    };
  }
};

// Get all folders (simple list)
export const getAllFolders = async (): Promise<FolderResponse> => {
  try {
    const response = await apiGet(API_ENDPOINTS.FOLDERS.GET_ALL + '/list');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: [], 
        error: errorData.error || 'Failed to fetch folders' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data || data, count: data.count };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error: 'Network error while fetching folders' 
    };
  }
};

// Create new folder
export const createFolder = async (folderName: string): Promise<FolderResponse> => {
  try {
    const response = await apiPost(API_ENDPOINTS.FOLDERS.CREATE, { name: folderName });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to create folder' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while creating folder' 
    };
  }
};

// Update folder
export const updateFolder = async (folderId: string, folderName: string): Promise<FolderResponse> => {
  try {
    const response = await apiPut(API_ENDPOINTS.FOLDERS.UPDATE(folderId), { name: folderName });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to update folder' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while updating folder' 
    };
  }
};

// Delete folder (soft delete)
export const deleteFolder = async (folderId: string): Promise<FolderResponse> => {
  try {
    const response = await apiDelete(API_ENDPOINTS.FOLDERS.DELETE(folderId));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: null, 
        error: errorData.error || 'Failed to delete folder' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data };
  } catch (error) {
    return { 
      success: false, 
      data: null, 
      error: 'Network error while deleting folder' 
    };
  }
};

// Get projects in a specific folder
export const getFolderProjects = async (folderId: string): Promise<any> => {
  try {
    const response = await apiGet(API_ENDPOINTS.FOLDERS.GET_PROJECTS(folderId));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        data: [], 
        error: errorData.error || 'Failed to fetch folder projects' 
      };
    }
    
    const data = await response.json();
    
    return { success: true, data: data.data || data, count: data.count };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error: 'Network error while fetching folder projects' 
    };
  }
};
