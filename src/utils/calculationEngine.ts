import { ConstructionProgressItem } from '../types/constructionProgress';
import { detectIdType, resolveIdType } from './idEngine';

/** Level order for hierarchy comparisons (higher = more senior) */
const LEVEL_ORDER: Record<string, number> = { roman: 5, level1: 4, level2: 3, level3: 2, alpha: 1, empty: 0 };

export function getRowLevel(id: string, items: { id: string }[], index: number): number {
  return LEVEL_ORDER[resolveIdType(id, items, index)] ?? 0;
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
export function getDirectChildren(items: ConstructionProgressItem[], parentIndex: number): number[] {
  if (!items || parentIndex < 0 || parentIndex >= items.length) return [];
  
  const item = items[parentIndex];
  const parentId = item?.id ?? '';
  const parentLevel = getRowLevel(parentId, items, parentIndex);
  const isBoldEmpty = item?.isBold && (parentLevel === 0);

  // Bold-empty: collect everything below until the next same-or-higher structural row
  if (isBoldEmpty) {
    const children: number[] = [];
    for (let i = parentIndex + 1; i < items.length; i++) {
      const rowLevel = getRowLevel(items[i].id, items, i);
      const isNextBoldEmpty = items[i].isBold && rowLevel === 0;
      if (rowLevel > 0 || isNextBoldEmpty) break; // hit a structural row or another bold-empty
      children.push(i);
    }
    return children;
  }

  if (parentLevel <= 1) return []; // alpha/empty have no children

  const expectedChildLevel = parentLevel - 1;
  const children: number[] = [];
  for (let i = parentIndex + 1; i < items.length; i++) {
    const rowLevel = getRowLevel(items[i].id, items, i);
    if (rowLevel >= parentLevel) break; // same or higher = end of this parent's scope
    if (rowLevel === expectedChildLevel) children.push(i);
  }
  return children;
}

/**
 * Check if a parent row has any qualifying children.
 * If it has none, leave its amount as manually entered.
 */
export function hasChildren(items: ConstructionProgressItem[], parentIndex: number): boolean {
  return getDirectChildren(items, parentIndex).length > 0;
}

/**
 * Determines if a row's boQ.amount should be auto-calculated (read-only).
 * True for roman, level1, level2, level3 rows that have at least one child.
 */
/** Check if a specific item's boQ.amount is auto-calculated (read-only). */
export function isAutoCalculated(allItems: ConstructionProgressItem[], item: ConstructionProgressItem): boolean {
  const boQ = item.boQ;
  const index = allItems.findIndex(i => i === item);
  const type = resolveIdType(item.id, allItems, index);

  // Bold-empty row: aggregates rows below it
  if (item.isBold && type === 'empty') return true;

  // Empty type: no children, no aggregation
  if (type === 'empty') return false;

  // Has rates → amount = qty×unitRate
  const hasRates = (boQ.materialRate || 0) > 0 ||
    (boQ.laborRate || 0) > 0 ||
    (boQ.unitRate || 0) > 0;
  if (hasRates) return true;

  // Has children → aggregation
  if (type === 'alpha') return false;
  if (index === -1) return false;
  return hasChildren(allItems, index);
}

/**
 * Calculate amount for a progress period using the same logic as BoQ amount
 */
export function calculateProgressAmount(
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
export function computeAllAmounts(items: ConstructionProgressItem[]): ConstructionProgressItem[] {
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
    const type = resolveIdType(id, result, i);
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

    // Rule 0.1: Alpha row → sum bold-empty below; fallback to plain empty if none
    if (type === 'alpha') {
      let boQSum = 0, previousWeekSum = 0, thisWeekSum = 0, upToThisWeekSum = 0;
      let remainingSum = 0, nextWeekPlanSum = 0, upToNextWeekPlanSum = 0;

      // First pass: check if any bold-empty rows exist below (before next alpha)
      let hasBoldEmpty = false;
      for (let j = i + 1; j < result.length; j++) {
        const jType = resolveIdType(result[j].id, result, j);
        if (jType === 'alpha') break;
        const jIsBoldEmpty = result[j].isBold && (jType === 'empty');
        if (jIsBoldEmpty) { hasBoldEmpty = true; break; }
      }

      // Second pass: sum the right target rows
      for (let j = i + 1; j < result.length; j++) {
        const jType = resolveIdType(result[j].id, result, j);
        if (jType === 'alpha') break;

        const jIsBoldEmpty = result[j].isBold && (jType === 'empty');
        const jIsPlainEmpty = !result[j].isBold && (jType === 'empty');

        const shouldSum = hasBoldEmpty ? jIsBoldEmpty : jIsPlainEmpty;
        if (!shouldSum) continue;

        boQSum            += result[j].boQ.amount || 0;
        previousWeekSum   += result[j].previousWeek.amount || 0;
        thisWeekSum       += result[j].thisWeek.amount || 0;
        upToThisWeekSum   += result[j].upToThisWeek.amount || 0;
        remainingSum      += result[j].remaining.amount || 0;
        nextWeekPlanSum   += result[j].nextWeekPlan.amount || 0;
        upToNextWeekPlanSum += result[j].upToNextWeekPlan.amount || 0;
      }

      result[i].boQ.amount            = Math.round(boQSum * 100) / 100;
      result[i].previousWeek.amount   = Math.round(previousWeekSum * 100) / 100;
      result[i].thisWeek.amount       = Math.round(thisWeekSum * 100) / 100;
      result[i].upToThisWeek.amount   = Math.round(upToThisWeekSum * 100) / 100;
      result[i].remaining.amount      = Math.round(remainingSum * 100) / 100;
      result[i].nextWeekPlan.amount   = Math.round(nextWeekPlanSum * 100) / 100;
      result[i].upToNextWeekPlan.amount = Math.round(upToNextWeekPlanSum * 100) / 100;

      const boQAmount = result[i].boQ.amount || 0;
      result[i].previousWeek.percentage     = boQAmount > 0 ? Math.round((result[i].previousWeek.amount   / boQAmount) * 100 * 10) / 10 : 0;
      result[i].thisWeek.percentage         = boQAmount > 0 ? Math.round((result[i].thisWeek.amount       / boQAmount) * 100 * 10) / 10 : 0;
      result[i].upToThisWeek.percentage     = boQAmount > 0 ? Math.round((result[i].upToThisWeek.amount   / boQAmount) * 100 * 10) / 10 : 0;
      result[i].remaining.percentage        = boQAmount > 0 ? Math.round((result[i].remaining.amount      / boQAmount) * 100 * 10) / 10 : 0;
      result[i].nextWeekPlan.percentage     = boQAmount > 0 ? Math.round((result[i].nextWeekPlan.amount   / boQAmount) * 100 * 10) / 10 : 0;
      result[i].upToNextWeekPlan.percentage = boQAmount > 0 ? Math.round((result[i].upToNextWeekPlan.amount / boQAmount) * 100 * 10) / 10 : 0;

      continue;
    }

    // Calculate unit rate from material + labor if both exist
    if ((boQ.materialRate || 0) > 0 || (boQ.laborRate || 0) > 0) {
      // Calculate unit rate as sum of material and labor rates
      const calculatedUnitRate = (boQ.materialRate || 0) + (boQ.laborRate || 0);
      result[i].boQ.unitRate = calculatedUnitRate;

      // Rule 1: qty × unitRate for BoQ and individual progress periods only
      result[i].boQ.amount = Math.round((boQ.qty || 0) * calculatedUnitRate * 100) / 100;
      result[i].previousWeek.amount = (result[i].previousWeek.qty || 0) * calculatedUnitRate;
      result[i].thisWeek.amount = (result[i].thisWeek.qty || 0) * calculatedUnitRate;

      // Calculate cumulative amounts from their components
      result[i].upToThisWeek.amount = result[i].previousWeek.amount + result[i].thisWeek.amount;
      result[i].upToThisWeek.qty = (result[i].previousWeek.qty || 0) + (result[i].thisWeek.qty || 0);
      result[i].remaining.qty = (result[i].boQ.qty || 0) - (result[i].upToThisWeek.qty || 0);
      result[i].remaining.amount = result[i].boQ.amount - result[i].upToThisWeek.amount;
      result[i].nextWeekPlan.amount = (result[i].nextWeekPlan.qty || 0) * boQ.unitRate;
      result[i].upToNextWeekPlan.amount = result[i].upToThisWeek.amount + result[i].nextWeekPlan.amount;
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
      result[i].boQ.amount = (boQ.qty || 0) * (boQ.unitRate || 0);
      result[i].previousWeek.amount = (result[i].previousWeek.qty || 0) * (boQ.unitRate || 0);
      result[i].thisWeek.amount = (result[i].thisWeek.qty || 0) * (boQ.unitRate || 0);

      // Calculate cumulative amounts from their components
      result[i].upToThisWeek.amount = result[i].previousWeek.amount + result[i].thisWeek.amount;
      result[i].upToThisWeek.qty = (result[i].previousWeek.qty || 0) + (result[i].thisWeek.qty || 0);
      result[i].remaining.qty = (result[i].boQ.qty || 0) - (result[i].upToThisWeek.qty || 0);
      result[i].remaining.amount = result[i].boQ.amount - result[i].upToThisWeek.amount;
      result[i].nextWeekPlan.amount = (result[i].nextWeekPlan.qty || 0) * (boQ.unitRate || 0);
      result[i].upToNextWeekPlan.qty = (result[i].upToThisWeek.qty || 0) + (result[i].nextWeekPlan.qty || 0);
      result[i].upToNextWeekPlan.amount = result[i].upToThisWeek.amount + result[i].nextWeekPlan.amount;

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

    // Rule 2: bold-empty → aggregate ALL rows below until next structural boundary
    if (isBoldEmpty) {
      if (children.length === 0) continue; // no children → keep manual

      result[i].boQ.amount = childrenBoQAmounts.reduce((a, b) => a + b, 0);
      result[i].previousWeek.amount = childrenPreviousWeekAmounts.reduce((a, b) => a + b, 0);
      result[i].thisWeek.amount = childrenThisWeekAmounts.reduce((a, b) => a + b, 0);
      result[i].upToThisWeek.amount = childrenUpToThisWeekAmounts.reduce((a, b) => a + b, 0);
      result[i].remaining.amount = childrenRemainingAmounts.reduce((a, b) => a + b, 0);
      result[i].nextWeekPlan.amount = childrenNextWeekPlanAmounts.reduce((a, b) => a + b, 0);
      result[i].upToNextWeekPlan.amount = childrenUpToNextWeekPlanAmounts.reduce((a, b) => a + b, 0);

      const boQAmt = result[i].boQ.amount || 0;
      result[i].previousWeek.percentage   = boQAmt > 0 ? Math.round((result[i].previousWeek.amount   / boQAmt) * 100 * 10) / 10 : 0;
      result[i].thisWeek.percentage       = boQAmt > 0 ? Math.round((result[i].thisWeek.amount       / boQAmt) * 100 * 10) / 10 : 0;
      result[i].upToThisWeek.percentage   = boQAmt > 0 ? Math.round((result[i].upToThisWeek.amount   / boQAmt) * 100 * 10) / 10 : 0;
      result[i].remaining.percentage      = boQAmt > 0 ? Math.round((result[i].remaining.amount      / boQAmt) * 100 * 10) / 10 : 0;
      result[i].nextWeekPlan.percentage   = boQAmt > 0 ? Math.round((result[i].nextWeekPlan.amount   / boQAmt) * 100 * 10) / 10 : 0;
      result[i].upToNextWeekPlan.percentage = boQAmt > 0 ? Math.round((result[i].upToNextWeekPlan.amount / boQAmt) * 100 * 10) / 10 : 0;
      continue;
    }

    // Rule 3: plain empty → no aggregation, keep manual
    if (type === 'empty') continue;

    if (children.length === 0) continue; // Rule 4: keep manual

    // Aggregate children amounts for all periods
    result[i].boQ.amount = childrenBoQAmounts.reduce((acc, amount) => acc + amount, 0);
    result[i].previousWeek.amount = childrenPreviousWeekAmounts.reduce((acc, amount) => acc + amount, 0);
    result[i].thisWeek.amount = childrenThisWeekAmounts.reduce((acc, amount) => acc + amount, 0);
    result[i].remaining.qty = children.map(ci => (result[ci].boQ.qty || 0) - (result[ci].upToThisWeek.qty || 0)).reduce((acc, qty) => acc + qty, 0);
    result[i].upToThisWeek.amount = childrenUpToThisWeekAmounts.reduce((acc, amount) => acc + amount, 0);
    result[i].upToThisWeek.qty = children.map(ci => result[ci].upToThisWeek.qty || 0).reduce((acc, qty) => acc + qty, 0);
    result[i].remaining.amount = childrenRemainingAmounts.reduce((acc, amount) => acc + amount, 0);
    result[i].nextWeekPlan.amount = childrenNextWeekPlanAmounts.reduce((acc, amount) => acc + amount, 0);
    result[i].upToNextWeekPlan.qty = children.map(ci => (result[ci].upToThisWeek.qty || 0) + (result[ci].nextWeekPlan.qty || 0)).reduce((acc, qty) => acc + qty, 0);
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
