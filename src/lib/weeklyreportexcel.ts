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
import { detectIdType, resolveIdType } from '@/utils/idEngine';

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
  coverImage?: string;           // Cover image URL or base64 data
  clientLogo?: string;           // Client logo URL or base64 data

  // ── Letter ──────────────────────────────────────────────────────────────────
  refNo?: string;
  letterDate?: string;
  toName?: string;
  toAddress?: string;
  recipientCompany?: string;
  recipientLocation?: string;
  recipientName?: string;
  ccLines?: string[];
  projectManager?: string;
  signatureImage?: string;
  constructorName?: string;
  companyLocation?: string;
  companyPhone1?: string;
  companyPhone2?: string;
  companyEmail1?: string;
  companyEmail2?: string;

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

  // ── 9. Introduction (1.Intro) ───────────────────────────────────────────────────
  projectOverview?: string;
  designConstruction?: string;
  designList?: string[];
}

export interface ConProgressItem {
  id: string;
  scopeOfWorks?: string;
  detailDescription?: string;
  unit?: string;
  reviseBoqQty?: number | string;
  materialRate?: number | string;
  laborRate?: number | string;
  unitRate?: number | string;
  amount?: number | string;
  remark?: string;
  previousWeekQty?: number | string;
  previousWeekAmount?: number | string;
  previousWeekPct?: number | string;
  thisWeekQty?: number | string;
  thisWeekAmount?: number | string;
  thisWeekPct?: number | string;
  upToThisWeekQty?: number | string;
  upToThisWeekAmount?: number | string;
  upToThisWeekPct?: number | string;
  remainingQty?: number | string;
  remainingAmount?: number | string;
  remainingPct?: number | string;
  nextWeekQty?: number | string;
  nextWeekAmount?: number | string;
  nextWeekPct?: number | string;
  upToNextWeekQty?: number | string;
  upToNextWeekAmount?: number | string;
  upToNextWeekPct?: number | string;
  isBold?: boolean;
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
  id?: string;
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
  comment?: string;
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

// Helper function to load image from public folder and add to worksheet
async function addImageToWorksheet(workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet, imagePath: string, range: string) {
  try {
    let imageBuffer: ArrayBuffer;
    let extension: string = 'png';

    // Check if it's a base64 data URL
    if (imagePath.startsWith('data:')) {
      // Extract the base64 part and extension from data URL
      const matches = imagePath.match(/^data:(image\/[\w+]+);base64,(.+)$/);
      if (!matches) {
        console.warn(`⚠️ Invalid data URL format for image`);
        return;
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Determine extension from MIME type
      if (mimeType === 'image/svg+xml') {
        extension = 'svg';
      } else {
        extension = mimeType.split('/')[1] || 'png';
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBuffer = bytes.buffer;

    } else {
      // Fetch image from URL or public folder
      const response = await fetch(imagePath);
      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch image ${imagePath}: ${response.statusText}`);
        return;
      }

      imageBuffer = await response.arrayBuffer();

      // Determine extension from URL if possible
      const urlParts = imagePath.split('.');
      if (urlParts.length > 1) {
        extension = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
      }

    }

    // Add image to workbook
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: extension as 'png' | 'jpeg' | 'gif',
    });

    // Add image to worksheet at specified range
    worksheet.addImage(imageId, range);

  } catch (error) {
    console.warn(`⚠️ Failed to add image from ${imagePath}:`, error);
  }
}

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

// Helper function to add padding to text (top and bottom) - accessible to all functions
const padText = (text: string | number | undefined) => {
  if (!text || text === '') return '';
  return `\n${text}\n`;
};

export async function exportWeeklyReportToExcel(data: WeeklyReportExportData, filename?: string) {
  const workbook = new ExcelJS.Workbook();

  // Create all worksheets with error tracking
  await safeBuild('ConProgress', () => buildConProgress(workbook, data));
  await safeBuild('Cover', () => buildCover(workbook, data));
  await safeBuild('Letter', () => buildLetter(workbook, data));
  await safeBuild('Content', () => buildContent(workbook));
  await safeBuild('Intro', () => buildIntro(workbook, data));
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
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
    },
    dataAlt: {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
    },
    numberWhite: {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    numberAlt: {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    },
    percentWhite: {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      numFmt: '[=1]0%;0.0%'
    },
    percentAlt: {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      numFmt: '[=1]0%;0.0%'
    },
    introHeader: {
      font: { bold: true, size: 12, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF9BC2E6' } },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const }
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

    // Calculate dynamic row height based on content length and column widths
    const calculateHeight = (text: string | number | undefined, colWidth: number) => {
      if (!text || text === '') return 15; // minimum height
      const str = String(text);
      // Estimate characters per line based on column width (approx 8px per char at size 10)
      const charsPerLine = Math.max(1, Math.floor(colWidth * 1.5));
      const totalChars = str.length;
      const estimatedLines = Math.ceil(totalChars / charsPerLine);
      // Count actual newlines
      const newlineCount = (str.match(/\n/g) || []).length;
      const totalLines = Math.max(1, estimatedLines + newlineCount);
      // Height: 15 base + 15 pixels per line + 10 padding
      return Math.max(15, 15 + (totalLines * 15) + 10);
    };

    // Column widths for text columns: ID(13.57), Scope(35.71), Detail(43), Remark(29)
    const textWidths = { 1: 13.57, 2: 35.71, 3: 43, 10: 29 };

    // Calculate height for each text column and use the maximum
    const heights = [
      calculateHeight(item.id, textWidths[1]),
      calculateHeight(item.scopeOfWorks, textWidths[2]),
      calculateHeight(item.detailDescription, textWidths[3]),
      calculateHeight(item.remark, textWidths[10])
    ];
    const maxHeight = Math.max(...heights);
    ws.getRow(r).height = maxHeight;

    ws.getCell(r, 1).value = padText(item.id);
    ws.getCell(r, 1).style = numberStyle;

    ws.getCell(r, 2).value = padText(item.scopeOfWorks);
    ws.getCell(r, 2).style = dataStyle;

    ws.getCell(r, 3).value = padText(item.detailDescription);
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

    ws.getCell(r, 10).value = padText(item.remark);
    ws.getCell(r, 10).style = dataStyle;

    ws.getCell(r, 11).value = '';
    ws.getCell(r, 11).style = dataStyle;

    // % Up to Previous Week (12-14)
    ws.getCell(r, 12).value = item.previousWeekQty ?? '';
    ws.getCell(r, 12).style = numberStyle;

    ws.getCell(r, 13).value = item.previousWeekAmount ?? '';
    ws.getCell(r, 13).style = numberStyle;

    ws.getCell(r, 14).value = item.previousWeekPct ? Number(item.previousWeekPct) / 100 : '';
    ws.getCell(r, 14).style = percentStyle;

    // % This Week (15-17)
    ws.getCell(r, 15).value = item.thisWeekQty ?? '';
    ws.getCell(r, 15).style = numberStyle;

    ws.getCell(r, 16).value = item.thisWeekAmount ?? '';
    ws.getCell(r, 16).style = numberStyle;

    ws.getCell(r, 17).value = item.thisWeekPct ? Number(item.thisWeekPct) / 100 : '';
    ws.getCell(r, 17).style = percentStyle;

    // % Up to This Week (18-20)
    ws.getCell(r, 18).value = item.upToThisWeekQty ?? '';
    ws.getCell(r, 18).style = numberStyle;

    ws.getCell(r, 19).value = item.upToThisWeekAmount ?? '';
    ws.getCell(r, 19).style = numberStyle;

    ws.getCell(r, 20).value = item.upToThisWeekPct ? Number(item.upToThisWeekPct) / 100 : '';
    ws.getCell(r, 20).style = percentStyle;

    // % Remaining (21-23)
    ws.getCell(r, 21).value = item.remainingQty ?? '';
    ws.getCell(r, 21).style = numberStyle;

    ws.getCell(r, 22).value = item.remainingAmount ?? '';
    ws.getCell(r, 22).style = numberStyle;

    ws.getCell(r, 23).value = item.remainingPct ? Number(item.remainingPct) / 100 : '';
    ws.getCell(r, 23).style = percentStyle;

    // % Next Week Plan (24-26)
    ws.getCell(r, 24).value = item.nextWeekQty ?? '';
    ws.getCell(r, 24).style = numberStyle;

    ws.getCell(r, 25).value = item.nextWeekAmount ?? '';
    ws.getCell(r, 25).style = numberStyle;

    ws.getCell(r, 26).value = item.nextWeekPct ? Number(item.nextWeekPct) / 100 : '';
    ws.getCell(r, 26).style = percentStyle;

    // % Up to Next Week Plan (27-29)
    ws.getCell(r, 27).value = item.upToNextWeekQty ?? '';
    ws.getCell(r, 27).style = numberStyle;

    ws.getCell(r, 28).value = item.upToNextWeekAmount ?? '';
    ws.getCell(r, 28).style = numberStyle;

    ws.getCell(r, 29).value = item.upToNextWeekPct ? Number(item.upToNextWeekPct) / 100 : '';
    ws.getCell(r, 29).style = percentStyle;

    // Apply background color based on ID type AFTER setting values and styles
    const idType = resolveIdType(item.id ?? '', d.conProgressItems ?? [], i);
    let bgColor = 'FFFFFFFF'; // Default white
    switch (idType) {
      case 'roman': bgColor = 'FFD0CECE'; break;
      case 'level1': bgColor = 'FFACB9CA'; break;
      case 'level2': bgColor = 'FFDDEBF7'; break;
      case 'level3': bgColor = 'FFE7E6E6'; break;
    }

    // Apply background color to all cells in the row
    for (let col = 1; col <= 29; col++) {
      const cell = ws.getCell(r, col);
      const currentStyle = { ...cell.style };

      // Apply background color
      currentStyle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };

      // Apply bold formatting if item.isBold is true
      if (item.isBold) {
        currentStyle.font = {
          size: 10,
          name: 'Arial',
          bold: true
        };
      }

      // Add vertical alignment with space (middle)
      currentStyle.alignment = {
        vertical: 'middle',
        horizontal: currentStyle.alignment?.horizontal || 'left',
        wrapText: true
      };

      // Add borders to all cells
      currentStyle.border = {
        top: { style: 'hair' as const },
        bottom: { style: 'hair' as const },
        left: { style: 'thin' as const },
        right: { style: 'thin' as const }
      };

      cell.style = currentStyle;
    }

    r++;
  });

  // Set column widths
  const widths = [13.57, 35.71, 43, 7.43, 8.14, 9.86, 8.14, 11, 16, 29, 2.29, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10];
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });
}

// SHEET 2: Cover
async function buildCover(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('Cover');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF002060' };

  // Set column A width for proper spacing
  ws.getColumn('A').width = 3.43;

  // Set columns B through L width
  for (let col = 2; col <= 12; col++) {
    ws.getColumn(col).width = 8.43;
  }

  // Apply background color to column A, rows 2-45
  for (let row = 2; row <= 45; row++) {
    ws.getCell(row, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16365C' }
    };
  }

  // Add company logo at column C, row 3 (range C3:E5 for good sizing)
  // ── Company logo — positioned at rows 3-5, columns C-E, 
  await addImageToWorksheet(workbook, ws, '/cacpm_logo.png', 'C3:E5');

  // Merge cells 3-5, columns C-E for logo area
  ws.mergeCells(3, 3, 5, 5); // Merge rows 3-5, columns C-E

  //Client Logo 
  if (d.clientLogo) {
    try {
      await addImageToWorksheet(workbook, ws, d.clientLogo, 'G3:I5');
      console.log('✅ Client logo added successfully');
    } catch (error) {
      console.warn('❌ Failed to add client logo:', error);
    }
  }
  
  // Merge cells 3-5, columns G-I for client logo area
  ws.mergeCells(3, 7, 5, 9); // Merge rows 3-5, columns G-I 
  

  // "KINGDOM OF CAMBODIA" banner row 9
  ws.getCell(9, 3).value = 'KINGDOM OF CAMBODIA';
  ws.getCell(9, 3).style = { font: { bold: true, size: 18, name: 'Arial', color: { argb: 'FF002060' } }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(9, 3, 9, 13); // Merge columns C-M

  // "NATION RELIGION KING" banner row 10
  ws.getCell(10, 3).value = 'NATION RELIGION KING';
  ws.getCell(10, 3).style = { font: { bold: true, size: 18, name: 'Arial', color: { argb: 'FF002060' } }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(10, 3, 10, 13); // Merge columns C-M

  let r = 13;

  // "WEEKLY PROGRESS REPORT" title with blue bg
  ws.getCell(r, 3).value = 'WEEKLY PROGRESS REPORT';
  ws.getCell(r, 3).style = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 18, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  };
  ws.mergeCells(r, 3, r, 13); // Merge columns C-M
  r++;

  // Week number
  ws.getCell(15, 3).value = `Week - ${d.weekNumber ?? ''}`;
  ws.getCell(15, 3).style = { font: { bold: true, size: 18, name: 'Arial', color: { argb: 'FF002060' } }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(15, 3, 15, 13); // Merge columns C-M

  // Date range
  ws.getCell(16, 3).value = `From ${d.reportDateFrom ?? ''} ~ ${d.reportDateTo ?? ''}`;
  ws.getCell(16, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };
  ws.mergeCells(16, 3, 16, 13); // Merge columns C-M
  r += 6;

  // Cover image area (merged cells C-M, rows 18-35)
  ws.mergeCells(18, 3, 35, 13); // Merge columns C-M, rows 18-35

  

  // Add cover image if available
  if (d.coverImage) {
    try {
      await addImageToWorksheet(workbook, ws, d.coverImage, 'C18:M35');
    } catch (error) {
      console.warn('❌ Failed to add cover image:', error);
      // Fallback: add placeholder text
      ws.getCell(16, 3).value = 'Cover Image (Failed to Load)';
      ws.getCell(16, 3).style = {
        font: { bold: true, size: 14, color: { argb: 'FF888888' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };
    }
  } else {
    // No cover image available - add placeholder
    ws.getCell(16, 3).value = 'No Cover Image Available';
    ws.getCell(16, 3).style = {
      font: { bold: true, size: 14, color: { argb: 'FF888888' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    console.log('ℹ️ No cover image data provided');
  }

  // Project title (merged rows 38-40, columns C-M)
  const projectTitles = [d.projectTitle, d.projectSubtitle, d.projectSubtitle2].filter(Boolean);
  if (projectTitles.length > 0) {
    // Merge the area for project titles
    ws.mergeCells(38, 3, 40, 13); // Merge rows 38-40, columns C-M

    // Add each title line with italic styling and center alignment
    projectTitles.forEach((line, index) => {
      ws.getCell(38 + index, 3).value = line;
      ws.getCell(38 + index, 3).style = {
        font: { bold: true, italic: true, size: 12, name: 'Arial' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true }
      };
    });
  }
  r = 41; // Skip past the project title area

  // Parties
  const parties = [
    ['Employee', d.employer ?? ''],
    ['Contractor', d.contractor ?? '']
  ];

  parties.forEach(([role, name], index) => {
    if (index === 0) {
      // Employee row at 42

      // C + D → Employee (role)
      ws.getCell(42, 3).value = role;
      ws.getCell(42, 3).style = {
        font: { bold: true, size: 14, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
      ws.mergeCells(42, 3, 42, 4); // Merge C-D

      // E → Colon
      ws.getCell(42, 5).value = ':';
      ws.getCell(42, 5).style = {
        font: { bold: true, size: 14, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      // F → M → Name
      ws.getCell(42, 6).value = name;
      ws.getCell(42, 6).style = {
        font: { bold: true, size: 14, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
      ws.mergeCells(42, 6, 42, 13); // Merge F-M

      r = 44; // Skip row 43
    } else {
      // Contractor (merged rows 44-45)

      // C + D → Contractor (role)
      ws.mergeCells(44, 3, 45, 4); // Merge C-D and rows 44-45
      ws.getCell(44, 3).value = role;
      ws.getCell(44, 3).style = {
        font: { bold: true, size: 14, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'middle' }
      };

      // E → Colon
      ws.mergeCells(44, 5, 45, 5); // Merge column E, rows 44-45
      ws.getCell(44, 5).value = ':';
      ws.getCell(44, 5).style = {
        font: { bold: true, size: 14, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      // F → M → Name
      ws.mergeCells(44, 6, 45, 13); // Merge F-M, rows 44-45
      ws.getCell(44, 6).value = name;
      ws.getCell(44, 6).style = {
        font: { bold: true, size: 14, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
      };

      r += 2; // Skip 2 rows
    }
  });

  // Set column widths
  const widths = [3.43, 8.43, 8.43, 8.43, 8.43, 8.43, 8.43, 8.43, 8.43, 8.43, 8.43, 8.43];
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  // Set specific row heights
  ws.getRow(9).height = 30;
  ws.getRow(10).height = 30;
  ws.getRow(13).height = 30;
  ws.getRow(15).height = 35;
}
/**
 * Estimates row height based on text length, column width, and font size.
 * ExcelJS does NOT auto-size merged cell rows — this does it manually.
 */
function estimateRowHeight(text: string, colWidthChars: number, fontSize: number = 12): number {
  const lineHeightPx = fontSize * 1.5;         // Approximate line height
  const charsPerLine = colWidthChars * 1.1;    // ~1.1 chars per column width unit

  const lines = text.split('\n').reduce((total, line) => {
    const wrappedLines = Math.ceil(line.length / charsPerLine) || 1;
    return total + wrappedLines;
  }, 0);

  return Math.max(15, lines * lineHeightPx);
}
// SHEET 3: Letter
async function buildLetter(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('Letter');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF0070C0' };

  // Set column widths: A=5, B=10.57, C=8.43, D=19.71, E=9.14, F=8.43, G=8.43, H=8.43, I=8.43, J=10, K=4
  const widths = [5, 10.57, 8.43, 19.71, 9.14, 8.43, 8.43, 8.43, 8.43, 10, 4];
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  // Row 1: height = 30
  ws.getRow(1).height = 30;

  // Row 2: height = 20, merge col B-J
  ws.getRow(2).height = 20;
  ws.getCell(2, 2).value = `LETTER FOR WEEKLY PROGRESS REPORT No.${d.weekNumber ?? ''}`;
  ws.getCell(2, 2).style = { 
    font: { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } }, 
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B5' } },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const } 
  };
  ws.mergeCells(2, 2, 2, 10);

  // Skip row 3 (leave empty)

  // Row 4: height = 20
  ws.getRow(4).height = 20;

  // Ref No and Date - no bg color, all values bold
  const letterInfo = [
    ['Ref. No.', d.refNo ?? ''],
    ['Date', d.letterDate ?? '']
  ];

  let r = 4;
  letterInfo.forEach(([label, value]) => {
    ws.getCell(r, 2).value = label;
    ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    ws.getCell(r, 3).value = ':';
    ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    ws.getCell(r, 4).value = value;
    ws.getCell(r, 4).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    ws.mergeCells(r, 4, r, 10);
    r++;
  });

  // Skip rows 6-7
  r = 8;

  // Row 8: Set explicit height for multi-line text
  ws.getRow(8).height = 60; // Explicit height for multi-line text

  // To, Att, CC with Employee location using "\n"
  ws.getCell(r, 2).value = 'To';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
  ws.getCell(r, 3).value = ':';
  ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
  
  // Set cell alignment (font will be set in rich text)
  ws.getCell(r, 4).style = { 
    alignment: { horizontal: 'left' as const, vertical: 'top' as const, wrapText: true } 
  };
  
  // Create rich text with different styles
  const richTextParts = [];
  
  if (d.recipientCompany) {
    richTextParts.push({ 
      text: d.recipientCompany,
      font: { bold: true, size: 12, name: 'Arial' }
    });
  }
  
  if (d.recipientLocation) {
    richTextParts.push({ 
      text: '\r\n' + d.recipientLocation,
      font: { bold: false, size: 12, name: 'Arial' }
    });
  }
  
  const richTextValue = { richText: richTextParts };
  ws.getCell(r, 4).value = richTextValue;
  ws.mergeCells(r, 4, r, 10);
  r++;

  // Row 9: height = 30 for Att. field
  ws.getRow(r).height = 30;
  
  ws.getCell(r, 2).value = 'Att.';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
  ws.getCell(r, 3).value = ':';
  ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
  ws.getCell(r, 4).value = d.recipientName ?? d.consultant ?? 'Attention';
  ws.getCell(r, 4).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true } };
  ws.mergeCells(r, 4, r, 10);
  r++;

  (d.ccLines ?? []).forEach((cc, i) => {
    if (i === 0) {
      // Row for CC: height = 30
      ws.getRow(r).height = 30;
      ws.getCell(r, 2).value = 'CC';
      ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    }
    // Row for CC lines: height = 30
    ws.getRow(r).height = 30;
    ws.getCell(r, 3).value = ':';
    ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const } };
    ws.getCell(r, 4).value = cc;
    ws.getCell(r, 4).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true } };
    ws.mergeCells(r, 4, r, 10);
    r++;
  });
  r++;

  // Letter body
  // "Dear Sir," row
  ws.getCell(r, 2).value = 'Dear Sir,';
  ws.getCell(r, 2).style = { 
    font: { bold: true, size: 11, name: 'Arial' }, 
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const } 
  };
  ws.mergeCells(r, 2, r, 10);
  ws.getRow(r).height = 20; // Single line, fixed is fine
  r++;

  // Letter body row — calculate merged width (cols B-J = widths[1..9])
  const mergedWidthChars = widths.slice(1, 10).reduce((a, b) => a + b, 0); // sum cols B-J
  const bodyText = `We are pleased to submit Weekly Progress Report No-${d.weekNumber ?? ''} from ${d.reportDateFrom ?? ''} to ${d.reportDateTo ?? ''} for ${d.projectTitle ?? ''}.\n\n\nSincerely Yours,`;

  ws.getCell(r, 2).value = bodyText;
  ws.getCell(r, 2).style = { 
    font: { size: 12, name: 'Arial' }, 
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true } 
  };
  ws.mergeCells(r, 2, r, 10);
  ws.getRow(r).height = estimateRowHeight(bodyText, mergedWidthChars, 12); // ✅ Manual height
  r += 2;

   // Row 16: height = 80, merge B-D for signature image
  ws.getRow(16).height = 60;
  ws.mergeCells(16, 2, 16, 4); // Merge B16:D16

  // E-Sign signature image in row 16
  
  if (d.signatureImage && d.signatureImage.trim() !== '') {
    
    try {
      // Add signature image to the merged cells
      const imageRange = 'B16:D16';
      
      await addImageToWorksheet(workbook, ws, d.signatureImage, imageRange);
      
    } catch (error) {
      
      // Add fallback text when image fails
      ws.getCell(16, 2).value = '[Signature Image - Failed to Load]';
      ws.getCell(16, 2).style = {
        font: { size: 10, name: 'Arial', color: { argb: 'FFFF0000' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
      };
    }
  } else {
    console.log('ℹ️ No signature image provided or empty value');
    
    // Add placeholder text when no image is provided
    ws.getCell(16, 2).value = '[No Signature Image]';
    ws.getCell(16, 2).style = {
      font: { size: 10, name: 'Arial', color: { argb: 'FF888888' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    };
  }
  
  // Signature block with rich text (only project manager name bold)
  const sigRichText = [];
  
  // Project Manager name (bold)
  if (d.projectManager) {
    sigRichText.push({ 
      text: d.projectManager, 
      font: { size: 10, name: 'Arial', bold: true } 
    });
  }
  sigRichText.push({ 
    text: ' | Project Manager', 
    font: { size: 10, name: 'Arial', bold: true } 
  });
  sigRichText.push({ 
    text: '\n' + (d.contractor ?? ''), 
    font: { size: 10, name: 'Arial', bold: true } 
  });
  sigRichText.push({ 
    text: '\n\n' + (d.companyLocation ?? ''), 
    font: { size: 10, name: 'Arial', bold: false } 
  });
  sigRichText.push({ 
    text: '\n\n' + (d.companyPhone1 ?? '') + (d.companyPhone2 ? ' | ' + d.companyPhone2 : ' | M +885 (0)'), 
    font: { size: 10, name: 'Arial', bold: false } 
  });
  sigRichText.push({ 
    text: '\n' + (d.companyEmail1 ?? ''), 
    font: { size: 10, name: 'Arial', bold: false } 
  });
  if (d.companyEmail2) {
    sigRichText.push({ 
      text: '\n' + d.companyEmail2, 
      font: { size: 10, name: 'Arial', bold: false } 
    });
  }
  
  ws.getCell(r, 2).value = { richText: sigRichText };
  ws.getCell(r, 2).style = { 
    font: { size: 10, name: 'Arial' }, 
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true } 
  };
  ws.mergeCells(r, 2, r, 10);
  ws.getRow(r).height = estimateRowHeight(sigRichText.map(item => item.text).join(''), mergedWidthChars, 10); // ✅ Manual height
}

// SHEET 4: CONTENT (Table of Contents)
async function buildContent(workbook: ExcelJS.Workbook) {
  const ws = workbook.addWorksheet('CONTENT');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF00B050' };

  let r = 3;

  ws.getCell(r, 2).value = 'TABLE OF CONTENTS*';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' as const }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF9BC2E6' } } };
  r += 2;

  const tocItems = [
    "1. INTRODUCTION",
    "2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK",
    "3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN",
    "4. QA/QC STATUS",
    "4.1 Non-Conformity Report (NCR)",
    "4.2 Corrective Action Request (CAR)",
    "4.3 Safety Corrective Action Request (SCAR)", 
    "4.4 PM Site Instruction (SI)",
    "4.5 Client Site Instruction (SI)", 
    "4.6 Inspection Request (IR)",
    "4.7 Material for Approval (MFA)", 
    "4.8 Request for Information (RFI)",
    "4.9 Request for Approval (RFA)", 
    "4.10 Field Change Request (FCR)",
    "4.11 Variation Order (VO)", 
    "4.12 Transmittal (TR)", 
    "4.13 Material Inspection Approval (MIR)",
    "5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)",
    "5.1 HSES Training / Introduction / Toolbox Meeting",
    "5.2 HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist",
    "5.3 Permit to Work",
    "5.4 First Aid / Accident / Incident / Near Miss / Fatalities (if Any)",
    "5.5 Other HSES Actities Concerns",
    "5.6 HSES Photo Reference",
    "6. RESOURCES STATUS", 
    "6.1 Manpower Status", 
    "6.2 Material Delivery Status", 
    "6.3 Machinery / Equipment Status",
    "7. SITE ACTIVITY PHOTOS", 
    "8. CONSTRUCTION ISSUE", 
    "9. MASTER SCHEDULE"
  ];

  tocItems.forEach(line => {
    const isMajor = /^\d+\.\s[A-Z]/.test(line);     // 1. TITLE
    const isSub = /^\d+\.\d+/.test(line);           // 4.1, 5.2, etc.

    ws.getCell(r, 2).value = line;
    ws.getRow(r).height = 25;  // Set row height to 25

    ws.getCell(r, 2).style = {
      font: { bold: false, size: 11, name: 'Arial' },
      alignment: {
        horizontal: 'left' as const,
        vertical: 'middle' as const,
        indent: isSub ? 2 : 0   // 👈 THIS IS THE KEY
      }
    };

    r++;
  });

  ws.getColumn(2).width = 98;
  ws.getColumn(1).width = 5;
}

// SHEET 5: 1.Intro
async function buildIntro(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('1.Intro');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF00B050' };

  let r = 3;

  ws.getCell(r, 2).value = '1. INTRODUCTION';
  ws.getCell(r, 2).style = styles.introHeader;
  r += 2;

  // Project Overview 
  ws.getCell(r, 2).value = 'Project Overview';
  ws.getCell(r, 2).style = {
    font: { bold: true, size: 12, name: 'Arial' },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
  };
  ws.getRow(r).height = 22.5;
  r++;

  // Project Overview Content
  ws.getCell(r, 2).value = '\n' + (d.projectOverview || '');
  ws.getCell(r, 2).style = styles.dataWhite;
  r++;

  // Design & Construction
  if (d.designConstruction) {
    ws.getCell(r, 2).value = 'Design & Construction';
    ws.getCell(r, 2).style = {
      font: { bold: true, size: 12, name: 'Arial' },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
    };
    ws.getRow(r).height = 22.5;
    r++;

    ws.getCell(r, 2).value ='\n'+ d.designConstruction + '\n';
    ws.getCell(r, 2).style = styles.dataWhite;
    r++;
  }

  // Design List
  if (d.designList && d.designList.length > 0) {
    d.designList.forEach((item) => {
      if (item && item.trim() !== '') {
        ws.getCell(r, 2).value = item;
        ws.getCell(r, 2).style = styles.dataWhite;
        r += 1;
      }
    });
  }

  // Cover Image
  if (d.coverImage) {
    r = 10; // Set to row 10
    try {
      // For browser compatibility, we'll use the base64 string directly
      // ExcelJS should handle base64 images properly in the browser environment
      const imageId = workbook.addImage({
        base64: d.coverImage,
        extension: d.coverImage.includes('png') ? 'png' : 'jpeg'
      });
      
      ws.addImage(imageId, {
        tl: { col: 1, row: 9 }, // Position at B10 (col 1 = Column B, row 9 = row 10)
        ext: { width: 700, height: 400 } // Width for Col B only, full height
      });
      
      ws.getRow(r).height = 400;
    } catch (error) {
      console.error('Error adding cover image:', error);
      // Add a placeholder text if image fails
      ws.getCell(r, 2).value = '[Cover Image]';
      ws.getCell(r, 2).style = styles.dataWhite;
    }
  }

  // Set column widths
  ws.getColumn(1).width = 5;   // Col A
  ws.getColumn(2).width = 100; // Col B
  ws.getColumn(3).width = 4;   // Col C
}

// SHEET 6: 2.OP (Overall Progress)
async function buildOP(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('2.OP');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF0070C0' };

  // Ensure all columns exist before merging
  for (let i = 1; i <= 9; i++) {
    ws.getColumn(i);
  }

  let r = 2;

  // Title
  ws.getRow(r).height = 25;
  ws.getCell(r, 2).value = '2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK';
  ws.getCell(r, 2).style = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };
  ws.mergeCells(r, 2, r, 9);
  r += 2;

  // Headers
  const headers = [
    'No',
    'Scope of Works',
    '% Up to Previous Week',
    '% This Week',
    '% Up to This Week',
    '% Remaining',
    '% Next Week Plan',
    '% Up Next Week Plan'
  ];

  headers.forEach((header, index) => {
    ws.getCell(r, index + 2).value = header;
    ws.getCell(r, index + 2).style = {
      font: { bold: true, size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF9BC2E6' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
      border: {
        top: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        left: { style: 'thin' as const },
        right: { style: 'thin' as const }
      }
    };
  });
  ws.getRow(r).height = 30;
  r++;

  // Data rows
  (d.overallProgressItems ?? []).forEach((item, i) => {
    const isAlt = i % 2 === 1;
    const dataStyle = isAlt ? styles.dataAlt : styles.dataWhite;
    const numberStyle = isAlt ? styles.numberAlt : styles.numberWhite;
    const percentStyle = isAlt ? styles.percentAlt : styles.percentWhite;

    // Check if the ID is a Roman numeral for special background color
    const displayValue = String(item.no || '');
    const isRomanId = /^[IVXLCDM]+\./.test(displayValue.trim());
    const romanStyle = {
      font: { bold: true, size: 10, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE7E6E6' } },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'hair' as const },
        bottom: { style: 'hair' as const },
        left: { style: 'thin' as const },
        right: { style: 'thin' as const }
      }
    };

    // Calculate row height based on content
    const calculateHeight = (text: string | number | undefined) => {
      if (!text || text === '') return 15;
      const str = String(text);
      const charsPerLine = 50; // Approximate
      const totalChars = str.length;
      const estimatedLines = Math.ceil(totalChars / charsPerLine);
      return Math.max(15, estimatedLines * 15);
    };

    // Format percentage display like UI
    const formatPercentageDisplay = (value: number | string | undefined): string => {
      if (value === undefined || value === null || value === "") return "";
      const numValue = typeof value === "string" ? parseFloat(value.replace("%", "")) : value;
      if (isNaN(numValue)) return "";
      return `${numValue.toFixed(1)}%`;
    };

  
  // Debug: Log first item properties
  if (d.overallProgressItems && d.overallProgressItems.length > 0) {
    console.log('DEBUG OP: First item properties =', Object.keys(d.overallProgressItems[0]));
    console.log('DEBUG OP: First item pctThisWeek =', d.overallProgressItems[0].pctThisWeek);
  }

    const heights = [
      calculateHeight(item.no),
      calculateHeight(item.scopeOfWorks)
    ];
    // Set fixed row height to 26
    ws.getRow(r).height = 26;

    // Apply styles based on whether it's a Roman ID row
    const rowStyle = isRomanId ? romanStyle : dataStyle;
    const rowNumberStyle = isRomanId ? romanStyle : numberStyle;
    const rowPercentStyle = isRomanId ? romanStyle : percentStyle;

    ws.getCell(r, 2).value = padText(displayValue);
    ws.getCell(r, 2).style = { ...rowNumberStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };

    ws.getCell(r, 3).value = padText(item.scopeOfWorks);
    ws.getCell(r, 3).style = rowStyle;

    ws.getCell(r, 4).value = formatPercentageDisplay(item.pctUpToPrevWeek ?? 0);
    ws.getCell(r, 4).style = { ...rowPercentStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };

    ws.getCell(r, 5).value = formatPercentageDisplay(item.pctThisWeek ?? 0);
    ws.getCell(r, 5).style = { ...rowPercentStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };

    ws.getCell(r, 6).value = formatPercentageDisplay(item.pctUpToThisWeek ?? 0);
    ws.getCell(r, 6).style = { ...rowPercentStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };

    ws.getCell(r, 7).value = formatPercentageDisplay(item.pctRemaining ?? 0);
    ws.getCell(r, 7).style = { ...rowPercentStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };

    ws.getCell(r, 8).value = formatPercentageDisplay(item.pctNextWeekPlan ?? 0);
    ws.getCell(r, 8).style = { ...rowPercentStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };

    ws.getCell(r, 9).value = formatPercentageDisplay(item.pctUpNextWeekPlan ?? 0);
    ws.getCell(r, 9).style = { ...rowPercentStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } };

    // Add borders to all cells (already included in romanStyle)
    if (!isRomanId) {
      for (let col = 2; col <= 9; col++) {
        const cell = ws.getCell(r, col);
        const currentStyle = { ...cell.style };
        currentStyle.border = {
          top: { style: 'hair' },
          bottom: { style: 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.style = currentStyle;
      }
    }

    r++;
  });

  // Set column widths
  const widths = [5, 6.57, 35, 14, 14, 14, 14, 14, 14, 4]; // Columns A-J
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  // Add remark if provided
  if (d.overallProgressRemark) {
    r += 2;
    ws.getCell(r, 1).value = 'Remarks:';
    ws.getCell(r, 1).style = styles.label;
    r++;
    ws.getCell(r, 1).value = d.overallProgressRemark;
    ws.getCell(r, 1).style = styles.dataWhite;
    ws.mergeCells(r, 1, r, 8);
  }
}

// SHEET 7: 3.NWDP
async function buildNWDP(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('3.NWDP');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF0070C0' };

  // Set column widths
  ws.getColumn('A').width = 5;
  ws.getColumn('B').width = 43;
  ws.getColumn('C').width = 10;
  ws.getColumn('D').width = 43;
  ws.getColumn('E').width = 10;
  ws.getColumn('F').width = 5;

  let r = 2;

  // Set row heights
  ws.getRow(1).height = 30;
  ws.getRow(2).height = 20;
  ws.getRow(4).height = 20;

  ws.getCell(r, 2).value = '3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN';
  ws.getCell(r, 2).style = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };
  ws.mergeCells(r, 2, r, 5);
  r += 2;

  // Table headers
  const headers = ['Activities of Work Done', 'Next Week Plan'];
  const headerCols = [2, 4];
  
  headers.forEach((header, index) => {
    const cell = ws.getCell(r, headerCols[index]);
    cell.value = header;
    cell.style = {
      font: { bold: true, name: 'Arial' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '9BC2E6' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'hair' },
        bottom: { style: 'hair' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
    
    // Merge headers: B+C for first header, D+E for second header
    if (index === 0) {
      ws.mergeCells(r, 2, r, 3); // Merge B to C
    } else if (index === 1) {
      ws.mergeCells(r, 4, r, 5); // Merge D to E
    }
  });
  r += 1;

  // Helper function to calculate indentation level based on ID structure
  const getIndentationLevel = (id: string): number => {
    if (!id) return 0;
    
    const trimmed = id.trim();
    
    // Roman numerals (I, II, III, etc.) - level 0
    if (/^[IVX]+$/.test(trimmed)) return 0;
    
    // Arabic numbers with dots (1., 2., etc.) - level 1
    if (/^\d+\.$/.test(trimmed)) return 2;
    
    // Decimal numbers (1.1, 1.2, etc.) - level 1
    if (/^\d+\.\d+$/.test(trimmed)) return 1;
    
    // Triple decimal (1.1.1, etc.) - level 1
    if (/^\d+\.\d+\.\d+$/.test(trimmed)) return 1;
    
    // Letters (a, b, c) - level 2
    if (/^[a-zA-Z]\.$/.test(trimmed)) return 2;
    
    // Dash only (-) - level 3 (treated as deepest level)
    if (/^-+$/.test(trimmed)) return 3;
    
    return 0;
  };

  // Helper function to add indentation spaces
  const addIndentation = (text: string, level: number): string => {
    let spaces = 0;
    
    // Custom spacing based on level
    switch (level) {
      case 0: // Roman numerals - no spaces
        spaces = 0;
        break;
      case 1: // Decimal numbers (1.1) - 8 spaces
        spaces = 8;
        break;
      case 2: // Arabic numbers (1., 2.) - 4 spaces  
        spaces = 4;
        break;
      case 3: // Dashes (-) - 16 spaces
        spaces = 16;
        break;
      default:
        spaces = level * 4;
    }
    
    return ' '.repeat(spaces) + text;
  };

  // Helper function to handle dash indentation specially
  const formatWithDashIndentation = (text: string, level: number): string => {
    // If the text is just a dash (no dots allowed), add proper indentation
    if (/^-+$/.test(text.trim()) && !text.includes('.')) {
      const spaces = level * 4;
      return ' '.repeat(spaces) + text.trim();
    }
    // Otherwise use regular indentation
    return addIndentation(text, level);
  };

  // Add data rows
  if (d.nwdpItems && d.nwdpItems.length > 0) {
    d.nwdpItems.forEach((item, index) => {
      // ID + Scope of work (combined in column B) with indentation
      const itemId = item.id || '';
      const scopeText = item.workDoneLabel || '';
      const workDoneIndentLevel = getIndentationLevel(itemId);
      const workDoneText = itemId && scopeText ? `${itemId}. ${scopeText}` : (itemId || scopeText);
      const indentedWorkDone = formatWithDashIndentation(workDoneText, workDoneIndentLevel);
      
      ws.getCell(r, 2).value = indentedWorkDone;
      ws.getCell(r, 2).style = {
        font: { bold: workDoneIndentLevel <= 0 ? true : false, size: 10, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'hair' },
          bottom: { style: 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // Work done percentage
      ws.getCell(r, 3).value = item.workDonePct !== undefined && item.workDonePct !== null ? `${item.workDonePct}%` : '';
      ws.getCell(r, 3).style = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'hair' },
          bottom: { style: 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // Next week plan description (with ID) and indentation
      const nextWeekId = item.id || '';
      const nextWeekText = item.nextWeekLabel || '';
      const nextWeekIndentLevel = getIndentationLevel(nextWeekId);
      const nextWeekCombined = nextWeekId && nextWeekText ? `${nextWeekId}. ${nextWeekText}` : (nextWeekId || nextWeekText);
      const indentedNextWeek = formatWithDashIndentation(nextWeekCombined, nextWeekIndentLevel);
      
      ws.getCell(r, 4).value = indentedNextWeek;
      ws.getCell(r, 4).style = {
        font: { bold: nextWeekIndentLevel <= 0 ? true : false, size: 10, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'hair' },
          bottom: { style: 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // Next week plan percentage
      ws.getCell(r, 5).value = item.nextWeekPct !== undefined && item.nextWeekPct !== null ? `${item.nextWeekPct}%` : '';
      ws.getCell(r, 5).style = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'hair' },
          bottom: { style: 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      r += 1;
    });
  } else {
    // Empty row if no data
    for (let col = 2; col <= 5; col++) {
      ws.getCell(r, col).style = {
        border: {
          top: { style: 'hair' },
          bottom: { style: 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
    }
    r += 1;
  }
}

// SHEET 8: 4. QAQC
async function buildQAQC(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('4. QAQC');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF0070C0' };

  // Set column widths
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 32; // Column B
  ws.getColumn(3).width = 50; // Column C
  ws.getColumn(4).width = 16; // Column D
  ws.getColumn(5).width = 17; // Column E
  ws.getColumn(6).width = 5;  // Column F

  let r = 3;

  ws.getCell(r, 2).value = '4. QA/QC STATUS';
  ws.getCell(r, 2).style = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };
  ws.getRow(r).height = 20;
  ws.mergeCells(r, 2, r, 5);
  r += 2;

  // Display all 13 QAQC sections with default empty tables
  const qaqcSectionList = [
    { id: '4.1', title: 'Non-Conformity Report (NCR)' },
    { id: '4.2', title: 'Corrective Action Request (CAR)' },
    { id: '4.3', title: 'Safety Corrective Action Request (SCAR)' },
    { id: '4.4', title: 'PM Site Instruction (SI)' },
    { id: '4.5', title: 'Client Site Instruction (SI)' },
    { id: '4.6', title: 'Inspection Request (IR)' },
    { id: '4.7', title: 'Material for Approval (MFA)' },
    { id: '4.8', title: 'Request for Information (RFI)' },
    { id: '4.9', title: 'Request for Approval (RFA)' },
    { id: '4.10', title: 'Field Change Request (FCR)' },
    { id: '4.11', title: 'Variation Order (VO)' },
    { id: '4.12', title: 'Transmittal (TR)' },
    { id: '4.13', title: 'Material Inspection Approval (MIR)' }
  ];

  for (let i = 0; i < 13; i++) {
    const section = qaqcSectionList[i];
    
    // Section title
    ws.getCell(r, 1).value = section.id;
    ws.getCell(r, 2).value = section.title;
    ws.getCell(r, 2).style = {
      font: { bold: true, size: 11, name: 'Arial' }
    };
    ws.getRow(r).height = 22.5;
    r++; // Space between sections

   
    // Extract acronym from section title (e.g., "Non-Conformity Report (NCR)" -> "NCR")
    const acronymMatch = section.title.match(/\(([^)]+)\)$/);
    const sectionAcronym = acronymMatch ? acronymMatch[1] : section.title;
    
    const sectionData = d.qaqcSections?.find(s => 
      s.sectionTitle === sectionAcronym || 
      s.sectionTitle?.includes(sectionAcronym)
    );

    // Table headers - special case for Client Site Instruction and Inspection Request
    if (section.id === '4.5') {
      ws.getCell(r, 2).value = 'Code';
      ws.getCell(r, 3).value = 'Description';
      ws.getCell(r, 4).value = 'Issued By';
      ws.getCell(r, 5).value = 'Issued Date';
    } else if (section.id === '4.6') {
      ws.getCell(r, 2).value = 'Code';
      ws.getCell(r, 3).value = 'Description';
      ws.getCell(r, 4).value = 'Received Date';
      ws.getCell(r, 5).value = 'Inspection Date';
    } else {
      // Standard order: Code, Description, Status, Date Responded
      ws.getCell(r, 2).value = 'Code';
      ws.getCell(r, 3).value = 'Description';
      ws.getCell(r, 4).value = 'Status';
      ws.getCell(r, 5).value = 'Date Responded';
    }
    
    // Style headers as bold with background color
    const headerStyle = {
      font: { bold: true, size: 11, name: 'Arial' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF9BC2E6' } }
    };
    
    ws.getCell(r, 2).style = headerStyle;
    ws.getCell(r, 3).style = headerStyle;
    ws.getCell(r, 4).style = headerStyle;
    ws.getCell(r, 5).style = headerStyle;
    ws.getCell(r, 6).style = headerStyle;
    
    r += 1;

    // Items or empty rows
    const items = sectionData?.items ?? [];
    const rowsToRender = Math.max(items.length, 5); // minimum 5 rows
    
    for (let j = 0; j < rowsToRender; j++) {
      const item = items[j];
      
      ws.getCell(r, 2).value = item?.code || '';
      ws.getCell(r, 3).value = item?.description || '';
      ws.getCell(r, 4).value = item?.status || '';
      ws.getCell(r, 5).value = item?.date || '';
      
      // Style data cells with borders
      const dataStyleWithBorder = {
        ...styles.data,
        border: {
          top: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          left: { style: 'thin' as const },
          right: { style: 'thin' as const }
        }
      };
      
      ws.getCell(r, 2).style = dataStyleWithBorder;
      ws.getCell(r, 3).style = dataStyleWithBorder;
      ws.getCell(r, 4).style = dataStyleWithBorder;
      ws.getCell(r, 5).style = dataStyleWithBorder;
      
      r += 1;
    }

    // Comments section - merge B-E with default height 42
    ws.getCell(r, 2).value = 'Comments:';
    ws.getCell(r, 2).style = { 
      ...styles.boldText, 
      border: {
        top: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        left: { style: 'thin' as const },
        right: { style: 'thin' as const }
      },
      alignment: { horizontal: 'left' as const, vertical: 'top' as const }
    };
    ws.mergeCells(r, 2, r, 5); // Merge B-E
    ws.getRow(r).height = 42; // Default height
    r += 1;
    
    // Collect comments from individual rows
    const rowComments = items?.map(item => item?.comment).filter(comment => comment && comment.trim()) || [];
    const allComments = rowComments.join('\n\n');
    
    if (allComments.trim()) {
      const commentLines = allComments.split('\n');
      for (const line of commentLines) {
        ws.getCell(r, 2).value = line;
        ws.getCell(r, 2).style = styles.data;
        ws.mergeCells(r, 2, r, 5); // Merge B-E
        ws.getRow(r).height = 42; // Default height, will expand based on content
        r += 1;
      }
    }
    
    r += 2; // Space between sections
  }

  
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
