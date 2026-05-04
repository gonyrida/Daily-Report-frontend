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
}

// ── Per-project lightweight summary row ───────────────────────────────────
export interface MasterProjectSummary {
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
}

// ── Construction Progress item — backend spreads the full ConstructionProgressItem
//    and adds projectSource, so we extend that type directly.
export interface MasterConstructionProgressItem extends ConstructionProgressItem {
  projectSource: string;
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
    };
    items: MasterConstructionProgressItem[];
  }>;
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
}
