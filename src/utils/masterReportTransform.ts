// src/utils/masterReportTransform.ts
// Transform MasterWeeklyReport data into WeeklyReportContentProps format

import { MasterWeeklyReport, MasterActivityItem, MasterIssueItem, PhotoLocation, MasterConstructionProgressItem } from '@/types/masterReport.types';
import { ActivityRow } from '@/types/activity.types';
import { ProgressRow } from '@/types/progress.types';
import { Resources, ManPowerEntry } from '@/types/resources.types';
/**
 * Construction Issue interface matching WeeklyReport.tsx usage
 */
export interface ConstructionIssue {
  id: string;
  issueNumber: number;
  location: string;
  problem: string;
  actionBy: string;
  photo?: string | File | null;
}

/**
 * Metadata interface for master report mode
 */
export interface MasterReportMetadata {
  folderName: string;
  folderId: string;
  weekNumber: number;
  projectCount: number;
  weightedProgress: number;
  projectNames: string[];
  totalActivities: number;
  totalIssues: number;
  totalManpower: number;
}

/**
 * Extended ActivityRow with project source for master mode grouping
 */
export interface MasterActivityRow extends ActivityRow {
  _projectSource?: string;
}

/**
 * Extended ProgressRow with project source for master mode
 */
export interface MasterProgressRow extends ProgressRow {
  _projectSource?: string;
  _projectId?: string;
}

/**
 * Extended ConstructionIssue with project source for master mode
 */
export interface MasterConstructionIssue extends ConstructionIssue {
  _projectSource?: string;
}

/**
 * Photo location with project attribution
 */
export interface MasterPhotoLocation extends PhotoLocation {
  _projectSource?: string;
}

/**
 * Result of transforming master report data
 */
export interface TransformedMasterData {
  // Activities
  weeklyActivities: MasterActivityRow[];
  nextWeekPlan: MasterActivityRow[];
  
  // Progress
  overallProgressRows: MasterProgressRow[];
  overallProgressRemark: string;
  
  // Resources/Manpower
  resourcesData: Resources;
  
  // Photos
  photosLocations: MasterPhotoLocation[];
  
  // Issues
  constructionIssues: MasterConstructionIssue[];
  
  // Construction Progress (grouped by project)
  constructionProgress: Record<string, {
    projectInfo: {
      project: string;
      subtitle: string;
    };
    items: MasterConstructionProgressItem[];
  }>;
  
  // Metadata
  metadata: MasterReportMetadata;
  
  // Cover & Letter data (simplified for master view)
  coverData: {
    projectName: string;
    reportTitle: string;
    weekNumber: string;
    dateRange: string;
    contractorName: string;
    clientName: string;
  };
  
  letterData: {
    projectName: string;
    weekNumber: string;
    recipientCompany: string;
    letterBody: string;
  };
}

/**
 * Transform a MasterActivityItem to ActivityRow format
 */
const transformActivity = (item: MasterActivityItem): MasterActivityRow => ({
  id: crypto.randomUUID(),
  description: item.description || '',
  percent: item.percent || 0,
  percentage: item.percentage || `${item.percent || 0}%`,
  source: (item.source as "manual" | "bulk" | "construction-progress") || 'manual',
  addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
  _projectSource: item.projectSource,
  displayId: '-',
  indentLevel: 0,
});

/**
 * Create a ManPowerEntry from aggregated total
 */
const createManPowerEntry = (total: number, description: string): ManPowerEntry => ({
  description,
  date: { fri: 0, sat: 0, sun: 0, mon: 0, tue: 0, wed: 0, thu: 0 },
  prevWeek: 0,
  thisWeek: total,
  accumulated: total,
});

/**
 * Transform MasterWeeklyReport into format usable by WeeklyReportContent
 */
export const transformMasterToReportData = (master: MasterWeeklyReport): TransformedMasterData => {
  const { aggregated, reports, folder, weekNumber } = master;
  
  // Get project names for metadata
  const projectNames = reports.map(r => r.projectName);
  const projectCount = reports.length;
  
  // Calculate totals
  const totalActivities = aggregated.activities.weeklyActivities.length;
  const totalIssues = aggregated.issues.length;
  const totalManpower = aggregated.manpower.grandTotal;
  
  // Transform activities with project source
  const weeklyActivities = aggregated.activities.weeklyActivities.map(transformActivity);
  const nextWeekPlan = aggregated.activities.nextWeekPlan.map(transformActivity);
  
  // Transform progress - show weighted average as main progress + per-project breakdown
  const overallProgressRows: MasterProgressRow[] = [
    // Title row for weighted average
    {
      id: 'master-weighted',
      description: `📊 Weighted Average Progress (across ${projectCount} projects)`,
      pctUpToThisWeek: aggregated.progress.weighted,
      upToThisWeek: aggregated.progress.weighted,
      rowType: 'title',
      displayIndex: 'I.',
      isCustomInput: false,
    },
    // Detail rows for each project
    ...reports.map((report, index): MasterProgressRow => ({
      id: `project-${report.projectId}`,
      description: `  └─ ${report.projectName}`,
      pctUpToThisWeek: aggregated.progress.perProject[report.projectId] || 0,
      upToThisWeek: aggregated.progress.perProject[report.projectId] || 0,
      rowType: 'detail',
      displayIndex: `${index + 1}.`,
      isCustomInput: false,
      _projectSource: report.projectName,
      _projectId: report.projectId,
    })),
  ];
  
  // Transform resources - use aggregated totals
  const resourcesData: Resources = {
    manPower: {
      dateRange: `Week ${weekNumber}`,
      managementTeam: aggregated.manpower.managementTotal > 0 
        ? [createManPowerEntry(aggregated.manpower.managementTotal, 'Management Team (Aggregated)')]
        : [],
      workingTeamInterior: aggregated.manpower.workingInteriorTotal > 0
        ? [createManPowerEntry(aggregated.manpower.workingInteriorTotal, 'Working Team - Interior (Aggregated)')]
        : [],
      workingTeamMEP: aggregated.manpower.workingMEPTotal > 0
        ? [createManPowerEntry(aggregated.manpower.workingMEPTotal, 'Working Team - MEP (Aggregated)')]
        : [],
    },
    material: [], // Not aggregated in master report
    machinery: [], // Not aggregated in master report
  };
  
  // Transform photos - flatten and tag with project source
  const photosLocations: MasterPhotoLocation[] = Object.entries(aggregated.photos).flatMap(
    ([projectName, locations]) =>
      locations.map(loc => ({
        ...loc,
        title: loc.title || loc.location || `${projectName} Site Photos`,
        location: loc.location || projectName,
        _projectSource: projectName,
      }))
  );
  
  // Transform issues with project attribution
  const constructionIssues: MasterConstructionIssue[] = aggregated.issues.map((issue, index): MasterConstructionIssue => ({
    id: crypto.randomUUID(),
    issueNumber: typeof issue.no === 'number' ? issue.no : (parseInt(issue.no as string) || index + 1),
    location: issue.location || '',
    problem: issue.problem || '',
    actionBy: issue.actionBy || '',
    _projectSource: issue.projectSource,
  }));
  
  // Build metadata
  const metadata: MasterReportMetadata = {
    folderName: folder.name,
    folderId: folder._id,
    weekNumber,
    projectCount,
    weightedProgress: aggregated.progress.weighted,
    projectNames,
    totalActivities,
    totalIssues,
    totalManpower,
  };
  
  // Build cover data for master view
  const coverData = {
    projectName: folder.name,
    reportTitle: `Master Weekly Report - Week ${weekNumber}`,
    weekNumber: weekNumber.toString(),
    dateRange: `${projectCount} Projects`,
    contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
    clientName: folder.companyId || 'Multiple Clients',
  };
  
  // Build letter data
  const letterData = {
    projectName: folder.name,
    weekNumber: weekNumber.toString(),
    recipientCompany: 'Project Stakeholders',
    letterBody: `This Master Weekly Report aggregates data from ${projectCount} projects within the ${folder.name} folder for Week ${weekNumber}. The weighted average progress across all projects is ${aggregated.progress.weighted.toFixed(1)}% based on manpower distribution.`,
  };
  
  // Build progress remark
  const overallProgressRemark = `Weighted Average: ${aggregated.progress.weighted.toFixed(1)}% | Total Manpower: ${totalManpower} | Activities: ${totalActivities} | Issues: ${totalIssues}`;
  
  return {
    weeklyActivities,
    nextWeekPlan,
    overallProgressRows,
    overallProgressRemark,
    resourcesData,
    photosLocations,
    constructionIssues,
    constructionProgress: aggregated.constructionProgress || {},
    metadata,
    coverData,
    letterData,
  };
};

/**
 * Generate a summary card data for master report dashboard view
 */
export const generateMasterSummaryCards = (data: TransformedMasterData) => [
  {
    label: 'Projects Reporting',
    value: data.metadata.projectCount,
    icon: 'Activity',
    color: 'blue',
  },
  {
    label: 'Weighted Progress',
    value: `${data.metadata.weightedProgress.toFixed(1)}%`,
    icon: 'BarChart3',
    color: 'green',
  },
  {
    label: 'Total Manpower',
    value: data.metadata.totalManpower,
    icon: 'Users',
    color: 'purple',
  },
  {
    label: 'Activities This Week',
    value: data.metadata.totalActivities,
    icon: 'ClipboardList',
    color: 'orange',
  },
  {
    label: 'Open Issues',
    value: data.metadata.totalIssues,
    icon: 'AlertTriangle',
    color: 'red',
  },
  {
    label: 'Photo Groups',
    value: data.photosLocations.length,
    icon: 'Camera',
    color: 'pink',
  },
];

export default transformMasterToReportData;
