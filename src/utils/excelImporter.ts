import { ConstructionProgressItem } from '../types/constructionProgress';
import { detectIdType } from './idEngine';
import ExcelJS from 'exceljs';

export interface ImportValidationError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

export interface ParsedImportRow {
  id: string;
  scopeOfWorks: string;
  detailDescription: string;
  unit: string;
  boQQty: number;
  materialRate: number;
  laborRate: number;
  // Raw BoQ amount from the Excel (column I). If present, we trust it as the
  // source of truth for the amount so grouping/summary rows (with no qty/rate)
  // still carry their amounts through.
  boQAmount?: number;

  // Progress — qty
  previousWeekQty: number;
  thisWeekQty: number;
  upToThisWeekQty?: number;
  remainingQty?: number;
  nextWeekPlanQty: number;
  upToNextWeekPlanQty?: number;

  // Progress — amount (read directly if present in the sheet)
  previousWeekAmount?: number;
  thisWeekAmount?: number;
  upToThisWeekAmount?: number;
  remainingAmount?: number;
  nextWeekPlanAmount?: number;
  upToNextWeekPlanAmount?: number;

  // Progress — percentage (alternative to qty)
  previousWeekPct?: number;
  thisWeekPct?: number;
  upToThisWeekPct?: number;
  remainingPct?: number;
  nextWeekPlanPct?: number;
  upToNextWeekPlanPct?: number;

  remark: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportResult {
  rows: ParsedImportRow[];
  errors: ImportValidationError[];
  validCount: number;
  totalCount: number;
}

/**
 * Header patterns. Order matters for fallback `includes` matching — more
 * specific patterns MUST come before generic ones. We also match exact-first
 * in `findField` below to avoid "description" swallowing "detail description".
 */
type Field = keyof ParsedImportRow;

interface HeaderPattern {
  patterns: string[]; // normalized forms this field accepts
  field: Field;
}

const HEADER_PATTERNS: HeaderPattern[] = [
  // ID
  { field: 'id', patterns: ['id', 'no', 'no.', 'number', 'item no', 'item #', 'item'] },

  // Detail Description — put BEFORE scopeOfWorks so "detail description"
  // is matched here first and never falls through to "description"
  { field: 'detailDescription', patterns: ['detail description', 'detail', 'detailed description', 'item detail'] },

  // Scope of Works
  { field: 'scopeOfWorks', patterns: ['scope of works', 'scope of work', 'scope', 'work item', 'work description', 'description'] },

  // Unit
  { field: 'unit', patterns: ['unit', 'uom'] },

  // BoQ
  { field: 'boQQty', patterns: ['boq qty', 'boq quantity', 'contract qty', 'contract quantity', 'revise boq qty', 'qty', 'quantity'] },
  { field: 'materialRate', patterns: ['material rate', 'mat rate', 'material', 'mat.rate', 'mat. rate'] },
  { field: 'laborRate', patterns: ['labor rate', 'labour rate', 'labor', 'labour', 'lab rate'] },
  { field: 'boQAmount', patterns: ['boq amount', 'revise boq amount', 'contract amount', 'amount'] },

  { field: 'remark', patterns: ['remark', 'remarks', 'notes', 'note'] },

  // Previous Week
  { field: 'previousWeekQty', patterns: ['previous week qty', 'prev week qty', 'previous qty', 'prev qty', 'up to previous week qty'] },
  { field: 'previousWeekAmount', patterns: ['previous week amount', 'prev week amount', 'up to previous week amount'] },
  { field: 'previousWeekPct', patterns: ['% up to previous week', 'up to previous week %', '% up to prev week', 'previous week %', '% previous week'] },

  // This Week
  { field: 'thisWeekQty', patterns: ['this week qty', 'this qty', 'this week quantity'] },
  { field: 'thisWeekAmount', patterns: ['this week amount', 'this week amt'] },
  { field: 'thisWeekPct', patterns: ['% this week', 'this week %', 'this week pct'] },

  // Up To This Week
  { field: 'upToThisWeekQty', patterns: ['up to this week qty', 'up to date qty'] },
  { field: 'upToThisWeekAmount', patterns: ['up to this week amount', 'up to date amount'] },
  { field: 'upToThisWeekPct', patterns: ['% up to this week', 'up to this week %', '% up to date', 'up to date %'] },

  // Remaining
  { field: 'remainingQty', patterns: ['remaining qty', 'remianing qty'] },
  { field: 'remainingAmount', patterns: ['remaining amount', 'remianing amount'] },
  { field: 'remainingPct', patterns: ['% remaining', 'remaining %', 'remianing %', '% remianing'] },

  // Next Week Plan
  { field: 'nextWeekPlanQty', patterns: ['next week plan qty', 'next week qty', 'next week plan', 'plan qty'] },
  { field: 'nextWeekPlanAmount', patterns: ['next week plan amount', 'next week amount', 'plan amount'] },
  { field: 'nextWeekPlanPct', patterns: ['% next week plan', 'next week plan %', '% next week', 'next week %'] },

  // Up To Next Week Plan
  { field: 'upToNextWeekPlanQty', patterns: ['up to next week plan qty', 'up to next week qty'] },
  { field: 'upToNextWeekPlanAmount', patterns: ['up to next week plan amount', 'up to next week amount'] },
  { field: 'upToNextWeekPlanPct', patterns: ['% up to next week plan', 'up to next week plan %', '% up to next week', 'up to next week %'] },
];

function normalizeHeader(header: any): string {
  return String(header ?? '').toLowerCase().trim().replace(/[\s_\-\n\r]+/g, ' ');
}

/**
 * Match a normalized header to a field. Exact match wins; otherwise first
 * pattern found by `includes` (patterns are ordered so specific beats generic).
 */
function findField(header: string): Field | null {
  if (!header) return null;

  // Pass 1: exact match
  for (const { field, patterns } of HEADER_PATTERNS) {
    if (patterns.some(p => p === header)) return field;
  }
  // Pass 2: header startsWith pattern
  for (const { field, patterns } of HEADER_PATTERNS) {
    if (patterns.some(p => header === p || header.startsWith(p + ' ') || header.endsWith(' ' + p))) return field;
  }
  // Pass 3: header contains pattern (loosest)
  for (const { field, patterns } of HEADER_PATTERNS) {
    if (patterns.some(p => header.includes(p))) return field;
  }
  return null;
}

/**
 * Extract a printable string from an ExcelJS cell value that might be
 * a formula object, rich text, date, number, null, etc.
 */
function cellToString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return cellToString((value as any).result);
    if ('richText' in value && Array.isArray((value as any).richText)) {
      return (value as any).richText.map((t: any) => t.text ?? '').join('').trim();
    }
    if ('text' in value) return String((value as any).text).trim();
  }
  return String(value).trim();
}

function cellToNumber(value: any): number {
  const s = cellToString(value).replace(/,/g, '').replace(/[^\d.\-eE]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function cellToPercent(value: any): number | undefined {
  const raw = cellToString(value);
  if (!raw) return undefined;
  const hadPctSign = raw.includes('%');
  const n = parseFloat(raw.replace(/,/g, '').replace(/%/g, ''));
  if (isNaN(n)) return undefined;
  // Excel stores "50%" as 0.5 under the hood. If value is between 0 and 1
  // (exclusive) and had no explicit "%" character in the string form, treat
  // it as a fraction and scale up.
  if (!hadPctSign && n > 0 && n < 1) return n * 100;
  return n;
}

/**
 * Scan the first ~20 rows looking for a header. Because this sheet uses a
 * two-row header (main on row N, sub-headers on row N+1 for the BoQ group),
 * we try combining each candidate row with the next row to get the best
 * column -> field mapping.
 */
function detectHeader(worksheet: ExcelJS.Worksheet): { headerRow: number; mapping: Record<number, Field> } | null {
  const rowsToScan = Math.min(25, worksheet.rowCount);
  let best: { headerRow: number; mapping: Record<number, Field>; score: number } | null = null;

  for (let i = 1; i <= rowsToScan; i++) {
    const row1 = worksheet.getRow(i);
    const row2 = i + 1 <= rowsToScan ? worksheet.getRow(i + 1) : null;

    const combined: Record<number, Field> = {};
    const usedFields = new Set<Field>();
    let score = 0;

    const maxCol = Math.max(row1.cellCount, row2?.cellCount ?? 0);
    for (let col = 1; col <= maxCol; col++) {
      const h1 = normalizeHeader(cellToString(row1.getCell(col).value));
      const h2 = row2 ? normalizeHeader(cellToString(row2.getCell(col).value)) : '';

      // Try combined "h1 h2", then h1, then h2
      const candidates = [
        [h1, h2].filter(Boolean).join(' ').trim(),
        h1,
        h2,
      ].filter(Boolean);

      for (const cand of candidates) {
        const field = findField(cand);
        if (field && !usedFields.has(field)) {
          combined[col] = field;
          usedFields.add(field);
          score++;
          break;
        }
      }
    }

    // A valid header needs at least ID + Scope OR 4+ recognized columns
    const hasIdAndScope = usedFields.has('id') && usedFields.has('scopeOfWorks');
    if ((hasIdAndScope && score >= 3) || score >= 5) {
      if (!best || score > best.score) {
        // When row2 was used meaningfully, the header block spans 2 rows,
        // so data starts at i+2. Otherwise data starts at i+1.
        const row2Used = row2 && Object.values(combined).some(f => {
          // crude check: if any field's column had an empty h1 but non-empty h2,
          // we know we consumed row2
          return true;
        });
        // Always skip to max of the two rows to be safe
        best = { headerRow: row2 ? i + 1 : i, mapping: combined, score };
      }
    }
  }

  return best ? { headerRow: best.headerRow, mapping: best.mapping } : null;
}

export async function parseExcelFile(file: File): Promise<ImportResult> {
  const errors: ImportValidationError[] = [];
  const rows: ParsedImportRow[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      errors.push({ row: 0, column: 'N/A', message: 'No worksheet found in Excel file' });
      return { rows, errors, validCount: 0, totalCount: 0 };
    }

    const detected = detectHeader(worksheet);
    if (!detected) {
      errors.push({
        row: 0,
        column: 'N/A',
        message: 'Could not find header row. Expected columns: ID, Scope of Works, Detail Description, Unit, BoQ Qty, etc.',
      });
      return { rows, errors, validCount: 0, totalCount: 0 };
    }

    const { headerRow, mapping } = detected;

    for (let i = headerRow + 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      // Is the row entirely empty? skip.
      let hasValue = false;
      row.eachCell((cell) => {
        if (cellToString(cell.value) !== '') hasValue = true;
      });
      if (!hasValue) continue;

      const parsed: ParsedImportRow = {
        id: '',
        scopeOfWorks: '',
        detailDescription: '',
        unit: '',
        boQQty: 0,
        materialRate: 0,
        laborRate: 0,
        previousWeekQty: 0,
        thisWeekQty: 0,
        nextWeekPlanQty: 0,
        remark: '',
        isValid: true,
        errors: [],
      };

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const field = mapping[colNumber];
        if (!field) return;

        const raw = cell.value;

        switch (field) {
          case 'id':
          case 'scopeOfWorks':
          case 'detailDescription':
          case 'unit':
          case 'remark':
            (parsed[field] as string) = cellToString(raw);
            break;

          case 'boQQty':
          case 'materialRate':
          case 'laborRate':
          case 'boQAmount':
          case 'previousWeekQty':
          case 'thisWeekQty':
          case 'upToThisWeekQty':
          case 'remainingQty':
          case 'nextWeekPlanQty':
          case 'upToNextWeekPlanQty':
          case 'previousWeekAmount':
          case 'thisWeekAmount':
          case 'upToThisWeekAmount':
          case 'remainingAmount':
          case 'nextWeekPlanAmount':
          case 'upToNextWeekPlanAmount':
            (parsed[field] as number) = cellToNumber(raw);
            break;

          case 'previousWeekPct':
          case 'thisWeekPct':
          case 'upToThisWeekPct':
          case 'remainingPct':
          case 'nextWeekPlanPct':
          case 'upToNextWeekPlanPct':
            (parsed[field] as number | undefined) = cellToPercent(raw);
            break;
        }
      });

      // ── Rule: if ID is empty but Scope of Works is a short code like
      // "F1", "W1", "C2" (i.e. the "item code" rows), we treat the whole
      // row as a leaf item. The existing cellToString already placed B in
      // scopeOfWorks and C in detailDescription, so nothing more to do.
      //
      // ── Rule: if ID column holds what is obviously a description (long
      // text, and no scopeOfWorks filled), push it over to scopeOfWorks.
      const idType = detectIdType(parsed.id);
      if (idType === 'empty' && parsed.id.length > 3 && !parsed.scopeOfWorks) {
        parsed.scopeOfWorks = parsed.id;
        parsed.id = '';
      }

      // ── Skip obvious non-data rows (title/metadata rows above the table
      // AND signature/footer rows below it).
      const idLower = parsed.id.toLowerCase();
      const scopeLower = parsed.scopeOfWorks.toLowerCase();
      const combinedLower = (parsed.id + ' ' + parsed.scopeOfWorks + ' ' + parsed.detailDescription).toLowerCase();

      const isMetadataRow =
        idLower === 'description' ||
        idLower === 'remark' ||
        idLower === 'notes' ||
        idLower.startsWith('rev.') ||
        (idLower === 'id' && scopeLower === 'scope of works');

      // Signature / footer patterns commonly found below BOQ tables.
      // If any of these phrases appears in the row AND the row carries no
      // numeric BoQ data, treat it as a footer and skip silently.
      const footerPhrases = [
        'prepared by',
        'checked by',
        'approved by',
        'verified by',
        'reviewed by',
        'sign here',
        'signature',
        'name:',
        'position:',
        'date:',
        'stamp',
      ];
      const looksLikeFooter =
        footerPhrases.some((phrase) => combinedLower.includes(phrase)) &&
        parsed.boQQty === 0 &&
        (parsed.boQAmount === undefined || parsed.boQAmount === 0);

      if (isMetadataRow || looksLikeFooter) continue;

      parsed.errors = validateRow(parsed, i - headerRow).map((e) => e.message);
      parsed.isValid = parsed.errors.length === 0;

      if (!parsed.isValid) {
        errors.push(...validateRow(parsed, i - headerRow));
      }

      rows.push(parsed);
    }
  } catch (err) {
    errors.push({
      row: 0,
      column: 'N/A',
      message: `Error reading Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }

  return {
    rows,
    errors,
    validCount: rows.filter((r) => r.isValid).length,
    totalCount: rows.length,
  };
}

/**
 * Validation. We now allow empty IDs (those are leaf item-code rows or
 * grouping-title rows). We only flag truly broken data.
 */
function validateRow(row: ParsedImportRow, rowNumber: number): ImportValidationError[] {
  const errs: ImportValidationError[] = [];

  // If the ID is present but malformed, report it
  if (row.id && detectIdType(row.id) === 'empty') {
    errs.push({
      row: rowNumber,
      column: 'ID',
      message: `Invalid ID format: "${row.id}". Use formats like: I, II (roman), 1, 2 (level1), 1.1 (level2), 1.1.1 (level3), A, B (alpha), or leave empty for item-code rows.`,
      value: row.id,
    });
  }

  // Require at least *some* textual content so we don't import truly blank rows
  if (!row.id && !row.scopeOfWorks && !row.detailDescription) {
    errs.push({
      row: rowNumber,
      column: 'Row',
      message: 'Row is empty (no ID, Scope of Works, or Detail Description).',
    });
  }

  const numericFields: { key: keyof ParsedImportRow; label: string }[] = [
    { key: 'boQQty', label: 'BoQ Qty' },
    { key: 'materialRate', label: 'Material Rate' },
    { key: 'laborRate', label: 'Labor Rate' },
    { key: 'previousWeekQty', label: 'Previous Week Qty' },
    { key: 'thisWeekQty', label: 'This Week Qty' },
    { key: 'nextWeekPlanQty', label: 'Next Week Plan Qty' },
  ];
  for (const { key, label } of numericFields) {
    const v = row[key] as number;
    if (typeof v === 'number' && v < 0) {
      errs.push({ row: rowNumber, column: label, message: `${label} cannot be negative`, value: String(v) });
    }
  }

  return errs;
}

/**
 * Convert ParsedImportRow[] to ConstructionProgressItem[].
 * We trust explicit amounts/percentages from the sheet when provided,
 * and fall back to qty × unitRate otherwise.
 */
export function mapToConstructionItems(
  parsedRows: ParsedImportRow[],
  _existingItems: ConstructionProgressItem[] = []
): ConstructionProgressItem[] {
  return parsedRows.map((row) => {
    const idType = detectIdType(row.id);
    const isStructural =
      idType === 'alpha' ||
      idType === 'level1' ||
      idType === 'level2' ||
      idType === 'level3' ||
      idType === 'roman' ||
      idType === 'ambiguous';

    const unitRate = row.materialRate + row.laborRate;

    // BoQ amount: prefer value from sheet, else qty × rate
    const boQAmount = row.boQAmount && row.boQAmount > 0 ? row.boQAmount : row.boQQty * unitRate;

    // Helper — derive a progress block, preferring explicit amount > pct > qty
    const derive = (
      qty: number,
      amount: number | undefined,
      pct: number | undefined
    ): { qty: number; amount: number; percentage: number } => {
      let a = 0;
      if (amount !== undefined && amount > 0) {
        a = amount;
      } else if (pct !== undefined && pct > 0) {
        a = (pct / 100) * boQAmount;
      } else {
        a = qty * unitRate;
      }
      let p: number;
      if (pct !== undefined) {
        p = Math.round(pct * 10) / 10;
      } else {
        p = boQAmount > 0 ? Math.round((a / boQAmount) * 100 * 10) / 10 : 0;
      }
      return { qty, amount: a, percentage: p };
    };

    const previousWeek = derive(row.previousWeekQty, row.previousWeekAmount, row.previousWeekPct);
    const thisWeek = derive(row.thisWeekQty, row.thisWeekAmount, row.thisWeekPct);
    const upToThisWeekQty = row.upToThisWeekQty ?? previousWeek.qty + thisWeek.qty;
    const upToThisWeek = derive(upToThisWeekQty, row.upToThisWeekAmount ?? previousWeek.amount + thisWeek.amount, row.upToThisWeekPct);

    const remainingQty = row.remainingQty ?? Math.max(row.boQQty - upToThisWeek.qty, 0);
    const remainingAmount = row.remainingAmount ?? Math.max(boQAmount - upToThisWeek.amount, 0);
    const remaining = derive(remainingQty, remainingAmount, row.remainingPct);

    const nextWeekPlan = derive(row.nextWeekPlanQty, row.nextWeekPlanAmount, row.nextWeekPlanPct);
    const upToNextWeekPlanQty = row.upToNextWeekPlanQty ?? upToThisWeek.qty + nextWeekPlan.qty;
    const upToNextWeekPlanAmount = row.upToNextWeekPlanAmount ?? upToThisWeek.amount + nextWeekPlan.amount;
    const upToNextWeekPlan = derive(upToNextWeekPlanQty, upToNextWeekPlanAmount, row.upToNextWeekPlanPct);

    return {
      id: row.id,
      scopeOfWorks: row.scopeOfWorks,
      detailDescription: row.detailDescription,
      unit: row.unit,
      boQ: {
        qty: row.boQQty,
        materialRate: row.materialRate,
        laborRate: row.laborRate,
        unitRate,
        amount: boQAmount,
      },
      remark: row.remark,
      previousWeek,
      thisWeek,
      upToThisWeek,
      remaining,
      nextWeekPlan,
      upToNextWeekPlan,
      isBold: isStructural,
      source: 'bulk',
    } as ConstructionProgressItem;
  });
}

/**
 * Generate a template Excel file matching the full UI column structure.
 */
export async function generateTemplateFile(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Construction Progress Template');

  // Two-row header to match the UI
  const mainHeaders = [
    'ID', 'Scope of Works', 'Detail Description', 'Unit',
    'BoQ', '', '', '', '',                                    // 5 sub-cols
    'Remark',
    'Previous Week', '', '',                                  // 3 sub-cols
    'This Week', '', '',
    'Up to This Week', '', '',
    'Remaining', '', '',
    'Next Week Plan', '', '',
    'Up to Next Week Plan', '', '',
  ];
  const subHeaders = [
    '', '', '', '',
    'Qty', 'Mat Rate', 'Labor Rate', 'Unit Rate', 'Amount',
    '',
    'Qty', 'Amount', '%',
    'Qty', 'Amount', '%',
    'Qty', 'Amount', '%',
    'Qty', 'Amount', '%',
    'Qty', 'Amount', '%',
    'Qty', 'Amount', '%',
  ];

  const r1 = ws.addRow(mainHeaders);
  const r2 = ws.addRow(subHeaders);

  // Merge group header cells
  const mergeRanges: [number, number, number, number][] = [
    [1, 1, 2, 1],   // ID
    [1, 2, 2, 2],   // Scope
    [1, 3, 2, 3],   // Detail
    [1, 4, 2, 4],   // Unit
    [1, 5, 1, 9],   // BoQ
    [1, 10, 2, 10], // Remark
    [1, 11, 1, 13], // Previous Week
    [1, 14, 1, 16], // This Week
    [1, 17, 1, 19], // Up to This Week
    [1, 20, 1, 22], // Remaining
    [1, 23, 1, 25], // Next Week Plan
    [1, 26, 1, 28], // Up to Next Week Plan
  ];
  for (const [r1n, c1, r2n, c2] of mergeRanges) ws.mergeCells(r1n, c1, r2n, c2);

  [r1, r2].forEach((r) =>
    r.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    })
  );

  // Example data
  const examples: any[][] = [
    ['I', 'SECTION I: GENERAL', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['1', 'Subsection 1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['1.1', 'Subsection 1.1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['A', 'Architectural Works', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'F1', 'Cleaning existing tiles including base', 'Sq.m', 62, 2.6, 1.8, 4.4, 272.8, '', '', '', '', 0, 0, 0, 0, 0, 0, 62, 272.8, 100, 0, 0, 0, 0, 0, 0],
    ['', 'W1', 'Removing existing paint and repairing mortar', 'Sq.m', 82.4, 1.8, 2.8, 4.6, 379.04, '', '', '', '', 0, 0, 0, 0, 0, 0, 82.4, 379.04, 100, 0, 0, 0, 0, 0, 0],
  ];
  examples.forEach((data) => {
    const r = ws.addRow(data);
    r.eachCell((cell, col) => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      if (col >= 5 && col !== 10) cell.alignment = { horizontal: 'right' };
    });
  });

  ws.columns = [
    { width: 8 }, { width: 30 }, { width: 35 }, { width: 8 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 },
    { width: 20 },
    { width: 10 }, { width: 12 }, { width: 6 },
    { width: 10 }, { width: 12 }, { width: 6 },
    { width: 10 }, { width: 12 }, { width: 6 },
    { width: 10 }, { width: 12 }, { width: 6 },
    { width: 10 }, { width: 12 }, { width: 6 },
    { width: 10 }, { width: 12 }, { width: 6 },
  ];

  ws.addRow([]);
  ws.addRow(['INSTRUCTIONS:']);
  ws.addRow(['- ID formats: I, II (roman) | 1, 2 (level1) | 1.1 (level2) | 1.1.1 (level3) | A, B (alpha)']);
  ws.addRow(['- Leave ID empty for item-code rows (F1, W1, C2) — Scope of Works carries the code.']);
  ws.addRow(['- Amount columns are optional: if blank they are computed as Qty x Unit Rate.']);
  ws.addRow(['- Percentage columns accept "50", "50%", or 0.5 (all interpreted as 50%).']);

  const buf = await workbook.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}