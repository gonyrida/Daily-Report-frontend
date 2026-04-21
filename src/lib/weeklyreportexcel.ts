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
  hsePhotos?: HSEPhotoEntry[];

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
  isGroupHeader?: boolean;  // marker for team group headers (I. / II. / III.)
}

export interface MaterialRow {
  description?: string;
  unit?: string;
  dailyData?: (number | string)[];  // 7 days: Fri, Sat, Sun, Mon, Tue, Wed, Thu
  previous?: number | string;
  thisPeriod?: number | string;
  accumulate?: number | string;
}

export interface EquipmentRow {
  description?: string;
  unit?: string;
  dailyData?: (number | string)[];  // 7 days: Fri, Sat, Sun, Mon, Tue, Wed, Thu
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

export interface HSEPhotoEntry {
  sectionTitle?: string;      // e.g., "5.6.1 HSES Training Photos"
  images?: string[];            // Array of image URLs or base64 data
  footers?: string[];           // Footer text for each image (caption)
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

    ws.getCell(r, 2).value = '\n' + d.designConstruction + '\n';
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

    // Section title - id and title in same column B with bold id
    ws.getCell(r, 2).value = {
      richText: [
        { text: `${section.id} `, font: { bold: true, size: 11, name: 'Arial' } },
        { text: section.title, font: { size: 11, name: 'Arial' } }
      ]
    };
    ws.getCell(r, 2).style = {
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    ws.mergeCells(r, 2, r, 5);
    ws.getRow(r).height = 22.5;
    r++; // Space between sections

    // Match section by sectionTitle which is the key like "4.1", "4.2", etc.
    const sectionData = d.qaqcSections?.find(s => s.sectionTitle === section.id);

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
    ws.getRow(r).height = 30;

    r += 1;

    // Items or empty rows
    const items = sectionData?.items ?? [];
    const rowsToRender = Math.max(items.length, 5); // minimum 5 rows

    for (let j = 0; j < rowsToRender; j++) {
      const item = items[j];

      ws.getCell(r, 2).value = item?.code || '';
      ws.getCell(r, 3).value = item?.description || '';

      // Handle special fields for sections 4.5 and 4.6
      if (section.id === '4.5') {
        // Client Site Instruction: Issued By, Issued Date
        ws.getCell(r, 4).value = (item as any)?.issuedBy || item?.status || '';
        ws.getCell(r, 5).value = (item as any)?.issuedDate || (item as any)?.dateResponse || '';
      } else if (section.id === '4.6') {
        // Inspection Request: Received Date, Inspection Date
        ws.getCell(r, 4).value = (item as any)?.receivedDate || (item as any)?.dateResponse || '';
        ws.getCell(r, 5).value = (item as any)?.inspectionDate || '';
      } else {
        // Standard: Status, Date Responded
        ws.getCell(r, 4).value = item?.status || '';
        ws.getCell(r, 5).value = (item as any)?.dateResponse || '';
      }

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
      ws.getCell(r, 4).style = {
        ...dataStyleWithBorder,
        alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }
      };
      ws.getCell(r, 5).style = dataStyleWithBorder;
      ws.getRow(r).height = 22;

      r += 1;
    }

    // Comments section - use section-level comments field
    const sectionComments = sectionData?.comments || '';

    // Comments row with rich text: "Comments:" bold+underline, value normal
    if (sectionComments.trim()) {
      ws.getCell(r, 2).value = {
        richText: [
          { text: 'Comments: ', font: { bold: true, underline: true, name: 'Arial', size: 11 } },
          { text: sectionComments, font: { name: 'Arial', size: 11 } }
        ]
      };
    } else {
      ws.getCell(r, 2).value = {
        richText: [
          { text: 'Comments:', font: { bold: true, underline: true, name: 'Arial', size: 11 } }
        ]
      };
    }

    ws.getCell(r, 2).style = {
      border: {
        top: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        left: { style: 'thin' as const },
        right: { style: 'thin' as const }
      },
      alignment: { horizontal: 'left' as const, vertical: 'top' as const, wrapText: true }
    };
    ws.mergeCells(r, 2, r, 5); // Merge B-E
    ws.getRow(r).height = 42;
    r += 1;

    r += 2; // Space between sections
  }


}
const HEADER_FILL = 'FFBDD7EE'; // theme 4, tint 0.4  (grey-blue header bg)
const TOTAL_FILL = 'FFE2EFDA'; // theme 7, tint 0.8  (light green totals)
const LOCATION_FILL = 'FFFFF2CC'; // theme 3, tint 0.8  (soft yellow banner)
// SHEET 9: 5. HSE
async function buildHSE(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('5. HSE');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF00B050' };

  // ── Column widths (A–K) exactly as template ──────────────────────────────
  const widths = [5.71, 30.71, 5.71, 8.43, 8.43, 8.43, 8.43, 8.43, 10.57, 15.71, 20];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Reusable style helpers ───────────────────────────────────────────────
  const sectionTitleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };
  const subSectionStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };
  const tableHeaderStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const dataCellStyle: Partial<ExcelJS.Style> = {
    font: { size: 11, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const dataCenterStyle: Partial<ExcelJS.Style> = {
    ...dataCellStyle,
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  };
  const noteBoxStyle: Partial<ExcelJS.Style> = {
    font: { size: 11, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  let r = 3;

  // ── Title row ────────────────────────────────────────────────────────────
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)';
  safeStyle(ws.getCell(r, 2), sectionTitleStyle, 'hseTitle');
  safeMerge(ws, r, 2, r, 11);
  r += 2; // row 5

  // ═══════════════════════════════════════════════════════════════════════
  // 5.1 HSES Training / Introduction / Toolbox Meeting
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '5.1 HSES Training / Introduction / Toolbox Meeting';
  safeStyle(ws.getCell(r, 2), subSectionStyle, 'hse51');
  r++; // row 6 — header

  // Header row: B=Type, E=Date, G=Venue (merged G-H), I=Trainer, J=Attendee, K=Remarks
  ws.getRow(r).height = 20.1;
  const trainingHdr = [
    { col: 2, val: 'Type of Training' },   // B (merged B-D)
    { col: 5, val: 'Date' },               // E (merged E-F)
    { col: 7, val: 'Venue' },              // G (merged G-H)
    { col: 9, val: 'Trainer' },            // I
    { col: 10, val: 'Attendee' },          // J
    { col: 11, val: 'Remarks' },           // K
  ];
  trainingHdr.forEach(h => {
    ws.getCell(r, h.col).value = h.val;
    safeStyle(ws.getCell(r, h.col), tableHeaderStyle, 'trainingHdr');
  });
  // Apply header style to spanned cells so borders render correctly
  [3, 4, 6, 8].forEach(c => safeStyle(ws.getCell(r, c), tableHeaderStyle, 'hdrSpan'));
  safeMerge(ws, r, 2, r, 4); // B-D (Type of Training)
  safeMerge(ws, r, 5, r, 6); // E-F (Date)
  safeMerge(ws, r, 7, r, 8); // G-H (Venue)
  r++; // row 7 — first data row

  // Training data rows (min 3 rows so the block always renders)
  const trainingRows = d.hseTraining ?? [];
  const trainingCount = Math.max(trainingRows.length, 3);
  for (let i = 0; i < trainingCount; i++) {
    const row = trainingRows[i] ?? {};
    ws.getRow(r).height = 20.1;

    ws.getCell(r, 2).value = row.typeOfTraining ?? '';
    safeStyle(ws.getCell(r, 2), dataCellStyle, 'train.type');
    safeStyle(ws.getCell(r, 3), dataCellStyle, 'train.type.span');
    safeStyle(ws.getCell(r, 4), dataCellStyle, 'train.type.span');
    safeMerge(ws, r, 2, r, 4);

    ws.getCell(r, 5).value = row.date ?? '';
    safeStyle(ws.getCell(r, 5), dataCenterStyle, 'train.date');
    safeStyle(ws.getCell(r, 6), dataCenterStyle, 'train.date.span');
    safeMerge(ws, r, 5, r, 6);

    ws.getCell(r, 7).value = row.venue ?? '';
    safeStyle(ws.getCell(r, 7), dataCenterStyle, 'train.venue');
    safeStyle(ws.getCell(r, 8), dataCenterStyle, 'train.venue.span');
    safeMerge(ws, r, 7, r, 8);

    ws.getCell(r, 9).value = row.trainer ?? '';
    safeStyle(ws.getCell(r, 9), dataCenterStyle, 'train.trainer');

    ws.getCell(r, 10).value = row.attendee ?? '';
    safeStyle(ws.getCell(r, 10), dataCenterStyle, 'train.attendee');

    ws.getCell(r, 11).value = row.remarks ?? '';
    safeStyle(ws.getCell(r, 11), dataCellStyle, 'train.remarks');

    r++;
  }
  r++; // blank spacer row

  // ═══════════════════════════════════════════════════════════════════════
  // 5.2 HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value =
    '5.2 HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist';
  safeStyle(ws.getCell(r, 2), subSectionStyle, 'hse52');
  r++;

  // Header: B-H Type of Inspection (merged), I Date, J Inspector, K Remarks
  ws.getRow(r).height = 35.1;
  ws.getCell(r, 2).value = 'Type of Inspection';
  safeStyle(ws.getCell(r, 2), tableHeaderStyle, 'insp.type');
  for (let c = 3; c <= 8; c++) safeStyle(ws.getCell(r, c), tableHeaderStyle, 'insp.type.span');
  safeMerge(ws, r, 2, r, 8);

  ws.getCell(r, 9).value = 'Date';
  safeStyle(ws.getCell(r, 9), tableHeaderStyle, 'insp.date');
  ws.getCell(r, 10).value = 'Inspector';
  safeStyle(ws.getCell(r, 10), tableHeaderStyle, 'insp.inspector');
  ws.getCell(r, 11).value = 'Remarks';
  safeStyle(ws.getCell(r, 11), tableHeaderStyle, 'insp.remarks');
  r++;

  const inspectionRows = d.hseInspection ?? [];
  const inspCount = Math.max(inspectionRows.length, 3);
  for (let i = 0; i < inspCount; i++) {
    const row = inspectionRows[i] ?? {};
    ws.getRow(r).height = 20.1;

    ws.getCell(r, 2).value = row.typeOfInspection ?? '';
    safeStyle(ws.getCell(r, 2), dataCellStyle, 'insp.type.data');
    for (let c = 3; c <= 8; c++) safeStyle(ws.getCell(r, c), dataCellStyle, 'insp.type.data.span');
    safeMerge(ws, r, 2, r, 8);

    ws.getCell(r, 9).value = row.date ?? '';
    safeStyle(ws.getCell(r, 9), dataCenterStyle, 'insp.date.data');

    ws.getCell(r, 10).value = row.inspector ?? '';
    safeStyle(ws.getCell(r, 10), dataCenterStyle, 'insp.inspector.data');

    ws.getCell(r, 11).value = row.remarks ?? '';
    safeStyle(ws.getCell(r, 11), dataCellStyle, 'insp.remarks.data');

    r++;
  }
  r++;

  // ═══════════════════════════════════════════════════════════════════════
  // 5.3 Permit to Work
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '5.3 Permit to Work';
  safeStyle(ws.getCell(r, 2), subSectionStyle, 'hse53');
  r++;

  // Header: B-D Type of Permit, E-F Start Date, G-H End Date, I Inspector, J Approver, K Remarks
  ws.getRow(r).height = 20.1;

  ws.getCell(r, 2).value = 'Type of Permit';
  safeStyle(ws.getCell(r, 2), tableHeaderStyle, 'permit.type');
  safeStyle(ws.getCell(r, 3), tableHeaderStyle, 'permit.type.span');
  safeStyle(ws.getCell(r, 4), tableHeaderStyle, 'permit.type.span');
  safeMerge(ws, r, 2, r, 4);

  ws.getCell(r, 5).value = 'Start Date';
  safeStyle(ws.getCell(r, 5), tableHeaderStyle, 'permit.start');
  safeStyle(ws.getCell(r, 6), tableHeaderStyle, 'permit.start.span');
  safeMerge(ws, r, 5, r, 6);

  ws.getCell(r, 7).value = 'End Date';
  safeStyle(ws.getCell(r, 7), tableHeaderStyle, 'permit.end');
  safeStyle(ws.getCell(r, 8), tableHeaderStyle, 'permit.end.span');
  safeMerge(ws, r, 7, r, 8);

  ws.getCell(r, 9).value = 'Inspector';
  safeStyle(ws.getCell(r, 9), tableHeaderStyle, 'permit.inspector');

  ws.getCell(r, 10).value = 'Approver';
  safeStyle(ws.getCell(r, 10), tableHeaderStyle, 'permit.approver');

  ws.getCell(r, 11).value = 'Remarks';
  safeStyle(ws.getCell(r, 11), tableHeaderStyle, 'permit.remarks');
  r++;

  const permitRows = d.hsePermits ?? [];
  const permitCount = Math.max(permitRows.length, 3);
  for (let i = 0; i < permitCount; i++) {
    const row = permitRows[i] ?? {};
    ws.getRow(r).height = 20.1;

    ws.getCell(r, 2).value = row.typeOfPermit ?? '';
    safeStyle(ws.getCell(r, 2), dataCellStyle, 'p.type.data');
    safeStyle(ws.getCell(r, 3), dataCellStyle, 'p.type.data.span');
    safeStyle(ws.getCell(r, 4), dataCellStyle, 'p.type.data.span');
    safeMerge(ws, r, 2, r, 4);

    ws.getCell(r, 5).value = row.startDate ?? '';
    safeStyle(ws.getCell(r, 5), dataCenterStyle, 'p.start.data');
    safeStyle(ws.getCell(r, 6), dataCenterStyle, 'p.start.data.span');
    safeMerge(ws, r, 5, r, 6);

    ws.getCell(r, 7).value = row.endDate ?? '';
    safeStyle(ws.getCell(r, 7), dataCenterStyle, 'p.end.data');
    safeStyle(ws.getCell(r, 8), dataCenterStyle, 'p.end.data.span');
    safeMerge(ws, r, 7, r, 8);

    ws.getCell(r, 9).value = row.inspector ?? '';
    safeStyle(ws.getCell(r, 9), dataCenterStyle, 'p.inspector.data');

    ws.getCell(r, 10).value = row.approver ?? '';
    safeStyle(ws.getCell(r, 10), dataCenterStyle, 'p.approver.data');

    ws.getCell(r, 11).value = row.remarks ?? '';
    safeStyle(ws.getCell(r, 11), dataCellStyle, 'p.remarks.data');

    r++;
  }
  r++;

  // ═══════════════════════════════════════════════════════════════════════
  // 5.4 First Aid / Accident / Incident / Near Miss / Fatalities (if Any)
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '5.4 First Aid / Accident / Incident / Near Miss / Fatalities (if Any)';
  safeStyle(ws.getCell(r, 2), subSectionStyle, 'hse54');
  r++;

  // Multi-line note box (4 rows tall)
  const firstAidText = (d.hseFirstAid && d.hseFirstAid.trim() !== '')
    ? d.hseFirstAid
    : '…..........................................................................................................................................................................................';
  ws.getRow(r).height = 80;
  ws.getCell(r, 2).value = firstAidText;
  safeStyle(ws.getCell(r, 2), noteBoxStyle, 'hse54.box');
  for (let c = 3; c <= 11; c++) safeStyle(ws.getCell(r, c), noteBoxStyle, 'hse54.box.span');
  safeMerge(ws, r, 2, r, 11);
  r += 2;

  // ═══════════════════════════════════════════════════════════════════════
  // 5.5 Other HSES Activities Concerns
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '5.5 Other HSES Activities Concerns';
  safeStyle(ws.getCell(r, 2), subSectionStyle, 'hse55');
  r++;

  const otherText = (d.hseOtherConcerns && d.hseOtherConcerns.trim() !== '')
    ? d.hseOtherConcerns
    : '…..........................................................................................................................................................................................';
  ws.getRow(r).height = 80;
  ws.getCell(r, 2).value = otherText;
  safeStyle(ws.getCell(r, 2), noteBoxStyle, 'hse55.box');
  for (let c = 3; c <= 11; c++) safeStyle(ws.getCell(r, c), noteBoxStyle, 'hse55.box.span');
  safeMerge(ws, r, 2, r, 11);
  r += 2;

  // ═══════════════════════════════════════════════════════════════════════
  // 5.6 HSES Photo Reference
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '5.6 HSES Photo Reference';
  safeStyle(ws.getCell(r, 2), subSectionStyle, 'hse56');
  r++;

  // Photo reference layout - two columns (lanes) per row
  // Layout: B-E = Left lane (merged), F-I = Right lane (merged)
  // Each entry block: header row + spacer + photo row + spacer + footer row

  const photoBoxStyle: Partial<ExcelJS.Style> = {
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  const sectionHeaderStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  const footerStyle: Partial<ExcelJS.Style> = {
    font: { size: 10, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  const naStyle: Partial<ExcelJS.Style> = {
    font: { size: 20, name: 'Arial', color: { argb: 'FF000000' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  // Process HSE photo entries
  const hsePhotoEntries = d.hsePhotos ?? [];
  let lastSection: string | undefined = undefined;
  let entriesOnCurrentPage = 0;

  for (const entry of hsePhotoEntries) {
    const currentSection = entry.sectionTitle;
    const sectionChanged = currentSection && currentSection !== lastSection;

    // Page break after 4 entries
    if (entriesOnCurrentPage >= 4) {
      // Add page break before new entry
      ws.getRow(r).addPageBreak();
      entriesOnCurrentPage = 0;

      // If section didn't change but page broke, re-print header with "(Continued)"
      if (!sectionChanged && lastSection) {
        ws.getRow(r).height = 20.1;
        ws.getCell(r, 2).value = `${lastSection} (Continued)`;
        safeStyle(ws.getCell(r, 2), sectionHeaderStyle, 'hse56.hdr');
        for (let c = 3; c <= 9; c++) safeStyle(ws.getCell(r, c), sectionHeaderStyle, 'hse56.hdr.span');
        safeMerge(ws, r, 2, r, 9);
        r++;
      }
    }

    // Handle new section header
    if (sectionChanged) {
      ws.getRow(r).height = 20.1;
      ws.getCell(r, 2).value = currentSection ?? '';
      safeStyle(ws.getCell(r, 2), sectionHeaderStyle, 'hse56.hdr');
      for (let c = 3; c <= 9; c++) safeStyle(ws.getCell(r, c), sectionHeaderStyle, 'hse56.hdr.span');
      safeMerge(ws, r, 2, r, 9);
      r++;
      lastSection = currentSection;
    }

    // Render photo entry block
    // Spacer row
    ws.getRow(r).height = 6.95;
    r++;

    // Photo row - tall (170pt)
    const photoRow = r;
    ws.getRow(r).height = 170.1;

    // Left photo box (B-E merged)
    safeStyle(ws.getCell(r, 2), photoBoxStyle, 'hse56.photoL');
    for (let c = 3; c <= 5; c++) safeStyle(ws.getCell(r, c), photoBoxStyle, 'hse56.photoL.span');
    safeMerge(ws, r, 2, r, 5);

    // Right photo box (F-I merged)
    safeStyle(ws.getCell(r, 6), photoBoxStyle, 'hse56.photoR');
    for (let c = 7; c <= 9; c++) safeStyle(ws.getCell(r, c), photoBoxStyle, 'hse56.photoR.span');
    safeMerge(ws, r, 6, r, 9);

    // Handle images
    const images = entry.images ?? [];
    const footers = entry.footers ?? [];
    const maxImages = 2; // Two lanes

    // Add images or N/A
    for (let idx = 0; idx < maxImages; idx++) {
      const imgSource = images[idx];
      const startCol = idx === 0 ? 2 : 6; // B for left, F for right
      const endCol = idx === 0 ? 5 : 9;   // E for left, I for right

      if (imgSource) {
        // Schedule image insertion after worksheet is set up
        // Images will be added asynchronously
        addImageToWorksheet(workbook, ws, imgSource, {
          tl: { col: startCol - 1, row: photoRow - 1 },
          br: { col: endCol - 1, row: photoRow - 1 },
          ext: { width: 200, height: 170 },
          editAs: 'oneCell'
        } as any).catch(() => {
          // If image fails, leave the cell empty (border already set)
        });
      } else {
        // No image - show N/A
        ws.getCell(photoRow, startCol).value = 'N/A';
        safeStyle(ws.getCell(photoRow, startCol), naStyle, 'hse56.na');
        safeStyle(ws.getCell(photoRow, startCol + 1), naStyle, 'hse56.na.span');
        safeStyle(ws.getCell(photoRow, startCol + 2), naStyle, 'hse56.na.span');
        if (idx === 0) {
          safeStyle(ws.getCell(photoRow, startCol + 3), naStyle, 'hse56.na.span');
        }
      }
    }

    r++;

    // Spacer row
    ws.getRow(r).height = 6.95;
    r++;

    // Footer/caption row (C-D for left, G-H for right)
    ws.getRow(r).height = 15;

    // Left footer
    ws.getCell(r, 3).value = footers[0] ?? '';
    safeStyle(ws.getCell(r, 3), footerStyle, 'hse56.footerL');
    safeStyle(ws.getCell(r, 4), footerStyle, 'hse56.footerL.span');
    safeMerge(ws, r, 3, r, 4);

    // Right footer
    ws.getCell(r, 7).value = footers[1] ?? '';
    safeStyle(ws.getCell(r, 7), footerStyle, 'hse56.footerR');
    safeStyle(ws.getCell(r, 8), footerStyle, 'hse56.footerR.span');
    safeMerge(ws, r, 7, r, 8);

    r++;
    entriesOnCurrentPage++;
  }

  // If no entries, render one empty placeholder
  if (hsePhotoEntries.length === 0) {
    // Spacer row
    ws.getRow(r).height = 6.95;
    r++;

    // Photo row
    ws.getRow(r).height = 170.1;

    // Left photo box with N/A
    ws.getCell(r, 2).value = 'N/A';
    safeStyle(ws.getCell(r, 2), naStyle, 'hse56.na');
    for (let c = 3; c <= 5; c++) safeStyle(ws.getCell(r, c), naStyle, 'hse56.na.span');
    safeMerge(ws, r, 2, r, 5);

    // Right photo box with N/A
    ws.getCell(r, 6).value = 'N/A';
    safeStyle(ws.getCell(r, 6), naStyle, 'hse56.na');
    for (let c = 7; c <= 9; c++) safeStyle(ws.getCell(r, c), naStyle, 'hse56.na.span');
    safeMerge(ws, r, 6, r, 9);

    r++;
  }
}

// Small helper: 1-based column index → Excel letter (A, B, ... Z, AA, AB, ...)
function colLetter(col: number): string {
  let s = '';
  let n = col;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// SHEET 10: 6. Resources
async function buildResources(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('6. Resources');
  const styles = createStyles(workbook);

  ws.properties.tabColor = { argb: 'FF00B050' };

  // ── Column widths (A–L) — compact layout without per-site columns ────────
  const widths = [5.71, 42, 8, 8, 8, 8, 8, 8, 8, 14, 14, 18];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Styles ───────────────────────────────────────────────────────────────
  const titleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };
  const subTitleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const dataStyle: Partial<ExcelJS.Style> = {
    font: { size: 11, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const numStyle: Partial<ExcelJS.Style> = {
    ...dataStyle,
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  const totalStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const totalNumStyle: Partial<ExcelJS.Style> = {
    ...totalStyle,
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  const totalEmptyStyle: Partial<ExcelJS.Style> = {
    ...totalStyle,
    alignment: { horizontal: 'center', vertical: 'middle' },
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  // Robust group-header detection (matches "I.", "II.", "III." prefix too).
  const isGroupHeaderRow = (mp: any): boolean => {
    if (mp?.isGroupHeader === true) return true;
    const desc = String(mp?.description ?? '').trim();
    return /^[IVXLCDM]+\.\s/i.test(desc);
  };

  // Write formula + pre-computed result so Excel shows the value without
  // requiring "Enable Editing".
  const setFormulaWithResult = (
    cell: ExcelJS.Cell,
    formula: string,
    result: number,
  ) => {
    cell.value = { formula, result } as ExcelJS.CellFormulaValue;
  };

  // Numeric coercion — empty/undefined/non-numeric → 0.
  const num = (v: any): number => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Defensive daily-data extractor — different record shapes put the daily
  // values under different field names. Try all the common ones before giving
  // up and returning zeros. This is why 6.2/6.3 were previously showing 0s:
  // the caller likely stores dailies under `dailyCounts` (matching 6.1) rather
  // than `dailyData`, so we now accept either.
  const pickDailyArray = (row: any): any[] => {
    if (Array.isArray(row?.dailyData)) return row.dailyData;
    if (Array.isArray(row?.dailyCounts)) return row.dailyCounts;
    if (Array.isArray(row?.daily)) return row.daily;
    if (Array.isArray(row?.days)) return row.days;
    return [];
  };

  const dayLabels = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const dates = d.weekDates && d.weekDates.length === 7
    ? d.weekDates
    : ['', '', '', '', '', '', ''];

  let r = 3;

  // ── Sheet title ──────────────────────────────────────────────────────────
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '6. RESOURCES STATUS';
  safeStyle(ws.getCell(r, 2), titleStyle, 'res.title');
  safeMerge(ws, r, 2, r, 12);
  r += 2;

  // ═══════════════════════════════════════════════════════════════════════
  // 6.1 Manpower Status
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '6.1 Manpower Status';
  safeStyle(ws.getCell(r, 2), subTitleStyle, 'res.61');
  r++;

  const hdrRow1 = r;
  ws.getRow(r).height = 22;
  ws.getCell(r, 2).value = 'Description';
  safeStyle(ws.getCell(r, 2), headerStyle, 'mp.desc');

  const weekLabel = (dates[0] && dates[6]) ? `Day ${dates[0]}–${dates[6]}` : 'This Week';
  ws.getCell(r, 3).value = weekLabel;
  safeStyle(ws.getCell(r, 3), headerStyle, 'mp.week');
  for (let c = 4; c <= 9; c++) safeStyle(ws.getCell(r, c), headerStyle, 'mp.week.span');
  safeMerge(ws, r, 3, r, 9);

  ws.getCell(r, 10).value = 'Previous Week';
  safeStyle(ws.getCell(r, 10), headerStyle, 'mp.prev');
  ws.getCell(r, 11).value = 'This Week';
  safeStyle(ws.getCell(r, 11), headerStyle, 'mp.this');
  ws.getCell(r, 12).value = 'Up to This Week';
  safeStyle(ws.getCell(r, 12), headerStyle, 'mp.upto');
  r++;

  ws.getRow(r).height = 18;
  dayLabels.forEach((day, i) => {
    ws.getCell(r, 3 + i).value = day;
    safeStyle(ws.getCell(r, 3 + i), headerStyle, `mp.day.${day}`);
  });
  safeStyle(ws.getCell(r, 2), headerStyle, 'mp.descBlank');
  safeStyle(ws.getCell(r, 10), headerStyle, 'mp.prevBlank');
  safeStyle(ws.getCell(r, 11), headerStyle, 'mp.thisBlank');
  safeStyle(ws.getCell(r, 12), headerStyle, 'mp.uptoBlank');
  safeMerge(ws, hdrRow1, 2, r + 1, 2);
  safeMerge(ws, hdrRow1, 10, r + 1, 10);
  safeMerge(ws, hdrRow1, 11, r + 1, 11);
  safeMerge(ws, hdrRow1, 12, r + 1, 12);
  r++;

  ws.getRow(r).height = 18;
  dates.forEach((dt, i) => {
    ws.getCell(r, 3 + i).value = dt;
    safeStyle(ws.getCell(r, 3 + i), headerStyle, `mp.dt.${i}`);
  });
  r++;

  // ── Manpower data rows ───────────────────────────────────────────────────
  const manpowerRows = d.manpowerRows ?? [];

  const groupHeaderStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  let mpItemNo = 0;
  const mpDataRowIndices: number[] = [];

  manpowerRows.forEach((mp: any) => {
    ws.getRow(r).height = 20;

    if (isGroupHeaderRow(mp)) {
      ws.getCell(r, 2).value = mp.description ?? '';
      safeStyle(ws.getCell(r, 2), groupHeaderStyle, 'mp.group');
      for (let c = 3; c <= 12; c++) {
        ws.getCell(r, c).value = null;
        safeStyle(ws.getCell(r, c), groupHeaderStyle, 'mp.group.span');
      }
      safeMerge(ws, r, 2, r, 12);
      mpItemNo = 0;
      r++;
      return;
    }

    mpItemNo++;
    const desc = mp.description ?? '';
    ws.getCell(r, 2).value = `${mpItemNo}. ${desc}`;
    safeStyle(ws.getCell(r, 2), dataStyle, 'mp.desc.data');

    const dc = pickDailyArray(mp);
    const dailyNums: number[] = [];
    for (let i = 0; i < 7; i++) {
      const v = num(dc[i]);
      dailyNums.push(v);
      ws.getCell(r, 3 + i).value = v;
      safeStyle(ws.getCell(r, 3 + i), numStyle, `mp.dc.${i}`);
    }

    const prevWk = num(mp.previousWeek);
    ws.getCell(r, 10).value = prevWk;
    safeStyle(ws.getCell(r, 10), numStyle, 'mp.prev.data');

    const thisWkComputed = mp.thisWeek !== undefined && mp.thisWeek !== ''
      ? num(mp.thisWeek)
      : dailyNums.reduce((a, b) => a + b, 0);
    if (mp.thisWeek !== undefined && mp.thisWeek !== '') {
      ws.getCell(r, 11).value = thisWkComputed;
    } else {
      setFormulaWithResult(ws.getCell(r, 11), `SUM(C${r}:I${r})`, thisWkComputed);
    }
    safeStyle(ws.getCell(r, 11), numStyle, 'mp.this.data');

    const upToComputed = mp.upToThisWeek !== undefined && mp.upToThisWeek !== ''
      ? num(mp.upToThisWeek)
      : prevWk + thisWkComputed;
    if (mp.upToThisWeek !== undefined && mp.upToThisWeek !== '') {
      ws.getCell(r, 12).value = upToComputed;
    } else {
      setFormulaWithResult(ws.getCell(r, 12), `J${r}+K${r}`, upToComputed);
    }
    safeStyle(ws.getCell(r, 12), numStyle, 'mp.upto.data');

    mpDataRowIndices.push(r);
    r++;
  });

  if (manpowerRows.length === 0) {
    ws.getRow(r).height = 20;
    for (let c = 2; c <= 12; c++) safeStyle(ws.getCell(r, c), dataStyle, 'mp.empty');
    r++;
  }

  // Manpower Grand Total — only J / K / L.
  ws.getRow(r).height = 22;
  ws.getCell(r, 2).value = 'Grand Total';
  safeStyle(ws.getCell(r, 2), totalStyle, 'mp.total.lbl');
  for (let i = 0; i < 7; i++) {
    ws.getCell(r, 3 + i).value = null;
    safeStyle(ws.getCell(r, 3 + i), totalEmptyStyle, `mp.total.d${i}`);
  }

  if (mpDataRowIndices.length > 0) {
    const jRefs = mpDataRowIndices.map(idx => `J${idx}`).join(',');
    const kRefs = mpDataRowIndices.map(idx => `K${idx}`).join(',');
    const lRefs = mpDataRowIndices.map(idx => `L${idx}`).join(',');

    let prevTotal = 0;
    let thisTotal = 0;
    let upToTotal = 0;
    mpDataRowIndices.forEach(idx => {
      const jv = ws.getCell(idx, 10).value;
      const kv = ws.getCell(idx, 11).value;
      const lv = ws.getCell(idx, 12).value;
      prevTotal += typeof jv === 'number' ? jv : num((jv as any)?.result);
      thisTotal += typeof kv === 'number' ? kv : num((kv as any)?.result);
      upToTotal += typeof lv === 'number' ? lv : num((lv as any)?.result);
    });

    setFormulaWithResult(ws.getCell(r, 10), `SUM(${jRefs})`, prevTotal);
    setFormulaWithResult(ws.getCell(r, 11), `SUM(${kRefs})`, thisTotal);
    setFormulaWithResult(ws.getCell(r, 12), `SUM(${lRefs})`, upToTotal);
  } else {
    ws.getCell(r, 10).value = 0;
    ws.getCell(r, 11).value = 0;
    ws.getCell(r, 12).value = 0;
  }
  safeStyle(ws.getCell(r, 10), totalNumStyle, 'mp.total.prev');
  safeStyle(ws.getCell(r, 11), totalNumStyle, 'mp.total.this');
  safeStyle(ws.getCell(r, 12), totalNumStyle, 'mp.total.upto');
  r += 2;

  // ═══════════════════════════════════════════════════════════════════════
  // 6.2 Material Delivery Status
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '6.2 Material Delivery Status';
  safeStyle(ws.getCell(r, 2), subTitleStyle, 'res.62');
  r++;

  const matHdrRow1 = r;
  ws.getRow(r).height = 22;
  ws.getCell(r, 2).value = 'Description';
  safeStyle(ws.getCell(r, 2), headerStyle, 'mat.desc');

  const matWeekLabel = (dates[0] && dates[6]) ? `Day ${dates[0]}–${dates[6]}` : 'This Week';
  ws.getCell(r, 3).value = matWeekLabel;
  safeStyle(ws.getCell(r, 3), headerStyle, 'mat.week');
  for (let c = 4; c <= 9; c++) safeStyle(ws.getCell(r, c), headerStyle, 'mat.week.span');
  safeMerge(ws, r, 3, r, 9);

  ws.getCell(r, 10).value = 'Previous';
  safeStyle(ws.getCell(r, 10), headerStyle, 'mat.prev');
  ws.getCell(r, 11).value = 'This Period';
  safeStyle(ws.getCell(r, 11), headerStyle, 'mat.this');
  ws.getCell(r, 12).value = 'Accumulate';
  safeStyle(ws.getCell(r, 12), headerStyle, 'mat.acc');
  r++;

  ws.getRow(r).height = 18;
  dayLabels.forEach((day, i) => {
    ws.getCell(r, 3 + i).value = day;
    safeStyle(ws.getCell(r, 3 + i), headerStyle, `mat.day.${day}`);
  });
  safeStyle(ws.getCell(r, 2), headerStyle, 'mat.descBlank');
  safeStyle(ws.getCell(r, 10), headerStyle, 'mat.prevBlank');
  safeStyle(ws.getCell(r, 11), headerStyle, 'mat.thisBlank');
  safeStyle(ws.getCell(r, 12), headerStyle, 'mat.accBlank');
  safeMerge(ws, matHdrRow1, 2, r + 1, 2);
  safeMerge(ws, matHdrRow1, 10, r + 1, 10);
  safeMerge(ws, matHdrRow1, 11, r + 1, 11);
  safeMerge(ws, matHdrRow1, 12, r + 1, 12);
  r++;

  ws.getRow(r).height = 18;
  dates.forEach((dt, i) => {
    ws.getCell(r, 3 + i).value = dt;
    safeStyle(ws.getCell(r, 3 + i), headerStyle, `mat.dt.${i}`);
  });
  r++;

  // ── Materials data rows ──────────────────────────────────────────────────
  const materialRows = d.materialRows ?? [];
  const matDataRowIndices: number[] = [];

  materialRows.forEach((m: any) => {
    ws.getRow(r).height = 20;

    const descWithUnit = m.unit ? `${m.description ?? ''} (${m.unit})` : (m.description ?? '');
    ws.getCell(r, 2).value = descWithUnit;
    safeStyle(ws.getCell(r, 2), dataStyle, 'mat.desc.data');

    // Use the defensive extractor so dailies render regardless of field name.
    const dd = pickDailyArray(m);
    for (let i = 0; i < 7; i++) {
      ws.getCell(r, 3 + i).value = num(dd[i]);
      safeStyle(ws.getCell(r, 3 + i), numStyle, `mat.daily.${i}`);
    }

    const prevVal = num(m.previous);
    ws.getCell(r, 10).value = prevVal;
    safeStyle(ws.getCell(r, 10), numStyle, 'mat.prev.data');

    const thisVal = num(m.thisPeriod);
    ws.getCell(r, 11).value = thisVal;
    safeStyle(ws.getCell(r, 11), numStyle, 'mat.this.data');

    if (m.accumulate !== undefined && m.accumulate !== '') {
      ws.getCell(r, 12).value = num(m.accumulate);
    } else {
      setFormulaWithResult(ws.getCell(r, 12), `J${r}+K${r}`, prevVal + thisVal);
    }
    safeStyle(ws.getCell(r, 12), numStyle, 'mat.acc.data');

    matDataRowIndices.push(r);
    r++;
  });

  if (materialRows.length === 0) {
    ws.getRow(r).height = 20;
    for (let c = 2; c <= 12; c++) safeStyle(ws.getCell(r, c), dataStyle, 'mat.empty');
    r++;
  }

  // Materials Total — SAME shape as 6.1 Grand Total: blank daily columns,
  // only sum Previous (J), This Period (K), Accumulate (L).
  ws.getRow(r).height = 22;
  ws.getCell(r, 2).value = 'Total';
  safeStyle(ws.getCell(r, 2), totalStyle, 'mat.total.lbl');
  for (let i = 0; i < 7; i++) {
    ws.getCell(r, 3 + i).value = null;
    safeStyle(ws.getCell(r, 3 + i), totalEmptyStyle, `mat.total.d${i}`);
  }

  if (matDataRowIndices.length > 0) {
    const jRefs = matDataRowIndices.map(idx => `J${idx}`).join(',');
    const kRefs = matDataRowIndices.map(idx => `K${idx}`).join(',');
    const lRefs = matDataRowIndices.map(idx => `L${idx}`).join(',');

    let prevTotal = 0;
    let thisTotal = 0;
    let accTotal = 0;
    matDataRowIndices.forEach(idx => {
      const jv = ws.getCell(idx, 10).value;
      const kv = ws.getCell(idx, 11).value;
      const lv = ws.getCell(idx, 12).value;
      prevTotal += typeof jv === 'number' ? jv : num((jv as any)?.result);
      thisTotal += typeof kv === 'number' ? kv : num((kv as any)?.result);
      accTotal += typeof lv === 'number' ? lv : num((lv as any)?.result);
    });

    setFormulaWithResult(ws.getCell(r, 10), `SUM(${jRefs})`, prevTotal);
    setFormulaWithResult(ws.getCell(r, 11), `SUM(${kRefs})`, thisTotal);
    setFormulaWithResult(ws.getCell(r, 12), `SUM(${lRefs})`, accTotal);
  } else {
    ws.getCell(r, 10).value = 0;
    ws.getCell(r, 11).value = 0;
    ws.getCell(r, 12).value = 0;
  }
  safeStyle(ws.getCell(r, 10), totalNumStyle, 'mat.total.prev');
  safeStyle(ws.getCell(r, 11), totalNumStyle, 'mat.total.this');
  safeStyle(ws.getCell(r, 12), totalNumStyle, 'mat.total.acc');
  r += 2;

  // ═══════════════════════════════════════════════════════════════════════
  // 6.3 Machinery / Equipment Status
  // ═══════════════════════════════════════════════════════════════════════
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '6.3 Machinery / Equipment Status';
  safeStyle(ws.getCell(r, 2), subTitleStyle, 'res.63');
  r++;

  const eqHdrRow1 = r;
  ws.getRow(r).height = 22;
  ws.getCell(r, 2).value = 'Description';
  safeStyle(ws.getCell(r, 2), headerStyle, 'eq.desc');

  const eqWeekLabel = (dates[0] && dates[6]) ? `Day ${dates[0]}–${dates[6]}` : 'This Week';
  ws.getCell(r, 3).value = eqWeekLabel;
  safeStyle(ws.getCell(r, 3), headerStyle, 'eq.week');
  for (let c = 4; c <= 9; c++) safeStyle(ws.getCell(r, c), headerStyle, 'eq.week.span');
  safeMerge(ws, r, 3, r, 9);

  ws.getCell(r, 10).value = 'Previous';
  safeStyle(ws.getCell(r, 10), headerStyle, 'eq.prev');
  ws.getCell(r, 11).value = 'This Period';
  safeStyle(ws.getCell(r, 11), headerStyle, 'eq.this');
  ws.getCell(r, 12).value = 'Accumulate';
  safeStyle(ws.getCell(r, 12), headerStyle, 'eq.acc');
  r++;

  ws.getRow(r).height = 18;
  dayLabels.forEach((day, i) => {
    ws.getCell(r, 3 + i).value = day;
    safeStyle(ws.getCell(r, 3 + i), headerStyle, `eq.day.${day}`);
  });
  safeStyle(ws.getCell(r, 2), headerStyle, 'eq.descBlank');
  safeStyle(ws.getCell(r, 10), headerStyle, 'eq.prevBlank');
  safeStyle(ws.getCell(r, 11), headerStyle, 'eq.thisBlank');
  safeStyle(ws.getCell(r, 12), headerStyle, 'eq.accBlank');
  safeMerge(ws, eqHdrRow1, 2, r + 1, 2);
  safeMerge(ws, eqHdrRow1, 10, r + 1, 10);
  safeMerge(ws, eqHdrRow1, 11, r + 1, 11);
  safeMerge(ws, eqHdrRow1, 12, r + 1, 12);
  r++;

  ws.getRow(r).height = 18;
  dates.forEach((dt, i) => {
    ws.getCell(r, 3 + i).value = dt;
    safeStyle(ws.getCell(r, 3 + i), headerStyle, `eq.dt.${i}`);
  });
  r++;

  // ── Equipment data rows ──────────────────────────────────────────────────
  const equipmentRows = d.equipmentRows ?? [];
  const eqDataRowIndices: number[] = [];

  equipmentRows.forEach((e: any) => {
    ws.getRow(r).height = 20;

    const descWithUnit = e.unit ? `${e.description ?? ''} (${e.unit})` : (e.description ?? '');
    ws.getCell(r, 2).value = descWithUnit;
    safeStyle(ws.getCell(r, 2), dataStyle, 'eq.desc.data');

    const dd = pickDailyArray(e);
    for (let i = 0; i < 7; i++) {
      ws.getCell(r, 3 + i).value = num(dd[i]);
      safeStyle(ws.getCell(r, 3 + i), numStyle, `eq.daily.${i}`);
    }

    const prevVal = num(e.previous);
    ws.getCell(r, 10).value = prevVal;
    safeStyle(ws.getCell(r, 10), numStyle, 'eq.prev.data');

    const thisVal = num(e.thisPeriod);
    ws.getCell(r, 11).value = thisVal;
    safeStyle(ws.getCell(r, 11), numStyle, 'eq.this.data');

    if (e.accumulate !== undefined && e.accumulate !== '') {
      ws.getCell(r, 12).value = num(e.accumulate);
    } else {
      setFormulaWithResult(ws.getCell(r, 12), `J${r}+K${r}`, prevVal + thisVal);
    }
    safeStyle(ws.getCell(r, 12), numStyle, 'eq.acc.data');

    eqDataRowIndices.push(r);
    r++;
  });

  if (equipmentRows.length === 0) {
    ws.getRow(r).height = 20;
    for (let c = 2; c <= 12; c++) safeStyle(ws.getCell(r, c), dataStyle, 'eq.empty');
    r++;
  }

  // Equipment Total — SAME shape as 6.1 Grand Total: blank daily columns,
  // only sum Previous (J), This Period (K), Accumulate (L).
  ws.getRow(r).height = 22;
  ws.getCell(r, 2).value = 'Total';
  safeStyle(ws.getCell(r, 2), totalStyle, 'eq.total.lbl');
  for (let i = 0; i < 7; i++) {
    ws.getCell(r, 3 + i).value = null;
    safeStyle(ws.getCell(r, 3 + i), totalEmptyStyle, `eq.total.d${i}`);
  }

  if (eqDataRowIndices.length > 0) {
    const jRefs = eqDataRowIndices.map(idx => `J${idx}`).join(',');
    const kRefs = eqDataRowIndices.map(idx => `K${idx}`).join(',');
    const lRefs = eqDataRowIndices.map(idx => `L${idx}`).join(',');

    let prevTotal = 0;
    let thisTotal = 0;
    let accTotal = 0;
    eqDataRowIndices.forEach(idx => {
      const jv = ws.getCell(idx, 10).value;
      const kv = ws.getCell(idx, 11).value;
      const lv = ws.getCell(idx, 12).value;
      prevTotal += typeof jv === 'number' ? jv : num((jv as any)?.result);
      thisTotal += typeof kv === 'number' ? kv : num((kv as any)?.result);
      accTotal += typeof lv === 'number' ? lv : num((lv as any)?.result);
    });

    setFormulaWithResult(ws.getCell(r, 10), `SUM(${jRefs})`, prevTotal);
    setFormulaWithResult(ws.getCell(r, 11), `SUM(${kRefs})`, thisTotal);
    setFormulaWithResult(ws.getCell(r, 12), `SUM(${lRefs})`, accTotal);
  } else {
    ws.getCell(r, 10).value = 0;
    ws.getCell(r, 11).value = 0;
    ws.getCell(r, 12).value = 0;
  }
  safeStyle(ws.getCell(r, 10), totalNumStyle, 'eq.total.prev');
  safeStyle(ws.getCell(r, 11), totalNumStyle, 'eq.total.this');
  safeStyle(ws.getCell(r, 12), totalNumStyle, 'eq.total.acc');
}

// SHEET 11: 7. Site Activity Photos
async function buildSitePhotos(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('7. Site Photos');
  const styles = createStyles(workbook);
  // No tab color — matches template

  // ── Column widths (A–J) ──────────────────────────────────────────────────
  // Layout mirrors template: two photo blocks side-by-side
  //   A    = left margin (5.71)
  //   B-E  = left caption / photo area, where C-D hold the caption text
  //   F-I  = right caption / photo area, where G-H hold the caption text
  //   J    = right margin
  const widths = [5.71, 1.57, 40.71, 10.71, 1.57, 1.57, 40.71, 10.71, 1.57, 4.71];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Styles
  const titleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };
  const bannerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  const locationStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 10, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: LOCATION_FILL } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const captionStyle: Partial<ExcelJS.Style> = {
    font: { size: 10, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const photoBoxStyle: Partial<ExcelJS.Style> = {
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  let r = 3;

  // ── Sheet title ──────────────────────────────────────────────────────────
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '7. SITE ACTIVITY PHOTOS';
  safeStyle(ws.getCell(r, 2), titleStyle, 'sp.title');
  for (let c = 3; c <= 9; c++) safeStyle(ws.getCell(r, c), titleStyle, 'sp.title.span');
  safeMerge(ws, r, 2, r, 9);
  r += 2;

  // ── Banner ───────────────────────────────────────────────────────────────
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = 'SITE ACTIVITY PHOTOS';
  safeStyle(ws.getCell(r, 2), bannerStyle, 'sp.banner');
  for (let c = 3; c <= 9; c++) safeStyle(ws.getCell(r, c), bannerStyle, 'sp.banner.span');
  safeMerge(ws, r, 2, r, 9);
  r++;

  // ── Photo entries ────────────────────────────────────────────────────────
  // Each entry renders a location banner then one row of photo+caption (pairs
  // of 2 captions side-by-side). Layout per entry:
  //   Row A: location banner (B-I merged, yellow background)
  //   Row B: blank spacer (6.95)
  //   Row C: photo area (tall, 170)  → two side-by-side boxes
  //   Row D: blank spacer (6.95)
  //   Row E: caption row (C-D = left cap, G-H = right cap)
  const entries = d.sitePhotoCaptions ?? [];

  if (entries.length === 0) {
    // Render one empty placeholder entry so the sheet doesn't look broken
    renderPhotoEntry(ws, r, {
      siteLocation: 'Site Location',
      caption1: '',
      caption2: '',
    });
    return;
  }

  // Group consecutive entries that share a site location so the banner shows once
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    const nextR = renderPhotoEntry(ws, r, entry);
    r = nextR;
    i++;
  }

  // Inner helper: render a single location+photo-pair block starting at row `r`.
  // Returns the next free row.
  function renderPhotoEntry(
    ws: ExcelJS.Worksheet,
    startRow: number,
    entry: SitePhotoEntry,
  ): number {
    let row = startRow;

    // Location banner (B-I, yellow)
    ws.getRow(row).height = 20.1;
    ws.getCell(row, 2).value = entry.siteLocation ?? '';
    safeStyle(ws.getCell(row, 2), locationStyle, 'sp.loc');
    for (let c = 3; c <= 9; c++) safeStyle(ws.getCell(row, c), locationStyle, 'sp.loc.span');
    safeMerge(ws, row, 2, row, 9);
    row++;

    // Spacer
    ws.getRow(row).height = 6.95;
    row++;

    // Photo row — tall (170pt). Left photo: B-E merged. Right photo: F-I merged.
    ws.getRow(row).height = 170.1;
    // Left photo box
    safeStyle(ws.getCell(row, 2), photoBoxStyle, 'sp.photoL');
    for (let c = 3; c <= 5; c++) safeStyle(ws.getCell(row, c), photoBoxStyle, 'sp.photoL.span');
    safeMerge(ws, row, 2, row, 5);
    // Right photo box
    safeStyle(ws.getCell(row, 6), photoBoxStyle, 'sp.photoR');
    for (let c = 7; c <= 9; c++) safeStyle(ws.getCell(row, c), photoBoxStyle, 'sp.photoR.span');
    safeMerge(ws, row, 6, row, 9);
    row++;

    // Spacer
    ws.getRow(row).height = 6.95;
    row++;

    // Caption row — C-D (left), G-H (right)
    ws.getRow(row).height = 15;
    ws.getCell(row, 3).value = entry.caption1 ?? '';
    safeStyle(ws.getCell(row, 3), captionStyle, 'sp.cap1');
    safeStyle(ws.getCell(row, 4), captionStyle, 'sp.cap1.span');
    safeMerge(ws, row, 3, row, 4);

    ws.getCell(row, 7).value = entry.caption2 ?? '';
    safeStyle(ws.getCell(row, 7), captionStyle, 'sp.cap2');
    safeStyle(ws.getCell(row, 8), captionStyle, 'sp.cap2.span');
    safeMerge(ws, row, 7, row, 8);
    row++;

    return row;
  }
}

// SHEET 12: 8. Construction Issues
async function buildConstructionIssues(workbook: ExcelJS.Workbook, d: WeeklyReportExportData) {
  const ws = workbook.addWorksheet('8. Issues');
  const styles = createStyles(workbook);
  // No tab color — matches template

  // ── Column widths (A–S) ──────────────────────────────────────────────────
  const widths = [
    5.71,  // A margin
    6.29,  // B issue-number column
    9, 9, 9, 9, 9, 9, 9, 9,      // C-J text block (issue text spans B-J)
    4.57,  // K gap
    9, 9, 9, 9,                  // L-O photo area
    4.57,  // P gap
    9,     // Q
    10.71, // R
    20.71, // S end
  ];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Styles
  const titleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };
  const bannerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  const issueNumberStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const labelStyle: Partial<ExcelJS.Style> = {
    font: { size: 10, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const photoRefStyle: Partial<ExcelJS.Style> = {
    font: { size: 10, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const descBoxStyle: Partial<ExcelJS.Style> = {
    font: { size: 10, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const photoBoxStyle: Partial<ExcelJS.Style> = {
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };
  const footerStyle: Partial<ExcelJS.Style> = {
    font: { size: 10, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'top' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  let r = 2;

  // ── Sheet title row (row 2) ──────────────────────────────────────────────
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '8. CONSTRUCTION ISSUE';
  safeStyle(ws.getCell(r, 2), titleStyle, 'ci.title');
  for (let c = 3; c <= 19; c++) safeStyle(ws.getCell(r, c), titleStyle, 'ci.title.span');
  safeMerge(ws, r, 2, r, 19);
  r++; // 3

  // ── Sub-header: project title on left, company name on right ─────────────
  ws.getRow(r).height = 45;
  ws.getCell(r, 2).value = d.projectTitle ?? '';
  safeStyle(ws.getCell(r, 2), {
    font: { size: 12, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
  }, 'ci.proj');
  ws.getCell(r, 19).value = d.contractor ?? 'CACPM Co.,Ltd';
  safeStyle(ws.getCell(r, 19), {
    font: { size: 12, name: 'Arial' },
    alignment: { horizontal: 'right', vertical: 'middle' },
  }, 'ci.contractor');
  r += 2; // skip to row 5

  // ── "Construction Issue" banner ──────────────────────────────────────────
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = 'Construction Issue';
  safeStyle(ws.getCell(r, 2), bannerStyle, 'ci.banner');
  for (let c = 3; c <= 19; c++) safeStyle(ws.getCell(r, c), bannerStyle, 'ci.banner.span');
  safeMerge(ws, r, 2, r, 19);
  r++; // 6

  // ── Issue blocks ─────────────────────────────────────────────────────────
  const issues = d.constructionIssues ?? [];
  // Render at least one empty issue so the sheet has the template structure
  const issuesToRender = issues.length > 0 ? issues : [{ number: 1 } as ConstructionIssue];

  for (let idx = 0; idx < issuesToRender.length; idx++) {
    const issue = issuesToRender[idx];

    // One issue block spans 12 rows total, matching template rows 6..17:
    //   +0  : issue number (B6 etc., 1 row)
    //   +1  : "Site Location:" label row | "Photo Reference" label (K)
    //   +2  : "Problems / Descriptions:" label | (photo box continues)
    //   +3..+9 : description body (merged vertically) | photo box continues
    //   +10 : "Action by:" footer row
    //   +11 : spacer (optional; we tighten to 11 rows and leave natural flow)

    // Issue number row
    ws.getRow(r).height = 18;
    ws.getCell(r, 2).value = issue.number ?? (idx + 1);
    safeStyle(ws.getCell(r, 2), issueNumberStyle, 'ci.num');
    for (let c = 3; c <= 19; c++) safeStyle(ws.getCell(r, c), issueNumberStyle, 'ci.num.span');
    safeMerge(ws, r, 2, r, 19);
    r++;

    // Site Location | Photo Reference labels
    ws.getRow(r).height = 18;
    ws.getCell(r, 2).value = `Site Location: ${issue.siteLocation ?? ''}`;
    safeStyle(ws.getCell(r, 2), labelStyle, 'ci.loc');
    for (let c = 3; c <= 10; c++) safeStyle(ws.getCell(r, c), labelStyle, 'ci.loc.span');
    safeMerge(ws, r, 2, r, 10);

    ws.getCell(r, 11).value = 'Photo Reference';
    safeStyle(ws.getCell(r, 11), photoRefStyle, 'ci.photoLbl');
    for (let c = 12; c <= 19; c++) safeStyle(ws.getCell(r, c), photoRefStyle, 'ci.photoLbl.span');
    safeMerge(ws, r, 11, r, 19);
    r++;

    // "Problems / Descriptions:" label (top of description area)
    const descStartRow = r;
    ws.getRow(r).height = 18;
    ws.getCell(r, 2).value = 'Problems / Descriptions:';
    safeStyle(ws.getCell(r, 2), labelStyle, 'ci.probLbl');
    for (let c = 3; c <= 10; c++) safeStyle(ws.getCell(r, c), labelStyle, 'ci.probLbl.span');
    safeMerge(ws, r, 2, r, 10);
    r++;

    // Photo area: rows descStartRow..descStartRow+8 (9 rows total) in K-S
    // Merge K-S across those 9 rows (matching template K7:S16 pattern)
    const photoStartRow = descStartRow;
    const photoEndRow = descStartRow + 8;
    safeStyle(ws.getCell(photoStartRow, 11), photoBoxStyle, 'ci.photo');
    for (let c = 12; c <= 19; c++) safeStyle(ws.getCell(photoStartRow, c), photoBoxStyle, 'ci.photo.span');
    safeMerge(ws, photoStartRow, 11, photoEndRow, 19);

    // Description body: merged from descStartRow+1 .. descStartRow+8 (8 rows)
    const descBodyStart = descStartRow + 1;
    const descBodyEnd = descStartRow + 8;
    for (let rr = descBodyStart; rr <= descBodyEnd; rr++) {
      ws.getRow(rr).height = 18;
    }
    ws.getCell(descBodyStart, 2).value = issue.problemDescription ?? '';
    safeStyle(ws.getCell(descBodyStart, 2), descBoxStyle, 'ci.desc');
    for (let rr = descBodyStart; rr <= descBodyEnd; rr++) {
      for (let c = 3; c <= 10; c++) safeStyle(ws.getCell(rr, c), descBoxStyle, 'ci.desc.span');
    }
    safeMerge(ws, descBodyStart, 2, descBodyEnd, 10);

    // Advance r past description body
    r = descBodyEnd + 1;

    // "Action by:" footer row (spans B-J, then K-S continues photo area NO — footer is B-J only)
    ws.getRow(r).height = 18;
    ws.getCell(r, 2).value = `Action by: ${issue.actionBy ?? ''}`;
    safeStyle(ws.getCell(r, 2), footerStyle, 'ci.action');
    for (let c = 3; c <= 10; c++) safeStyle(ws.getCell(r, c), footerStyle, 'ci.action.span');
    safeMerge(ws, r, 2, r, 10);

    // Right side of footer row — keep inside photo box (already merged above)
    r++;
  }
}