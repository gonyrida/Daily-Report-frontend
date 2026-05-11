/**
 * masterReportExcel.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a Master Weekly Report Excel file using the same layout/styling as
 * weeklyReportExcel.ts, adapted for MasterWeeklyReport (aggregated, multi-project).
 *
 * Sheet order (mirrors weekly):
 *   Con. Progress | Cover | CONTENT | Letter | 1.Intro | 2.OP |
 *   3.NWDP | 4.QAQC | 5.HSE | 6.Resources | 7.Site Photos | 8.Construction Issues
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { resolveIdType } from '@/utils/idEngine';
import type {
  MasterWeeklyReport,
  MasterActivityItem,
  MasterIssueItem,
  MasterQaqcSection,
  MasterHsePhotoSection,
  PhotoLocation,
  MasterConstructionProgressItem,
} from '@/types/masterReport.types';
import type { ManPowerEntry, MaterialEntry, MachineryEntry } from '@/types/resources.types';

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const HEADER_FILL = 'FFBDD7EE';
const TOTAL_FILL  = 'FFE2EFDA';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function detectExtensionFromBuffer(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer, 0, 4);
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  return null;
}

async function addImageToWorksheet(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  imagePath: string | File,
  range: string | { tl: { col: number; row: number }; br: { col: number; row: number }; editAs?: string },
) {
  if (imagePath instanceof File) {
    imagePath = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read File'));
      reader.readAsDataURL(imagePath as File);
    });
  }
  if (!imagePath || typeof imagePath !== 'string') throw new Error('Invalid image path');
  const cleanPath = (imagePath as string).trim();
  let imageBuffer: ArrayBuffer;
  let extension = 'png';

  if (cleanPath.startsWith('data:')) {
    const matches = cleanPath.match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!matches?.[2]) throw new Error('Invalid base64 data URL');
    const mimeType = matches[1];
    extension = mimeType === 'image/svg+xml' ? 'svg'
      : mimeType.split('/')[1] === 'jpg' ? 'jpeg' : (mimeType.split('/')[1] ?? 'png');
    const bin = atob(matches[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    imageBuffer = bytes.buffer;
  } else {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(cleanPath, { signal: ctrl.signal, headers: { Accept: 'image/*' } });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      imageBuffer = await res.arrayBuffer();
    } catch (e) { clearTimeout(timer); throw e; }
    extension = detectExtensionFromBuffer(imageBuffer) ?? 'png';
  }
  if (extension === 'jpg') extension = 'jpeg';
  const imageId = workbook.addImage({ buffer: imageBuffer, extension: extension as 'png' | 'jpeg' | 'gif' });
  worksheet.addImage(imageId, range as any);
}

function safeMerge(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) {
  try {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (ws.getCell(r, c).isMerged) return;
    ws.mergeCells(r1, c1, r2, c2);
  } catch { /* skip */ }
}

function safeStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>, _: string) {
  try { cell.style = style; } catch { /* skip */ }
}

const num = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const padText = (v: string | number | undefined) => (v !== undefined && v !== null && v !== '') ? `\n${v}\n` : '';

function setFormula(cell: ExcelJS.Cell, formula: string, result: number) {
  cell.value = { formula, result } as ExcelJS.CellFormulaValue;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportMasterReportToExcel(data: MasterWeeklyReport, filename?: string) {
  if (!data) throw new Error('No master report data provided');
  const workbook = new ExcelJS.Workbook();

  await buildConProgress(workbook, data);
  await buildCover(workbook, data);
  await buildContent(workbook);
  await buildLetter(workbook, data);
  await buildIntro(workbook, data);
  await buildOP(workbook, data);
  await buildNWDP(workbook, data);
  await buildQAQC(workbook, data);
  await buildHSE(workbook, data);
  await buildResources(workbook, data);
  await buildSitePhotos(workbook, data);
  await buildConstructionIssues(workbook, data);

  for (const ws of workbook.worksheets) {
    const isConProgress = ws.name === 'Con. Progress';
    ws.pageSetup = {
      orientation: isConProgress ? 'landscape' : 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    };
    const lastRow = ws.lastRow?.number ?? 1;
    const lastCol = ws.lastColumn?.number ?? 1;
    if (lastRow > 0 && lastCol > 0) ws.pageSetup.printArea = `A1:${ws.getColumn(lastCol).letter}${lastRow}`;
  }

  const folderName = data.folder?.name ?? 'MasterReport';
  const finalFilename = filename ?? `MasterReport_${folderName}_W${data.weekNumber ?? 'XX'}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), finalFilename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 1: Con. Progress (grouped by project)
// ═══════════════════════════════════════════════════════════════════════════════

async function buildConProgress(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('Con. Progress');
  ws.properties.tabColor = { argb: 'FF0070C0' };
  for (let i = 1; i <= 29; i++) ws.getColumn(i);

  const thin = { style: 'thin' as const };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
  const sectionHdr: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FF000000' }, size: 10.5, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA6A6A6' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: allBorders,
  };
  const subHdr: Partial<ExcelJS.Style> = { ...sectionHdr, font: { ...sectionHdr.font, bold: false } };
  const dataStyle: Partial<ExcelJS.Style> = {
    font: { size: 10, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    border: { top: { style: 'hair' }, bottom: { style: 'hair' }, left: thin, right: thin },
  };
  const numStyle: Partial<ExcelJS.Style> = { ...dataStyle, alignment: { horizontal: 'center', vertical: 'middle' } };
  const percentStyle: Partial<ExcelJS.Style> = { ...numStyle, numFmt: '[=1]0%;0.0%' };
  const projectBannerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B5' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };

  const constructionProgress = data.aggregated?.constructionProgress ?? {};
  const projectNames = Object.keys(constructionProgress);

  let r = 1;

  // Title row
  ws.getRow(r).height = 30;
  safeMerge(ws, r, 1, r, 10);
  ws.getCell(r, 1).value = 'CONSTRUCTION PROGRESS';
  ws.getCell(r, 1).style = { font: { bold: true, underline: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  r++;

  // Overall project info from folder
  const infoRows: [string, string][] = [
    ['Folder:', data.folder?.name ?? ''],
    ['Week:', String(data.weekNumber ?? '')],
    ['Projects:', projectNames.join(', ')],
  ];
  infoRows.forEach(([label, value]) => {
    ws.getRow(r).height = 20;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).style = { font: { bold: true, size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
    ws.getCell(r, 2).value = value;
    ws.getCell(r, 2).style = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
    r++;
  });
  r++;

  // Column headers (rows 6-7 in weekly template)
  const headerRow = r;
  ws.getRow(r).height = 22.5;
  ws.getRow(r + 1).height = 26.25;

  const headerSpans: Array<{ col: number; val: string; merge?: [number, number] }> = [
    { col: 1,  val: 'ID',                    merge: [r, r + 1] },
    { col: 2,  val: 'Scope of Works',         merge: [r, r + 1] },
    { col: 3,  val: 'Detail Description',     merge: [r, r + 1] },
    { col: 4,  val: 'Unit',                   merge: [r, r + 1] },
    { col: 5,  val: 'Revise BOQ' },
    { col: 10, val: 'Remark',                 merge: [r, r + 1] },
    { col: 12, val: '% Up to Previous Week' },
    { col: 15, val: '% This Week' },
    { col: 18, val: '% Up to This Week' },
    { col: 21, val: '% Remaining' },
    { col: 24, val: '% Next Week Plan' },
    { col: 27, val: '% Up to Next Week Plan' },
  ];

  headerSpans.forEach(h => {
    ws.getCell(r, h.col).value = h.val;
    safeStyle(ws.getCell(r, h.col), sectionHdr, 'h');
    if (h.merge) safeMerge(ws, h.merge[0], h.col, h.merge[1], h.col);
  });
  safeMerge(ws, r, 5, r, 9);
  safeMerge(ws, r, 12, r, 14); safeMerge(ws, r, 15, r, 17);
  safeMerge(ws, r, 18, r, 20); safeMerge(ws, r, 21, r, 23);
  safeMerge(ws, r, 24, r, 26); safeMerge(ws, r, 27, r, 29);
  r++;

  const subHeaders = ['','','','','QTY','Material','Labor','Unit Rate','Amount','','','QTY','AMOUNT','%','QTY','AMOUNT','%','QTY','AMOUNT','%','QTY','AMOUNT','%','QTY','AMOUNT','%','QTY','AMOUNT','%'];
  subHeaders.forEach((h, i) => { if (h) { ws.getCell(r, i + 1).value = h; safeStyle(ws.getCell(r, i + 1), subHdr, 'sh'); } });
  r++;

  if (projectNames.length === 0) {
    ws.getRow(r).height = 20;
    for (let c = 1; c <= 29; c++) safeStyle(ws.getCell(r, c), dataStyle, 'd');
    r++;
  }

  // Render each project's construction progress
  for (const projectName of projectNames) {
    const { projectInfo, items } = constructionProgress[projectName];

    // Project banner
    ws.getRow(r).height = 24;
    ws.getCell(r, 1).value = `${projectName} — ${projectInfo.project ?? ''}`;
    safeStyle(ws.getCell(r, 1), projectBannerStyle, 'pb');
    for (let c = 2; c <= 29; c++) safeStyle(ws.getCell(r, c), projectBannerStyle, 'pb');
    safeMerge(ws, r, 1, r, 29);
    r++;

    (items ?? []).forEach((item: MasterConstructionProgressItem, i: number) => {
      const allItems = (items ?? []).map((it: any) => ({ id: it.id ?? '' }));
      const idType = resolveIdType(item.id ?? '', allItems, i);
      let bgColor = 'FFFFFFFF';
      switch (idType) {
        case 'roman':  bgColor = 'FFD0CECE'; break;
        case 'level1': bgColor = 'FFACB9CA'; break;
        case 'level2': bgColor = 'FFDDEBF7'; break;
        case 'level3': bgColor = 'FFE7E6E6'; break;
      }

      const cellBg: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
        font: { size: 10, name: 'Arial', bold: !!item.isBold },
        alignment: { vertical: 'middle', wrapText: true },
        border: { top: { style: 'hair' }, bottom: { style: 'hair' }, left: thin, right: thin },
      };
      const cellNum: Partial<ExcelJS.Style> = { ...cellBg, alignment: { horizontal: 'center', vertical: 'middle' } };
      const cellPct: Partial<ExcelJS.Style> = { ...cellNum, numFmt: '[=1]0%;0.0%' };

      ws.getRow(r).height = 20;

      ws.getCell(r, 1).value = padText(item.id);      safeStyle(ws.getCell(r, 1), cellNum, 'd');
      ws.getCell(r, 2).value = padText(item.scopeOfWorks);  safeStyle(ws.getCell(r, 2), { ...cellBg, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } }, 'd');
      ws.getCell(r, 3).value = padText(item.detailDescription); safeStyle(ws.getCell(r, 3), { ...cellBg, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } }, 'd');
      ws.getCell(r, 4).value = item.unit ?? '';        safeStyle(ws.getCell(r, 4), cellNum, 'd');
      ws.getCell(r, 5).value = item.boQ?.qty ?? '';     safeStyle(ws.getCell(r, 5), cellNum, 'd');
      ws.getCell(r, 6).value = item.boQ?.materialRate ?? ''; safeStyle(ws.getCell(r, 6), cellNum, 'd');
      ws.getCell(r, 7).value = item.boQ?.laborRate ?? '';    safeStyle(ws.getCell(r, 7), cellNum, 'd');
      ws.getCell(r, 8).value = item.boQ?.unitRate ?? '';     safeStyle(ws.getCell(r, 8), cellNum, 'd');
      ws.getCell(r, 9).value = item.boQ?.amount ?? '';       safeStyle(ws.getCell(r, 9), cellNum, 'd');
      ws.getCell(r, 10).value = padText(item.remark);  safeStyle(ws.getCell(r, 10), { ...cellBg, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } }, 'd');
      ws.getCell(r, 11).value = '';                    safeStyle(ws.getCell(r, 11), cellBg, 'd');

      ws.getCell(r, 12).value = item.previousWeek?.qty ?? '';          safeStyle(ws.getCell(r, 12), cellNum, 'd');
      ws.getCell(r, 13).value = item.previousWeek?.amount ?? '';        safeStyle(ws.getCell(r, 13), cellNum, 'd');
      ws.getCell(r, 14).value = item.previousWeek?.percentage ? num(item.previousWeek.percentage) / 100 : ''; safeStyle(ws.getCell(r, 14), cellPct, 'd');
      ws.getCell(r, 15).value = item.thisWeek?.qty ?? '';               safeStyle(ws.getCell(r, 15), cellNum, 'd');
      ws.getCell(r, 16).value = item.thisWeek?.amount ?? '';            safeStyle(ws.getCell(r, 16), cellNum, 'd');
      ws.getCell(r, 17).value = item.thisWeek?.percentage ? num(item.thisWeek.percentage) / 100 : ''; safeStyle(ws.getCell(r, 17), cellPct, 'd');
      ws.getCell(r, 18).value = item.upToThisWeek?.qty ?? '';           safeStyle(ws.getCell(r, 18), cellNum, 'd');
      ws.getCell(r, 19).value = item.upToThisWeek?.amount ?? '';        safeStyle(ws.getCell(r, 19), cellNum, 'd');
      ws.getCell(r, 20).value = item.upToThisWeek?.percentage ? num(item.upToThisWeek.percentage) / 100 : ''; safeStyle(ws.getCell(r, 20), cellPct, 'd');
      ws.getCell(r, 21).value = item.remaining?.qty ?? '';              safeStyle(ws.getCell(r, 21), cellNum, 'd');
      ws.getCell(r, 22).value = item.remaining?.amount ?? '';           safeStyle(ws.getCell(r, 22), cellNum, 'd');
      ws.getCell(r, 23).value = item.remaining?.percentage ? num(item.remaining.percentage) / 100 : ''; safeStyle(ws.getCell(r, 23), cellPct, 'd');
      ws.getCell(r, 24).value = item.nextWeekPlan?.qty ?? '';           safeStyle(ws.getCell(r, 24), cellNum, 'd');
      ws.getCell(r, 25).value = item.nextWeekPlan?.amount ?? '';        safeStyle(ws.getCell(r, 25), cellNum, 'd');
      ws.getCell(r, 26).value = item.nextWeekPlan?.percentage ? num(item.nextWeekPlan.percentage) / 100 : ''; safeStyle(ws.getCell(r, 26), cellPct, 'd');
      ws.getCell(r, 27).value = item.upToNextWeekPlan?.qty ?? '';       safeStyle(ws.getCell(r, 27), cellNum, 'd');
      ws.getCell(r, 28).value = item.upToNextWeekPlan?.amount ?? '';    safeStyle(ws.getCell(r, 28), cellNum, 'd');
      ws.getCell(r, 29).value = item.upToNextWeekPlan?.percentage ? num(item.upToNextWeekPlan.percentage) / 100 : ''; safeStyle(ws.getCell(r, 29), cellPct, 'd');
      r++;
    });
  }

  const widths = [13.57, 35.71, 43, 7.43, 8.14, 9.86, 8.14, 11, 16, 29, 2.29, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10, 11.43, 12.71, 10];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 2: Cover
// ═══════════════════════════════════════════════════════════════════════════════

async function buildCover(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('Cover');
  ws.properties.tabColor = { argb: 'FF002060' };
  ws.getColumn('A').width = 3.43;
  for (let col = 2; col <= 13; col++) ws.getColumn(col).width = 8.43;

  for (let row = 2; row <= 45; row++) ws.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16365C' } };

  try { await addImageToWorksheet(workbook, ws, '/cacpm_logo.png', 'C3:E5'); } catch { /* skip */ }
  ws.mergeCells(3, 3, 5, 5);

  const firstReport = data.reports?.[0];
  ws.mergeCells(3, 11, 5, 13);

  ws.getRow(9).height = 30;
  ws.getCell(9, 3).value = 'KINGDOM OF CAMBODIA';
  ws.getCell(9, 3).style = { font: { bold: true, size: 18, name: 'Arial', color: { argb: 'FF002060' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
  ws.mergeCells(9, 3, 9, 13);

  ws.getRow(10).height = 30;
  ws.getCell(10, 3).value = 'NATION RELIGION KING';
  ws.getCell(10, 3).style = { font: { bold: true, size: 18, name: 'Arial', color: { argb: 'FF002060' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
  ws.mergeCells(10, 3, 10, 13);

  ws.getRow(13).height = 30;
  ws.getCell(13, 3).value = 'MASTER WEEKLY PROGRESS REPORT';
  ws.getCell(13, 3).style = { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 18, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
  ws.mergeCells(13, 3, 13, 13);

  ws.getRow(15).height = 35;
  ws.getCell(15, 3).value = `Week - ${data.weekNumber ?? ''}`;
  ws.getCell(15, 3).style = { font: { bold: true, size: 18, name: 'Arial', color: { argb: 'FF002060' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
  ws.mergeCells(15, 3, 15, 13);

  const dateFrom = firstReport?.startDate ?? '';
  const dateTo   = firstReport?.endDate ?? '';
  ws.getCell(16, 3).value = dateFrom && dateTo ? `From ${dateFrom} ~ ${dateTo}` : '';
  ws.getCell(16, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' } };
  ws.mergeCells(16, 3, 16, 13);

  ws.mergeCells(18, 3, 35, 13);
  const coverImg = data.availableCoverImages?.[0]?.coverImage;
  if (coverImg) { try { await addImageToWorksheet(workbook, ws, coverImg, 'C18:M35'); } catch { /* skip */ } }

  ws.mergeCells(38, 3, 40, 13);
  ws.getCell(38, 3).value = data.folder?.name ?? '';
  ws.getCell(38, 3).style = { font: { bold: true, italic: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } };

  const employer   = firstReport?.employer ?? firstReport?.cover?.employer ?? '';
  const contractor = firstReport?.letter?.constructorName ?? '';

  ws.getCell(42, 3).value = 'Employer';
  ws.getCell(42, 3).style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(42, 3, 42, 4);
  ws.getCell(42, 5).value = ':';
  ws.getCell(42, 5).style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' } };
  ws.getCell(42, 6).value = employer;
  ws.getCell(42, 6).style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(42, 6, 42, 13);

  ws.mergeCells(44, 3, 45, 4);
  ws.getCell(44, 3).value = 'Contractor';
  ws.getCell(44, 3).style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(44, 5, 45, 5);
  ws.getCell(44, 5).value = ':';
  ws.getCell(44, 5).style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' } };
  ws.mergeCells(44, 6, 45, 13);
  ws.getCell(44, 6).value = contractor;
  ws.getCell(44, 6).style = { font: { bold: true, size: 14, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 3: CONTENT (Table of Contents)
// ═══════════════════════════════════════════════════════════════════════════════

async function buildContent(workbook: ExcelJS.Workbook) {
  const ws = workbook.addWorksheet('CONTENT');
  ws.properties.tabColor = { argb: 'FF00B050' };

  let r = 3;
  ws.getCell(r, 2).value = 'TABLE OF CONTENTS*';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } } };
  r += 2;

  const tocItems = [
    '1. INTRODUCTION',
    '2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK',
    '3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN',
    '4. QA/QC STATUS',
    '4.1 Non-Conformity Report (NCR)',
    '4.2 Corrective Action Request (CAR)',
    '4.3 Safety Corrective Action Request (SCAR)',
    '4.4 PM Site Instruction (SI)',
    '4.5 Client Site Instruction (SI)',
    '4.6 Inspection Request (IR)',
    '4.7 Material for Approval (MFA)',
    '4.8 Request for Information (RFI)',
    '4.9 Request for Approval (RFA)',
    '4.10 Field Change Request (FCR)',
    '4.11 Variation Order (VO)',
    '4.12 Transmittal (TR)',
    '4.13 Material Inspection Approval (MIR)',
    '5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)',
    '5.1 HSES Training / Introduction / Toolbox Meeting',
    '5.2 HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist',
    '5.3 Permit to Work',
    '5.4 First Aid / Accident / Incident / Near Miss / Fatalities (if Any)',
    '5.5 Other HSES Activities Concerns',
    '5.6 HSES Photo Reference',
    '6. RESOURCES STATUS',
    '6.1 Manpower Status',
    '6.2 Material Delivery Status',
    '6.3 Machinery / Equipment Status',
    '7. SITE ACTIVITY PHOTOS',
    '8. CONSTRUCTION ISSUE',
  ];

  tocItems.forEach(line => {
    const isSub = /^\d+\.\d+/.test(line);
    ws.getCell(r, 2).value = line;
    ws.getCell(r, 2).style = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', indent: isSub ? 2 : 0 } };
    ws.getRow(r).height = 25;
    r++;
  });

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 98;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 4: Letter
// ═══════════════════════════════════════════════════════════════════════════════

async function buildLetter(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('Letter');
  ws.properties.tabColor = { argb: 'FF0070C0' };

  const colWidths = [5, 10.57, 8.43, 19.71, 9.14, 8.43, 8.43, 8.43, 8.43, 10, 4];
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const firstReport = data.reports?.[0];
  const letter = firstReport?.letter ?? {};
  const weekNumber = data.weekNumber ?? '';

  ws.getRow(1).height = 30;
  ws.getRow(2).height = 20;
  ws.getCell(2, 2).value = `LETTER FOR MASTER WEEKLY PROGRESS REPORT No.${weekNumber}`;
  ws.getCell(2, 2).style = { font: { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B5' } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(2, 2, 2, 10);

  let r = 4;
  const formatDate = (val: any): string => {
    try {
      const d = val ? new Date(val) : new Date();
      return isNaN(d.getTime()) ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  };

  [
    ['Ref. No.', `${letter.refNoPrefix ?? 'WR'}-${weekNumber}/${new Date().getFullYear()}`],
    ['Date',     formatDate(letter.reportDate)],
  ].forEach(([label, value]) => {
    ws.getRow(r).height = 20;
    ws.getCell(r, 2).value = label; ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
    ws.getCell(r, 3).value = ':';   ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
    ws.getCell(r, 4).value = value; ws.getCell(r, 4).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
    ws.mergeCells(r, 4, r, 10); r++;
  });

  r = 8;
  ws.getRow(r).height = 60;
  ws.getCell(r, 2).value = 'To'; ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.getCell(r, 3).value = ':'; ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.getCell(r, 4).value = {
    richText: [
      { text: letter.recipientCompany ?? 'Company Name', font: { bold: true, size: 12, name: 'Arial' } },
      ...(letter.recipientLocation ? [{ text: '\n' + letter.recipientLocation, font: { bold: false, size: 12, name: 'Arial' } }] : []),
    ],
  };
  ws.getCell(r, 4).style = { alignment: { horizontal: 'left', vertical: 'top', wrapText: true } };
  ws.mergeCells(r, 4, r, 10); r++;

  ws.getRow(r).height = 30;
  ws.getCell(r, 2).value = 'Att.'; ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.getCell(r, 3).value = ':';   ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.getCell(r, 4).value = letter.recipientName ?? 'Project Manager';
  ws.getCell(r, 4).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
  ws.mergeCells(r, 4, r, 10); r++;

  (letter.ccList ?? []).forEach((cc, i) => {
    ws.getRow(r).height = 30;
    if (i === 0) { ws.getCell(r, 2).value = 'CC'; ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } }; }
    ws.getCell(r, 3).value = ':'; ws.getCell(r, 3).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
    ws.getCell(r, 4).value = cc; ws.getCell(r, 4).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
    ws.mergeCells(r, 4, r, 10); r++;
  });
  r++;

  ws.getCell(r, 2).value = 'Dear Sir,';
  ws.getCell(r, 2).style = { font: { bold: true, size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(r, 2, r, 10); ws.getRow(r).height = 20; r++;

  const folderName = data.folder?.name ?? '';
  const firstRep = data.reports?.[0];
  const dateFrom = firstRep?.startDate ?? '';
  const dateTo   = firstRep?.endDate ?? '';
  const bodyText = letter.letterBody
    ? letter.letterBody
    : `We are pleased to submit Master Weekly Progress Report No-${weekNumber} from ${dateFrom} to ${dateTo} for ${folderName}.\n\n\nSincerely Yours,`;

  ws.getCell(r, 2).value = bodyText;
  ws.getCell(r, 2).style = { font: { size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
  ws.mergeCells(r, 2, r, 10);
  ws.getRow(r).height = 100;
  r += 2;

  // Signature
  const sigRow = r;
  ws.getRow(sigRow).height = 80;
  ws.mergeCells(sigRow, 2, sigRow, 4);
  if (letter.signatureImage) {
    try { await addImageToWorksheet(workbook, ws, letter.signatureImage, `B${sigRow}:D${sigRow}`); } catch { /* skip */ }
  }
  r++;

  const sigName = letter.signatoryName ?? '';
  const sigPos  = letter.signatoryPosition ?? 'Project Manager';
  const contractor = letter.constructorName ?? '';
  ws.getCell(r, 2).value = {
    richText: [
      { text: sigName, font: { bold: true, size: 10, name: 'Arial' } },
      { text: ` | ${sigPos}`, font: { bold: true, size: 10, name: 'Arial' } },
      { text: '\n' + contractor, font: { bold: true, size: 10, name: 'Arial' } },
      { text: '\n\n' + (letter.companyLocation ?? ''), font: { size: 10, name: 'Arial' } },
      { text: '\n' + [letter.companyPhone1, letter.companyPhone2].filter(Boolean).join(' | '), font: { size: 10, name: 'Arial' } },
      { text: '\n' + (letter.companyEmail1 ?? ''), font: { size: 10, name: 'Arial' } },
      ...(letter.companyEmail2 ? [{ text: '\n' + letter.companyEmail2, font: { size: 10, name: 'Arial' } }] : []),
    ],
  };
  ws.getCell(r, 2).style = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
  ws.mergeCells(r, 2, r, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 5: 1.Intro
// ═══════════════════════════════════════════════════════════════════════════════

async function buildIntro(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('1.Intro');
  ws.properties.tabColor = { argb: 'FF00B050' };

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 100;
  ws.getColumn(3).width = 4;

  const dataStyle: Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };

  let r = 3;
  ws.getCell(r, 2).value = '1. INTRODUCTION';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  r += 2;

  const intro = data.reports?.[0]?.introduction;

  ws.getCell(r, 2).value = 'Project Overview';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
  ws.getRow(r).height = 22.5; r++;

  ws.getCell(r, 2).value = '\n' + (intro?.projectOverview ?? '');
  ws.getCell(r, 2).style = dataStyle; r++;

  if (intro?.designNConstruction) {
    ws.getCell(r, 2).value = 'Design & Construction';
    ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
    ws.getRow(r).height = 22.5; r++;
    ws.getCell(r, 2).value = '\n' + intro.designNConstruction + '\n';
    ws.getCell(r, 2).style = dataStyle; r++;
  }

  // Cover image
  const coverImg = intro?.coverImage ?? data.availableCoverImages?.[0]?.coverImage;
  if (coverImg) {
    r = Math.max(r, 10);
    try {
      const imgId = workbook.addImage({ base64: coverImg, extension: coverImg.includes('png') ? 'png' : 'jpeg' });
      ws.addImage(imgId, { tl: { col: 1, row: r - 1 }, ext: { width: 700, height: 400 } });
      ws.getRow(r).height = 400;
    } catch { ws.getCell(r, 2).value = '[Cover Image]'; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 6: 2.OP — Overall Progress (per-project)
// ═══════════════════════════════════════════════════════════════════════════════

async function buildOP(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('2.OP');
  ws.properties.tabColor = { argb: 'FF0070C0' };

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 6;     // No
  ws.getColumn(3).width = 40;    // Project Name
  ws.getColumn(4).width = 16;    // % Up to Previous Week
  ws.getColumn(5).width = 16;    // % This Week
  ws.getColumn(6).width = 16;    // % Up to This Week
  ws.getColumn(7).width = 14;    // % Remaining
  ws.getColumn(8).width = 5;

  const thin = { style: 'thin' as const };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };

  const hdrStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 10, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: allBorders,
  };

  let r = 2;
  ws.getRow(r).height = 25;
  ws.getCell(r, 2).value = '2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(r, 2, r, 7);
  r += 2;

  // Weighted avg callout
  const weighted = data.aggregated?.progress?.weighted ?? 0;
  ws.getRow(r).height = 28;
  ws.getCell(r, 2).value = {
    richText: [
      { text: 'Overall Weighted Progress: ', font: { bold: true, size: 11, name: 'Arial' } },
      { text: `${weighted.toFixed(1)}%`, font: { bold: true, size: 13, name: 'Arial', color: { argb: 'FF2F75B5' } } },
    ],
  };
  ws.getCell(r, 2).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }, alignment: { horizontal: 'left', vertical: 'middle' }, border: allBorders };
  ws.mergeCells(r, 2, r, 7);
  r += 2;

  // Headers
  const headers = ['No', 'Project Name', '% Up to Prev Week', '% This Week', '% Up to This Week', '% Remaining'];
  headers.forEach((h, i) => { ws.getCell(r, i + 2).value = h; safeStyle(ws.getCell(r, i + 2), hdrStyle, 'h'); });
  ws.getRow(r).height = 30;
  r++;

  const perProject = data.aggregated?.progress?.perProject ?? {};
  const reports = data.reports ?? [];

  const fmtPct = (v: number | undefined) => (v !== undefined && v !== null) ? `${Number(v).toFixed(1)}%` : '';

  reports.forEach((report, i) => {
    const isAlt = i % 2 === 1;
    const bg = isAlt ? 'FFE7E6E6' : 'FFFFFFFF';
    const progress = perProject[report.projectId] ?? report.progress ?? 0;

    const rowStyle: Partial<ExcelJS.Style> = {
      font: { size: 10, name: 'Arial' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'hair' }, bottom: { style: 'hair' }, left: thin, right: thin },
    };
    const textStyle: Partial<ExcelJS.Style> = { ...rowStyle, alignment: { horizontal: 'left', vertical: 'middle' } };

    ws.getRow(r).height = 26;
    ws.getCell(r, 2).value = padText(i + 1);     safeStyle(ws.getCell(r, 2), rowStyle, 'd');
    ws.getCell(r, 3).value = padText(report.projectName ?? ''); safeStyle(ws.getCell(r, 3), textStyle, 'd');
    ws.getCell(r, 4).value = '';                 safeStyle(ws.getCell(r, 4), rowStyle, 'd');
    ws.getCell(r, 5).value = '';                 safeStyle(ws.getCell(r, 5), rowStyle, 'd');
    ws.getCell(r, 6).value = fmtPct(progress);  safeStyle(ws.getCell(r, 6), rowStyle, 'd');
    ws.getCell(r, 7).value = fmtPct(100 - progress); safeStyle(ws.getCell(r, 7), rowStyle, 'd');
    r++;
  });

  if (reports.length === 0) {
    ws.getRow(r).height = 26;
    for (let c = 2; c <= 7; c++) safeStyle(ws.getCell(r, c), { border: allBorders }, 'd');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 7: 3.NWDP — Activities of Work Done / Next Week Plan
// ═══════════════════════════════════════════════════════════════════════════════

async function buildNWDP(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('3.NWDP');
  ws.properties.tabColor = { argb: 'FF0070C0' };

  ws.getColumn('A').width = 5; ws.getColumn('B').width = 43; ws.getColumn('C').width = 10;
  ws.getColumn('D').width = 43; ws.getColumn('E').width = 10; ws.getColumn('F').width = 5;

  const thin = { style: 'thin' as const };
  const border = { top: thin, bottom: thin, left: thin, right: thin };

  let r = 2;
  ws.getRow(r).height = 20;
  ws.getCell(r, 2).value = '3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(r, 2, r, 5); r += 2;

  ws.getRow(r).height = 22;
  ['Activities of Work Done', 'Next Week Plan'].forEach((h, i) => {
    const sc = i === 0 ? 2 : 4;
    ws.getCell(r, sc).value = h;
    ws.getCell(r, sc).style = { font: { bold: true, size: 11, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'center', vertical: 'middle' }, border };
    ws.mergeCells(r, sc, r, sc + 1);
  });
  r++;

  const weeklyActivities = data.aggregated?.activities?.weeklyActivities ?? [];
  const nextWeekPlan     = data.aggregated?.activities?.nextWeekPlan ?? [];
  const maxLen = Math.max(weeklyActivities.length, nextWeekPlan.length, 1);

  const getIdStyle = (id: string) => {
    const t = (id ?? '').trim();
    if (/^[IVX]/i.test(t)) return { bold: true, indent: 1 };
    if (t === '-')           return { bold: false, indent: 6 };
    if (/^\d+$/.test(t))    return { bold: true, indent: 2 };
    return                        { bold: false, indent: 2 };
  };

  const buildText = (item: MasterActivityItem) => {
    const id = item.id ?? ''; const desc = item.description ?? '';
    if (!id) return desc;
    if (id === '-') return desc ? `- ${desc}` : '-';
    return id.endsWith('.') ? `${id} ${desc}` : `${id}. ${desc}`;
  };

  const getPct = (item: MasterActivityItem) => {
    const p = item.percent ?? (item.percentage ? parseFloat(item.percentage) : undefined);
    return p !== undefined && p !== null ? `${p}%` : '';
  };

  for (let i = 0; i < maxLen; i++) {
    const wa = weeklyActivities[i]; const nw = nextWeekPlan[i];
    const id = wa?.id ?? nw?.id ?? '';
    const { bold, indent } = getIdStyle(id);
    ws.getRow(r).height = 20;

    ws.getCell(r, 2).value = wa ? buildText(wa) : '';
    ws.getCell(r, 2).style = { font: { bold, size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent }, border };
    ws.getCell(r, 3).value = wa ? getPct(wa) : '';
    ws.getCell(r, 3).style = { alignment: { horizontal: 'center', vertical: 'middle' }, border };
    ws.getCell(r, 4).value = nw ? buildText(nw) : '';
    ws.getCell(r, 4).style = { font: { bold, size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent }, border };
    ws.getCell(r, 5).value = nw ? getPct(nw) : '';
    ws.getCell(r, 5).style = { alignment: { horizontal: 'center', vertical: 'middle' }, border };
    r++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 8: 4.QAQC — 13 sections from aggregated.qaqcStatus
// ═══════════════════════════════════════════════════════════════════════════════

async function buildQAQC(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('4. QAQC');
  ws.properties.tabColor = { argb: 'FF0070C0' };

  ws.getColumn(1).width = 6; ws.getColumn(2).width = 32;
  ws.getColumn(3).width = 50; ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 17; ws.getColumn(6).width = 5;

  const thin = { style: 'thin' as const };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
  const hdrStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders };
  const dataStyle: Partial<ExcelJS.Style> = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }, border: allBorders };

  let r = 3;
  ws.getRow(r).height = 20;
  ws.getCell(r, 2).value = '4. QA/QC STATUS';
  ws.getCell(r, 2).style = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  ws.mergeCells(r, 2, r, 5); r += 2;

  const qaqcMap = data.aggregated?.qaqcStatus ?? {};
  const ID_TO_KEY: Record<string, string> = {
    '4.1': 'ncr', '4.2': 'car', '4.3': 'scar', '4.4': 'pmsi', '4.5': 'csi',
    '4.6': 'ir', '4.7': 'mfa', '4.8': 'rfi', '4.9': 'rfa', '4.10': 'fcr',
    '4.11': 'vo', '4.12': 'tr', '4.13': 'mir',
  };

  const sections = [
    { id: '4.1',  title: 'Non-Conformity Report (NCR)' },
    { id: '4.2',  title: 'Corrective Action Request (CAR)' },
    { id: '4.3',  title: 'Safety Corrective Action Request (SCAR)' },
    { id: '4.4',  title: 'PM Site Instruction (SI)' },
    { id: '4.5',  title: 'Client Site Instruction (SI)' },
    { id: '4.6',  title: 'Inspection Request (IR)' },
    { id: '4.7',  title: 'Material for Approval (MFA)' },
    { id: '4.8',  title: 'Request for Information (RFI)' },
    { id: '4.9',  title: 'Request for Approval (RFA)' },
    { id: '4.10', title: 'Field Change Request (FCR)' },
    { id: '4.11', title: 'Variation Order (VO)' },
    { id: '4.12', title: 'Transmittal (TR)' },
    { id: '4.13', title: 'Material Inspection Approval (MIR)' },
  ];

  for (const section of sections) {
    ws.getCell(r, 2).value = { richText: [{ text: `${section.id} `, font: { bold: true, size: 11, name: 'Arial' } }, { text: section.title, font: { size: 11, name: 'Arial' } }] };
    ws.getCell(r, 2).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }, alignment: { horizontal: 'left', vertical: 'middle' }, border: allBorders };
    ws.mergeCells(r, 2, r, 5); ws.getRow(r).height = 22.5; r++;

    if (section.id === '4.5') {
      ['Code','Description','Issued By','Issued Date'].forEach((h, i) => { ws.getCell(r, i + 2).value = h; safeStyle(ws.getCell(r, i + 2), hdrStyle, 'h'); });
    } else if (section.id === '4.6') {
      ['Code','Description','Received Date','Inspection Date'].forEach((h, i) => { ws.getCell(r, i + 2).value = h; safeStyle(ws.getCell(r, i + 2), hdrStyle, 'h'); });
    } else {
      ['Code','Description','Status','Date Responded'].forEach((h, i) => { ws.getCell(r, i + 2).value = h; safeStyle(ws.getCell(r, i + 2), hdrStyle, 'h'); });
    }
    ws.getRow(r).height = 30; r++;

    const sectionData: MasterQaqcSection | undefined = qaqcMap[ID_TO_KEY[section.id]];
    const items = sectionData?.items ?? [];
    for (let j = 0; j < Math.max(items.length, 5); j++) {
      const item = items[j];
      ws.getCell(r, 2).value = item?.code ?? ''; ws.getCell(r, 2).style = dataStyle;
      ws.getCell(r, 3).value = item?.description ?? ''; ws.getCell(r, 3).style = dataStyle;
      if (section.id === '4.5') {
        ws.getCell(r, 4).value = (item as any)?.issuedBy ?? item?.status ?? ''; ws.getCell(r, 4).style = dataStyle;
        ws.getCell(r, 5).value = (item as any)?.issuedDate ?? item?.dateResponded ?? ''; ws.getCell(r, 5).style = dataStyle;
      } else if (section.id === '4.6') {
        ws.getCell(r, 4).value = (item as any)?.receivedDate ?? item?.dateResponded ?? ''; ws.getCell(r, 4).style = dataStyle;
        ws.getCell(r, 5).value = (item as any)?.inspectionDate ?? ''; ws.getCell(r, 5).style = dataStyle;
      } else {
        ws.getCell(r, 4).value = item?.status ?? ''; ws.getCell(r, 4).style = dataStyle;
        ws.getCell(r, 5).value = item?.dateResponded ?? ''; ws.getCell(r, 5).style = dataStyle;
      }
      ws.getRow(r).height = 22; r++;
    }

    ws.getCell(r, 2).value = { richText: [{ text: 'Comments: ', font: { bold: true, underline: true, name: 'Arial', size: 11 } }, { text: sectionData?.comments ?? '', font: { name: 'Arial', size: 11 } }] };
    ws.getCell(r, 2).style = { border: allBorders, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } };
    ws.mergeCells(r, 2, r, 5); ws.getRow(r).height = 42; r++; r += 2;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 9: 5.HSE
// ═══════════════════════════════════════════════════════════════════════════════

async function buildHSE(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('5. HSE');
  ws.properties.tabColor = { argb: 'FF00B050' };
  [5.71, 30.71, 5.71, 5.71, 5.71, 5.71, 5.71, 5.71, 10.57, 15.71, 15.71].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const thin = { style: 'thin' as const };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
  const secTitle: Partial<ExcelJS.Style> = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  const sub: Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  const hdr: Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: allBorders };
  const data2: Partial<ExcelJS.Style> = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }, border: allBorders };
  const dataC: Partial<ExcelJS.Style> = { ...data2, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } };
  const note: Partial<ExcelJS.Style> = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'top', wrapText: true }, border: allBorders };
  const photoBox: Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: allBorders };
  const footer: Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: allBorders };
  const naS: Partial<ExcelJS.Style> = { font: { size: 20, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders };
  const secHdr: Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders };

  const hses = data.aggregated?.hses;
  let r = 3;

  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = '5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)';
  safeStyle(ws.getCell(r, 2), secTitle, 'd'); safeMerge(ws, r, 2, r, 11); r += 2;

  // 5.1 Training
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '5.1 HSES Training / Introduction / Toolbox Meeting'; safeStyle(ws.getCell(r, 2), sub, 'd'); r++;
  ws.getRow(r).height = 20.1;
  [{ col: 2, val: 'Type of Training' }, { col: 5, val: 'Date' }, { col: 7, val: 'Venue' }, { col: 9, val: 'Trainer' }, { col: 10, val: 'Attendee' }, { col: 11, val: 'Remarks' }]
    .forEach(h => { ws.getCell(r, h.col).value = h.val; safeStyle(ws.getCell(r, h.col), hdr, 'h'); });
  [3, 4, 6, 8].forEach(c => safeStyle(ws.getCell(r, c), hdr, 'h'));
  safeMerge(ws, r, 2, r, 4); safeMerge(ws, r, 5, r, 6); safeMerge(ws, r, 7, r, 8); r++;
  for (let i = 0; i < Math.max((hses?.training ?? []).length, 3); i++) {
    const row = (hses?.training ?? [])[i] ?? {};
    ws.getRow(r).height = 20.1;
    ws.getCell(r, 2).value = row.typeOfTraining ?? ''; safeStyle(ws.getCell(r, 2), data2, 'd'); safeStyle(ws.getCell(r, 3), data2, 'd'); safeStyle(ws.getCell(r, 4), data2, 'd'); safeMerge(ws, r, 2, r, 4);
    ws.getCell(r, 5).value = row.date ?? ''; safeStyle(ws.getCell(r, 5), dataC, 'd'); safeStyle(ws.getCell(r, 6), dataC, 'd'); safeMerge(ws, r, 5, r, 6);
    ws.getCell(r, 7).value = row.venue ?? ''; safeStyle(ws.getCell(r, 7), dataC, 'd'); safeStyle(ws.getCell(r, 8), dataC, 'd'); safeMerge(ws, r, 7, r, 8);
    ws.getCell(r, 9).value = row.trainer ?? ''; safeStyle(ws.getCell(r, 9), dataC, 'd');
    ws.getCell(r, 10).value = row.attendee ?? ''; safeStyle(ws.getCell(r, 10), dataC, 'd');
    ws.getCell(r, 11).value = row.remarks ?? ''; safeStyle(ws.getCell(r, 11), data2, 'd'); r++;
  }
  r++;

  // 5.2 Inspection
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '5.2 HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist'; safeStyle(ws.getCell(r, 2), sub, 'd'); r++;
  ws.getRow(r).height = 35.1;
  ws.getCell(r, 2).value = 'Type of Inspection'; safeStyle(ws.getCell(r, 2), hdr, 'd'); for (let c = 3; c <= 8; c++) safeStyle(ws.getCell(r, c), hdr, 'd'); safeMerge(ws, r, 2, r, 8);
  ws.getCell(r, 9).value = 'Date'; safeStyle(ws.getCell(r, 9), hdr, 'd'); ws.getCell(r, 10).value = 'Inspector'; safeStyle(ws.getCell(r, 10), hdr, 'd'); ws.getCell(r, 11).value = 'Remarks'; safeStyle(ws.getCell(r, 11), hdr, 'd'); r++;
  for (let i = 0; i < Math.max((hses?.inspection ?? []).length, 3); i++) {
    const row = (hses?.inspection ?? [])[i] ?? {};
    ws.getRow(r).height = 20.1;
    ws.getCell(r, 2).value = row.typeOfInspection ?? ''; safeStyle(ws.getCell(r, 2), data2, 'd'); for (let c = 3; c <= 8; c++) safeStyle(ws.getCell(r, c), data2, 'd'); safeMerge(ws, r, 2, r, 8);
    ws.getCell(r, 9).value = row.date ?? ''; safeStyle(ws.getCell(r, 9), dataC, 'd'); ws.getCell(r, 10).value = row.inspector ?? ''; safeStyle(ws.getCell(r, 10), dataC, 'd'); ws.getCell(r, 11).value = row.remarks ?? ''; safeStyle(ws.getCell(r, 11), data2, 'd'); r++;
  }
  r++;

  // 5.3 Permit
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '5.3 Permit to Work'; safeStyle(ws.getCell(r, 2), sub, 'd'); r++;
  ws.getRow(r).height = 20.1;
  ws.getCell(r, 2).value = 'Type of Permit'; safeStyle(ws.getCell(r, 2), hdr, 'd'); safeStyle(ws.getCell(r, 3), hdr, 'd'); safeStyle(ws.getCell(r, 4), hdr, 'd'); safeMerge(ws, r, 2, r, 4);
  ws.getCell(r, 5).value = 'Start Date'; safeStyle(ws.getCell(r, 5), hdr, 'd'); safeStyle(ws.getCell(r, 6), hdr, 'd'); safeMerge(ws, r, 5, r, 6);
  ws.getCell(r, 7).value = 'End Date'; safeStyle(ws.getCell(r, 7), hdr, 'd'); safeStyle(ws.getCell(r, 8), hdr, 'd'); safeMerge(ws, r, 7, r, 8);
  ws.getCell(r, 9).value = 'Inspector'; safeStyle(ws.getCell(r, 9), hdr, 'd'); ws.getCell(r, 10).value = 'Approver'; safeStyle(ws.getCell(r, 10), hdr, 'd'); ws.getCell(r, 11).value = 'Remarks'; safeStyle(ws.getCell(r, 11), hdr, 'd'); r++;
  for (let i = 0; i < Math.max((hses?.permit ?? []).length, 3); i++) {
    const row = (hses?.permit ?? [])[i] ?? {};
    ws.getRow(r).height = 20.1;
    ws.getCell(r, 2).value = row.typeOfPermit ?? ''; safeStyle(ws.getCell(r, 2), data2, 'd'); safeStyle(ws.getCell(r, 3), data2, 'd'); safeStyle(ws.getCell(r, 4), data2, 'd'); safeMerge(ws, r, 2, r, 4);
    ws.getCell(r, 5).value = row.startDate ?? ''; safeStyle(ws.getCell(r, 5), dataC, 'd'); safeStyle(ws.getCell(r, 6), dataC, 'd'); safeMerge(ws, r, 5, r, 6);
    ws.getCell(r, 7).value = row.endDate ?? ''; safeStyle(ws.getCell(r, 7), dataC, 'd'); safeStyle(ws.getCell(r, 8), dataC, 'd'); safeMerge(ws, r, 7, r, 8);
    ws.getCell(r, 9).value = row.inspector ?? ''; safeStyle(ws.getCell(r, 9), dataC, 'd'); ws.getCell(r, 10).value = row.approver ?? ''; safeStyle(ws.getCell(r, 10), dataC, 'd'); ws.getCell(r, 11).value = row.remarks ?? ''; safeStyle(ws.getCell(r, 11), data2, 'd'); r++;
  }
  r++;

  // 5.4 First Aid
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '5.4 First Aid / Accident / Incident / Near Miss / Fatalities (if Any)'; safeStyle(ws.getCell(r, 2), sub, 'd'); r++;
  ws.getRow(r).height = 80;
  ws.getCell(r, 2).value = hses?.firstAidAccident?.trim() || '….......................................................................................................................................................................'; safeStyle(ws.getCell(r, 2), note, 'd');
  for (let c = 3; c <= 11; c++) safeStyle(ws.getCell(r, c), note, 'd'); safeMerge(ws, r, 2, r, 11); r += 2;

  // 5.5 Other
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '5.5 Other HSES Activities Concerns'; safeStyle(ws.getCell(r, 2), sub, 'd'); r++;
  ws.getRow(r).height = 80;
  ws.getCell(r, 2).value = hses?.otherActivities?.trim() || '….......................................................................................................................................................................'; safeStyle(ws.getCell(r, 2), note, 'd');
  for (let c = 3; c <= 11; c++) safeStyle(ws.getCell(r, c), note, 'd'); safeMerge(ws, r, 2, r, 11); r += 2;

  // 5.6 Photo Reference
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '5.6 HSES Photo Reference'; safeStyle(ws.getCell(r, 2), sub, 'd'); r++;

  const flatSlots = (sections: MasterHsePhotoSection[]) =>
    sections.flatMap(sec => sec.entries.flatMap(e => e.slots));

  const renderRows = async (slots: { image: string; caption: string }[], startR: number): Promise<number> => {
    let rr = startR;
    for (let rowIdx = 0; rowIdx < Math.max(4, Math.ceil(slots.length / 2)); rowIdx++) {
      const L = slots[rowIdx * 2]; const R = slots[rowIdx * 2 + 1];
      const pr = rr; ws.getRow(rr).height = 173;
      safeStyle(ws.getCell(rr, 2), photoBox, 'd'); for (let c = 3; c <= 6; c++) safeStyle(ws.getCell(rr, c), photoBox, 'd'); safeMerge(ws, rr, 2, rr, 6);
      safeStyle(ws.getCell(rr, 7), photoBox, 'd'); for (let c = 8; c <= 11; c++) safeStyle(ws.getCell(rr, c), photoBox, 'd'); safeMerge(ws, rr, 7, rr, 11);
      for (const [idx, slot] of [[0, L], [1, R]] as [number, typeof L][]) {
        const sc = idx === 0 ? 2 : 7; const ec = idx === 0 ? 6 : 11;
        if (slot?.image) { try { await addImageToWorksheet(workbook, ws, slot.image, { tl: { col: sc - 1, row: pr - 1 }, br: { col: ec, row: pr }, editAs: 'twoCell' } as any); } catch { ws.getCell(pr, sc).value = 'N/A'; safeStyle(ws.getCell(pr, sc), naS, 'd'); } }
        else { ws.getCell(pr, sc).value = 'N/A'; safeStyle(ws.getCell(pr, sc), naS, 'd'); }
      }
      rr++;
      ws.getRow(rr).height = 15;
      ws.getCell(rr, 2).value = L?.caption ?? ''; safeStyle(ws.getCell(rr, 2), footer, 'd'); for (let c = 3; c <= 6; c++) safeStyle(ws.getCell(rr, c), footer, 'd'); safeMerge(ws, rr, 2, rr, 6);
      ws.getCell(rr, 7).value = R?.caption ?? ''; safeStyle(ws.getCell(rr, 7), footer, 'd'); for (let c = 8; c <= 11; c++) safeStyle(ws.getCell(rr, c), footer, 'd'); safeMerge(ws, rr, 7, rr, 11);
      rr++;
    }
    return rr;
  };

  const renderSection = (title: string) => {
    ws.getRow(r).height = 20.1;
    ws.getCell(r, 2).value = title; safeStyle(ws.getCell(r, 2), secHdr, 'd');
    for (let c = 3; c <= 11; c++) safeStyle(ws.getCell(r, c), secHdr, 'd'); safeMerge(ws, r, 2, r, 11);
  };

  renderSection('HSE Toolbox Meeting');
  r++;
  r = await renderRows(flatSlots(hses?.hsePhotoReferences?.hseToolboxMeeting ?? []), r);

  renderSection('HSE Activity Photo');
  r++;
  r = await renderRows(flatSlots(hses?.hsePhotoReferences?.hseActivityPhotos ?? []), r);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 10: 6.Resources
// ═══════════════════════════════════════════════════════════════════════════════

async function buildResources(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('6. Resources');
  ws.properties.tabColor = { argb: 'FF00B050' };
  [5.71, 42, 8, 8, 8, 8, 8, 8, 8, 14, 14, 18].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const thin = { style: 'thin' as const };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
  const titleS: Partial<ExcelJS.Style> = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  const subS:   Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' } };
  const hdrS:   Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: allBorders };
  const dataS:  Partial<ExcelJS.Style> = { font: { size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }, border: allBorders };
  const numS:   Partial<ExcelJS.Style> = { ...dataS, alignment: { horizontal: 'center', vertical: 'middle' } };
  const totS:   Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } }, alignment: { horizontal: 'left', vertical: 'middle' }, border: allBorders };
  const totN:   Partial<ExcelJS.Style> = { ...totS, alignment: { horizontal: 'center', vertical: 'middle' } };
  const grpS:   Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }, alignment: { horizontal: 'left', vertical: 'middle' }, border: allBorders };
  const dayLabels = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const resources = data.aggregated?.resources;
  let r = 3;

  // Sheet title
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '6. RESOURCES STATUS'; safeStyle(ws.getCell(r, 2), titleS, 'd'); safeMerge(ws, r, 2, r, 12); r += 2;

  const buildHdr = (label: string, lastLbl: string) => {
    ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = label; safeStyle(ws.getCell(r, 2), subS, 'd'); r++;
    const hdrR1 = r; ws.getRow(r).height = 22;
    ws.getCell(r, 2).value = 'Description'; safeStyle(ws.getCell(r, 2), hdrS, 'd');
    ws.getCell(r, 3).value = 'This Week'; safeStyle(ws.getCell(r, 3), hdrS, 'd');
    for (let c = 4; c <= 9; c++) safeStyle(ws.getCell(r, c), hdrS, 'd'); safeMerge(ws, r, 3, r, 9);
    ws.getCell(r, 10).value = 'Previous'; safeStyle(ws.getCell(r, 10), hdrS, 'd');
    ws.getCell(r, 11).value = 'This Period'; safeStyle(ws.getCell(r, 11), hdrS, 'd');
    ws.getCell(r, 12).value = lastLbl; safeStyle(ws.getCell(r, 12), hdrS, 'd'); r++;
    ws.getRow(r).height = 18;
    dayLabels.forEach((d, i) => { ws.getCell(r, 3 + i).value = d; safeStyle(ws.getCell(r, 3 + i), hdrS, 'd'); });
    [2, 10, 11, 12].forEach(c => safeStyle(ws.getCell(r, c), hdrS, 'd'));
    safeMerge(ws, hdrR1, 2, r + 1, 2); safeMerge(ws, hdrR1, 10, r + 1, 10); safeMerge(ws, hdrR1, 11, r + 1, 11); safeMerge(ws, hdrR1, 12, r + 1, 12); r++;
    ws.getRow(r).height = 18; for (let c = 3; c <= 9; c++) safeStyle(ws.getCell(r, c), hdrS, 'd'); r++;
  };

  const buildTotal = (dataRows: number[], lbl: string) => {
    ws.getRow(r).height = 22; ws.getCell(r, 2).value = lbl; safeStyle(ws.getCell(r, 2), totS, 'd');
    for (let i = 0; i < 7; i++) { ws.getCell(r, 3 + i).value = null; safeStyle(ws.getCell(r, 3 + i), totN, 'd'); }
    let p = 0, t = 0, a = 0;
    dataRows.forEach(idx => {
      const jv = ws.getCell(idx, 10).value; const kv = ws.getCell(idx, 11).value; const lv = ws.getCell(idx, 12).value;
      p += typeof jv === 'number' ? jv : num((jv as any)?.result);
      t += typeof kv === 'number' ? kv : num((kv as any)?.result);
      a += typeof lv === 'number' ? lv : num((lv as any)?.result);
    });
    if (dataRows.length > 0) {
      setFormula(ws.getCell(r, 10), `SUM(${dataRows.map(i => `J${i}`).join(',')})`, p);
      setFormula(ws.getCell(r, 11), `SUM(${dataRows.map(i => `K${i}`).join(',')})`, t);
      setFormula(ws.getCell(r, 12), `SUM(${dataRows.map(i => `L${i}`).join(',')})`, a);
    } else { ws.getCell(r, 10).value = 0; ws.getCell(r, 11).value = 0; ws.getCell(r, 12).value = 0; }
    safeStyle(ws.getCell(r, 10), totN, 'd'); safeStyle(ws.getCell(r, 11), totN, 'd'); safeStyle(ws.getCell(r, 12), totN, 'd'); r += 2;
  };

  // 6.1 Manpower
  buildHdr('6.1 Manpower Status', 'Up to This Week');
  const mpTeams = [
    { label: 'I. Management Team', entries: resources?.manPower?.managementTeam ?? [] },
    { label: 'II. Working Team (Interior)', entries: resources?.manPower?.workingTeamInterior ?? [] },
    { label: 'III. Working Team (MEP)', entries: resources?.manPower?.workingTeamMEP ?? [] },
  ];
  const mpRows: number[] = [];
  for (const team of mpTeams) {
    ws.getRow(r).height = 20; ws.getCell(r, 2).value = team.label; safeStyle(ws.getCell(r, 2), grpS, 'd');
    for (let c = 3; c <= 12; c++) { ws.getCell(r, c).value = null; safeStyle(ws.getCell(r, c), grpS, 'd'); } safeMerge(ws, r, 2, r, 12); r++;
    team.entries.forEach((mp: ManPowerEntry, idx) => {
      ws.getRow(r).height = 20; ws.getCell(r, 2).value = `${idx + 1}. ${mp.description}`; safeStyle(ws.getCell(r, 2), dataS, 'd');
      [mp.date?.fri, mp.date?.sat, mp.date?.sun, mp.date?.mon, mp.date?.tue, mp.date?.wed, mp.date?.thu].forEach((d, i) => { ws.getCell(r, 3 + i).value = num(d); safeStyle(ws.getCell(r, 3 + i), numS, 'd'); });
      ws.getCell(r, 10).value = num(mp.prevWeek); safeStyle(ws.getCell(r, 10), numS, 'd');
      setFormula(ws.getCell(r, 11), `SUM(C${r}:I${r})`, num(mp.thisWeek)); safeStyle(ws.getCell(r, 11), numS, 'd');
      setFormula(ws.getCell(r, 12), `J${r}+K${r}`, num(mp.prevWeek) + num(mp.thisWeek)); safeStyle(ws.getCell(r, 12), numS, 'd');
      mpRows.push(r); r++;
    });
  }
  if (mpRows.length === 0) { ws.getRow(r).height = 20; for (let c = 2; c <= 12; c++) safeStyle(ws.getCell(r, c), dataS, 'd'); r++; }
  buildTotal(mpRows, 'Grand Total');

  // 6.2 Material
  buildHdr('6.2 Material Delivery Status', 'Accumulate');
  const matRows: number[] = [];
  (resources?.material ?? []).forEach((m: MaterialEntry) => {
    ws.getRow(r).height = 20; ws.getCell(r, 2).value = m.unit ? `${m.description} (${m.unit})` : m.description; safeStyle(ws.getCell(r, 2), dataS, 'd');
    [m.date?.fri, m.date?.sat, m.date?.sun, m.date?.mon, m.date?.tue, m.date?.wed, m.date?.thu].forEach((d, i) => { ws.getCell(r, 3 + i).value = num(d); safeStyle(ws.getCell(r, 3 + i), numS, 'd'); });
    ws.getCell(r, 10).value = num(m.prevWeek); safeStyle(ws.getCell(r, 10), numS, 'd');
    ws.getCell(r, 11).value = num(m.thisWeek); safeStyle(ws.getCell(r, 11), numS, 'd');
    setFormula(ws.getCell(r, 12), `J${r}+K${r}`, num(m.prevWeek) + num(m.thisWeek)); safeStyle(ws.getCell(r, 12), numS, 'd');
    matRows.push(r); r++;
  });
  if (matRows.length === 0) { ws.getRow(r).height = 20; for (let c = 2; c <= 12; c++) safeStyle(ws.getCell(r, c), dataS, 'd'); r++; }
  buildTotal(matRows, 'Total');

  // 6.3 Machinery
  buildHdr('6.3 Machinery / Equipment Status', 'Accumulate');
  const eqRows: number[] = [];
  (resources?.machinery ?? []).forEach((e: MachineryEntry) => {
    ws.getRow(r).height = 20; ws.getCell(r, 2).value = e.description; safeStyle(ws.getCell(r, 2), dataS, 'd');
    [e.date?.fri, e.date?.sat, e.date?.sun, e.date?.mon, e.date?.tue, e.date?.wed, e.date?.thu].forEach((d, i) => { ws.getCell(r, 3 + i).value = num(d); safeStyle(ws.getCell(r, 3 + i), numS, 'd'); });
    ws.getCell(r, 10).value = num(e.prevWeek); safeStyle(ws.getCell(r, 10), numS, 'd');
    ws.getCell(r, 11).value = num(e.thisWeek); safeStyle(ws.getCell(r, 11), numS, 'd');
    setFormula(ws.getCell(r, 12), `J${r}+K${r}`, num(e.prevWeek) + num(e.thisWeek)); safeStyle(ws.getCell(r, 12), numS, 'd');
    eqRows.push(r); r++;
  });
  if (eqRows.length === 0) { ws.getRow(r).height = 20; for (let c = 2; c <= 12; c++) safeStyle(ws.getCell(r, c), dataS, 'd'); r++; }
  buildTotal(eqRows, 'Total');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 11: 7.Site Activity Photos — photos grouped by project then location
// ═══════════════════════════════════════════════════════════════════════════════

async function buildSitePhotos(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('7. Site Activities Photos');
  ws.getColumn(1).width = 5.71; ws.getColumn(2).width = 1.57; ws.getColumn(3).width = 50.71;
  ws.getColumn(4).width = 1.57; ws.getColumn(5).width = 1.57; ws.getColumn(6).width = 50.71;
  ws.getColumn(7).width = 1.57; ws.getColumn(8).width = 4.71;

  const thin = { style: 'thin' as const, color: { argb: 'FF000000' } };
  const titleS:   Partial<ExcelJS.Style> = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  const bannerS:  Partial<ExcelJS.Style> = { ...titleS, alignment: { horizontal: 'center', vertical: 'middle' }, border: { top: thin, bottom: thin, left: thin, right: thin } };
  const projS:    Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B5' } }, alignment: { horizontal: 'center', vertical: 'middle' }, border: { top: thin, bottom: thin, left: thin, right: thin } };
  const locS:     Partial<ExcelJS.Style> = { font: { bold: true, size: 10, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6DCE4' } }, alignment: { horizontal: 'center', vertical: 'middle' }, border: { top: thin, bottom: thin, left: thin, right: thin } };
  const captionS: Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: { top: thin, bottom: thin, left: thin, right: thin } };

  let r = 3;
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '7. SITE ACTIVITY PHOTOS';
  safeStyle(ws.getCell(r, 2), titleS, 'd'); for (let c = 3; c <= 7; c++) safeStyle(ws.getCell(r, c), titleS, 'd'); safeMerge(ws, r, 2, r, 7); r += 2;
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = 'SITE ACTIVITY PHOTOS';
  safeStyle(ws.getCell(r, 2), bannerS, 'd'); for (let c = 3; c <= 7; c++) safeStyle(ws.getCell(r, c), bannerS, 'd'); safeMerge(ws, r, 2, r, 7); r++;

  const photosByProject: Record<string, PhotoLocation[]> = data.aggregated?.photos ?? {};
  const projectNames = Object.keys(photosByProject);

  const renderPair = async (img1: string | null, img2: string | null, cap1: string, cap2: string) => {
    const naS: Partial<ExcelJS.Style> = { font: { size: 14, name: 'Arial', italic: true, color: { argb: 'FF888888' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
    ws.getRow(r).height = 6.95;
    [2, 3, 4, 5, 6, 7].forEach((c, i) => {
      const borders: Partial<ExcelJS.Border>[] = [{ top: thin, left: thin }, { top: thin }, { top: thin, right: thin }, { top: thin, left: thin }, { top: thin }, { top: thin, right: thin }];
      safeStyle(ws.getCell(r, c), { border: borders[i] as any }, 'd');
    }); r++;
    const pr = r; ws.getRow(r).height = 170.1;
    safeStyle(ws.getCell(r, 2), { border: { left: thin } }, 'd');
    safeStyle(ws.getCell(r, 3), { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' } }, 'd');
    safeStyle(ws.getCell(r, 4), { border: { right: thin } }, 'd');
    safeStyle(ws.getCell(r, 5), { border: { left: thin } }, 'd');
    safeStyle(ws.getCell(r, 6), { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' } }, 'd');
    safeStyle(ws.getCell(r, 7), { border: { right: thin } }, 'd');
    if (img1) { try { await addImageToWorksheet(workbook, ws, img1, { tl: { col: 2, row: pr - 1 }, br: { col: 3, row: pr }, editAs: 'twoCell' } as any); } catch { ws.getCell(pr, 3).value = 'N/A'; safeStyle(ws.getCell(pr, 3), naS, 'd'); } }
    else { ws.getCell(pr, 3).value = 'N/A'; safeStyle(ws.getCell(pr, 3), naS, 'd'); }
    if (img2) { try { await addImageToWorksheet(workbook, ws, img2, { tl: { col: 5, row: pr - 1 }, br: { col: 6, row: pr }, editAs: 'twoCell' } as any); } catch { ws.getCell(pr, 6).value = 'N/A'; safeStyle(ws.getCell(pr, 6), naS, 'd'); } }
    else { ws.getCell(pr, 6).value = 'N/A'; safeStyle(ws.getCell(pr, 6), naS, 'd'); }
    r++;
    ws.getRow(r).height = 6.95;
    [2, 3, 4, 5, 6, 7].forEach((c, i) => {
      const borders: Partial<ExcelJS.Border>[] = [{ bottom: thin, left: thin }, { bottom: thin }, { bottom: thin, right: thin }, { bottom: thin, left: thin }, { bottom: thin }, { bottom: thin, right: thin }];
      safeStyle(ws.getCell(r, c), { border: borders[i] as any }, 'd');
    }); r++;
    ws.getRow(r).height = 15;
    ws.getCell(r, 2).value = cap1; safeStyle(ws.getCell(r, 2), captionS, 'd'); safeStyle(ws.getCell(r, 3), captionS, 'd'); safeStyle(ws.getCell(r, 4), captionS, 'd'); safeMerge(ws, r, 2, r, 4);
    ws.getCell(r, 5).value = cap2; safeStyle(ws.getCell(r, 5), captionS, 'd'); safeStyle(ws.getCell(r, 6), captionS, 'd'); safeStyle(ws.getCell(r, 7), captionS, 'd'); safeMerge(ws, r, 5, r, 7); r++;
  };

  if (projectNames.length === 0) {
    for (let i = 0; i < 4; i++) await renderPair(null, null, '', '');
    return;
  }

  for (const projectName of projectNames) {
    const locations = photosByProject[projectName] ?? [];
    ws.getRow(r).height = 22; ws.getCell(r, 2).value = projectName;
    safeStyle(ws.getCell(r, 2), projS, 'd'); for (let c = 3; c <= 7; c++) safeStyle(ws.getCell(r, c), projS, 'd'); safeMerge(ws, r, 2, r, 7); r++;

    for (const loc of locations) {
      const locLabel = loc.location ?? loc.title ?? 'Site Location';
      ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = locLabel;
      safeStyle(ws.getCell(r, 2), locS, 'd'); for (let c = 3; c <= 7; c++) safeStyle(ws.getCell(r, c), locS, 'd'); safeMerge(ws, r, 2, r, 7); r++;

      const slots = loc.entries.flatMap(e => e.slots);
      if (slots.length === 0) { await renderPair(null, null, '', ''); continue; }
      for (let si = 0; si < slots.length; si += 2) {
        const L = slots[si]; const R = slots[si + 1] ?? null;
        await renderPair(L?.image ?? null, R?.image ?? null, L?.caption ?? '', R?.caption ?? '');
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET 12: 8.Construction Issues
// ═══════════════════════════════════════════════════════════════════════════════

async function buildConstructionIssues(workbook: ExcelJS.Workbook, data: MasterWeeklyReport) {
  const ws = workbook.addWorksheet('8. Construction Issues');
  ws.getColumn(1).width = 5.71; ws.getColumn(2).width = 51.71;
  ws.getColumn(3).width = 1.14; ws.getColumn(4).width = 48.71; ws.getColumn(5).width = 1.28;

  const thin = { style: 'thin' as const };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
  const titleS:    Partial<ExcelJS.Style> = { font: { bold: true, size: 12, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }, alignment: { horizontal: 'left', vertical: 'middle' } };
  const bannerS:   Partial<ExcelJS.Style> = { ...titleS, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders };
  const numS:      Partial<ExcelJS.Style> = { font: { bold: true, size: 11, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' }, border: allBorders };
  const locS:      Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' }, border: { top: thin, bottom: thin, left: thin } };
  const photoRefS: Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders };
  const labelS:    Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' }, border: allBorders };
  const bodyS:     Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'top', wrapText: true }, border: allBorders };
  const actionS:   Partial<ExcelJS.Style> = { font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'left', vertical: 'middle' }, border: allBorders };

  let r = 2;
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = '8. CONSTRUCTION ISSUE';
  safeStyle(ws.getCell(r, 2), titleS, 'd'); for (let c = 3; c <= 5; c++) safeStyle(ws.getCell(r, c), titleS, 'd'); safeMerge(ws, r, 2, r, 5); r += 2;
  ws.getRow(r).height = 20.1; ws.getCell(r, 2).value = 'Construction Issue';
  safeStyle(ws.getCell(r, 2), bannerS, 'd'); for (let c = 3; c <= 5; c++) safeStyle(ws.getCell(r, c), bannerS, 'd'); safeMerge(ws, r, 2, r, 5); r++;

  const issues = data.aggregated?.issues ?? [];
  const issuesToRender: MasterIssueItem[] = issues.length > 0
    ? issues
    : Array.from({ length: 4 }, (_, i) => ({ no: i + 1, projectSource: '' } as MasterIssueItem));

  for (let idx = 0; idx < issuesToRender.length; idx++) {
    const issue = issuesToRender[idx];
    const r0 = r;
    ws.getRow(r0 + 0).height = 18; ws.getRow(r0 + 1).height = 18; ws.getRow(r0 + 2).height = 5.25;
    for (let k = 3; k <= 12; k++) ws.getRow(r0 + k).height = 18; ws.getRow(r0 + 13).height = 5.25;

    ws.getCell(r0, 2).value = issue.no ?? (idx + 1); safeStyle(ws.getCell(r0, 2), numS, 'd');
    for (let c = 3; c <= 5; c++) safeStyle(ws.getCell(r0, c), { font: { size: 11, name: 'Arial' } }, 'd');
    safeStyle(ws.getCell(r0, 5), { border: { right: thin }, font: { size: 11, name: 'Arial' } }, 'd');
    safeMerge(ws, r0, 2, r0, 5);

    const projectTag = issue.projectSource ? ` [${issue.projectSource}]` : '';
    ws.getCell(r0 + 1, 2).value = `Site Location: ${issue.location ?? ''}${projectTag}`; safeStyle(ws.getCell(r0 + 1, 2), locS, 'd');
    ws.getCell(r0 + 1, 3).value = 'Photo Reference'; safeStyle(ws.getCell(r0 + 1, 3), photoRefS, 'd');
    safeStyle(ws.getCell(r0 + 1, 4), { border: allBorders, font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' } }, 'd');
    safeStyle(ws.getCell(r0 + 1, 5), { border: allBorders, font: { size: 10, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'middle' } }, 'd');
    safeMerge(ws, r0 + 1, 3, r0 + 1, 5);

    for (let rr = r0 + 2; rr <= r0 + 13; rr++) safeStyle(ws.getCell(rr, 3), { border: { left: thin } }, 'd');
    safeStyle(ws.getCell(r0 + 13, 3), { border: { left: thin, bottom: thin } }, 'd'); safeMerge(ws, r0 + 2, 3, r0 + 13, 3);
    for (let rr = r0 + 2; rr <= r0 + 13; rr++) safeStyle(ws.getCell(rr, 5), { border: { right: thin } }, 'd');
    safeStyle(ws.getCell(r0 + 13, 5), { border: { right: thin, bottom: thin } }, 'd'); safeMerge(ws, r0 + 2, 5, r0 + 13, 5);
    safeStyle(ws.getCell(r0 + 13, 4), { border: { bottom: thin } }, 'd'); safeMerge(ws, r0 + 3, 4, r0 + 12, 4);

    if (issue.photo?.trim()) {
      try { await addImageToWorksheet(workbook, ws, issue.photo, { tl: { col: 3, row: r0 + 2 }, br: { col: 4, row: r0 + 12 }, editAs: 'twoCell' } as any); }
      catch { ws.getCell(r0 + 3, 4).value = 'N/A'; safeStyle(ws.getCell(r0 + 3, 4), { font: { size: 14, name: 'Arial', italic: true, color: { argb: 'FF888888' } }, alignment: { horizontal: 'center', vertical: 'middle' } }, 'd'); }
    } else { ws.getCell(r0 + 3, 4).value = 'N/A'; safeStyle(ws.getCell(r0 + 3, 4), { font: { size: 14, name: 'Arial', italic: true, color: { argb: 'FF888888' } }, alignment: { horizontal: 'center', vertical: 'middle' } }, 'd'); }

    ws.getCell(r0 + 2, 2).value = 'Problems / Descriptions:'; safeStyle(ws.getCell(r0 + 2, 2), labelS, 'd'); safeStyle(ws.getCell(r0 + 3, 2), labelS, 'd'); safeMerge(ws, r0 + 2, 2, r0 + 3, 2);
    ws.getCell(r0 + 4, 2).value = issue.problem ?? ''; safeStyle(ws.getCell(r0 + 4, 2), bodyS, 'd');
    for (let rr = r0 + 5; rr <= r0 + 11; rr++) safeStyle(ws.getCell(rr, 2), bodyS, 'd'); safeMerge(ws, r0 + 4, 2, r0 + 11, 2);
    ws.getCell(r0 + 12, 2).value = `Action by: ${issue.actionBy ?? ''}`; safeStyle(ws.getCell(r0 + 12, 2), actionS, 'd'); safeStyle(ws.getCell(r0 + 13, 2), actionS, 'd'); safeMerge(ws, r0 + 12, 2, r0 + 13, 2);
    r = r0 + 14;
  }
}
