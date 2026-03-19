import React, { useState, useMemo, useEffect, useRef } from "react";
import { Trash2, MoreVertical, Plus, X, ChevronDown, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { Input } from '@/components/ui/input';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BoQData { qty: number; materialRate: number; laborRate: number; unitRate: number; amount: number; }
export interface ProgressData { qty: number; amount: number; percentage: number; }

export interface ConstructionProgressItem {
  id: string;
  isBold?: boolean;
  scopeOfWorks: string;
  detailDescription: string;
  unit: string;
  boQ: BoQData;
  remark: string;
  previousWeek: ProgressData;
  thisWeek: ProgressData;
  upToThisWeek: ProgressData;
  remaining: ProgressData;
  nextWeekPlan: ProgressData;
  upToNextWeekPlan: ProgressData;
}

export interface ProjectInfo { project: string; subtitle: string; date: string; revision: string; }
export interface ConstructionProgressData { projectInfo: ProjectInfo; items: ConstructionProgressItem[]; }

export interface ConstructionProgressPayload {
  reportId: string;
  projectInfo: ProjectInfo;
  progressItems: ConstructionProgressItem[];
  createdAt: string;
  updatedAt: string;
}

interface WeeklyReportConstructionProgressProps {
  data?: ConstructionProgressData;
  onDataChange?: (data: ConstructionProgressData) => void;
  reportId?: string;
}

interface EditableCell { rowIndex: number; field: string; }

// ─── ID Engine ────────────────────────────────────────────────────────────────

type IdType = 'roman' | 'level1' | 'level2' | 'level3' | 'alpha' | 'empty';

const ROMAN_VALUES: [string, number][] = [
  ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
  ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
  ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
];

function toRoman(num: number): string {
  if (num <= 0) return 'I';
  let result = '';
  for (const [s, v] of ROMAN_VALUES) {
    while (num >= v) { result += s; num -= v; }
  }
  return result;
}

function fromRoman(str: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const cur = map[str[i]] ?? 0;
    const next = map[str[i + 1]] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

function detectIdType(id: string): IdType {
  if (!id || id.trim() === '') return 'empty';
  const t = id.trim();
  if (/^\d+\.\d+\.\d+$/.test(t)) return 'level3';
  if (/^\d+\.\d+$/.test(t)) return 'level2';
  if (/^\d+$/.test(t)) return 'level1';
  // Single uppercase letter (A-Z) = alpha  e.g. A, B, C
  if (/^[A-Z]$/.test(t)) return 'alpha';
  // Two or more roman numeral chars = roman  e.g. II, III, IV, XIV
  // (single-char roman like I, V, X treated as alpha above — we disambiguate
  //  by reserving single caps for alpha and requiring 2+ chars for roman)
  if (/^[IVXLCDM]{2,}$/.test(t) && fromRoman(t) > 0) return 'roman';
  return 'empty';
}

/** Classify a user-intent "section header" ID — single I means roman section 1 */
function isRomanOne(id: string): boolean {
  return id.trim() === 'I';
}

/** Increment a single ID of its type */
function incrementId(refId: string, type: IdType): string {
  if (type === 'empty') return '';
  // For roman: fromRoman handles "I"=1, "II"=2, etc. correctly
  if (type === 'roman') return toRoman(fromRoman(refId.trim()) + 1);
  if (type === 'alpha') return String.fromCharCode(refId.charCodeAt(0) + 1);
  if (type === 'level1') return String(parseInt(refId, 10) + 1);
  if (type === 'level2') { const [a, b] = refId.split('.').map(Number); return `${a}.${b + 1}`; }
  if (type === 'level3') { const [a, b, c] = refId.split('.').map(Number); return `${a}.${b}.${c + 1}`; }
  return refId;
}

/**
 * Resolve the nearest "scope context" above insertAfterIndex for a given child type.
 * - level2 needs nearest level1 parent above
 * - level3 needs nearest level2 parent above
 * - alpha needs nearest level3 (or level2 if no level3) parent above
 * Returns the parent ID string, or undefined if none found.
 */
function findNearestParent(items: ConstructionProgressItem[], insertAfterIndex: number, type: IdType): string | undefined {
  const parentType: IdType | null =
    type === 'level2' ? 'level1' :
      type === 'level3' ? 'level2' :
        type === 'alpha' ? 'level3' :   // alpha groups under level3
          null;

  if (!parentType) return undefined;

  for (let i = insertAfterIndex; i >= 0; i--) {
    if (detectIdType(items[i].id) === parentType) return items[i].id;
    // Don't cross a higher-level boundary going up
    // e.g. for level2, stop scanning if we hit a roman (section boundary)
    if (type === 'level2' && detectIdType(items[i].id) === 'roman') break;
    if (type === 'level3' && detectIdType(items[i].id) === 'level1') break;
    if (type === 'alpha' && detectIdType(items[i].id) === 'level2') break;
  }

  // Fallback: scan without boundary restriction
  for (let i = insertAfterIndex; i >= 0; i--) {
    if (detectIdType(items[i].id) === parentType) return items[i].id;
  }
  return undefined;
}

/**
 * Find the last same-type SIBLING above insertAfterIndex.
 * "Sibling" means: shares the same parent prefix.
 *   - roman/level1: any roman/level1 (global siblings)
 *   - level2: same level1 prefix  e.g. "1.x" only matches other "1.x"
 *   - level3: same level2 prefix  e.g. "1.1.x" only matches other "1.1.x"
 *   - alpha: same nearest-level3-or-level2 parent scope
 */
/** Check if an ID is a roman numeral (including the ambiguous single-char "I") */
function isRomanId(id: string): boolean {
  const t = id?.trim() ?? '';
  // Multi-char roman
  if (/^[IVXLCDM]{2,}$/.test(t) && fromRoman(t) > 0) return true;
  // Single "I" — the only single-char that unambiguously means roman section 1
  if (t === 'I') return true;
  return false;
}

function findLastSibling(
  items: ConstructionProgressItem[],
  insertAfterIndex: number,
  type: IdType
): string | null {
  if (type === 'roman') {
    for (let i = insertAfterIndex; i >= 0; i--) {
      if (isRomanId(items[i].id)) return items[i].id;
    }
    return null;
  }
  if (type === 'level1') {
    // Level1 is scoped under its nearest roman parent.
    // Scan backwards: return last level1 found, but STOP if we cross a roman boundary.
    for (let i = insertAfterIndex; i >= 0; i--) {
      if (isRomanId(items[i].id)) break; // crossed into previous roman section — stop
      if (detectIdType(items[i].id) === 'level1') return items[i].id;
    }
    return null; // no sibling in this roman section → start from 1
  }

  if (type === 'level2') {
    // Find nearest level1 parent first
    const parent = findNearestParent(items, insertAfterIndex, 'level2');
    const prefix = parent ?? null; // e.g. "1"
    for (let i = insertAfterIndex; i >= 0; i--) {
      const t = detectIdType(items[i].id);
      if (t === 'level2') {
        const p = items[i].id.split('.')[0];
        if (!prefix || p === prefix) return items[i].id;
      }
      // Stop if we cross into a different level1 or roman section
      if (t === 'level1' || isRomanId(items[i].id)) break;
    }
    return null;
  }

  if (type === 'level3') {
    // Find nearest level2 parent
    const parent = findNearestParent(items, insertAfterIndex, 'level3');
    const prefix = parent ?? null; // e.g. "1.1"
    for (let i = insertAfterIndex; i >= 0; i--) {
      const t = detectIdType(items[i].id);
      if (t === 'level3') {
        const parts = items[i].id.split('.');
        const p = `${parts[0]}.${parts[1]}`;
        if (!prefix || p === prefix) return items[i].id;
      }
      // Stop if we cross into a different level2 section
      if (t === 'level2' || t === 'level1' || t === 'roman') break;
    }
    return null;
  }

  if (type === 'alpha') {
    // Alpha resets under each level3 (or level2 if no level3) parent
    // Find the nearest level3 or level2 scope boundary above
    let scopeBoundaryIndex = -1;
    for (let i = insertAfterIndex; i >= 0; i--) {
      const t = detectIdType(items[i].id);
      if (t === 'level3' || t === 'level2' || t === 'level1' || t === 'roman') {
        scopeBoundaryIndex = i;
        break;
      }
    }
    // Scan backwards from insertAfterIndex down to scopeBoundaryIndex for last alpha
    for (let i = insertAfterIndex; i > scopeBoundaryIndex; i--) {
      if (detectIdType(items[i].id) === 'alpha') return items[i].id;
    }
    return null;
  }

  return null;
}

/**
 * Compute the next ID to assign when inserting a row of `type` after `insertAfterIndex`.
 * Uses parent-aware sibling detection.
 */
function computeNextId(items: ConstructionProgressItem[], insertAfterIndex: number, type: IdType): string {
  if (type === 'empty') return '';

  const lastSibling = findLastSibling(items, insertAfterIndex, type);
  if (lastSibling) return incrementId(lastSibling, type);

  // No sibling found — start fresh
  if (type === 'roman') return 'I';
  if (type === 'level1') return '1';
  if (type === 'alpha') return 'A';

  if (type === 'level2') {
    const parent = findNearestParent(items, insertAfterIndex, 'level2');
    const p = parent ?? '1';
    return `${p}.1`;
  }
  if (type === 'level3') {
    const parent = findNearestParent(items, insertAfterIndex, 'level3');
    if (parent) {
      const parts = parent.split('.');
      return `${parts[0]}.${parts[1]}.1`;
    }
    return '1.1.1';
  }
  return '';
}

/**
 * After inserting `count` rows at `insertedAt`, renumber all same-type siblings below,
 * then cascade: if level1 IDs changed → fix level2 children → fix level3 grandchildren.
 */
function renumberBelow(
  items: ConstructionProgressItem[],
  insertedAt: number,
  count: number,
  type: IdType
): ConstructionProgressItem[] {
  if (type === 'empty' || type === 'alpha') return items;

  const result = [...items];
  const idMap = new Map<string, string>(); // oldId → newId

  // Pass 1: renumber same-type siblings below insertion point
  for (let i = insertedAt + count; i < result.length; i++) {
    const item = result[i];
    const itemMatchesType = type === 'roman' ? isRomanId(item.id) : detectIdType(item.id) === type;

    // For level1: stop renumbering when we enter a new roman section
    if (type === 'level1' && isRomanId(item.id)) break;

    if (!itemMatchesType) continue;

    const prevSibling = findLastSibling(result, i - 1, type);
    const newId = prevSibling ? incrementId(prevSibling, type) : computeNextId(result, i - 1, type);
    if (newId !== item.id) {
      idMap.set(item.id, newId);
      result[i] = { ...item, id: newId };
    }
  }

  if (idMap.size === 0) return result;

  // Pass 2: cascade level2 children if level1 changed
  if (type === 'level1') {
    for (let i = insertedAt + count; i < result.length; i++) {
      const item = result[i];
      if (detectIdType(item.id) !== 'level2') continue;
      const parts = item.id.split('.');
      const newParent = idMap.get(parts[0]);
      if (newParent) {
        const newId = `${newParent}.${parts[1]}`;
        idMap.set(item.id, newId);
        result[i] = { ...item, id: newId };
      }
    }
  }

  // Pass 3: cascade level3 grandchildren if level2 (or level1→level2) changed
  if (type === 'level1' || type === 'level2') {
    for (let i = insertedAt + count; i < result.length; i++) {
      const item = result[i];
      if (detectIdType(item.id) !== 'level3') continue;
      const parts = item.id.split('.');
      const parentL2 = `${parts[0]}.${parts[1]}`;
      const newParentL2 = idMap.get(parentL2);
      if (newParentL2) {
        const newId = `${newParentL2}.${parts[2]}`;
        idMap.set(item.id, newId);
        result[i] = { ...item, id: newId };
      }
    }
  }

  return result;
}


// ─── Calculation Engine ───────────────────────────────────────────────────────

/** Level order for hierarchy comparisons (higher = more senior) */
const LEVEL_ORDER: Record<string, number> = { roman: 5, level1: 4, level2: 3, level3: 2, alpha: 1, empty: 0 };

function getRowLevel(id: string): number {
  return LEVEL_ORDER[isRomanId(id) ? 'roman' : detectIdType(id)] ?? 0;
}

/**
 * For a parent row at parentIndex, collect its direct children.
 * Direct children = rows immediately below with level strictly lower than parent,
 * stopping when we hit a row at the same or higher level.
 * 
 * Parent→child mapping:
 *   roman  → collects level1
 *   level1 → collects level2
 *   level2 → collects level3
 *   level3 → collects alpha
 */
function getDirectChildren(items: ConstructionProgressItem[], parentIndex: number): number[] {
  if (!items || parentIndex < 0 || parentIndex >= items.length) return [];
  const parentId = items[parentIndex]?.id ?? '';
  const parentLevel = getRowLevel(parentId);
  if (parentLevel <= 1) return []; // alpha/empty have no children

  const expectedChildLevel = parentLevel - 1;
  const children: number[] = [];

  for (let i = parentIndex + 1; i < items.length; i++) {
    const rowLevel = getRowLevel(items[i].id);
    if (rowLevel >= parentLevel) break; // same or higher = end of this parent's scope
    if (rowLevel === expectedChildLevel) children.push(i);
  }
  return children;
}

/**
 * Check if a parent row has any qualifying children.
 * If it has none, leave its amount as manually entered.
 */
function hasChildren(items: ConstructionProgressItem[], parentIndex: number): boolean {
  return getDirectChildren(items, parentIndex).length > 0;
}

/**
 * Determines if a row's boQ.amount should be auto-calculated (read-only).
 * True for roman, level1, level2, level3 rows that have at least one child.
 */
/** Check if a specific item's boQ.amount is auto-calculated (read-only). */
function isAutoCalculated(allItems: ConstructionProgressItem[], item: ConstructionProgressItem): boolean {
  const boQ = item.boQ;
  const type = isRomanId(item.id) ? 'roman' : detectIdType(item.id);

  // Bold-empty row: aggregates rows below it
  if (item.isBold && type === 'empty') return true;

  // Has rates → amount = qty×unitRate
  const hasRates = (boQ.materialRate || 0) > 0 ||
    (boQ.laborRate || 0) > 0 ||
    (boQ.unitRate || 0) > 0;
  if (hasRates) return true;

  // Has children → aggregation
  if (type === 'alpha' || type === 'empty') return false;
  const index = allItems.findIndex(i => i === item);
  if (index === -1) return false;
  return hasChildren(allItems, index);
}

/**
 * Calculate amount for a progress period using the same logic as BoQ amount
 */
function calculateProgressAmount(
  qty: number,
  unitRate: number,
  materialRate: number,
  laborRate: number,
  childrenAmounts: number[]
): number {
  // Rule 1: If has rates → qty × unitRate
  if ((materialRate || 0) > 0 || (laborRate || 0) > 0) {
    const calculatedUnitRate = (materialRate || 0) + (laborRate || 0);
    return Math.round((qty || 0) * calculatedUnitRate * 100) / 100;
  }

  if ((unitRate || 0) > 0) {
    return Math.round((qty || 0) * (unitRate || 0) * 100) / 100;
  }

  // Rule 2: If has children → sum children amounts
  if (childrenAmounts.length > 0) {
    return Math.round(childrenAmounts.reduce((acc, amount) => acc + (amount || 0), 0) * 100) / 100;
  }

  // Rule 3: Keep manual (return 0 for new calculation)
  return 0;
}

/**
 * Run a full bottom-up pass to compute all boQ.amounts and progress period amounts.
 *
 * Priority per row:
 *   1. If the row has any rate (materialRate | laborRate | unitRate) > 0
 *      → amount = qty × unitRate  (leaf formula)
 *   2. Else if the row has children
 *      → amount = Σ direct children amounts  (aggregation)
 *   3. Else → keep manually entered amount unchanged
 *
 * Processes bottom-up so children are computed before parents.
 */
function computeAllAmounts(items: ConstructionProgressItem[]): ConstructionProgressItem[] {
  if (!items || items.length === 0) return items ?? [];
  const result = items.map(item => ({
    ...item,
    boQ: { ...item.boQ },
    previousWeek: { ...item.previousWeek },
    thisWeek: { ...item.thisWeek },
    upToThisWeek: { ...item.upToThisWeek },
    remaining: { ...item.remaining },
    nextWeekPlan: { ...item.nextWeekPlan },
    upToNextWeekPlan: { ...item.upToNextWeekPlan }
  }));

  for (let i = result.length - 1; i >= 0; i--) {
    const boQ = result[i].boQ;
    const id = result[i].id;
    const type = isRomanId(id) ? 'roman' : detectIdType(id);
    const isBoldEmpty = result[i].isBold && type === 'empty';

    // Get children for aggregation
    const children = getDirectChildren(result, i);
    const childrenBoQAmounts = children.map(ci => result[ci].boQ.amount || 0);
    const childrenPreviousWeekAmounts = children.map(ci => result[ci].previousWeek.amount || 0);
    const childrenThisWeekAmounts = children.map(ci => result[ci].thisWeek.amount || 0);
    const childrenUpToThisWeekAmounts = children.map(ci => result[ci].upToThisWeek.amount || 0);
    const childrenRemainingAmounts = children.map(ci => result[ci].remaining.amount || 0);
    const childrenNextWeekPlanAmounts = children.map(ci => result[ci].nextWeekPlan.amount || 0);
    const childrenUpToNextWeekPlanAmounts = children.map(ci => result[ci].upToNextWeekPlan.amount || 0);

    // Rule 0.1: Alpha row → sum ALL rows below until next Alpha
    if (type === 'alpha') {
      let boQSum = 0, previousWeekSum = 0, thisWeekSum = 0, upToThisWeekSum = 0;
      let remainingSum = 0, nextWeekPlanSum = 0, upToNextWeekPlanSum = 0;

      for (let j = i + 1; j < result.length; j++) {
        const jId = result[j].id;
        const jType = isRomanId(jId) ? 'roman' : detectIdType(jId);
        if (jType === 'alpha') break; // stop at next Alpha

        boQSum += result[j].boQ.amount || 0;
        previousWeekSum += result[j].previousWeek.amount || 0;
        thisWeekSum += result[j].thisWeek.amount || 0;
        upToThisWeekSum += result[j].upToThisWeek.amount || 0;
        remainingSum += result[j].remaining.amount || 0;
        nextWeekPlanSum += result[j].nextWeekPlan.amount || 0;
        upToNextWeekPlanSum += result[j].upToNextWeekPlan.amount || 0;
      }

      result[i].boQ.amount = Math.round(boQSum * 100) / 100;
      result[i].previousWeek.amount = Math.round(previousWeekSum * 100) / 100;
      result[i].thisWeek.amount = Math.round(thisWeekSum * 100) / 100;
      result[i].upToThisWeek.amount = Math.round(upToThisWeekSum * 100) / 100;
      result[i].remaining.amount = Math.round(remainingSum * 100) / 100;
      result[i].nextWeekPlan.amount = Math.round(nextWeekPlanSum * 100) / 100;
      result[i].upToNextWeekPlan.amount = Math.round(upToNextWeekPlanSum * 100) / 100;

      // Calculate percentages for Alpha rows
      const boQAmount = result[i].boQ.amount || 0;
      result[i].previousWeek.percentage = boQAmount > 0 ? Math.round((result[i].previousWeek.amount / boQAmount) * 100 * 10) / 10 : 0;
      result[i].thisWeek.percentage = boQAmount > 0 ? Math.round((result[i].thisWeek.amount / boQAmount) * 100 * 10) / 10 : 0;
      result[i].upToThisWeek.percentage = boQAmount > 0 ? Math.round((result[i].upToThisWeek.amount / boQAmount) * 100 * 10) / 10 : 0;
      result[i].remaining.percentage = boQAmount > 0 ? Math.round((result[i].remaining.amount / boQAmount) * 100 * 10) / 10 : 0;
      result[i].nextWeekPlan.percentage = boQAmount > 0 ? Math.round((result[i].nextWeekPlan.amount / boQAmount) * 100 * 10) / 10 : 0;
      result[i].upToNextWeekPlan.percentage = boQAmount > 0 ? Math.round((result[i].upToNextWeekPlan.amount / boQAmount) * 100 * 10) / 10 : 0;

      // Alpha rows should preserve their unitRate - don't recalculate from material/labor rates
      continue;
    }

    // Calculate unit rate from material + labor if both exist
    if ((boQ.materialRate || 0) > 0 || (boQ.laborRate || 0) > 0) {
      // Calculate unit rate as sum of material and labor rates
      const calculatedUnitRate = (boQ.materialRate || 0) + (boQ.laborRate || 0);
      result[i].boQ.unitRate = calculatedUnitRate;

      // Rule 1: qty × unitRate for BoQ and individual progress periods only
      result[i].boQ.amount = Math.round((boQ.qty || 0) * calculatedUnitRate * 100) / 100;
      result[i].previousWeek.amount = Math.round((result[i].previousWeek.qty || 0) * calculatedUnitRate * 100) / 100;
      result[i].thisWeek.amount = Math.round((result[i].thisWeek.qty || 0) * calculatedUnitRate * 100) / 100;

      // Calculate cumulative amounts from their components
      result[i].upToThisWeek.amount = Math.round((result[i].previousWeek.amount + result[i].thisWeek.amount) * 100) / 100;
      result[i].upToThisWeek.qty = Math.round(((result[i].previousWeek.qty || 0) + (result[i].thisWeek.qty || 0)) * 100) / 100;
      result[i].remaining.qty = Math.round(((result[i].boQ.qty || 0) - (result[i].upToThisWeek.qty || 0)) * 100) / 100;
      result[i].remaining.amount = Math.round((result[i].boQ.amount - result[i].upToThisWeek.amount) * 100) / 100;
      result[i].nextWeekPlan.amount = Math.round((result[i].nextWeekPlan.qty || 0) * boQ.unitRate * 100) / 100;
      result[i].upToNextWeekPlan.amount = Math.round((result[i].upToThisWeek.amount + result[i].nextWeekPlan.amount) * 100) / 100;
      result[i].upToNextWeekPlan.qty = Math.round(((result[i].upToThisWeek.qty || 0) + (result[i].nextWeekPlan.qty || 0)) * 100) / 100;

      // Calculate percentages for rows with material/labor rates
      const boQAmountMatLabor = result[i].boQ.amount || 0;
      result[i].previousWeek.percentage = boQAmountMatLabor > 0 ? Math.round((result[i].previousWeek.amount / boQAmountMatLabor) * 100 * 10) / 10 : 0;
      result[i].thisWeek.percentage = boQAmountMatLabor > 0 ? Math.round((result[i].thisWeek.amount / boQAmountMatLabor) * 100 * 10) / 10 : 0;
      result[i].upToThisWeek.percentage = boQAmountMatLabor > 0 ? Math.round((result[i].upToThisWeek.amount / boQAmountMatLabor) * 100 * 10) / 10 : 0;
      result[i].remaining.percentage = boQAmountMatLabor > 0 ? Math.round((result[i].remaining.amount / boQAmountMatLabor) * 100 * 10) / 10 : 0;
      result[i].nextWeekPlan.percentage = boQAmountMatLabor > 0 ? Math.round((result[i].nextWeekPlan.amount / boQAmountMatLabor) * 100 * 10) / 10 : 0;
      result[i].upToNextWeekPlan.percentage = boQAmountMatLabor > 0 ? Math.round((result[i].upToNextWeekPlan.amount / boQAmountMatLabor) * 100 * 10) / 10 : 0;

      continue;
    }

    if ((boQ.unitRate || 0) > 0) {
      // Rule 1: qty × unitRate for BoQ and all progress periods
      result[i].boQ.amount = Math.round((boQ.qty || 0) * (boQ.unitRate || 0) * 100) / 100;
      result[i].previousWeek.amount = Math.round((result[i].previousWeek.qty || 0) * (boQ.unitRate || 0) * 100) / 100;
      result[i].thisWeek.amount = Math.round((result[i].thisWeek.qty || 0) * (boQ.unitRate || 0) * 100) / 100;

      // Calculate cumulative amounts from their components
      result[i].upToThisWeek.amount = Math.round((result[i].previousWeek.amount + result[i].thisWeek.amount) * 100) / 100;
      result[i].upToThisWeek.qty = Math.round(((result[i].previousWeek.qty || 0) + (result[i].thisWeek.qty || 0)) * 100) / 100;
      result[i].remaining.qty = Math.round(((result[i].boQ.qty || 0) - (result[i].upToThisWeek.qty || 0)) * 100) / 100;
      result[i].remaining.amount = Math.round((result[i].boQ.amount - result[i].upToThisWeek.amount) * 100) / 100;
      result[i].nextWeekPlan.amount = Math.round((result[i].nextWeekPlan.qty || 0) * (boQ.unitRate || 0) * 100) / 100;
      result[i].upToNextWeekPlan.qty = Math.round(((result[i].upToThisWeek.qty || 0) + (result[i].nextWeekPlan.qty || 0)) * 100) / 100;
      result[i].upToNextWeekPlan.amount = Math.round((result[i].upToThisWeek.amount + result[i].nextWeekPlan.amount) * 100) / 100;

      // Calculate percentages for rows with unitRate
      const boQAmountUnitRate = result[i].boQ.amount || 0;
      result[i].previousWeek.percentage = boQAmountUnitRate > 0 ? Math.round((result[i].previousWeek.amount / boQAmountUnitRate) * 100 * 10) / 10 : 0;
      result[i].thisWeek.percentage = boQAmountUnitRate > 0 ? Math.round((result[i].thisWeek.amount / boQAmountUnitRate) * 100 * 10) / 10 : 0;
      result[i].upToThisWeek.percentage = boQAmountUnitRate > 0 ? Math.round((result[i].upToThisWeek.amount / boQAmountUnitRate) * 100 * 10) / 10 : 0;
      result[i].remaining.percentage = boQAmountUnitRate > 0 ? Math.round((result[i].remaining.amount / boQAmountUnitRate) * 100 * 10) / 10 : 0;
      result[i].nextWeekPlan.percentage = boQAmountUnitRate > 0 ? Math.round((result[i].nextWeekPlan.amount / boQAmountUnitRate) * 100 * 10) / 10 : 0;
      result[i].upToNextWeekPlan.percentage = boQAmountUnitRate > 0 ? Math.round((result[i].upToNextWeekPlan.amount / boQAmountUnitRate) * 100 * 10) / 10 : 0;

      continue;
    }

    // Rule 2: sum children (skip empty — they have no children, but not alpha since alpha now has its own aggregation)
    if (type === 'empty') continue;

    if (children.length === 0) continue; // Rule 3: keep manual

    // Aggregate children amounts for all periods
    result[i].boQ.amount = Math.round(childrenBoQAmounts.reduce((acc, amount) => acc + amount, 0) * 100) / 100;
    result[i].previousWeek.amount = Math.round(childrenPreviousWeekAmounts.reduce((acc, amount) => acc + amount, 0) * 100) / 100;
    result[i].thisWeek.amount = Math.round(childrenThisWeekAmounts.reduce((acc, amount) => acc + amount, 0) * 100) / 100;
    result[i].remaining.qty = Math.round(children.map(ci => (result[ci].boQ.qty || 0) - (result[ci].upToThisWeek.qty || 0)).reduce((acc, qty) => acc + qty, 0) * 100) / 100;
    result[i].upToThisWeek.amount = Math.round(childrenUpToThisWeekAmounts.reduce((acc, amount) => acc + amount, 0) * 100) / 100;
    result[i].upToThisWeek.qty = Math.round(children.map(ci => result[ci].upToThisWeek.qty || 0).reduce((acc, qty) => acc + qty, 0) * 100) / 100;
    result[i].remaining.amount = Math.round(childrenRemainingAmounts.reduce((acc, amount) => acc + amount, 0) * 100) / 100;
    result[i].upToNextWeekPlan.qty = Math.round(children.map(ci => (result[ci].upToThisWeek.qty || 0) + (result[ci].nextWeekPlan.qty || 0)).reduce((acc, qty) => acc + qty, 0) * 100) / 100;
    result[i].nextWeekPlan.amount = Math.round(childrenNextWeekPlanAmounts.reduce((acc, amount) => acc + amount, 0) * 100) / 100;
    result[i].upToNextWeekPlan.amount = Math.round(childrenUpToNextWeekPlanAmounts.reduce((acc, amount) => acc + amount, 0) * 100) / 100;

    // Calculate percentages for rows that aggregate children
    const boQAmountChildren = result[i].boQ.amount || 0;
    result[i].previousWeek.percentage = boQAmountChildren > 0 ? Math.round((result[i].previousWeek.amount / boQAmountChildren) * 100 * 10) / 10 : 0;
    result[i].thisWeek.percentage = boQAmountChildren > 0 ? Math.round((result[i].thisWeek.amount / boQAmountChildren) * 100 * 10) / 10 : 0;
    result[i].upToThisWeek.percentage = boQAmountChildren > 0 ? Math.round((result[i].upToThisWeek.amount / boQAmountChildren) * 100 * 10) / 10 : 0;
    result[i].remaining.percentage = boQAmountChildren > 0 ? Math.round((result[i].remaining.amount / boQAmountChildren) * 100 * 10) / 10 : 0;
    result[i].nextWeekPlan.percentage = boQAmountChildren > 0 ? Math.round((result[i].nextWeekPlan.amount / boQAmountChildren) * 100 * 10) / 10 : 0;
    result[i].upToNextWeekPlan.percentage = boQAmountChildren > 0 ? Math.round((result[i].upToNextWeekPlan.amount / boQAmountChildren) * 100 * 10) / 10 : 0;
  }

  return result;
}

/**
 * After deleting a row at `startIndex`, renumber all same-type siblings from
 * that position onward, then cascade to children if needed.
 * Works for all types: roman, level1, level2, level3, alpha.
 */
function renumberFromIndex(
  items: ConstructionProgressItem[],
  startIndex: number,
  type: IdType
): ConstructionProgressItem[] {
  if (type === 'empty') return items;
  const result = [...items];
  const idMap = new Map<string, string>();

  for (let i = startIndex; i < result.length; i++) {
    const item = result[i];
    const itemType = isRomanId(item.id) ? 'roman' : detectIdType(item.id);

    // Stop at a higher-level boundary (same logic as findLastSibling)
    if (type === 'level1' && isRomanId(item.id)) break;
    if (type === 'level2' && (itemType === 'level1' || isRomanId(item.id))) break;
    if (type === 'level3' && (itemType === 'level2' || itemType === 'level1' || isRomanId(item.id))) break;
    if (type === 'alpha' && (itemType === 'level3' || itemType === 'level2' || itemType === 'level1' || isRomanId(item.id))) break;

    const currentType = type === 'roman' ? (isRomanId(item.id) ? 'roman' : null) : itemType;
    if (currentType !== type) continue;

    // Find the previous sibling of the same type to increment from
    const prevSibling = findLastSibling(result, i - 1, type);
    const newId = prevSibling
      ? incrementId(prevSibling, type)
      : computeNextId(result, i - 1, type);

    if (newId !== item.id) {
      idMap.set(item.id, newId);
      result[i] = { ...item, id: newId };
    }
  }

  if (idMap.size === 0) return result;

  // Cascade: fix children of any renamed parents
  for (let i = startIndex; i < result.length; i++) {
    const item = result[i];
    const itemType = detectIdType(item.id);

    if (itemType === 'level2' && type === 'level1') {
      const parts = item.id.split('.');
      const newParent = idMap.get(parts[0]);
      if (newParent) {
        const newId = `${newParent}.${parts[1]}`;
        idMap.set(item.id, newId);
        result[i] = { ...item, id: newId };
      }
    }
    if (itemType === 'level3') {
      const parts = item.id.split('.');
      const parentL2 = `${parts[0]}.${parts[1]}`;
      const newParentL2 = idMap.get(parentL2);
      if (newParentL2) {
        const newId = `${newParentL2}.${parts[2]}`;
        idMap.set(item.id, newId);
        result[i] = { ...item, id: newId };
      } else if (type === 'level1') {
        const newParentL1 = idMap.get(parts[0]);
        if (newParentL1) {
          const newId = `${newParentL1}.${parts[1]}.${parts[2]}`;
          idMap.set(item.id, newId);
          result[i] = { ...item, id: newId };
        }
      }
    }
  }

  return result;
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const defaultData: ConstructionProgressData = {
  projectInfo: {
    project: "Renovation Works of The Project for Building Capacity and Establishing Enabling Environment in ICT Majors of TVET in Cambodia",
    subtitle: "Battambang Institute of Technology (BIT) - A-TYPE Renovation",
    date: "13-Mar-26",
    revision: "Rev.01"
  },
  items: [
    {
      id: "I", scopeOfWorks: "Investigation Phase", detailDescription: "", unit: "Ls",
      boQ: { qty: 1, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 1, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 1, amount: 1, percentage: 100 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 1, amount: 1, percentage: 100 },
      isBold: true
    },
    {
      id: "1", scopeOfWorks: "Site survey", detailDescription: "", unit: "Ls",
      boQ: { qty: 1, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 1, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 1, amount: 1, percentage: 100 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 1, amount: 1, percentage: 100 },

    },
    {
      id: "2", scopeOfWorks: "Drawing (Existing & Construction)", detailDescription: "", unit: "Ls",
      boQ: { qty: 1.00, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 1.00, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 1.00, amount: 0, percentage: 100 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 1.00, amount: 0, percentage: 100 }
    },
    {
      id: "3", scopeOfWorks: "BoQ", detailDescription: "", unit: "Ls",
      boQ: { qty: 1.00, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 1.00, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 1.00, amount: 0, percentage: 100 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 1.00, amount: 0, percentage: 100 }
    },
    {
      id: "II", scopeOfWorks: "Construction Phase", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      isBold: true
    },
    {
      id: "1", scopeOfWorks: "Battambang Province", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "1.1", scopeOfWorks: "Battambang Institute of Technology (BIT)", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      isBold: true
    },
    {
      id: "1.1.1", scopeOfWorks: "A-TYPE", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      isBold: true
    },
    {
      id: "A", scopeOfWorks: "Architectural Works", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      isBold: true
    },
    {
      id: "", scopeOfWorks: "Floor Finish", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "F1", detailDescription: "F1 - Cleaning the existing tiles with repairing joint including the existing base", unit: "Sq.m",
      boQ: { qty: 62, materialRate: 2.6, laborRate: 1.8, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 10, amount: 0, percentage: 0 },
      thisWeek: { qty: 10, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 5, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "Wall Finish", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "W1 ", detailDescription: "- Removing of existing paint and cleaning with repairing of existing mortar finish", unit: "Sq.m",
      boQ: { qty: 82.4, materialRate: 2.8, laborRate: 1.8, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "W2 ", detailDescription: "- Interior wall paint (Emulsion paint with smooth surface roller paint, stucco paint cream white or designated color, 2 Coat)", unit: "Sq.m",
      boQ: { qty: 53.9, materialRate: 5, laborRate: 4, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "W5 ", detailDescription: "- Acoustic wood panel (on existing wall) using nail gun and accessories", unit: "Sq.m",
      boQ: { qty: 61.06, materialRate: 41.8, laborRate: 12.9, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "W6 ", detailDescription: "- External wall paint (Emulsion paint with smooth surface roller paint, existing color or designated color, 2 Coat)", unit: "Sq.m",
      boQ: { qty: 36, materialRate: 4.3, laborRate: 3.6, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "S2 ", detailDescription: "- MC Wood Molding 20x50mm with laminate finishing", unit: "m",
      boQ: { qty: 70, materialRate: 7.5, laborRate: 4.5, unitRate: 0, amount: 0 }, remark: "New items proposes for the top trim of W5 and around WD1",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "Ceiling Works", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "C2 ", detailDescription: "- Acoustic tax (300mm x 600mm, THK 6) on gypsum board (THK 9.5, 1 ply) with light-weight steel ceiling frame", unit: "Sq.m",
      boQ: { qty: 62, materialRate: 22.6, laborRate: 7.6, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "Door Works", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "D1", detailDescription: "-  Replacing the existing door with new steel door including door frame (W: 1,000 x H: 2,100) certificated KS (Korean Standard) with 1 set of hardware, door lock, door closer and door stopper ", unit: "Set",
      boQ: { qty: 0, materialRate: 428, laborRate: 71.2, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "D1'", detailDescription: "- Repaint the existing double door and install a new lock.", unit: "Set",
      boQ: { qty: 1, materialRate: 120, laborRate: 35, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "Window Works", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "WD1", detailDescription: " - Replacing the existing window with new PVC window + THK 5 tempered glass", unit: "Sq.m",
      boQ: { qty: 0, materialRate: 166.4, laborRate: 30, unitRate: 0, amount: 0 }, remark: "The existing window is good condition we propose to reuse and repainting",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "WD2 ", detailDescription: " - Paint on window frame and security bar (Cleaning the existing window frame and security bar / Removing the existing paint and re-paint with new paint, oil paint for steel, white or designated color)", unit: "Sq.m",
      boQ: { qty: 10, materialRate: 11.30, laborRate: 5.70, unitRate: 0, amount: 0 }, remark: "The existing security bars are in good condition, we propose repainting",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
    },
    {
      id: "", scopeOfWorks: "WD3 ", detailDescription: "- Steel Security Bar: Size to cover the existing window opening including oil paint (Korean traditional window lattice pattern)", unit: "Sq.m",
      boQ: { qty: 0, materialRate: 38.70, laborRate: 11.70, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "B", scopeOfWorks: "Electrical Works", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      isBold: true
    },
    {
      id: "", scopeOfWorks: "Air Conditioner", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "AC ", detailDescription: "Installation wall mounted air conditioner (2.5HP each) with accessories", unit: "LS",
      boQ: { qty: 1.00, materialRate: 2295.50, laborRate: 98.50, unitRate: 0, amount: 2394.00 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 1.00, amount: 0, percentage: 100 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "Electricity & Communication", detailDescription: "", unit: "",
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "E1", detailDescription: "Replacing existing lighting fixture with new LED (300 x 1,200, 50w)", unit: "LS",
      boQ: { qty: 1.00, materialRate: 988.50, laborRate: 289.10, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 1.00, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "E2", detailDescription: "Install DB Panel, Power socket, grounding and accessories", unit: "LS",
      boQ: { qty: 1.00, materialRate: 1369.80, laborRate: 323.20, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 1.00, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },
    {
      id: "", scopeOfWorks: "E3", detailDescription: "Install Rack Cabinet, Data socket, Network switch, and Testing", unit: "LS",
      boQ: { qty: 1.00, materialRate: 1612.90, laborRate: 350.20, unitRate: 0, amount: 0 }, remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 1.00, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    },

  ]
};

// ─── ID Type Config ───────────────────────────────────────────────────────────

const ID_TYPE_CONFIG: { type: IdType; label: string; example: string; color: string }[] = [
  { type: 'roman', label: 'Section', example: 'I, II, III', color: 'bg-[#D0CECE]' },
  { type: 'level1', label: 'Level 1', example: '1, 2, 3', color: 'bg-[#ACB9CA]' },
  { type: 'level2', label: 'Level 2', example: '1.1, 1.2', color: 'bg-[#DDEBF7]' },
  { type: 'level3', label: 'Level 3', example: '1.1.1, 1.1.2', color: 'bg-[#E7E6E6]' },
  { type: 'alpha', label: 'Alpha', example: 'A, B, C, D', color: 'bg-white' },
  { type: 'empty', label: 'No ID', example: '(blank)', color: 'bg-white' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const WeeklyReportConstructionProgress: React.FC<WeeklyReportConstructionProgressProps> = ({
  data, onDataChange, reportId
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [items, setItems] = useState<ConstructionProgressItem[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [rowBackgrounds, setRowBackgrounds] = useState<Record<number, string>>({});

  // ── Sample Data Loading ──
  const loadSampleData = () => {
    const computedItems = computeAllAmounts(defaultData.items);
    setItems(computedItems);
    setLocalProjectInfo(defaultData.projectInfo);
    if (onDataChange) {
      onDataChange({ ...defaultData, items: computedItems });
    }
  };

  // ── Add Rows Popup State ──
  const [showAddRows, setShowAddRows] = useState(false);
  // 'after' = insert after the row, 'before' = insert above the row
  const [insertMode, setInsertMode] = useState<'after' | 'before'>('after');
  const [addRowsType, setAddRowsType] = useState<IdType>('level1');
  const [addRowsCount, setAddRowsCount] = useState(1);
  // -1 means "at end"; otherwise index to insert after
  const [addRowsAfter, setAddRowsAfter] = useState<number>(-1);

  const currentData = data || defaultData;

  useEffect(() => {
    if (currentData.items?.length) {
      const computed = computeAllAmounts(currentData.items);
      setItems(computed);

      // Auto-clear backgrounds for Alpha rows to ensure they always have white background
      const alphaIndices: number[] = [];
      computed.forEach((item, index) => {
        if (detectIdType(item.id) === 'alpha') {
          alphaIndices.push(index);
        }
      });

      if (alphaIndices.length > 0) {
        setRowBackgrounds(prev => {
          const updated = { ...prev };
          alphaIndices.forEach(idx => delete updated[idx]);
          return updated;
        });
      }
    } else {
      setItems([]);
    }
  }, [currentData.items]);

  const [localProjectInfo, setLocalProjectInfo] = useState(currentData.projectInfo);
  useEffect(() => { if (data?.projectInfo) setLocalProjectInfo(data.projectInfo); }, [data?.projectInfo]);

  // Close row-action dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.dropdown-button') && !t.closest('.fixed-dropdown')) {
        setActiveDropdown(null); setDropdownPosition(null);
      }
    };
    if (activeDropdown !== null) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const handleProjectInfoChange = (field: keyof typeof localProjectInfo, value: string) => {
    const updated = { ...localProjectInfo, [field]: value };
    setLocalProjectInfo(updated);
    if (onDataChange) onDataChange({ ...currentData, projectInfo: updated });
  };

  const filteredItems = useMemo(() => {
    const src = items.length > 0 ? items : currentData.items;
    if (!searchTerm) return src;
    return src.filter(i =>
      i.scopeOfWorks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.detailDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, currentData.items, searchTerm]);

  // Round to 2dp then format with comma thousands separator
  const formatNum = (v: number): string => {
    const rounded = Math.round(v * 100) / 100;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  };
  const formatCurrency = formatNum;

  const getDefaultRowBg = (id: string) => {
    if (!id || id.trim() === '') return 'bg-white';
    if (/^[IVXLCDM]+$/.test(id)) return 'bg-[#D0CECE]';
    if (/^\d+$/.test(id)) return 'bg-[#ACB9CA]';
    if (/^\d+\.\d+\.\d+$/.test(id)) return 'bg-[#E7E6E6]';
    if (/^\d+\.\d+$/.test(id)) return 'bg-[#DDEBF7]';
    return 'bg-white';
  };

  const getRowBg = (item: ConstructionProgressItem, rowIndex: number) => {
    // Check if any percentage exceeds 100%
    const hasOver100Percentage =
      item.previousWeek.percentage > 100 ||
      item.thisWeek.percentage > 100 ||
      item.upToThisWeek.percentage > 100 ||
      item.remaining.percentage > 100 ||
      item.nextWeekPlan.percentage > 100 ||
      item.upToNextWeekPlan.percentage > 100;

    // If any percentage is over 100%, return red background
    if (hasOver100Percentage) {
      return 'bg-red-100';
    }

    return rowBackgrounds[rowIndex] ?? getDefaultRowBg(item.id);
  };

  // ── Cell Editing ──
  const ALL_COLUMNS = [
    'id', 'scopeOfWorks', 'detailDescription', 'unit',
    'boQ.qty', 'boQ.materialRate', 'boQ.laborRate', 'boQ.unitRate', 'boQ.amount', 'remark',
    'previousWeek.qty', 'previousWeek.amount', 'previousWeek.percentage',
    'thisWeek.qty', 'thisWeek.amount', 'thisWeek.percentage',
    'upToThisWeek.qty', 'upToThisWeek.amount', 'upToThisWeek.percentage',
    'remaining.qty', 'remaining.amount', 'remaining.percentage',
    'nextWeekPlan.qty', 'nextWeekPlan.amount', 'nextWeekPlan.percentage',
    'upToNextWeekPlan.qty', 'upToNextWeekPlan.amount', 'upToNextWeekPlan.percentage'
  ];

  const getItemValue = (item: ConstructionProgressItem, field: string) => {
    const [main, sub] = field.split('.');
    const val = item[main as keyof ConstructionProgressItem];
    return sub && typeof val === 'object' && val !== null ? (val as any)[sub] ?? '' : val ?? '';
  };

  const setItemValue = (item: ConstructionProgressItem, field: string, value: any) => {
    const [main, sub] = field.split('.');
    const copy = { ...item };
    if (sub) {
      (copy[main as keyof ConstructionProgressItem] as any) = {
        ...(copy[main as keyof ConstructionProgressItem] as any),
        [sub]: value
      };
    } else {
      (copy[main as keyof ConstructionProgressItem] as any) = value;
    }
    return copy;
  };

  const startEditing = (rowIndex: number, field: string) => {
    if (rowIndex < 0 || rowIndex >= filteredItems.length) return;
    const value = getItemValue(filteredItems[rowIndex], field);
    setEditingCell({ rowIndex, field });
    setEditValue(String(value));
    setTimeout(() => {
      const input = inputRefs.current.get(`${rowIndex}-${field}`);
      if (input) { input.focus(); input.select(); }
    }, 0);
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const { rowIndex, field } = editingCell;
    const item = filteredItems[rowIndex];
    let val: any = editValue;
    if (field.includes('qty') || field.includes('Rate') || field.includes('amount') || field.includes('percentage')) {
      val = parseFloat(editValue.replace(/,/g, '')) || 0;
    }
    const updated = setItemValue(item, field, val);
    // If mat or labor rate changed → sync unitRate = mat+lab (unless user overrode it)
    // If unitRate edited directly → keep as override (computeAllAmounts will preserve it)
    let finalItem = updated;
    if (field === 'boQ.materialRate' || field === 'boQ.laborRate') {
      const mat = field === 'boQ.materialRate' ? val : updated.boQ.materialRate;
      const lab = field === 'boQ.laborRate' ? val : updated.boQ.laborRate;
      finalItem = { ...updated, boQ: { ...updated.boQ, unitRate: (mat || 0) + (lab || 0) } };
    }
    const newItems = [...items];
    newItems[items.findIndex(i => i.id === item.id && i.scopeOfWorks === item.scopeOfWorks)] = finalItem;
    const computed = computeAllAmounts(newItems);
    setItems(computed);
    if (onDataChange) onDataChange({ ...currentData, items: computed });
    setEditingCell(null); setEditValue('');
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };

  const navigate = (dir: 'right' | 'left' | 'up' | 'down' | 'next-row') => {
    if (!editingCell) return;
    const { rowIndex, field } = editingCell;
    const ci = ALL_COLUMNS.indexOf(field);
    let nc = ci, nr = rowIndex;
    if (dir === 'right') nc = Math.min(ci + 1, ALL_COLUMNS.length - 1);
    else if (dir === 'left') nc = Math.max(ci - 1, 0);
    else if (dir === 'down') nr = Math.min(rowIndex + 1, filteredItems.length - 1);
    else if (dir === 'up') nr = Math.max(rowIndex - 1, 0);
    else if (dir === 'next-row') {
      if (ci === ALL_COLUMNS.length - 1) { nc = 0; nr = Math.min(rowIndex + 1, filteredItems.length - 1); }
      else nc = ci + 1;
    }
    saveEdit();
    setTimeout(() => startEditing(nr, ALL_COLUMNS[nc]), 0);
  };

  const toggleBold = (rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= filteredItems.length) return;
    const item = filteredItems[rowIndex];
    const newItems = [...items];
    const idx = items.findIndex(i => i === item);
    if (idx === -1) return;
    newItems[idx] = { ...item, isBold: !item.isBold };
    const computed = computeAllAmounts(newItems);
    setItems(computed);
    if (onDataChange) onDataChange({ ...currentData, items: computed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, () => void> = {
      'Enter': () => { e.preventDefault(); navigate('next-row'); },
      'Tab': () => { e.preventDefault(); navigate(e.shiftKey ? 'left' : 'right'); },
      'ArrowRight': () => { e.preventDefault(); navigate('right'); },
      'ArrowLeft': () => { e.preventDefault(); navigate('left'); },
      'ArrowDown': () => { e.preventDefault(); navigate('down'); },
      'ArrowUp': () => { e.preventDefault(); navigate('up'); },
      'Escape': () => { e.preventDefault(); cancelEdit(); },
      'b': () => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); if (editingCell) toggleBold(editingCell.rowIndex); } },
    };
    map[e.key]?.();
  };

  // ── Smart Add Rows ──

  // Preview IDs — simulate one-by-one insertions into a temp list
  const previewIds = useMemo(() => {
    const insertAfterIndex = addRowsAfter === -1 ? items.length - 1 : addRowsAfter;
    const ep = { qty: 0, amount: 0, percentage: 0 };
    const blank = (id: string): ConstructionProgressItem => ({
      id, scopeOfWorks: '', detailDescription: '', unit: '',
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: '',
      previousWeek: { ...ep }, thisWeek: { ...ep }, upToThisWeek: { ...ep },
      remaining: { ...ep }, nextWeekPlan: { ...ep }, upToNextWeekPlan: { ...ep },
      isBold: detectIdType(id) === 'alpha' || detectIdType(id) === 'level1' || detectIdType(id) === 'level2' || detectIdType(id) === 'level3' || isRomanId(id)
    });
    const ids: string[] = [];
    const tempItems = [...items];
    let cursor = insertAfterIndex;
    for (let i = 0; i < Math.min(addRowsCount, 50); i++) {
      const id = computeNextId(tempItems, cursor, addRowsType);
      ids.push(id);
      tempItems.splice(cursor + 1, 0, blank(id));
      cursor++;
    }
    return ids;
  }, [addRowsType, addRowsCount, addRowsAfter, items]);

  // Open modal pre-filled to insert relative to a specific row
  const openInsertModal = (rowIndex: number, mode: 'after' | 'before') => {
    setInsertMode(mode);
    setAddRowsAfter(mode === 'after' ? rowIndex : rowIndex - 1);
    setAddRowsCount(1);
    // Auto-detect type from the clicked row to pre-select the likely type
    const clickedItem = items[rowIndex];
    if (clickedItem) {
      const t = detectIdType(clickedItem.id);
      const resolvedType: IdType = isRomanId(clickedItem.id) ? 'roman' : (t === 'empty' ? 'level1' : t);
      setAddRowsType(resolvedType);
    }
    setDropdownPosition(null);
    setShowAddRows(true);
  };

  const confirmAddRows = () => {
    const insertAfterIndex = addRowsAfter === -1 ? items.length - 1 : addRowsAfter;
    const emptyProgress = { qty: 0, amount: 0, percentage: 0 };
    const newRows: ConstructionProgressItem[] = previewIds.map((id) => ({
      id,
      scopeOfWorks: '',
      detailDescription: '',
      unit: '',
      boQ: {
        qty: 0,
        materialRate: 0,
        laborRate: 0,
        unitRate: 0,
        amount: 0,
      },
      remark: '',
      previousWeek: { ...emptyProgress },
      thisWeek: { ...emptyProgress },
      upToThisWeek: { ...emptyProgress },
      remaining: { ...emptyProgress },
      nextWeekPlan: { ...emptyProgress },
      upToNextWeekPlan: { ...emptyProgress },
      isBold: detectIdType(id) === 'alpha' || detectIdType(id) === 'level1' || detectIdType(id) === 'level2' || detectIdType(id) === 'level3' || isRomanId(id)
    }));

    let newItems = [...items];
    newItems.splice(insertAfterIndex + 1, 0, ...newRows);

    // Cascade renumber below
    newItems = renumberBelow(newItems, insertAfterIndex + 1, addRowsCount, addRowsType);

    const computedItems = computeAllAmounts(newItems);
    setItems(computedItems);
    if (onDataChange) onDataChange({ ...currentData, items: computedItems });
    setShowAddRows(false);
    setTimeout(() => startEditing(insertAfterIndex + 1, 'scopeOfWorks'), 0);

    // Clear backgrounds for any new Alpha rows
    const newAlphaIndices: number[] = [];
    for (let i = insertAfterIndex + 1; i <= insertAfterIndex + addRowsCount; i++) {
      const itemType = detectIdType(computedItems[i].id);
      console.log(`Row ${i}: ID="${computedItems[i].id}", Type="${itemType}", isAlpha=${itemType === 'alpha'}`);
      if (itemType === 'alpha') {
        newAlphaIndices.push(i);
      }
    }

    if (newAlphaIndices.length > 0) {
      console.log('Clearing backgrounds for Alpha rows:', newAlphaIndices);
      setRowBackgrounds(prev => {
        const updated = { ...prev };
        newAlphaIndices.forEach(idx => delete updated[idx]);
        return updated;
      });
    }
  };

  // ── Row Actions ──
  const backgroundColorOptions = [
    { name: 'White', value: 'bg-white', class: 'bg-white border border-gray-300' },
    { name: 'Gray', value: 'bg-gray-100', class: 'bg-gray-100' },
    { name: 'Blue', value: 'bg-blue-50', class: 'bg-blue-50' },
    { name: 'Green', value: 'bg-green-50', class: 'bg-green-50' },
    { name: 'Yellow', value: 'bg-yellow-50', class: 'bg-yellow-50' },
    { name: 'Red', value: 'bg-red-50', class: 'bg-red-50' },
    { name: 'Purple', value: 'bg-purple-50', class: 'bg-purple-50' },
    { name: 'Orange', value: 'bg-orange-50', class: 'bg-orange-50' }
  ];

  const handleDropdownToggle = (rowIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (activeDropdown === rowIndex) { setActiveDropdown(null); setDropdownPosition(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 2, left: rect.right - 160 + 2 });
    setActiveDropdown(rowIndex);
  };

  const deleteRow = (rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= items.length) return;

    // Detect the type of the row being deleted so we can renumber its siblings
    const deletedItem = items[rowIndex];
    const deletedType: IdType = isRomanId(deletedItem.id)
      ? 'roman'
      : detectIdType(deletedItem.id);

    // Remove the row first
    const filtered = items.filter((_, i) => i !== rowIndex);

    // Renumber siblings below the deletion point (insertedAt = rowIndex, count = 0 means
    // we pass rowIndex as the first affected position with count=0 sentinel —
    // renumberBelow expects insertedAt+count as start, so pass rowIndex-1, count=0... 
    // easier: just re-run renumberBelow with insertedAt=rowIndex, count=0 by
    // treating the deletion point as if 0 new rows were inserted there)
    let renumbered = filtered;
    if (deletedType !== 'empty') {
      // renumberBelow scans from insertedAt+count onward.
      // After deletion, the row that was at rowIndex+1 is now at rowIndex.
      // So pass insertedAt = rowIndex-1, count = 0 → start = rowIndex-1+0 = rowIndex-1
      // But renumberBelow skips inserted rows (count=0 means none inserted).
      // Simplest: pass insertedAt = rowIndex - 1, count = 0.
      // renumberBelow iterates from insertedAt+count = rowIndex-1+0... 
      // Actually renumberBelow starts at insertedAt+count so we need:
      // insertedAt + count = rowIndex  →  insertedAt = rowIndex, count = 0
      // but it loops from insertedAt+count meaning it starts AT rowIndex.
      // Let's just call it with insertedAt=rowIndex-1, count=1 on the filtered array
      // but with 0 "new" rows — i.e. a no-op insert — to trigger renumbering from rowIndex.
      // The cleanest: call renumberBelow(filtered, rowIndex - 1, 0, type) where
      // the loop starts at rowIndex - 1 + 0 = rowIndex - 1... not right either.
      // 
      // Real fix: export a renumberFrom(items, startIndex, type) that renumbers
      // all same-type siblings from startIndex onward.
      renumbered = renumberFromIndex(filtered, rowIndex, deletedType);
    }

    const computed = computeAllAmounts(renumbered);
    setItems(computed);
    if (onDataChange) onDataChange({ ...currentData, items: computed });
    if (editingCell?.rowIndex === rowIndex) { setEditingCell(null); setEditValue(''); }
    setRowBackgrounds(prev => { const n = { ...prev }; delete n[rowIndex]; return n; });
    setActiveDropdown(null); setDropdownPosition(null);
  };

  const renderCell = (item: ConstructionProgressItem, rowIndex: number, field: string) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === field;
    const value = getItemValue(item, field);
    const key = `${rowIndex}-${field}`;
    const isText = ['scopeOfWorks', 'detailDescription', 'remark'].includes(field);

    // Determine read-only state:
    // boQ.amount is read-only for auto-calculated parent rows
    // boQ.unitRate is always read-only (derived from materialRate + laborRate)
    // All progress period amounts are read-only when auto-calculated
    const isBoQAmount = field === 'boQ.amount';
    const isUnitRate = field === 'boQ.unitRate';
    const isProgressAmount = field.includes('.amount') && !field.startsWith('boQ.');
    const isReadOnly = (isBoQAmount || isProgressAmount) && isAutoCalculated(items, item);

    if (isEditing) {
      return (
        <Input
          ref={(el) => { if (el) inputRefs.current.set(key, el); }}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className={isText ? 'w-full text-left' : 'w-auto text-center min-w-[40px]'}
          inputSize="sm"
          showIndicator={false}
          style={{ width: isText ? '100%' : `${Math.max(40, editValue.length * 8 + 16)}px` }}
        />
      );
    }

    let display: any = value;
    if (field.includes('materialRate') || field.includes('laborRate') || field.includes('qty') || field.includes('unitRate')) {
      display = (typeof value === 'number' && value > 0) ? formatNum(value) : '-';
    } else if (field.includes('amount')) {
      display = (typeof value === 'number' && value > 0) ? formatCurrency(value) : '-';
    } else if (field.includes('percentage')) {
      display = (typeof value === 'number' && value > 0) ? `${value}%` : '-';

      // For percentage fields, add background color based on value
      const percentageValue = typeof value === 'number' ? value : 0;
      const bgColorClass = percentageValue === 100
        ? 'bg-green-200 dark:bg-green-400/70'
        : 'bg-yellow-200 dark:bg-yellow-400/70';
      const textColorClass = percentageValue === 100
        ? 'text-green-800 dark:text-green-300 font-semibold'
        : 'text-yellow-800 dark:text-yellow-300';

      if (isEditing) {
        return (
          <div className="relative w-full">
            <div
              className={`absolute inset-0 rounded transition-all duration-300 ${bgColorClass}`}
              style={{ width: `${Math.min(percentageValue, 100)}%` }}
            />
            <Input
              ref={(el) => { if (el) inputRefs.current.set(key, el); }}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              className={`relative bg-transparent z-10 dark:text-foreground text-center w-full px-1 py-0.5 text-sm ${textColorClass}`}
              inputSize="sm"
              showIndicator={false}
              style={{ border: 'none', outline: 'none' }}
            />
          </div>
        );
      }

      if (isReadOnly) {
        return (
          <div className="relative w-full">
            <div
              className={`absolute inset-0 rounded transition-all duration-300 ${bgColorClass}`}
              style={{ width: `${Math.min(percentageValue, 100)}%` }}
            />
            <div
              className={`relative bg-transparent z-10 px-1 py-0.5 rounded text-sm text-center whitespace-nowrap select-none cursor-not-allowed ${textColorClass}`}
              title="Auto-calculated from children"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {(() => {
                const b = item.boQ;
                const hr = (b.materialRate || 0) > 0 || (b.laborRate || 0) > 0 || (b.unitRate || 0) > 0;
                const isBoldEmptyRow = item.isBold && (detectIdType(item.id) === 'empty' || item.id.trim() === '');
                if (hr) return <span className="mr-0.5 text-blue-300 text-xs" title="qty × unit rate"></span>;
                if (isBoldEmptyRow) return <span className="mr-0.5 text-slate-600 font-bold" title="Bold-empty sum"></span>;
                return <span className="mr-0.5 text-slate-400" title="Auto-sum from children"></span>;
              })()}
              {display}
            </div>
          </div>
        );
      }

      return (
        <div className="relative w-full">
          <div
            className={`absolute inset-0 rounded transition-all duration-300 ${bgColorClass}`}
            style={{ width: `${Math.min(percentageValue, 100)}%` }}
          />
          <div
            onClick={() => startEditing(rowIndex, field)}
            className={`relative bg-transparent z-10 cursor-pointer hover:bg-blue-50/50 rounded text-sm text-center whitespace-nowrap px-1 py-0.5 ${textColorClass}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {display}
          </div>
        </div>
      );
    }

    if (isReadOnly) {
      return (
        <div
          className="px-1 py-0.5 rounded text-sm text-center whitespace-nowrap select-none bg-slate-100 text-slate-500 cursor-not-allowed"
          title="Auto-calculated from children"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {(() => {
            const b = item.boQ;
            const hr = (b.materialRate || 0) > 0 || (b.laborRate || 0) > 0 || (b.unitRate || 0) > 0;
            const isBoldEmptyRow = item.isBold && (detectIdType(item.id) === 'empty' || item.id.trim() === '');
            if (hr) return <span className="mr-0.5 text-blue-300 text-xs" title="qty × unit rate"></span>;
            if (isBoldEmptyRow) return <span className="mr-0.5 text-slate-600 font-bold" title="Bold-empty sum"></span>;
            return <span className="mr-0.5 text-slate-400" title="Auto-sum from children"></span>;
          })()}
          {display}
        </div>
      );
    }

    // unitRate: editable + amber hint showing mat+lab relationship
    if (isUnitRate && !isEditing) {
      const computedRate = (item.boQ.materialRate || 0) + (item.boQ.laborRate || 0);
      const isOverridden = Math.abs((item.boQ.unitRate || 0) - computedRate) > 0.001;
      return (
        <div
          onClick={() => startEditing(rowIndex, field)}
          className={`px-1 py-0.5 cursor-pointer rounded text-sm text-center whitespace-nowrap
            ${isOverridden ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
          title={isOverridden ? `Overridden (Mat+Lab = ${formatNum(computedRate)})` : 'Unit Rate = Mat. Rate + Labor Rate — click to override'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isOverridden && <span className="mr-0.5 text-xs">✎</span>}
          {display}
        </div>
      );
    }

    return (
      <div
        onClick={() => startEditing(rowIndex, field)}
        className={`px-1 py-0.5 cursor-pointer hover:bg-blue-50 rounded text-sm ${isText ? 'text-left whitespace-normal break-words' : 'text-center whitespace-nowrap'}`}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        {display}
      </div>
    );
  };

  // ── Render ──
  return (
    <div className="flex flex-col bg-blue-50 font-sans text-slate-900">
      <div className="p-6 lg:px-12 flex flex-col">

        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex-shrink-0">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project</p>
              <input type="text" className="w-full text-slate-800 font-semibold bg-transparent border-slate-300 focus:border-primary focus:outline-none"
                value={localProjectInfo.project} onChange={(e) => handleProjectInfoChange('project', e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtitle</p>
              <input type="text" className="w-full text-slate-600 bg-transparent border-slate-300 focus:border-primary focus:outline-none"
                value={localProjectInfo.subtitle} onChange={(e) => handleProjectInfoChange('subtitle', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-between items-center mt-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</p>
              <input type="date" className="text-slate-800 bg-transparent cursor-pointer"
                value={localProjectInfo.date} onChange={(e) => handleProjectInfoChange('date', e.target.value)} />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revision</p>
              <input type="text" className="text-center text-xs font-medium bg-primary/10 text-primary rounded px-2.5 py-0.5 border border-primary/20 focus:outline-none"
                value={localProjectInfo.revision} onChange={(e) => handleProjectInfoChange('revision', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 flex-shrink-0">
          <input
            className="flex-1 pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
            placeholder="Search scope of works or description..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={loadSampleData}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
          >
            Load Sample Data
          </button>
          <button
            onClick={() => { setInsertMode('after'); setAddRowsAfter(-1); setAddRowsCount(1); setShowAddRows(true); }}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Rows
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="overflow-auto max-h-[600px] relative">
              <style>{`
                .sticky-col { 
                  position: sticky; 
                  z-index: 15; 
                  background-color: white; 
                  border-right: 1px solid rgb(226 232 240);
                }
                .sticky-col:nth-child(1) { left: 0px; }
                .sticky-col:nth-child(2) { left: 95px; }

                /* First header row sticks at top */
                thead tr:nth-child(1) th {
                  position: sticky;
                  top: 0;
                  z-index: 20;
                  background-color: rgb(52 73 94);
                }

                /* Second header row sticks BELOW the first row (first row is ~38px tall) */
                thead tr:nth-child(2) th {
                  position: sticky;
                  top: 38px;
                  z-index: 20;
                  background-color: rgb(52 73 94);
                }

                /* Header corner cells that are also horizontally sticky */
                thead tr:nth-child(1) th:nth-child(1) {
                  left: 0px;
                  z-index: 40;
                }
                thead tr:nth-child(1) th:nth-child(2) {
                  left: 95px;
                  z-index: 40;
                }
              `}</style>
              <table ref={tableRef} className="text-sm text-left border-collapse" style={{ tableLayout: 'fixed', minWidth: 'max-content' }}>
                <colgroup>
                  <col style={{ width: '95px' }} /><col style={{ width: '250px' }} /><col style={{ width: '301px' }} />
                  <col style={{ width: '52px' }} /><col style={{ width: '57px' }} /><col style={{ width: '77px' }} />
                  <col style={{ width: '77px' }} /><col style={{ width: '77px' }} /><col style={{ width: '112px' }} />
                  <col style={{ width: '203px' }} /><col style={{ width: '57px' }} />
                  <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
                  <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
                  <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
                  <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
                  <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
                  <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '60px' }} />
                </colgroup>
                <thead className="sticky top-0 z-20 bg-[#34495e] shadow-md">
                  <tr className="bg-[#34495e] text-white">
                    <th className="px-4 py-4 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>ID</th>
                    <th className="px-2 py-4 border-r border-slate-600 font-bold" rowSpan={2}>Scope of Works</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" rowSpan={2}>Detail Description</th>
                    <th className="px-3 py-4 border-r border-slate-600 text-center font-bold" rowSpan={2}>Unit</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={5}>BoQ</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" rowSpan={2}>Remark</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Up to Previous Week</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% This Week</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Up to This Week</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Remaining</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Next Week Plan</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Up to Next Week Plan</th>
                    <th className="px-2 py-4 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>Actions</th>
                  </tr>
                  <tr className="bg-[#34495e]/90 text-white/90 py-4">
                    {['QTY', 'Mat. Rate', 'Labor Rate', 'Unit Rate', 'Amount', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%'].map((h, i) => (
                      <th key={i} className="px-1 py-1 border-r border-slate-600 text-center text-sm">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((item, index) => (
                    <tr key={index} className={`${getRowBg(item, index)} transition-colors group${item.isBold ? ' font-bold' : ''}`}>
                      {['id', 'scopeOfWorks', 'detailDescription', 'unit',
                        'boQ.qty', 'boQ.materialRate', 'boQ.laborRate', 'boQ.unitRate', 'boQ.amount', 'remark',
                        'previousWeek.qty', 'previousWeek.amount', 'previousWeek.percentage',
                        'thisWeek.qty', 'thisWeek.amount', 'thisWeek.percentage',
                        'upToThisWeek.qty', 'upToThisWeek.amount', 'upToThisWeek.percentage',
                        'remaining.qty', 'remaining.amount', 'remaining.percentage',
                        'nextWeekPlan.qty', 'nextWeekPlan.amount', 'nextWeekPlan.percentage',
                        'upToNextWeekPlan.qty', 'upToNextWeekPlan.amount', 'upToNextWeekPlan.percentage'
                      ].map(field => (
                        <td key={field} className={`px-1.5 py-2 border-r border-slate-200 ${field === 'remark' ? 'text-blue-600' : ''} ${['id', 'scopeOfWorks'].includes(field) ? 'sticky-col' : ''}`}>
                          {renderCell(item, index, field)}
                        </td>
                      ))}
                      <td className="px-1.5 py-2 text-center border-r border-slate-200">
                        <button
                          onClick={(e) => handleDropdownToggle(index, e)}
                          className="dropdown-button p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row Action Dropdown */}
        {activeDropdown !== null && dropdownPosition && (
          <div
            className="fixed-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[160px]"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-2">Background Color</p>
              <div className="grid grid-cols-4 gap-1">
                {backgroundColorOptions.map(c => (
                  <button key={c.value} onClick={() => { setRowBackgrounds(p => ({ ...p, [activeDropdown]: c.value })); setActiveDropdown(null); }}
                    className={`w-6 h-6 rounded border-2 ${c.class} hover:scale-110 transition-transform`} title={c.name} />
                ))}
              </div>
            </div>
            <div className="border-b border-gray-100">
              <button
                onClick={() => activeDropdown !== null && openInsertModal(activeDropdown, 'before')}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowUpToLine size={14} className="text-slate-400" /> Insert row above
              </button>
              <button
                onClick={() => activeDropdown !== null && openInsertModal(activeDropdown, 'after')}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowDownToLine size={14} className="text-slate-400" /> Insert row below
              </button>
            </div>
            <div className="border-b border-gray-100">
              <button
                onClick={() => {
                  if (activeDropdown === null) return;
                  const item = filteredItems[activeDropdown];
                  const newItems = [...items];
                  const idx = items.findIndex(i => i === item);
                  if (idx === -1) return;
                  newItems[idx] = { ...item, isBold: !item.isBold };
                  const computed = computeAllAmounts(newItems);
                  setItems(computed);
                  if (onDataChange) onDataChange({ ...currentData, items: computed });
                  setActiveDropdown(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <span className="font-bold text-slate-500 text-xs w-3.5">B</span>
                {activeDropdown !== null && filteredItems[activeDropdown]?.isBold ? 'Remove bold' : 'Bold row'} <span className="ml-auto text-sm text-slate-400">Ctrl+B</span>
              </button>
            </div>
            <button
              onClick={() => deleteRow(activeDropdown)}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} /> Delete Row
            </button>
          </div>
        )}
      </div>

      {/* ── Smart Add Rows Modal ── */}
      {showAddRows && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-sm font-bold text-slate-800">
                {insertMode === 'before' ? 'Insert Row Above' : insertMode === 'after' && addRowsAfter !== items.length - 1 && addRowsAfter !== -1 ? 'Insert Row Below' : 'Add Rows'}
              </h2>
              <button onClick={() => setShowAddRows(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Step 1: Row Type */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Step 1 — Row Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {ID_TYPE_CONFIG.map(cfg => (
                    <button
                      key={cfg.type}
                      onClick={() => setAddRowsType(cfg.type)}
                      className={`flex flex-col items-start px-3 py-2.5 rounded-lg border-2 transition-all text-left ${addRowsType === cfg.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <span className={`text-sm font-bold px-1.5 py-0.5 rounded mb-1 ${cfg.color} text-slate-700`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm text-slate-500 font-mono">{cfg.example}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Insert Position */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Step 2 — Insert Position</p>
                {(insertMode === 'before' || insertMode === 'after') && addRowsAfter !== -1 && addRowsAfter !== items.length - 1 && (
                  <p className="text-sm text-blue-500 mb-2">
                    ✦ Pre-filled from row click — change if needed.
                  </p>
                )}
                <div className="relative">
                  <select
                    value={addRowsAfter}
                    onChange={(e) => setAddRowsAfter(Number(e.target.value))}
                    className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-8"
                  >
                    <option value={-1}>— At the end —</option>
                    {items.map((item, i) => (
                      <option key={i} value={i}>
                        Row {i + 1}{item.id ? ` [${item.id}]` : ''}{item.scopeOfWorks ? ` — ${item.scopeOfWorks.slice(0, 40)}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Step 3: Count */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Step 3 — Number of Rows</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAddRowsCount(c => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center font-bold text-lg"
                  >−</button>
                  <input
                    type="number" min={1} max={50}
                    value={addRowsCount}
                    onChange={(e) => setAddRowsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => setAddRowsCount(c => Math.min(50, c + 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center font-bold text-lg"
                  >+</button>
                </div>
              </div>

              {/* Preview */}
              {addRowsType !== 'empty' && previewIds.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview — IDs that will be created</p>
                  <div className="flex flex-wrap gap-1.5 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {previewIds.map((id, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded font-mono text-xs font-semibold shadow-sm">
                        {id || '(blank)'}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-400 mt-1.5">
                    ✦ Rows below will be auto-renumbered, including children.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setShowAddRows(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={confirmAddRows}
                className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <Plus size={15} /> Insert {addRowsCount} Row{addRowsCount > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReportConstructionProgress;
