// src/utils/masterReportTransform.ts
// Transform MasterWeeklyReport data into WeeklyReportContentProps format

import { MasterWeeklyReport, MasterActivityItem, MasterIssueItem, PhotoLocation, MasterConstructionProgressItem, MasterReportCoverData, MasterHses, MasterQaqcSection } from '@/types/masterReport.types';
import { ActivityRow } from '@/types/activity.types';
import { ProgressRow } from '@/types/progress.types';
import { Resources } from '@/types/resources.types';

/**
 * Calculate indentation level based on ID pattern (copied from constructionProgressToActivities.ts)
 * - Roman numerals (I, II, III) -> level 0
 * - Plain numbers (1, 2, 3) -> level 0  
 * - Single dot (1.1, 2.1) -> level 0 (parent)
 * - Two dots (1.1.1, 1.1.2) -> level 1 (child, shows 1.1 as parent)
 * - Alpha (A, B, C) -> display "-" with level 3 (child of 1.1.1)
 */
function calculateIndentLevel(id: string): { level: number; displayId: string } {
  if (!id) return { level: 0, displayId: id };
  
  const trimmed = id.trim();
  
  // Check if it's an alpha ID (single letter A-Z) but NOT a Roman numeral
  // Roman numerals: I, V, X, L, C, D, M (and combinations like II, III, IV, etc.)
  // Only multi-character Roman numerals count (I and V are exceptions as common single-char numerals)
  const isRomanNumeral = trimmed.length > 1 && 
    /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(trimmed);
  const isCommonSingleCharRoman = /^(I|V)$/i.test(trimmed); // I and V are commonly used as single-char
    
  if (/^[a-zA-Z]$/i.test(trimmed) && !isRomanNumeral && !isCommonSingleCharRoman) {
    return { level: 3, displayId: "-" }; // Alpha becomes "-" with level 3 indent
  }
  
  // Count dots in the ID
  const dotCount = (trimmed.match(/\./g) || []).length;
  
  // Level 1 (no dots): I, II, 1, 2, 3 -> level 0
  if (dotCount === 0) {
    return { level: 0, displayId: trimmed };
  }
  
  // Level 2 (one dot): 1.1, 2.1 -> level 0 (parent)
  if (dotCount === 1) {
    return { level: 0, displayId: trimmed };
  }
  
  // Level 3+ (two or more dots): 1.1.1, 1.1.2 -> level 1 (indented to show 1.1 as parent)
  return { level: 1, displayId: trimmed };
}
import { selectMasterCoverImage, ReportWithCover, isValidCoverImage, constructImageUrl, DEFAULT_MASTER_COVER_IMAGES } from '@/utils/imageUtils';
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
      date?: string;
      revision?: string;
    };
    items: MasterConstructionProgressItem[];
  }>;
  
  // Metadata
  metadata: MasterReportMetadata;
  
  // Cover & Letter data (simplified for master view)
  coverData: MasterReportCoverData;
  
  letterData: {
    projectName: string;
    weekNumber: string;
    recipientCompany: string;
    letterBody: string;
  };
  
  // Introduction data (from latest or selected weekly report)
  introduction: {
    projectOverview: string;
    designConstruction: string;
  };

  // Aggregated QAQC data in backend format (keyed by section: ncr, car, …)
  aggregatedQaqcData: Record<string, MasterQaqcSection>;

  // Aggregated HSES data combined from all project reports
  aggregatedHsesData: MasterHses;

  // Full reports array for accessing individual report details
  reports: MasterProjectSummary[];
}

/**
 * Transform a MasterActivityItem to ActivityRow format
 */
const transformActivity = (item: MasterActivityItem): MasterActivityRow => {
  // Calculate proper ID display and indentation level
  const { displayId, level } = calculateIndentLevel(item.id || '');
  
  return {
    id: crypto.randomUUID(),
    description: item.description || '',
    percent: item.percent || 0,
    percentage: item.percentage || `${item.percent || 0}%`,
    source: (item.source as "manual" | "bulk" | "construction-progress") || 'manual',
    addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
    _projectSource: item.projectSource,
    displayId,
    indentLevel: level,
    sourceId: item.id, // Preserve original ID for reference
  };
};

/**
 * Transform MasterWeeklyReport into format usable by WeeklyReportContent
 */
export const transformMasterToReportData = (master: MasterWeeklyReport & { availableCoverImages?: any[] }): TransformedMasterData => {
  const { aggregated, reports, folder, weekNumber, availableCoverImages: backendCoverImages } = master;
  
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
  
  // Transform issues with project attribution.
  // Filter out empty placeholders first so numbering is globally continuous.
  const constructionIssues: MasterConstructionIssue[] = aggregated.issues
    .filter(issue =>
      (issue.location || '').trim() ||
      (issue.problem  || '').trim() ||
      (issue.actionBy || '').trim()
    )
    .map((issue, index): MasterConstructionIssue => ({
      id: crypto.randomUUID(),
      issueNumber: index + 1,
      location: issue.location || '',
      problem:  issue.problem  || '',
      actionBy: issue.actionBy || '',
      photo:    issue.photo    || null,
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
  
  // Extract unique employer names from reports
  const uniqueEmployers = [...new Set(reports
    .map(report => report.employer)
    .filter(employer => employer && employer.trim() !== '')
  )];
  
  // Build client name string
  const clientName = uniqueEmployers.length === 0 
    ? 'Multiple Clients' 
    : uniqueEmployers.length === 1 
    ? uniqueEmployers[0]
    : uniqueEmployers.slice(0, 2).join(', ') + (uniqueEmployers.length > 2 ? ` +${uniqueEmployers.length - 2} more` : '');

  // Derive the master date range from each report's cover.dateRange string
  // (e.g. "17-Apr-26 ~ 23-Apr-26") — this is what the user actually entered and
  // what each individual report displays, so it is the authoritative value.
  // The model-level startDate/endDate fields are NOT reliable (they can reflect
  // creation/query time rather than the actual week dates).
  const parseCoverDateRange = (str: string): { start: Date | null; end: Date | null } => {
    const m = str?.match(/(\d{1,2}-[A-Za-z]{3}-\d{2})\s*~\s*(\d{1,2}-[A-Za-z]{3}-\d{2})/);
    if (!m) return { start: null, end: null };
    const toDate = (part: string): Date | null => {
      const [day, month, year] = part.split('-');
      const d = new Date(`${month} ${day}, 20${year}`);
      return isNaN(d.getTime()) ? null : d;
    };
    return { start: toDate(m[1]), end: toDate(m[2]) };
  };

  const parsedRanges = reports
    .map(r => parseCoverDateRange(r.cover?.dateRange || ''))
    .filter(dr => dr.start && dr.end) as { start: Date; end: Date }[];

  const allStarts = parsedRanges.map(dr => dr.start);
  const allEnds   = parsedRanges.map(dr => dr.end);

  // Fallback: use model-level startDate/endDate if no cover dateRange strings exist
  const fallbackDates = parsedRanges.length === 0
    ? reports.flatMap(r => {
        const dates: Date[] = [];
        if (r.startDate) dates.push(new Date(r.startDate));
        if (r.endDate)   dates.push(new Date(r.endDate));
        return dates;
      }).filter(d => !isNaN(d.getTime()))
    : [];

  const minDate = allStarts.length > 0
    ? new Date(Math.min(...allStarts.map(d => d.getTime())))
    : fallbackDates.length > 0 ? new Date(Math.min(...fallbackDates.map(d => d.getTime()))) : null;

  const maxDate = allEnds.length > 0
    ? new Date(Math.max(...allEnds.map(d => d.getTime())))
    : fallbackDates.length > 0 ? new Date(Math.max(...fallbackDates.map(d => d.getTime()))) : null;

  // Format using app-wide DD-MMM-YY ~ DD-MMM-YY convention
  const formatDate = (date: Date) => {
    const day   = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year  = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const dateRange = minDate && maxDate
    ? `${formatDate(minDate)} ~ ${formatDate(maxDate)}`
    : `Week ${weekNumber}`;

  // Transform resources - use per-description merged arrays from backend
  const backendResources = aggregated.resources;
  const resourcesData: Resources = {
    manPower: {
      dateRange,
      managementTeam:      backendResources?.manPower?.managementTeam      ?? [],
      workingTeamInterior: backendResources?.manPower?.workingTeamInterior  ?? [],
      workingTeamMEP:      backendResources?.manPower?.workingTeamMEP       ?? [],
    },
    material:  backendResources?.material  ?? [],
    machinery: backendResources?.machinery ?? [],
  };

  // Select cover image using priority strategy
  // 1. Try submitted reports first, then any report with valid image
  // 2. Map reports to include cover information from nested cover object

  const reportsWithCover: ReportWithCover[] = reports.map(report => ({
    projectId: report.projectId,
    projectName: report.projectName,
    status: report.status,
    startDate: report.startDate,
    endDate: report.endDate,
    createdAt: report.createdAt || report.startDate,
    submittedAt: report.submittedAt || report.endDate,
    cover: report.cover,
    // Also check direct coverImage field
    coverImage: (report as any).coverImage
  }));
  
  const selectedReport = selectMasterCoverImage(reportsWithCover, "submitted");
  
  // Extract employer and project name from the selected report's cover section
  const selectedEmployer = selectedReport?.cover?.employer || selectedReport?.employer || '';
  const selectedProjectName = selectedReport?.cover?.projectName || selectedReport?.projectName || folder.name;
  
  // Use selected employer only (single employer from selected report)
  const finalEmployer = selectedEmployer;
  
  // Get the cover image URL from the selected report
  const selectedCoverImage = selectedReport 
    ? constructImageUrl(selectedReport.coverImage || selectedReport.cover?.coverImage || '')
    : DEFAULT_MASTER_COVER_IMAGES.placeholder;

  // Use available cover images from backend, or fallback to extracting from reports.
  // Apply constructImageUrl so raw/relative paths become loadable absolute URLs.
  const rawAvailableCoverImages = backendCoverImages || reports
    .filter(r => r.cover?.coverImage && isValidCoverImage(r.cover.coverImage))
    .map(r => ({
      projectId: r.projectId,
      projectName: r.projectName,
      coverImage: r.cover?.coverImage || '',
      status: r.status,
      submittedAt: r.submittedAt,
    }));

  const availableCoverImages = rawAvailableCoverImages.map(img => ({
    ...img,
    coverImage: constructImageUrl(img.coverImage),
  }));


  // Build cover data for master view
  const coverData: MasterReportCoverData = {
    projectName: selectedProjectName,
    reportTitle: `Master Weekly Report - Week ${weekNumber}`,
    weekNumber: weekNumber.toString(),
    dateRange,
    coverImage: selectedCoverImage,
    clientLogo: '',
    projectTitle: selectedProjectName,
    employer: finalEmployer,
    contractorName: 'Cambodian Advanced Construction Project Management (CACPM) Co., Ltd',
    availableCoverImages,
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
  
  // Extract introduction data from the latest submitted report, or first available report
  // Sort reports by submittedAt (most recent first), or by createdAt if not submitted
  const sortedReports = [...reports].sort((a, b) => {
    const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return dateB - dateA;
  });
  
  const latestReport = sortedReports[0];
  const introduction = {
    projectOverview: latestReport?.introduction?.projectOverview || '',
    designConstruction: latestReport?.introduction?.designNConstruction || '',
  };
  
  // Expose aggregated QAQC data (backend format) so dashboard can pass it to WeeklyReportContent
  const aggregatedQaqcData: Record<string, MasterQaqcSection> = aggregated.qaqcStatus || {};

  // Expose aggregated HSES data
  const aggregatedHsesData: MasterHses = aggregated.hses || {
    training: [],
    inspection: [],
    permit: [],
    firstAidAccident: '',
    otherActivities: '',
  };

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
    introduction,
    aggregatedQaqcData,
    aggregatedHsesData,
    reports: master.reports || [],
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
