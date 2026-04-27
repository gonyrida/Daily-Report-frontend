/**
 * weeklyReportExcelMapper.ts
 * Place at: src/lib/weeklyReportExcelMapper.ts
 *
 * Maps your existing hook state → WeeklyReportExportData for the Excel export.
 * Adjust the field names to match your actual TypeScript types.
 */

import type { WeeklyReportExportData, QAQCSection } from "./weeklyreportexcel";

// Helper: Convert File object to base64 data URL
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper: Process image - if it's a File, convert to base64; if string, return as-is
async function processImage(img: unknown): Promise<string | undefined> {
  if (!img) return undefined;

  // If it's already a string (base64 or URL), return it
  if (typeof img === 'string') {
    return img;
  }

  // If it's a File object, convert to base64
  if (img instanceof File || (typeof img === 'object' && img !== null && 'size' in img && 'type' in img)) {
    try {
      const file = img as File;
      console.log(`Converting File to base64: ${file.name}, size: ${file.size}`);
      const base64 = await fileToBase64(file);
      console.log(`File converted successfully, base64 length: ${base64.length}`);
      return base64;
    } catch (err) {
      console.error('Failed to convert File to base64:', err);
      return undefined;
    }
  }

  return undefined;
}

export interface MapperInput {
  // from useCoverData()
  coverData?: {
    weekNumber?: number | string;
    reportDateFrom?: string;
    reportDateTo?: string;
    projectTitle?: string;
    projectSubtitle?: string;
    projectSubtitle2?: string;
    employer?: string;
    consultant?: string;
    contractor?: string;
    coverImage?: string;         // Cover image URL or base64 data
    clientLogo?: string;         // Client logo URL or base64 data
    signatureImage?: string;     // Signature image URL or base64 data
    constructorName?: string;     // Constructor name
    companyLocation?: string;     // Company location
    companyPhone1?: string;      // Company phone 1
    companyPhone2?: string;      // Company phone 2
    companyEmail1?: string;       // Company email 1
    companyEmail2?: string;       // Company email 2
    refNo?: string;
    letterDate?: string;
    toName?: string;
    attName?: string;
    ccLines?: string[];
    projectManager?: string;
    recipientCompany?: string;
    recipientLocation?: string;
    [k: string]: unknown;
  };

  // Construction progress metadata
  conProgressProject?: string;
  conProgressSubtitle?: string;
  conProgressDate?: string;
  conProgressRevision?: string;

  // from useConstructionProgress()
  constructionProgress?: Array<{
    id?: string;
    scopeOfWorks?: string;
    description?: string;
    detailDescription?: string;
    unit?: string;
    boQ?: {
      qty?: number | string;
      materialRate?: number | string;
      laborRate?: number | string;
      unitRate?: number | string;
      amount?: number | string;
    };
    reviseBoqQty?: number | string;
    qty?: number | string;
    materialRate?: number | string;
    laborRate?: number | string;
    unitRate?: number | string;
    amount?: number | string;
    remark?: string;
    remarks?: string;
    previousWeek?: {
      qty?: number | string;
      amount?: number | string;
      percentage?: number | string;
    };
    previousWeekQty?: number | string;
    previousWeekAmount?: number | string;
    previousWeekPct?: number | string;
    thisWeek?: {
      qty?: number | string;
      amount?: number | string;
      percentage?: number | string;
    };
    thisWeekQty?: number | string;
    thisWeekAmount?: number | string;
    thisWeekPct?: number | string;
    upToThisWeek?: {
      qty?: number | string;
      amount?: number | string;
      percentage?: number | string;
    };
    upToThisWeekQty?: number | string;
    upToThisWeekAmount?: number | string;
    upToThisWeekPct?: number | string;
    remaining?: {
      qty?: number | string;
      amount?: number | string;
      percentage?: number | string;
    };
    remainingQty?: number | string;
    remainingAmount?: number | string;
    remainingPct?: number | string;
    nextWeekPlan?: {
      qty?: number | string;
      amount?: number | string;
      percentage?: number | string;
    };
    nextWeekQty?: number | string;
    nextWeekAmount?: number | string;
    nextWeekPct?: number | string;
    upToNextWeekPlan?: {
      qty?: number | string;
      amount?: number | string;
      percentage?: number | string;
    };
    upToNextWeekQty?: number | string;
    upToNextWeekAmount?: number | string;
    upToNextWeekPct?: number | string;
    isBold?: boolean;
    [k: string]: unknown;
  }>;

  // from useOverallProgress()
  overallProgress?: Array<{
    no?: string;
    scopeOfWorks?: string;
    description?: string;
    pctUpToPrevWeek?: number | string;
    prevWeek?: number | string;
    pctThisWeek?: number | string;
    thisWeek?: number | string;
    pctUpToThisWeek?: number | string;
    upToThisWeek?: number | string;
    pctRemaining?: number | string;
    remaining?: number | string;
    pctNextWeekPlan?: number | string;
    nextWeek?: number | string;
    pctUpNextWeekPlan?: number | string;
    upNextWeek?: number | string;
    rowType?: "title" | "detail" | "subDetail";
    displayIndex?: string;
    sourceId?: string;
    searchTerm?: string;
    isCustomInput?: boolean;
    [k: string]: unknown;
  }>;
  overallProgressRemark?: string;

  // from useActivities() / useWeeklyReportContent()
  nwdpItems?: Array<{
    sourceId?: string;
    workDoneLabel?: string;
    label?: string;
    activity?: string;
    workDonePct?: number | string;
    donePct?: number | string;
    nextWeekLabel?: string;
    nextLabel?: string;
    nextWeekPct?: number | string;
    planPct?: number | string;
    [k: string]: unknown;
  }>;

  // from useQaqcApi()
  qaqcSections?: QAQCSection[];

  // from useHsesData()
  hseTraining?: Array<{
    typeOfTraining?: string;
    type?: string;
    date?: string;
    venue?: string;
    trainer?: string;
    attendee?: number | string;
    count?: number | string;
    remarks?: string;
    [k: string]: unknown;
  }>;
  hseInspection?: Array<{
    typeOfInspection?: string;
    type?: string;
    date?: string;
    inspector?: string;
    remarks?: string;
    [k: string]: unknown;
  }>;
  hsePermits?: Array<{
    typeOfPermit?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    inspector?: string;
    approver?: string;
    remarks?: string;
    [k: string]: unknown;
  }>;
  hseFirstAid?: string;
  hseOtherConcerns?: string;
  // ReferenceSection format: [{ id, title, entries: [{ id, slots: [{ id, image, caption }] }] }]
  hsePhotoReferences?: {
    hseToolboxMeeting?: any[];
    hseActivityPhotos?: any[];
  };

  // from useResourceTable()
  weekDates?: string[];
  manpowerRows?: Array<{
    description?: string;
    label?: string;
    dailyCounts?: (number | string)[];
    counts?: (number | string)[];
    previousWeek?: number | string;
    prev?: number | string;
    thisWeek?: number | string;
    current?: number | string;
    upToThisWeek?: number | string;
    cumulative?: number | string;
    [k: string]: unknown;
  }>;
  materialRows?: Array<{
    description?: string;
    name?: string;
    unit?: string;
    dailyData?: (number | string)[];
    dailyCounts?: (number | string)[];
    daily?: (number | string)[];
    days?: (number | string)[];
    previous?: number | string;
    prev?: number | string;
    thisPeriod?: number | string;
    current?: number | string;
    accumulate?: number | string;
    total?: number | string;
    [k: string]: unknown;
  }>;
  equipmentRows?: Array<{
    description?: string;
    name?: string;
    unit?: string;
    dailyData?: (number | string)[];
    dailyCounts?: (number | string)[];
    daily?: (number | string)[];
    days?: (number | string)[];
    previous?: number | string;
    prev?: number | string;
    thisPeriod?: number | string;
    current?: number | string;
    accumulate?: number | string;
    total?: number | string;
    [k: string]: unknown;
  }>;

  // from site photos state
  sitePhotoCaptions?: Array<{
    siteLocation?: string;
    location?: string;
    caption1?: string;
    caption2?: string;
    image1?: string;  // Base64 image data or URL for left photo
    image2?: string;  // Base64 image data or URL for right photo
    [k: string]: unknown;
  }>;

  // from useConstructionIssue()
  constructionIssues?: Array<{
    number?: number | string;
    no?: number | string;
    siteLocation?: string;
    location?: string;
    problemDescription?: string;
    description?: string;
    issue?: string;
    actionBy?: string;
    action?: string;
    photo?: string | File | null;
    [k: string]: unknown;
  }>;

  // from Introduction component
  projectOverview?: string;
  designConstruction?: string;
  designList?: string[];
}

// Converts ReferenceSection format → HSEPhotoEntry[] expected by buildHSE.
// Input sections: [{ id, title, entries: [{ id, slots: [{ id, image, caption }] }] }]
// Output:         [{ images: string[], descriptions: string[] }]  — one entry per photo row (2 images per row)
function referenceSectionsToPhotoEntries(sections: any[]): { images: string[]; descriptions: string[] }[] {
  const result = sections.flatMap((section: any) =>
    (section.entries ?? []).map((entry: any) => {
      const images = (entry.slots ?? []).map((s: any) => s.image || '').filter(Boolean);
      const descriptions = (entry.slots ?? []).map((s: any) => s.caption || '');

      return {
        images,
        descriptions
      };
    })
  );

  return result;
}

// Cache for valid construction progress data
let cachedConProgressItems: any[] = [];

// Cache for valid HSE photo data to prevent overwriting with empty data
let cachedHSEPhotoReferences: any = null;

export async function buildWeeklyReportExportData(input: MapperInput): Promise<WeeklyReportExportData> {
  // Debug: Add stack trace to identify caller
  const stack = new Error().stack;
  const caller = stack?.split('\n')[2]?.trim() || 'unknown';

  const c = input.coverData ?? {};

  const result = {
    // ── Cover ────────────────────────────────────────────────────────────────
    weekNumber: c.weekNumber,
    reportDateFrom: c.reportDateFrom,
    reportDateTo: c.reportDateTo,
    projectTitle: c.projectTitle,
    projectSubtitle: c.projectSubtitle,
    projectSubtitle2: c.projectSubtitle2,
    employer: c.employer,
    consultant: c.consultant,
    contractor: c.contractor,
    coverImage: c.coverImage,        // Map cover image
    clientLogo: c.clientLogo,        // Map client logo
    signatureImage: c.signatureImage,    // Map signature image
    refNo: c.refNo,
    letterDate: c.letterDate,
    toName: c.toName,
    recipientName: c.attName,
    ccLines: c.ccLines ?? [],
    projectManager: c.projectManager,
    constructorName: c.constructorName,
    companyLocation: c.companyLocation,
    companyPhone1: c.companyPhone1,
    companyPhone2: c.companyPhone2,
    companyEmail1: c.companyEmail1,
    companyEmail2: c.companyEmail2,
    recipientCompany: c.recipientCompany,
    recipientLocation: c.recipientLocation,

    // ── Con. Progress ────────────────────────────────────────────────────────
    conProgressProject: input.conProgressProject ?? c.projectTitle,
    conProgressSubtitle: input.conProgressSubtitle,
    conProgressDate: input.conProgressDate ?? c.reportDateFrom,
    conProgressRevision: input.conProgressRevision,
    conProgressItems: (() => {
      // Cache valid data when available
      if (input.constructionProgress && input.constructionProgress.length > 0) {
        cachedConProgressItems = input.constructionProgress.map(p => ({
          id: p.id,
          scopeOfWorks: p.scopeOfWorks ?? p.description,
          detailDescription: p.detailDescription,
          unit: p.unit,
          reviseBoqQty: p.boQ?.qty ?? p.reviseBoqQty ?? p.qty,
          materialRate: p.boQ?.materialRate ?? p.materialRate,
          laborRate: p.boQ?.laborRate ?? p.laborRate,
          unitRate: p.boQ?.unitRate ?? p.unitRate,
          amount: p.boQ?.amount ?? p.amount,
          remark: p.remark ?? p.remarks,
          previousWeekQty: p.previousWeek?.qty ?? p.previousWeekQty,
          previousWeekAmount: p.previousWeek?.amount ?? p.previousWeekAmount,
          previousWeekPct: p.previousWeek?.percentage ?? p.previousWeekPct,
          thisWeekQty: p.thisWeek?.qty ?? p.thisWeekQty,
          thisWeekAmount: p.thisWeek?.amount ?? p.thisWeekAmount,
          thisWeekPct: p.thisWeek?.percentage ?? p.thisWeekPct,
          upToThisWeekQty: p.upToThisWeek?.qty ?? p.upToThisWeekQty,
          upToThisWeekAmount: p.upToThisWeek?.amount ?? p.upToThisWeekAmount,
          upToThisWeekPct: p.upToThisWeek?.percentage ?? p.upToThisWeekPct,
          remainingQty: p.remaining?.qty ?? p.remainingQty,
          remainingAmount: p.remaining?.amount ?? p.remainingAmount,
          remainingPct: p.remaining?.percentage ?? p.remainingPct,
          nextWeekQty: p.nextWeekPlan?.qty ?? p.nextWeekQty,
          nextWeekAmount: p.nextWeekPlan?.amount ?? p.nextWeekAmount,
          nextWeekPct: p.nextWeekPlan?.percentage ?? p.nextWeekPct,
          upToNextWeekQty: p.upToNextWeekPlan?.qty ?? p.upToNextWeekQty,
          upToNextWeekAmount: p.upToNextWeekPlan?.amount ?? p.upToNextWeekAmount,
          upToNextWeekPct: p.upToNextWeekPlan?.percentage ?? p.upToNextWeekPct,
          isBold: p.isBold,
        }));
        return cachedConProgressItems;
      }

      // Use cached data if current data is empty
      if (cachedConProgressItems.length > 0) {
        return cachedConProgressItems;
      }

      return [];
    })(),

    // ── Overall Progress ─────────────────────────────────────────────────────
    overallProgressRemark: input.overallProgressRemark,
    overallProgressItems: (() => {
      const filtered = (input.overallProgress ?? [])
        .filter(row => {
          // Remove the overly aggressive filter - keep all rows for now
          // If you need to filter, do it based on actual business logic
          return true;
        })
        .map((p, i) => ({
          no: p.no ?? p.displayIndex ?? String(i + 1),
          scopeOfWorks: p.description ?? p.scopeOfWorks,
          pctUpToPrevWeek: String(p.pctUpToPrevWeek ?? p.prevWeek ?? ''),
          pctThisWeek: String(p.pctThisWeek ?? p.thisWeek ?? ''),
          pctUpToThisWeek: String(p.pctUpToThisWeek ?? p.upToThisWeek ?? ''),
          pctRemaining: String(p.pctRemaining ?? p.remaining ?? ''),
          pctNextWeekPlan: String(p.pctNextWeekPlan ?? p.nextWeek ?? ''),
          pctUpNextWeekPlan: String(p.pctUpNextWeekPlan ?? p.upNextWeek ?? ''),
        }));
      return filtered;
    })(),

    // ── NWDP ─────────────────────────────────────────────────────────────────
    nwdpItems: (input.nwdpItems ?? []).map(item => ({
      id: item.sourceId,
      workDoneLabel: item.workDoneLabel ?? item.label ?? item.activity,
      workDonePct: String(item.workDonePct ?? item.donePct ?? ''),
      nextWeekLabel: item.nextWeekLabel ?? item.nextLabel,
      nextWeekPct: String(item.nextWeekPct ?? item.planPct ?? ''),
    })),

    // ── QAQC ─────────────────────────────────────────────────────────────────
    qaqcSections: input.qaqcSections ?? [],

    // ── HSE ──────────────────────────────────────────────────────────────────
    hseTraining: (input.hseTraining ?? []).map(row => ({
      typeOfTraining: row.typeOfTraining ?? row.type,
      date: row.date,
      venue: row.venue,
      trainer: row.trainer,
      attendee: row.attendee ?? row.count,
      remarks: row.remarks,
    })),
    hseInspection: (input.hseInspection ?? []).map(row => ({
      typeOfInspection: row.typeOfInspection ?? row.type,
      date: row.date,
      inspector: row.inspector,
      remarks: row.remarks,
    })),
    hsePermits: (input.hsePermits ?? []).map(row => ({
      typeOfPermit: row.typeOfPermit ?? row.type,
      startDate: row.startDate,
      endDate: row.endDate,
      inspector: row.inspector,
      approver: row.approver,
      remarks: row.remarks,
    })),
    hseFirstAid: input.hseFirstAid,
    hseOtherConcerns: input.hseOtherConcerns,
    hsePhotoReferences: (() => {
      // Better caching: Update cache when we have valid data, use cache when data is empty
      const currentHsePhotoRefs = input.hsePhotoReferences;
      const hasValidData = currentHsePhotoRefs && (
        (currentHsePhotoRefs.hseToolboxMeeting && currentHsePhotoRefs.hseToolboxMeeting.length > 0) ||
        (currentHsePhotoRefs.hseActivityPhotos && currentHsePhotoRefs.hseActivityPhotos.length > 0)
      );

      // Update cache when we have valid data
      if (hasValidData) {
        cachedHSEPhotoReferences = currentHsePhotoRefs;
      }

      // Use cached data if current data is empty and we have cached data
      const dataToUse = (!hasValidData && cachedHSEPhotoReferences) ? cachedHSEPhotoReferences : currentHsePhotoRefs;

      return {
        hseToolboxMeeting: referenceSectionsToPhotoEntries(dataToUse?.hseToolboxMeeting ?? []),
        hseActivityPhotos: referenceSectionsToPhotoEntries(dataToUse?.hseActivityPhotos ?? []),
      };
    })(),

    // ── Resources ────────────────────────────────────────────────────────────
    weekDates: input.weekDates,
    manpowerRows: (input.manpowerRows ?? []).map(row => ({
      description: row.description ?? row.label,
      dailyCounts: row.dailyCounts ?? row.counts ?? [0, 0, 0, 0, 0, 0, 0],
      previousWeek: row.previousWeek ?? row.prev,
      thisWeek: row.thisWeek ?? row.current,
      upToThisWeek: row.upToThisWeek ?? row.cumulative,
    })),
    materialRows: (input.materialRows ?? []).map(row => ({
      description: row.description ?? row.name,
      unit: row.unit,
      dailyData: row.dailyData ?? row.dailyCounts ?? row.daily ?? row.days ?? [0, 0, 0, 0, 0, 0, 0],
      previous: row.previous ?? row.prev,
      thisPeriod: row.thisPeriod ?? row.current,
      accumulate: row.accumulate ?? row.total,
    })),
    equipmentRows: (input.equipmentRows ?? []).map(row => ({
      description: row.description ?? row.name,
      unit: row.unit,
      dailyData: row.dailyData ?? row.dailyCounts ?? row.daily ?? row.days ?? [0, 0, 0, 0, 0, 0, 0],
      previous: row.previous ?? row.prev,
      thisPeriod: row.thisPeriod ?? row.current,
      accumulate: row.accumulate ?? row.total,
    })),

    // ── Site Photos ───────────────────────────────────────────────────────────
    sitePhotoCaptions: await (async () => {
      const mapped = await Promise.all((input.sitePhotoCaptions ?? []).map(async (e, i) => {
        // Process images - convert File objects to base64
        const processedImg1 = await processImage(e.image1);
        const processedImg2 = await processImage(e.image2);

        console.log(`SitePhoto ${i} processed:`, {
          hasImage1: !!processedImg1,
          hasImage2: !!processedImg2,
        });

        return {
          siteLocation: e.siteLocation ?? e.location,
          caption1: e.caption1,
          caption2: e.caption2,
          image1: processedImg1,
          image2: processedImg2,
        };
      }));
      return mapped;
    })(),

    // ── Construction Issues ───────────────────────────────────────────────────
    constructionIssues: (input.constructionIssues ?? []).map((issue, i) => ({
      number: issue.number ?? issue.no ?? i + 1,
      siteLocation: issue.siteLocation ?? issue.location,
      problemDescription: issue.problemDescription ?? issue.description ?? issue.issue,
      actionBy: issue.actionBy ?? issue.action,
      photo: typeof issue.photo === 'string' ? issue.photo : undefined,
    })),

    // ── Introduction (1.Intro) ───────────────────────────────────────────────
    projectOverview: input.projectOverview,
    designConstruction: input.designConstruction,
    designList: input.designList,
  };

  return result;
}