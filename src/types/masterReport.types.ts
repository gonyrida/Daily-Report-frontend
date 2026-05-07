// src/types/masterReport.types.ts
// Types for the folder-level Master Weekly Report (dynamically aggregated, read-only)

import { ConstructionProgressItem } from './constructionProgress';

// ── Photo shape (mirrors WeeklyReport sections.photos.locations[]) ─────────
export interface PhotoSlot {
  image: string;
  caption: string;
}

export interface PhotoEntry {
  slots: PhotoSlot[];
}

export interface PhotoLocation {
  location?: string;
  title?: string;
  entries: PhotoEntry[];
}

// ── Activity item with an extra projectSource tag ─────────────────────────
export interface MasterActivityItem {
  id?: string; // Original ID from construction progress for proper ID display
  description: string;
  percent?: number;
  percentage?: string;
  source?: string;
  projectSource: string; // name of the originating project
  addedAt?: string;
}

// ── Construction issue with source tag ────────────────────────────────────
export interface MasterIssueItem {
  no?: string | number;
  location?: string;
  problem?: string;
  actionBy?: string;
  photo?: string;
  projectSource: string;
}

// ── Aggregated manpower totals ─────────────────────────────────────────────
export interface AggregatedManpower {
  managementTotal: number;
  workingInteriorTotal: number;
  workingMEPTotal: number;
  grandTotal: number;
}

// ── Weighted progress result ───────────────────────────────────────────────
export interface AggregatedProgress {
  /** Weighted average: Σ(progress_i × manpower_i) / Σ(manpower_i), or simple mean fallback */
  weighted: number;
  /** Per-project progress keyed by projectId string */
  perProject: Record<string, number>;
}

// ── Cover & Letter data (simplified for master view)
export interface AvailableCoverImageInfo {
  reportId: string;
  projectId: string;
  projectName: string;
  coverImage: string;
  status: string;
  submittedAt?: string;
}

export interface MasterReportCoverData {
  projectName: string;
  reportTitle: string;
  weekNumber: string;
  dateRange: string;
  coverImage: string;
  clientLogo: string;
  projectTitle: string;
  employer: string;
  contractorName: string;
  // Available cover images from all reports for selection
  availableCoverImages?: AvailableCoverImageInfo[];
}

// ── Per-project lightweight summary row ───────────────────────────────────
export interface MasterProjectSummary {
  reportId: string;
  projectId: string;
  projectName: string;
  weekNumber: number;
  status: string;
  startDate: string;
  endDate: string;
  activityCount: number;
  issueCount: number;
  progress: number;
  employer?: string;
  /** Report creation timestamp for sorting */
  createdAt?: string;
  /** Report submission timestamp for sorting submitted reports */
  submittedAt?: string;
  /** Cover data including cover image */
  cover?: {
    coverImage?: string;
    projectName?: string;
    projectTitle?: string;
    reportTitle?: string;
    dateRange?: string;
    employer?: string;
  };
  /** Introduction data including project overview and design construction */
  introduction?: {
    projectOverview?: string;
    designNConstruction?: string;
    coverImage?: string;
  };
  /** Letter data for letter of submittal */
  letter?: {
    refNoPrefix?: string;
    weekNumber?: string;
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
  };
}

// ── Construction Progress item — backend spreads the full ConstructionProgressItem
//    and adds projectSource, so we extend that type directly.
export interface MasterConstructionProgressItem extends ConstructionProgressItem {
  projectSource: string;
}

// ── Aggregated QAQC item (single entry from any project) ──────────────────
export interface MasterQaqcItem {
  code?: string;
  description?: string;
  status?: string;
  dateResponded?: string;
  projectSource?: string;
  [key: string]: unknown;
}

// ── Aggregated QAQC section (one per section key, e.g. "ncr", "car") ─────
export interface MasterQaqcSection {
  items: MasterQaqcItem[];
  comments: string;
}

// ── Aggregated HSES record types ───────────────────────────────────────────
export interface MasterHsesTraining {
  typeOfTraining?: string;
  date?: string;
  venue?: string;
  trainer?: string;
  attendee?: string;
  remarks?: string;
  projectSource?: string;
}

export interface MasterHsesInspection {
  typeOfInspection?: string;
  date?: string;
  inspector?: string;
  remarks?: string;
  projectSource?: string;
}

export interface MasterHsesPermit {
  typeOfPermit?: string;
  startDate?: string;
  endDate?: string;
  inspector?: string;
  approver?: string;
  remarks?: string;
  projectSource?: string;
}

export interface MasterHses {
  training: MasterHsesTraining[];
  inspection: MasterHsesInspection[];
  permit: MasterHsesPermit[];
  firstAidAccident: string;
  otherActivities: string;
}

// ── Full aggregated payload ────────────────────────────────────────────────
export interface MasterAggregated {
  activities: {
    weeklyActivities: MasterActivityItem[];
    nextWeekPlan: MasterActivityItem[];
  };
  manpower: AggregatedManpower;
  /** Photos grouped by project name */
  photos: Record<string, PhotoLocation[]>;
  progress: AggregatedProgress;
  issues: MasterIssueItem[];
  /** Construction progress grouped by project name */
  constructionProgress: Record<string, {
    projectInfo: {
      project: string;
      subtitle: string;
      date: string;
      revision: string;
    };
    items: MasterConstructionProgressItem[];
  }>;
  /** QAQC items aggregated from all project reports, keyed by section (ncr, car, …) */
  qaqcStatus?: Record<string, MasterQaqcSection>;
  /** HSES records aggregated from all project reports */
  hses?: MasterHses;
}

// ── Top-level master report shape (matches API response data) ─────────────
export interface MasterWeeklyReport {
  type: 'master';
  folder: {
    _id: string;
    name: string;
    companyId?: string;
    createdAt?: string;
    [key: string]: unknown;
  };
  weekNumber: number;
  /** One entry per project that has a report for this week */
  reports: MasterProjectSummary[];
  aggregated: MasterAggregated;
  /** Available cover images from all reports for selection */
  availableCoverImages?: AvailableCoverImageInfo[];
}
