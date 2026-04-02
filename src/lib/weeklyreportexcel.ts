/**
 * weeklyReportExcel.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a Weekly Progress Report Excel file that exactly matches the
 * ICT-WEEKLY_REPORT template: 12 sheets, same names, tab colors, layout.
 *
 * Install:  npm install exceljs file-saver
 * Place at: src/lib/weeklyReportExcel.ts
 *
 * Usage:
 *   import { exportWeeklyReportToExcel } from "@/lib/weeklyReportExcel";
 *   exportWeeklyReportToExcel(data);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface WeeklyReportExportData {
  // ── Cover / Header ──────────────────────────────────────────────────────────
  weekNumber?: number | string;
  reportDateFrom?: string;       // "13-Mar-26"
  reportDateTo?: string;         // "19-Mar-26"
  projectTitle?: string;
  projectSubtitle?: string;
  projectSubtitle2?: string;
  employer?: string;
  consultant?: string;
  contractor?: string;

  // ── Letter ──────────────────────────────────────────────────────────────────
  refNo?: string;
  letterDate?: string;
  toName?: string;
  toAddress?: string;
  attName?: string;
  ccLines?: string[];
  projectManager?: string;

  // ── Con. Progress ────────────────────────────────────────────────────────────
  conProgressProject?: string;
  conProgressSubtitle?: string;
  conProgressDate?: string;
  conProgressRevision?: string;
  conProgressItems?: ConProgressItem[];

  // ── 2.OP — Overall Progress ──────────────────────────────────────────────────
  overallProgressItems?: OverallProgressItem[];
  overallProgressRemark?: string;

  // ── 3.NWDP — Activities / Next Week Plan ─────────────────────────────────────
  nwdpItems?: NWDPItem[];

  // ── 4. QAQC ──────────────────────────────────────────────────────────────────
  qaqcSections?: QAQCSection[];

  // ── 5. HSE ───────────────────────────────────────────────────────────────────
  hseTraining?: HSETrainingRow[];
  hseInspection?: HSEInspectionRow[];
  hsePermits?: HSEPermitRow[];
  hseFirstAid?: string;
  hseOtherConcerns?: string;

  // ── 6. Resources ─────────────────────────────────────────────────────────────
  weekDates?: string[];           // 7 day-date strings e.g. ["13","14","15","16","17","18","19"]
  manpowerRows?: ManpowerRow[];
  materialRows?: MaterialRow[];
  equipmentRows?: EquipmentRow[];

  // ── 7. Site Activity Photos ───────────────────────────────────────────────────
  sitePhotoCaptions?: SitePhotoEntry[];

  // ── 8. Construction Issues ────────────────────────────────────────────────────
  constructionIssues?: ConstructionIssue[];
}

export interface ConProgressItem {
  id?: string;
  scopeOfWorks?: string;
  detailDescription?: string;
  unit?: string;
  reviseBoqQty?: number | string;
  materialRate?: number | string;
  laborRate?: number | string;
  unitRate?: number | string;
  amount?: number | string;
  remark?: string;
  thisWeekQty?: number | string;
  thisWeekAmount?: number | string;
  thisWeekPct?: number | string;
  nextWeekQty?: number | string;
  nextWeekAmount?: number | string;
  nextWeekPct?: number | string;
  upToNextWeekQty?: number | string;
  upToNextWeekAmount?: number | string;
  upToNextWeekPct?: number | string;
}

export interface OverallProgressItem {
  no?: string;
  scopeOfWorks?: string;
  pctUpToPrevWeek?: number | string;
  pctThisWeek?: number | string;
  pctUpToThisWeek?: number | string;
  pctRemaining?: number | string;
  pctNextWeekPlan?: number | string;
  pctUpNextWeekPlan?: number | string;
}

export interface NWDPItem {
  workDoneLabel?: string;
  workDonePct?: number | string;
  nextWeekLabel?: string;
  nextWeekPct?: number | string;
}

export interface QAQCSection {
  sectionTitle?: string;
  codeHeader?: string;
  statusHeader?: string;
  dateHeader?: string;
  items?: QAQCItem[];
  comments?: string;
}

export interface QAQCItem {
  code?: string;
  description?: string;
  status?: string;
  date?: string;
}

export interface HSETrainingRow {
  typeOfTraining?: string;
  date?: string;
  venue?: string;
  trainer?: string;
  attendee?: number | string;
  remarks?: string;
}

export interface HSEInspectionRow {
  typeOfInspection?: string;
  date?: string;
  inspector?: string;
  remarks?: string;
}

export interface HSEPermitRow {
  typeOfPermit?: string;
  startDate?: string;
  endDate?: string;
  inspector?: string;
  approver?: string;
  remarks?: string;
}

export interface ManpowerRow {
  description?: string;
  dailyCounts?: (number | string)[];
  previousWeek?: number | string;
  thisWeek?: number | string;
  upToThisWeek?: number | string;
}

export interface MaterialRow {
  description?: string;
  unit?: string;
  previous?: number | string;
  thisPeriod?: number | string;
  accumulate?: number | string;
}

export interface EquipmentRow {
  description?: string;
  unit?: string;
  previous?: number | string;
  thisPeriod?: number | string;
  accumulate?: number | string;
}

export interface SitePhotoEntry {
  siteLocation?: string;
  caption1?: string;
  caption2?: string;
}

export interface ConstructionIssue {
  number?: number | string;
  siteLocation?: string;
  problemDescription?: string;
  actionBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Helper function for safe merging
function safeMerge(ws: ExcelJS.Worksheet, startRow: number, startCol: number, endRow: number, endCol: number) {
  try {
    // Check if any cells in range are already merged
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getCell(r, c);
        if (cell.isMerged) {
          console.warn(`⚠️ Skipping merge: cell (${r},${c}) is already merged`);
          return;
        }
      }
    }
    ws.mergeCells(startRow, startCol, endRow, endCol);
  } catch (err) {
    console.warn(`⚠️ Merge failed (${startRow},${startCol} to ${endRow},${endCol}):`, err);
  }
}

// Helper function for safe style application
function safeStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>, styleName: string) {
  try {
    if (!style) {
      console.warn(`⚠️ Style '${styleName}' is undefined, skipping style application`);
      return;
    }
    cell.style = style;
  } catch (err) {
    console.warn(`⚠️ Failed to apply style '${styleName}':`, err);
  }
}

// Helper function for error tracking
async function safeBuild(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`❌ Error in ${name}:`, err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportWeeklyReportToExcel(data: WeeklyReportExportData, filename?: string) {
  const workbook = new ExcelJS.Workbook();
  
  // Create all worksheets with error tracking
  await safeBuild('ConProgress', () => buildConProgress(workbook, data));
  await safeBuild('Cover', () => buildCover(workbook, data));
  await safeBuild('Letter', () => buildLetter(workbook, data));
  await safeBuild('Content', () => buildContent(workbook));
  await safeBuild('Intro', () => buildIntro(workbook));
  await safeBuild('OP', () => buildOP(workbook, data));
  await safeBuild('NWDP', () => buildNWDP(workbook, data));
  await safeBuild('QAQC', () => buildQAQC(workbook, data));
  await safeBuild('HSE', () => buildHSE(workbook, data));
  await safeBuild('Resources', () => buildResources(workbook, data));
  await safeBuild('SitePhotos', () => buildSitePhotos(workbook, data));
  await safeBuild('ConstructionIssues', () => buildConstructionIssues(workbook, data));

  // Generate filename if not provided
  const finalFilename = filename || `WeeklyReport_${data.projectTitle || 'Project'}_W${data.weekNumber || 'XX'}.xlsx`;

  // Write to buffer and save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSHEET BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

// Helper function to create styles
function createStyles(workbook: ExcelJS.Workbook): { [key: string]: Partial<ExcelJS.Style> } {
  return {
    coverTitle: {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 18, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF002060' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    sectionHdr: {
      font: { bold: true, color: { argb: 'FF000000' }, size: 10.5, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFA6A6A6' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
      border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } }
    },
    subHdr: {
      font: { bold: false, color: { argb: 'FF000000' }, size: 10.5, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFA6A6A6' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
      border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } }
    },
    title: {
      font: { bold: true, underline: true, size: 14, name: 'Arial', color: { argb: 'FF000000' } },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
    },
    label: {
      font: { bold: true, size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF2F2F2' } },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const }
    },
    dataWhite: {
      font: { size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
    },
    dataAlt: {
      font: { size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDCE6F1' } },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
    },
    numberWhite: {
      font: { size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    numberAlt: {
      font: { size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDCE6F1' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    percentWhite: {
      font: { size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      numFmt: '0.00%'
    },
    percentAlt: {
      font: { size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDCE6F1' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      numFmt: '0.00%'
    }
  };
}

// SHEET 1: Con. Progress
async function buildConProgress(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('Con. Progress');
  const styles = createStyles(workbook);
  
  // Set tab color
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  // Ensure all columns exist before merging (ExcelJS requirement)
  for (let i = 1; i <= 20; i++) {
    ws.getColumn(i);
  }
  
  let r = 1;

  // Title - Row height 30
  ws.getRow(r).height = 30;
  safeMerge(ws, r, 1, r, 10); // A-J
  ws.getCell(r, 1).value = 'CONSTRUCTION PROGRESS';
  safeStyle(ws.getCell(r, 1), styles.title, 'title');
  r++;

  // Info rows
  const infoData = [
    ['Project:', d.conProgressProject ?? d.projectTitle ?? ''],
    ['Subtitle:', d.conProgressSubtitle ?? ''],
    ['Date:', d.conProgressDate ?? '', 'Rev.', d.conProgressRevision ?? '']
  ];

  infoData.forEach(([label, value, label2, value2]) => {
    // Set row height for info rows (rows 2-5)
    ws.getRow(r).height = 20;
    
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).style = { font: { bold: true, size: 11, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    
    ws.getCell(r, 2).value = value;
    ws.getCell(r, 2).style = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    safeMerge(ws, r, 2, r, 2); // B-B
    
    // If there's a second label/value pair (Date/Revision row)
    if (label2 && value2) {
      ws.getCell(r, 10).value = label2 + ' ' + value2; // Combine label and value in same cell
      ws.getCell(r, 10).style = { font: { bold: false, size: 11, name: 'Arial' }, alignment: { horizontal: 'right' as const, vertical: 'middle' as const } };
    }
    r++;
  });
  r++;

  // Group headers row - Clean & Correct Version
  const headerRow = 6;
  
  // Set row heights for header rows
  ws.getRow(headerRow).height = 22.5;
  ws.getRow(headerRow + 1).height = 26.25;

  // Vertical headers
  ws.getCell(headerRow, 1).value = 'ID';
  ws.getCell(headerRow, 1).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 1, headerRow + 1, 1);

  ws.getCell(headerRow, 2).value = 'Scope of Works';
  ws.getCell(headerRow, 2).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 2, headerRow + 1, 2);

  ws.getCell(headerRow, 3).value = 'Detail Description';
  ws.getCell(headerRow, 3).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 3, headerRow + 1, 3);

  ws.getCell(headerRow, 4).value = 'Unit';
  ws.getCell(headerRow, 4).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 4, headerRow + 1, 4);

  // Horizontal grouped headers
  ws.getCell(headerRow, 5).value = 'Revise BOQ';
  ws.getCell(headerRow, 5).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 5, headerRow, 9);

  ws.getCell(headerRow, 10).value = 'Remark';
  ws.getCell(headerRow, 10).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 10, headerRow + 1, 10);

  ws.getCell(headerRow, 12).value = '% Up to Previous Week';
  ws.getCell(headerRow, 12).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 12, headerRow, 14);

  ws.getCell(headerRow, 15).value = '% This Week';
  ws.getCell(headerRow, 15).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 15, headerRow, 17);

  ws.getCell(headerRow, 18).value = '% Up to This Week';
  ws.getCell(headerRow, 18).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 18, headerRow, 20);

  ws.getCell(headerRow, 21).value = '% Remaining';
  ws.getCell(headerRow, 21).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 21, headerRow, 23);

  ws.getCell(headerRow, 24).value = '% Next Week Plan';
  ws.getCell(headerRow, 24).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 24, headerRow, 26);

  ws.getCell(headerRow, 27).value = '% Up to Next Week Plan';
  ws.getCell(headerRow, 27).style = styles.sectionHdr;
  safeMerge(ws, headerRow, 27, headerRow, 29);

  r = headerRow + 1;

  // Sub-column headers - Updated to match corrected structure
  const subHeaders = [
    '', '', '', '', 
    'QTY', 'Material', 'Labor', 'Unit Rate', 'Amount', 
    '', '',  
    'QTY', 'AMOUNT', '%', 
    'QTY', 'AMOUNT', '%', 
    'QTY', 'AMOUNT', '%',
    'QTY', 'AMOUNT', '%', 
    'QTY', 'AMOUNT', '%',  
    'QTY', 'AMOUNT', '%'
  ];
  subHeaders.forEach((header, index) => {
    if (header) {
      ws.getCell(r, index + 1).value = header;
      ws.getCell(r, index + 1).style = styles.subHdr;
    }
  });
  r++;

  // Data rows
  (d.conProgressItems ?? []).forEach((item, i) => {
    const isAlt = i % 2 === 1;
    const dataStyle = isAlt ? styles.dataAlt : styles.dataWhite;
    const numberStyle = isAlt ? styles.numberAlt : styles.numberWhite;
    const percentStyle = isAlt ? styles.percentAlt : styles.percentWhite;

    ws.getCell(r, 1).value = item.id ?? '';
    ws.getCell(r, 1).style = dataStyle;
    
    ws.getCell(r, 2).value = item.scopeOfWorks ?? '';
    ws.getCell(r, 2).style = dataStyle;
    
    ws.getCell(r, 3).value = item.detailDescription ?? '';
    ws.getCell(r, 3).style = dataStyle;
    
    ws.getCell(r, 4).value = item.unit ?? '';
    ws.getCell(r, 4).style = numberStyle;
    
    ws.getCell(r, 5).value = item.reviseBoqQty ?? '';
    ws.getCell(r, 5).style = numberStyle;
    
    ws.getCell(r, 6).value = item.materialRate ?? '';
    ws.getCell(r, 6).style = numberStyle;
    
    ws.getCell(r, 7).value = item.laborRate ?? '';
    ws.getCell(r, 7).style = numberStyle;
    
    ws.getCell(r, 8).value = item.unitRate ?? '';
    ws.getCell(r, 8).style = numberStyle;
    
    ws.getCell(r, 9).value = item.amount ?? '';
    ws.getCell(r, 9).style = numberStyle;
    
    ws.getCell(r, 10).value = item.remark ?? '';
    console.log('🔍 Excel Debug: Writing remark to cell:', item.remark, '->', ws.getCell(r, 10).value);
    ws.getCell(r, 10).style = dataStyle;
    
    ws.getCell(r, 11).value = '';
    ws.getCell(r, 11).style = dataStyle;
    
    // % Up to Previous Week (12-14)
    ws.getCell(r, 12).value = item.pctUpToPrevWeek ?? '';
    ws.getCell(r, 12).style = percentStyle;
    
    ws.getCell(r, 13).value = '';
    ws.getCell(r, 13).style = dataStyle;
    
    ws.getCell(r, 14).value = '';
    ws.getCell(r, 14).style = dataStyle;
    
    // % This Week (15-17)
    ws.getCell(r, 15).value = item.pctThisWeek ?? '';
    ws.getCell(r, 15).style = percentStyle;
    
    ws.getCell(r, 16).value = '';
    ws.getCell(r, 16).style = dataStyle;
    
    ws.getCell(r, 17).value = '';
    ws.getCell(r, 17).style = dataStyle;
    
    // % Up to This Week (18-20)
    ws.getCell(r, 18).value = item.pctUpToThisWeek ?? '';
    ws.getCell(r, 18).style = percentStyle;
    
    ws.getCell(r, 19).value = '';
    ws.getCell(r, 19).style = dataStyle;
    
    ws.getCell(r, 20).value = '';
    ws.getCell(r, 20).style = dataStyle;
    
    // % Remaining (21-23)
    ws.getCell(r, 21).value = item.pctRemaining ?? '';
    ws.getCell(r, 21).style = percentStyle;
    
    ws.getCell(r, 22).value = '';
    ws.getCell(r, 22).style = dataStyle;
    
    ws.getCell(r, 23).value = '';
    ws.getCell(r, 23).style = dataStyle;
    
    // % Next Week Plan (24-26)
    ws.getCell(r, 24).value = item.pctNextWeekPlan ?? '';
    ws.getCell(r, 24).style = percentStyle;
    
    ws.getCell(r, 25).value = '';
    ws.getCell(r, 25).style = dataStyle;
    
    ws.getCell(r, 26).value = '';
    ws.getCell(r, 26).style = dataStyle;
    
    // % Up to Next Week Plan (27-29)
    ws.getCell(r, 27).value = item.pctUpNextWeekPlan ?? '';
    ws.getCell(r, 27).style = percentStyle;
    
    ws.getCell(r, 28).value = '';
    ws.getCell(r, 28).style = dataStyle;
    
    ws.getCell(r, 29).value = '';
    ws.getCell(r, 29).style = dataStyle;
    
    r++;
  });

  // Set column widths
  const widths = [13.57, 35.71, 43, 7.43, 8.14, 9.86, 8.14, 11, 16, 29, 2.29, 11.43, 12.71, 8, 11.43, 12.71, 8, 11.43, 12.71, 8];
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });
}

// SHEET 2: Cover
async function buildCover(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('Cover');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF002060' };
  
  let r = 11;

  // "KINGDOM OF CAMBODIA"
  ws.getCell(r, 2).value = 'KINGDOM OF CAMBODIA';
  ws.getCell(r, 2).style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(r, 2, r, 12);
  r++;

  ws.getCell(r, 2).value = 'NATION RELIGION KING';
  ws.getCell(r, 2).style = { font: { bold: true, italic: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(r, 2, r, 12);
  r += 2;

  // "WEEKLY PROGRESS REPORT" banner
  ws.getCell(r, 3).value = 'WEEKLY PROGRESS REPORT';
  ws.getCell(r, 3).style = styles.coverTitle;
  ws.mergeCells(r, 3, r, 11);
  r++;

  // Week number
  ws.getCell(r, 2).value = String(d.weekNumber ?? '');
  ws.getCell(r, 2).style = { font: { bold: true, size: 28, name: 'Arial', color: { argb: 'FF002060' } }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(r, 2, r, 11);
  r++;

  // Date range
  ws.getCell(r, 2).value = `From ${d.reportDateFrom ?? ''} ~ ${d.reportDateTo ?? ''}`;
  ws.getCell(r, 2).style = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(r, 2, r, 11);
  r += 6;

  // Project title
  [d.projectTitle, d.projectSubtitle, d.projectSubtitle2].filter(Boolean).forEach(line => {
    ws.getCell(r, 3).value = line;
    ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true } };
    ws.mergeCells(r, 3, r, 11);
    r++;
  });
  r += 2;

  // Parties
  const parties = [
    ['Employer', d.employer ?? ''],
    ['Consultant', d.consultant ?? ''],
    ['Contractor', d.contractor ?? '']
  ];

  parties.forEach(([role, name]) => {
    ws.getCell(r, 3).value = role;
    ws.getCell(r, 3).style = styles.label;
    ws.getCell(r, 5).value = ':';
    ws.getCell(r, 5).style = styles.label;
    ws.getCell(r, 6).value = name;
    ws.getCell(r, 6).style = styles.dataWhite;
    ws.mergeCells(r, 6, r, 12);
    r++;
  });

  // Set column widths
  const widths = [8, 5, 5, 5, 9, 3, 20, 5, 5, 5, 5, 27];
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  // Set specific row heights
  ws.getRow(15).height = 35;
}

// SHEET 3: Letter
async function buildLetter(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('Letter');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 2;

  ws.getCell(r, 2).value = `LETTER FOR WEEKLY PROGRESS REPORT No.${d.weekNumber ?? ''}`;
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
  ws.mergeCells(r, 2, r, 12);
  r += 2;

  // Ref No and Date
  const letterInfo = [
    ['Ref. No.', d.refNo ?? `ICT-CPM-LETTER-${d.weekNumber ?? ''}`],
    ['Date', d.letterDate ?? '']
  ];

  letterInfo.forEach(([label, value]) => {
    ws.getCell(r, 2).value = label;
    ws.getCell(r, 2).style = styles.label;
    ws.getCell(r, 3).value = ':';
    ws.getCell(r, 3).style = styles.label;
    ws.getCell(r, 4).value = value;
    ws.getCell(r, 4).style = styles.dataWhite;
    ws.mergeCells(r, 4, r, 10);
    r++;
  });
  r++;

  // To, Att, CC
  ws.getCell(r, 2).value = 'To';
  ws.getCell(r, 2).style = styles.label;
  ws.getCell(r, 3).value = ':';
  ws.getCell(r, 3).style = styles.label;
  ws.getCell(r, 4).value = d.toName ?? '';
  ws.getCell(r, 4).style = styles.dataWhite;
  ws.mergeCells(r, 4, r, 10);
  r++;

  ws.getCell(r, 2).value = 'Att.';
  ws.getCell(r, 2).style = styles.label;
  ws.getCell(r, 3).value = ':';
  ws.getCell(r, 3).style = styles.label;
  ws.getCell(r, 4).value = d.attName ?? '';
  ws.getCell(r, 4).style = styles.dataWhite;
  ws.mergeCells(r, 4, r, 10);
  r++;

  (d.ccLines ?? []).forEach((cc, i) => {
    if (i === 0) {
      ws.getCell(r, 2).value = 'CC';
      ws.getCell(r, 2).style = styles.label;
    }
    ws.getCell(r, 3).value = ':';
    ws.getCell(r, 3).style = styles.label;
    ws.getCell(r, 4).value = cc;
    ws.getCell(r, 4).style = styles.dataWhite;
    ws.mergeCells(r, 4, r, 10);
    r++;
  });
  r++;

  // Letter body
  ws.getCell(r, 2).value = 'Dear Sir,';
  ws.getCell(r, 2).style = styles.dataWhite;
  r++;

  ws.getCell(r, 2).value = `We are pleased to submit Weekly Progress Report No-${d.weekNumber ?? ''} from ${d.reportDateFrom ?? ''} to ${d.reportDateTo ?? ''}.`;
  ws.getCell(r, 2).style = styles.dataWhite;
  ws.mergeCells(r, 2, r, 10);
  r += 2;

  ws.getCell(r, 2).value = '_________________________________';
  ws.getCell(r, 2).style = styles.dataWhite;
  r++;

  ws.getCell(r, 2).value = `${d.projectManager ?? ''} | Project Manager\n${d.contractor ?? ''}`;
  ws.getCell(r, 2).style = styles.dataWhite;
  ws.mergeCells(r, 2, r, 10);

  // Set column widths
  const widths = [6, 11, 9, 20, 10, 9, 9, 9, 9, 9, 5, 9, 28, 14, 14];
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });
}

// SHEET 4: CONTENT (Table of Contents)
async function buildContent(workbook: ExcelJS.Workbook) {
  const ws = workbook.addWorksheet('CONTENT');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF00B050' };
  
  let r = 3;

  ws.getCell(r, 2).value = 'TABLE OF CONTENTS*';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const } };
  r += 2;

  const tocItems = [
    "1. INTRODUCTION",
    "2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK",
    "3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN",
    "4. QA/QC STATUS",
    "4.1 Non-Conformity Report (NCR)", "4.2 Corrective Action Request (CAR)",
    "4.3 Safety Corrective Action Request (SCAR)", "4.4 PM Site Instruction (SI)",
    "4.5 Client Site Instruction (SI)", "4.6 Inspection Request (IR)",
    "4.7 Material for Approval (MFA)", "4.8 Request for Information (RFI)",
    "4.9 Request for Approval (RFA)", "4.10 Field Change Request (FCR)",
    "4.11 Variation Order (VO)", "4.12 Transmittal (TR)", "4.13 Material Inspection Approval (MIR)",
    "5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)",
    "5.1 HSES Training / Introduction / Toolbox Meeting",
    "5.2 HSES Inspection / Audit / Heavy Equipment / Hand&Power Tools",
    "5.3 Permit to Work", "5.4 First Aid / Accident / Incident / Near Miss / Fatalities",
    "5.5 Other HSES Activities Concerns", "5.6 HSES Photo Reference",
    "6. RESOURCES STATUS", "6.1 Manpower Status", "6.2 Material Delivery Status", "6.3 Machinery / Equipment Status",
    "7. SITE ACTIVITY PHOTOS", "8. CONSTRUCTION ISSUE", "9. MASTER SCHEDULE"
  ];

  tocItems.forEach(line => {
    const isMajor = /^\d+\.\s[A-Z]/.test(line);
    ws.getCell(r, 2).value = line;
    ws.getCell(r, 2).style = { font: { bold: isMajor, size: 10, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    r++;
  });

  ws.getColumn(2).width = 98;
}

// SHEET 5: 1.Intro
async function buildIntro(workbook: ExcelJS.Workbook) {
  const ws = workbook.addWorksheet('1.Intro');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF00B050' };
  
  let r = 3;

  ws.getCell(r, 2).value = '1. INTRODUCTION';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 8);
  r += 2;

  // Add introduction content here as needed
  ws.getCell(r, 2).value = 'Introduction content would go here...';
  ws.getCell(r, 2).style = styles.dataWhite;
  ws.mergeCells(r, 2, r, 8);
}

// SHEET 6: 2.OP (Overall Progress)
async function buildOP(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('2.OP');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 2;

  ws.getCell(r, 2).value = '2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 9);
  r += 2;

  // Add overall progress content here
  // Implementation similar to Con. Progress but for overall progress data
}

// SHEET 7: 3.NWDP
async function buildNWDP(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('3.NWDP');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 2;

  ws.getCell(r, 2).value = '3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 7);
  r += 2;

  // Add NWDP content here
  // Implementation for activities and next week plan
}

// SHEET 8: 4. QAQC
async function buildQAQC(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('4. QAQC');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 3;

  ws.getCell(r, 2).value = '4. QA/QC STATUS';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 11);
  r += 2;

  // Add QAQC content here
  // Implementation for QA/QC sections
}

// SHEET 9: 5. HSE
async function buildHSE(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('5. HSE');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 3;

  ws.getCell(r, 2).value = '5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 11);
  r += 2;

  // Add HSE content here
  // Implementation for HSE training, inspection, permits, etc.
}

// SHEET 10: 6. Resources
async function buildResources(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('6. Resources');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 3;

  ws.getCell(r, 2).value = '6. RESOURCES STATUS';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 8);
  r += 2;

  // Add Resources content here
  // Implementation for manpower, materials, equipment
}

// SHEET 11: 7. Site Activity Photos
async function buildSitePhotos(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('7. Site Photos');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 3;

  ws.getCell(r, 2).value = '7. SITE ACTIVITY PHOTOS';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 9);
  r += 2;

  // Add Site Photos content here
  // Implementation for site photo captions
}

// SHEET 12: 8. Construction Issues
async function buildConstructionIssues(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('8. Issues');
  const styles = createStyles(workbook);
  
  ws.properties.tabColor = { argb: 'FF0070C0' };
  
  let r = 3;

  ws.getCell(r, 2).value = '8. CONSTRUCTION ISSUE';
  ws.getCell(r, 2).style = styles.sectionHdr;
  ws.mergeCells(r, 2, r, 6);
  r += 2;

  // Add Construction Issues content here
  // Implementation for construction issues
}
