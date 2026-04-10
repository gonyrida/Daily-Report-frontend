// src/types/weeklyReport.types.ts
// Core type definitions for the Weekly Report module

import { ProgressRow } from './progress.types';
import { Resources } from './resources.types';
import { ConstructionProgressData } from './constructionProgress';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated API response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Core Weekly Report Types
// ============================================================================

/**
 * Weekly report status
 */
export type WeeklyReportStatus = 'draft' | 'in-progress' | 'submitted' | 'approved' | 'rejected';

/**
 * Weekly report metadata
 */
export interface WeeklyReportMeta {
  id: string;
  _id?: string;  // MongoDB ID (for company reports)
  projectName: string;
  projectId?: string;  // Project ID for filtering
  weekNumber: number;
  startDate: string;
  endDate: string;
  reportDateFrom?: string;
  reportDateTo?: string;
  status: WeeklyReportStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  version: number;
  userId?: {
    _id?: string;
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
  }; // Populated user info for company reports
}

/**
 * Complete weekly report structure
 */
export interface WeeklyReport extends WeeklyReportMeta {
  sections: WeeklyReportSections;
}

/**
 * All weekly report sections
 */
export interface WeeklyReportSections {
  cover: WeeklyReportCover;
  letter: WeeklyReportLetter;
  introduction: WeeklyReportIntroduction;
  overallProgress: OverallProgressSection;
  activities: WeeklyReportActivities;
  qaqcStatus: {
    ncr?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    car?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    scar?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    pmsi?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    csi?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    ir?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    mfa?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    rfi?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    rfa?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    fcr?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    vo?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    tr?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
    mir?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  };
  hses: HsesData;
  resources: Resources;
  photos: any;
  constructionIssues: ConstructionIssue[];
  masterSchedule: MasterScheduleEntry[];
  constructionProgress: ConstructionProgressData;
}

// ============================================================================
// Section Types
// ============================================================================

/**
 * Cover section
 */
export interface WeeklyReportCover {
  projectName: string;
  reportTitle: string;
  weekNumber: string;
  dateRange: string;
  contractorName: string;
  clientName: string;
  contractNumber: string;
  coverImage?: string;
  clientLogo?: string;
  projectTitle?: string;
  employer?: string;
}

/**
 * Letter section
 */
export interface WeeklyReportLetter {
  weekNumber?: string;
  dateRange?: string;
  projectName?: string;
  reportDate?: string;
  recipientCompany?: string;
  recipientLocation?: string;
  recipientName?: string;
  ccList?: string[];
  letterBody?: string;
  signatureImage?: string;
  signatoryName?: string;
  signatoryPosition?: string;
  constructorName?: string;
  companyLocation?: string;
  companyPhone1?: string;
  companyPhone2?: string;
  companyEmail1?: string;
  companyEmail2?: string;
  refNoPrefix?: string;
  employer?: string;
}

/**
 * Introduction section
 */
export interface WeeklyReportIntroduction {
  projectOverview: string;
  designNConstruction: string;
  coverImage: string;
}

/**
 * Activity row for activities section
 */
export interface ActivityRow {
  description: string;
  percent: number;
}

/**
 * Weekly activities section
 */
export interface WeeklyReportActivities {
  weeklyActivities: ActivityRow[];
  nextWeekPlan: ActivityRow[];
}

/**
 * Overall progress section
 */
export interface OverallProgressSection {
  rows: ProgressRow[];
}

/**
 * Overall progress entry (deprecated - use ProgressRow instead)
 */
export interface OverallProgressEntry {
  id: string;
  workItem: string;
  plannedProgress: number;
  actualProgress: number;
  variance: number;
  remarks?: string;
}

/**
 * QA/QC entry
 */
export interface QaqcEntry {
  id: string;
  inspectionType: string;
  itemDescription: string;
  location: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  inspector: string;
  remarks?: string;
  photoReferences?: string[];
}

/**
 * HSE data structure
 */
export interface HsesData {
  training: Array<{
    typeOfTraining: string;
    date: string;
    venue: string;
    trainer: string;
    attendee: string;
    remarks: string;
  }>;
  inspection: Array<{
    typeOfInspection: string;
    date: string;
    inspector: string;
    remarks: string;
  }>;
  permit: Array<{
    typeOfPermit: string;
    startDate: string;
    endDate: string;
    inspector: string;
    approver: string;
    remarks: string;
  }>;
  firstAidAccident: string;
  otherActivities: string;
  hsePhotoReferences: string[];
}

/**
 * Resource sub-row
 */
export interface ResourceSubRow {
  description: string;
  dailyData: string[];
  previousWeek: string;
  thisWeek: string;
  upToThisWeek: string;
}

/**
 * Resource section
 */
export interface ResourceSection {
  id: string;
  title: string;
  subtitle: string;
  subRows: ResourceSubRow[];
}

/**
 * Master schedule entry with Supabase file support
 */
export interface MasterScheduleEntry {
  id: string;
  type: 'document' | 'image' | 'chart';
  title: string;
  description?: string;
  date: string;
  fileName?: string;
  fileData?: string; // Base64 for legacy support
  supabaseUrl?: string; // New: Supabase storage URL
  supabasePath?: string; // New: Supabase storage path
  fileSize?: number;
  fileType?: string;
  caption?: string;
  file?: File; // Temporary file object during upload
}

/**
 * Construction issue
 */
export interface ConstructionIssue {
  id: string;
  issueNumber: number;
  siteLocation: string;
  photoReference: string;
  problems: string;
  actionBy: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  resolvedAt?: string;
}

// ============================================================================
// Request/Response Types for API
// ============================================================================

/**
 * Parameters for getting weekly reports list
 */
export interface GetWeeklyReportsParams {
  page?: number;
  limit?: number;
  status?: WeeklyReportStatus;
  projectName?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'weekNumber';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Request payload for creating weekly report
 */
export interface CreateWeeklyReportRequest {
  projectName: string;
  projectId?: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  sections?: Partial<WeeklyReportSections>;
}

/**
 * Request payload for updating weekly report
 */
export interface UpdateWeeklyReportRequest {
  sections?: Partial<WeeklyReportSections>;
  status?: WeeklyReportStatus;
}

/**
 * Construction issue entry - matches backend schema
 */
export interface ConstructionIssue {
  no: string;
  location: string;
  problem: string;
  actionBy: string;
  photo: string;
}

/**
 * Section-specific update requests
 */
export interface UpdateActivitiesRequest {
  weeklyActivities?: ActivityRow[];
  nextWeekPlan?: ActivityRow[];
}

export interface UpdateHsesRequest {
  training?: HsesData['training'];
  inspection?: HsesData['inspection'];
  permit?: HsesData['permit'];
  firstAidAccident?: string;
  otherActivities?: string;
  hsePhotoReferences?: string[];
}

export interface UpdateResourcesRequest {
  resources: Resources;
}

export interface UpdateConstructionIssuesRequest {
  issues: ConstructionIssue[];
}

export interface UpdateQaqcRequest {
  ncr?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  car?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  scar?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  pmsi?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  csi?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  ir?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  mfa?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  rfi?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  rfa?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  fcr?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  vo?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  tr?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
  mir?: { items: Array<{ code: string; description: string; status: string; dateResponded: string }>; comments: string };
}

export interface UpdateOverallProgressRequest {
  entries: OverallProgressEntry[];
}

export interface UpdateIntroductionRequest {
  projectOverview?: string;
  designNConstruction?: string;
  coverImage?: string;
}

export interface UpdateLetterRequest {
  letterData: Partial<WeeklyReportLetter>;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Standard hook return type for data fetching
 */
export interface UseWeeklyReportHookReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  update: (data: Partial<T>) => Promise<void>;
}

/**
 * Hook return type for list data
 */
export interface UseWeeklyReportListReturn extends UseWeeklyReportHookReturn<WeeklyReport[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Tab types for navigation
 */
export type WeeklyReportTabType = 
  | "cover" 
  | "letter" 
  | "table-of-content" 
  | "overall-progress" 
  | "activities" 
  | "qaqc-status" 
  | "hses" 
  | "resource"
  | "construction-issues";

/**
 * Section update type for partial updates
 */
export type PartialWeeklyReportSections = Partial<WeeklyReportSections>;

/**
 * Export status for weekly reports
 */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Export options
 */
export interface WeeklyReportExportOptions {
  format: 'pdf' | 'excel' | 'word';
  includeImages: boolean;
  sections?: WeeklyReportTabType[];
  watermark?: string;
}
