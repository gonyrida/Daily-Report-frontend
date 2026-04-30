// src/services/weeklyReportService.ts
// API service layer for Weekly Report operations

import { apiFetch, apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/apiFetch';
import type {
  WeeklyReport,
  WeeklyReportMeta,
  WeeklyReportSections,
  ApiResponse,
  PaginatedResponse,
  GetWeeklyReportsParams,
  CreateWeeklyReportRequest,
  UpdateWeeklyReportRequest,
  UpdateActivitiesRequest,
  UpdateHsesRequest,
  UpdateResourcesRequest,
  UpdateConstructionIssuesRequest,
  UpdateQaqcRequest,
  UpdateOverallProgressRequest,
  UpdateIntroductionRequest,
  UpdateLetterRequest,
  WeeklyReportExportOptions,
  ExportStatus,
  MasterScheduleEntry
} from '@/types/weeklyReport.types';
import type { MasterWeeklyReport } from '@/types/masterReport.types';

// ============================================================================
// Base API URL and Error Handling
// ============================================================================

const WEEKLY_REPORTS_BASE_URL = '/weekly-reports';

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Handles API response and transforms errors into user-friendly messages
 */
const handleApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  try {
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('API Error:', { status: response.status, message: errorMessage, data });
      // Log detailed validation errors - check multiple possible locations
      console.error('🔍 Full response data:', JSON.stringify(data, null, 2));
      if (data?.data && typeof data.data === 'object') {
        console.error('🔍 Detailed validation errors (data.data):', JSON.stringify(data.data, null, 2));
      }
      if (data?.errors && Array.isArray(data.errors)) {
        console.error('🔍 Validation errors (data.errors):', JSON.stringify(data.errors, null, 2));
      }
      if (data?.validationErrors) {
        console.error('🔍 Validation errors (data.validationErrors):', JSON.stringify(data.validationErrors, null, 2));
      }
      if (data?.details) {
        console.error('🔍 Error details (data.details):', JSON.stringify(data.details, null, 2));
      }
      return {
        success: false,
        error: errorMessage
      };
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message
    };
  } catch (error) {
    console.error('Response parsing error:', error);
    return {
      success: false,
      error: 'Failed to process server response'
    };
  }
};

/**
 * Handles paginated API responses
 */
const handlePaginatedResponse = async <T>(response: Response): Promise<PaginatedResponse<T>> => {
  try {
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('API Error:', { status: response.status, message: errorMessage, data });
      return {
        success: false,
        error: errorMessage,
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };
    }

    return {
      success: true,
      data: data.data || data.reports || data.items || [],  // ← ADD 'reports' fallback
      message: data.message,
      pagination: data.pagination || {
        page: data.page || 1,
        limit: data.limit || 10,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / (data.limit || 10))
      }
    };
  } catch (error) {
    console.error('Response parsing error:', error);
    return {
      success: false,
      error: 'Failed to process server response',
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    };
  }
};

/**
 * Get company-wide weekly reports (submitted only)
 * Similar to getCompanyReports in reportsApi
 */
export const getCompanyWeeklyReports = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  projectFilter?: string
): Promise<PaginatedResponse<WeeklyReport>> => {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(projectFilter && { projectId: projectFilter }), // Send as projectId instead of project
    });

    const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/company?${queryParams}`);
    return handlePaginatedResponse<WeeklyReport>(response);
  } catch (error) {
    console.error("Error fetching company weekly reports:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch company weekly reports",
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    };
  }
};

// ============================================================================
// Core Weekly Report Operations
// ============================================================================

/**
 * Get paginated list of weekly reports metadata (lightweight for dashboard)
 */
export const getWeeklyReportsMeta = async (params: GetWeeklyReportsParams = {}): Promise<PaginatedResponse<WeeklyReport>> => {
  const searchParams = new URLSearchParams();
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${WEEKLY_REPORTS_BASE_URL}/meta?${searchParams.toString()}`;
  const cacheKey = `meta_${url}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await apiGet(url);
  const result = await handlePaginatedResponse<WeeklyReport>(response);
  
  // Cache the result
  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  
  return result;
};

/**
 * Get paginated list of weekly reports
 */
export const getWeeklyReports = async (params: GetWeeklyReportsParams = {}): Promise<PaginatedResponse<WeeklyReport>> => {
  const searchParams = new URLSearchParams();
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${WEEKLY_REPORTS_BASE_URL}?${searchParams.toString()}`;
  const response = await apiGet(url);
  return handlePaginatedResponse<WeeklyReport>(response);
};

/**
 * Get a single weekly report by ID with all sections
 */
export const getWeeklyReportById = async (id: string): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/${id}`);
  const result = await handleApiResponse<WeeklyReport>(response);
  return result;
};

/**
 * Get weekly report metadata only (lightweight version)
 */
export const getWeeklyReportMeta = async (id: string): Promise<ApiResponse<WeeklyReportMeta>> => {
  const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/${id}/meta`);
  return handleApiResponse<WeeklyReportMeta>(response);
};

/**
 * Create a new weekly report
 */
export const createWeeklyReport = async (data: CreateWeeklyReportRequest): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiPost(WEEKLY_REPORTS_BASE_URL, data);
  return handleApiResponse<WeeklyReport>(response);
};

/**
 * Update a weekly report (partial or full update)
 */
export const updateWeeklyReport = async (id: string, data: UpdateWeeklyReportRequest): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiPut(`${WEEKLY_REPORTS_BASE_URL}/${id}`, data);
  return handleApiResponse<WeeklyReport>(response);
};

/**
 * Delete a weekly report (soft delete preferred)
 */
export const deleteWeeklyReport = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiDelete(`${WEEKLY_REPORTS_BASE_URL}/${id}`, {});
  return handleApiResponse<void>(response);
};

/**
 * Submit a weekly report (change status to submitted)
 */
export const submitWeeklyReport = async (id: string): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiFetch(`${WEEKLY_REPORTS_BASE_URL}/${id}/submit`, {
    method: "POST",
    body: {}
  });
  return handleApiResponse<WeeklyReport>(response);
};

/**
 * Approve a weekly report
 */
export const approveWeeklyReport = async (id: string): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiFetch(`${WEEKLY_REPORTS_BASE_URL}/${id}/approve`, {
    method: "POST",
    body: {}
  });
  return handleApiResponse<WeeklyReport>(response);
};

/**
 * Reject a weekly report
 */
export const rejectWeeklyReport = async (id: string, reason?: string): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${id}/reject`, { reason });
  return handleApiResponse<WeeklyReport>(response);
};

// ============================================================================
// Section-Specific Operations
// ============================================================================

/**
 * Update activities section
 */
export const updateActivities = async (id: string, data: UpdateActivitiesRequest): Promise<ApiResponse<WeeklyReportSections['activities']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/activities`, data);
  return handleApiResponse<WeeklyReportSections['activities']>(response);
};

/**
 * Update HSE section
 */
export const updateHses = async (id: string, data: UpdateHsesRequest): Promise<ApiResponse<WeeklyReportSections['hses']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/hses`, data);
  return handleApiResponse<WeeklyReportSections['hses']>(response);
};

/**
 * Update resources section
 */
export const updateResources = async (id: string, data: UpdateResourcesRequest): Promise<ApiResponse<WeeklyReportSections['resources']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/resources`, data);
  return handleApiResponse<WeeklyReportSections['resources']>(response);
};

/**
 * Update construction issues section
 */
export const updateConstructionIssues = async (id: string, data: UpdateConstructionIssuesRequest): Promise<ApiResponse<WeeklyReportSections['constructionIssues']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/construction-issues`, data);
  return handleApiResponse<WeeklyReportSections['constructionIssues']>(response);
};

/**
 * Update QA/QC section
 */
export const updateQaqc = async (id: string, data: UpdateQaqcRequest): Promise<ApiResponse<WeeklyReportSections['qaqcStatus']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/qaqc`, data);
  return handleApiResponse<WeeklyReportSections['qaqcStatus']>(response);
};

/**
 * Update overall progress section
 */
export const updateOverallProgress = async (id: string, data: UpdateOverallProgressRequest): Promise<ApiResponse<WeeklyReportSections['overallProgress']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/overall-progress`, data);
  return handleApiResponse<WeeklyReportSections['overallProgress']>(response);
};

/**
 * Update introduction section
 */
export const updateIntroduction = async (id: string, data: UpdateIntroductionRequest): Promise<ApiResponse<WeeklyReportSections['introduction']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/introduction`, data);
  return handleApiResponse<WeeklyReportSections['introduction']>(response);
};

/**
 * Update letter section
 */
export const updateLetter = async (id: string, data: UpdateLetterRequest): Promise<ApiResponse<WeeklyReportSections['letter']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/letter`, data);
  return handleApiResponse<WeeklyReportSections['letter']>(response);
};

/**
 * Update cover section
 */
export const updateCover = async (id: string, data: Partial<WeeklyReportSections['cover']>): Promise<ApiResponse<WeeklyReportSections['cover']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/cover`, data);
  return handleApiResponse<WeeklyReportSections['cover']>(response);
};

// ============================================================================
// Export Operations
// ============================================================================

/**
 * Export weekly report to specified format
 */
export const exportWeeklyReport = async (id: string, options: WeeklyReportExportOptions): Promise<ApiResponse<{ downloadUrl: string; filename: string }>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${id}/export`, options);
  return handleApiResponse<{ downloadUrl: string; filename: string }>(response);
};

/**
 * Get export status
 */
export const getExportStatus = async (exportId: string): Promise<ApiResponse<{ status: ExportStatus; progress?: number; downloadUrl?: string }>> => {
  const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/export/${exportId}/status`);
  return handleApiResponse<{ status: ExportStatus; progress?: number; downloadUrl?: string }>(response);
};

/**
 * Download exported report
 */
export const downloadExportedReport = async (downloadUrl: string): Promise<Blob> => {
  const response = await apiGet(downloadUrl, {});
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  return response.blob();
};

// ============================================================================
// Utility Operations
// ============================================================================

/**
 * Duplicate a weekly report (create new report based on existing one)
 */
export const duplicateWeeklyReport = async (id: string, newWeekNumber: number, newStartDate: string, newEndDate: string): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${id}/duplicate`, {
    weekNumber: newWeekNumber,
    startDate: newStartDate,
    endDate: newEndDate
  });
  return handleApiResponse<WeeklyReport>(response);
};

/**
 * Get weekly report template (empty report structure)
 */
export const getWeeklyReportTemplate = async (projectName: string): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/template?projectName=${encodeURIComponent(projectName)}`);
  return handleApiResponse<WeeklyReport>(response);
};

/**
 * Validate weekly report data before submission
 */
export const validateWeeklyReport = async (id: string): Promise<ApiResponse<{ isValid: boolean; errors: string[]; warnings: string[] }>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${id}/validate`, {});
  return handleApiResponse<{ isValid: boolean; errors: string[]; warnings: string[] }>(response);
};

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get weekly reports for a date range
 */
export const getWeeklyReportsByDateRange = async (startDate: string, endDate: string, projectName?: string): Promise<PaginatedResponse<WeeklyReport>> => {
  const params: GetWeeklyReportsParams = {
    startDate,
    endDate,
    projectName,
    limit: 100 // Get more results for date range queries
  };
  return getWeeklyReports(params);
};

/**
 * Bulk update multiple weekly reports
 */
export const bulkUpdateWeeklyReports = async (ids: string[], data: Partial<UpdateWeeklyReportRequest>): Promise<ApiResponse<WeeklyReport[]>> => {
  const response = await apiPut(`${WEEKLY_REPORTS_BASE_URL}/bulk-update`, { ids, data });
  return handleApiResponse<WeeklyReport[]>(response);
};

/**
 * Bulk delete multiple weekly reports
 */
export const bulkDeleteWeeklyReports = async (ids: string[]): Promise<ApiResponse<void>> => {
  const response = await apiFetch(`${WEEKLY_REPORTS_BASE_URL}/bulk-delete`, {
    method: 'DELETE',
    body: JSON.stringify({ ids })
  });
  return handleApiResponse<void>(response);
};

// ============================================================================
// Master Schedule Operations
// ============================================================================

/**
 * Get master schedule for a weekly report
 */
export const getWeeklyReportMasterSchedule = async (reportId: string): Promise<ApiResponse<{ weeklyReportId: string; entries: MasterScheduleEntry[] }>> => {
  const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/master-schedule`);
  return handleApiResponse<{ weeklyReportId: string; entries: MasterScheduleEntry[] }>(response);
};

/**
 * Update master schedule section
 */
export const updateMasterSchedule = async (id: string, data: MasterScheduleEntry[]): Promise<ApiResponse<WeeklyReportSections['masterSchedule']>> => {
  const response = await apiPatch(`${WEEKLY_REPORTS_BASE_URL}/${id}/master-schedule`, data);
  return handleApiResponse<WeeklyReportSections['masterSchedule']>(response);
};

/**
 * Save master schedule for a weekly report
 */
export const saveWeeklyReportMasterSchedule = async (reportId: string, entries: MasterScheduleEntry[]): Promise<ApiResponse<{ weeklyReportId: string; entries: MasterScheduleEntry[] }>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/master-schedule`, {
    entries
  });
  return handleApiResponse<{ weeklyReportId: string; entries: MasterScheduleEntry[] }>(response);
};

/**
 * Update specific master schedule entry
 */
export const updateMasterScheduleEntry = async (reportId: string, entryId: string, updateData: Partial<MasterScheduleEntry>): Promise<ApiResponse<any>> => {
  const response = await apiPut(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/master-schedule/entries/${entryId}`, updateData);
  return handleApiResponse<any>(response);
};

/**
 * Delete master schedule entry
 */
export const deleteMasterScheduleEntry = async (reportId: string, entryId: string): Promise<ApiResponse<void>> => {
  const response = await apiDelete(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/master-schedule/entries/${entryId}`);
  return handleApiResponse<void>(response);
};

/**
 * Get list of all files in master schedule
 */
export const getMasterScheduleFiles = async (reportId: string): Promise<ApiResponse<Array<{ id: string; type: string; fileName: string; fileSize: number; fileType: string; supabaseUrl: string; uploadedAt: string }>>> => {
  const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/master-schedule/files`);
  return handleApiResponse<Array<{ id: string; type: string; fileName: string; fileSize: number; fileType: string; supabaseUrl: string; uploadedAt: string }>>(response);
};

/**
 * Convert PDF to images for rendering in PDF export
 * POST /api/weekly-reports/:id/master-schedule/:entryId/convert-pdf
 */
export const convertPdfToImages = async (
  reportId: string,
  entryId: string,
  pdfUrl: string
): Promise<ApiResponse<{
  entryId: string;
  images: Array<{
    pageNumber: number;
    supabaseUrl: string;
    supabasePath: string;
    width: number;
    height: number;
  }>;
  pageCount: number;
}>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/master-schedule/${entryId}/convert-pdf`, {
    pdfUrl
  });
  return handleApiResponse(response);
};

/**
 * Convert PDF to images WITHOUT saving report (for unsaved reports)
 * POST /api/weekly-reports/convert-pdf-standalone
 */
export const convertPdfToImagesStandalone = async (
  pdfUrl: string,
  tempId: string
): Promise<ApiResponse<{
  images: Array<{
    pageNumber: number;
    supabaseUrl: string;
    supabasePath: string;
    width: number;
    height: number;
  }>;
  pageCount: number;
}>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/convert-pdf-standalone`, {
    pdfUrl,
    tempId
  });
  return handleApiResponse(response);
};

// ============================================================================
// Manpower Aggregation API Functions
// ============================================================================

/**
 * Aggregate manpower data for a weekly report
 */
export const aggregateManpower = async (
  projectName: string, 
  startDate: string, 
  endDate: string, 
  options: { includePrevWeek?: boolean; includeAccumulated?: boolean; projectId?: string } = {}
): Promise<ApiResponse<any>> => {
  const params = new URLSearchParams({
    projectName,  // Always send this (backend requires it)
    startDate,
    endDate
  });
  
  // Also send projectId when available so backend can use it for accurate lookup
  if (options.projectId) {
    params.append('projectId', options.projectId);
  }
  
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/aggregate-manpower?${params}`, options);
  return handleApiResponse<any>(response);
};

/**
 * Update weekly report with aggregated manpower data
 */
export const updateReportManpower = async (reportId: string, options: { includePrevWeek?: boolean; includeAccumulated?: boolean } = {}): Promise<ApiResponse<WeeklyReport>> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/update-manpower`, options);
  return handleApiResponse<WeeklyReport>(response);
};

/**
 * Create weekly report with automatic manpower aggregation
 */
export const createReportWithManpower = async (data: CreateWeeklyReportRequest, aggregationOptions: { includePrevWeek?: boolean; includeAccumulated?: boolean } = {}): Promise<ApiResponse<WeeklyReport>> => {
  const requestData = {
    ...data,
    aggregateManpower: true,
    aggregationOptions
  };
  
  const response = await apiPost(WEEKLY_REPORTS_BASE_URL, requestData);
  return handleApiResponse<WeeklyReport>(response);
};

// ============================================================================
// Image Aggregation API Functions
// ============================================================================

export interface AggregatedPhoto {
  date: string;
  section: 'HSE' | 'SITE';
  image: string;
  caption: string;
  source: string;
  sectionTitle?: string;
}

export interface AggregatedImagesData {
  hsePhotos: AggregatedPhoto[];
  sitePhotos: AggregatedPhoto[];
  hsePhotoReferences: {
    hseToolboxMeeting: any[];
    hseActivityPhotos: any[];
  };
  photosSection: {
    title: string;
    locations: any[];
  };
  dailyReportCount: number;
  hsePhotoCount: number;
  sitePhotoCount: number;
}

/**
 * Preview aggregated images from daily reports without saving to weekly report
 * GET /api/weekly-reports/aggregate-images
 */
export const previewAggregatedImages = async (
  projectIdentifier: string,
  startDate: string,
  endDate: string,
  options: { useProjectId?: boolean; maxImagesPerReport?: number } = {}
): Promise<ApiResponse<AggregatedImagesData>> => {
  const params = new URLSearchParams({
    projectIdentifier,
    startDate,
    endDate,
    ...(options.useProjectId && { useProjectId: 'true' }),
    ...(options.maxImagesPerReport && { maxImagesPerReport: options.maxImagesPerReport.toString() })
  });
  
  const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/aggregate-images?${params}`);
  return handleApiResponse<AggregatedImagesData>(response);
};

/**
 * Update weekly report with aggregated images from daily reports
 * POST /api/weekly-reports/:id/update-images
 */
export const updateReportImages = async (
  reportId: string, 
  options: { maxImagesPerReport?: number } = {}
): Promise<ApiResponse<WeeklyReport> & { aggregated?: { hsePhotoCount: number; sitePhotoCount: number; dailyReportCount: number } }> => {
  const response = await apiPost(`${WEEKLY_REPORTS_BASE_URL}/${reportId}/update-images`, options);
  return handleApiResponse<WeeklyReport>(response) as any;
};

/**
 * Create weekly report with automatic image aggregation from daily reports
 */
export const createReportWithImages = async (
  data: CreateWeeklyReportRequest, 
  aggregationOptions: { maxImagesPerReport?: number } = {}
): Promise<ApiResponse<WeeklyReport>> => {
  const requestData = {
    ...data,
    aggregateImages: true,
    aggregationOptions
  };

  const response = await apiPost(WEEKLY_REPORTS_BASE_URL, requestData);
  return handleApiResponse<WeeklyReport>(response);
};

// ============================================================================
// Master Report (folder-level aggregation – read-only, no stored document)
// ============================================================================

/**
 * Fetch the dynamically aggregated master report for a folder + week.
 * Calls GET /api/weekly-reports/master?folderId=xxx&weekNumber=xx
 */
export const getMasterWeeklyReport = async (
  folderId: string,
  weekNumber: number
): Promise<ApiResponse<MasterWeeklyReport>> => {
  try {
    const params = new URLSearchParams({ folderId, weekNumber: weekNumber.toString() });
    const response = await apiGet(`${WEEKLY_REPORTS_BASE_URL}/master?${params}`);
    return handleApiResponse<MasterWeeklyReport>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch master report'
    };
  }
};
