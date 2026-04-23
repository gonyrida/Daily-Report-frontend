import { ConstructionProgressItem } from '@/types/constructionProgress';
import { ProgressRow } from '@/types/progress.types';

/**
 * Row-type classifier based on construction item's ID pattern.
 *   "I", "II", "III" …  → title row
 *   "1", "2", "3" …     → detail row
 *   "1.1", "2.3" …      → subDetail row
 */
function resolveRowType(id: string): 'title' | 'detail' | 'subDetail' {
  if (!id || id.trim() === '') return 'detail';
  const trimmed = id.trim();

  if (/^(I|V)$/i.test(trimmed)) return 'title';
  if (
    /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(trimmed) &&
    trimmed.length > 1
  ) {
    return 'title';
  }
  if (/^\d+\.\d+/.test(trimmed)) return 'subDetail';
  if (/^\d+$/.test(trimmed)) return 'detail';
  return 'detail';
}

/**
 * Merge construction progress into Overall Progress rows.
 *
 * Contract:
 *   1. Tombstones are sacred. A row with `isDeleted === true` is NEVER
 *      revived and NEVER duplicated. It stays in the stored array so the
 *      next merge still sees it.
 *   2. Existing rows (active or tombstoned) keep their React id, their
 *      position in the array, and all user edits (percentages, description
 *      overrides if any). Construction data does not overwrite them.
 *   3. All construction items from the payload are appended. Duplicate sourceIds
 *      are allowed to support displaying duplicate level 1 IDs.
 *   4. User-added custom rows (no sourceId) are left exactly where they are.
 *
 * The caller is responsible for filtering `isDeleted` out of the UI. This
 * function operates on the full stored array, tombstones included.
 */
export function mergeConstructionIntoOverallRows(
  items: ConstructionProgressItem[],
  existingRows: ProgressRow[]
): ProgressRow[] {
  const existing = existingRows ?? [];

  if (!items || items.length === 0) {
    // Nothing to merge — return existing untouched (including tombstones).
    return existing;
  }

  // Track sourceIds already in the existing array to prevent re-adding them.
  // This prevents duplicates when the merge runs multiple times (re-renders).
  const existingSourceIds = new Set<string>();
  for (const row of existing) {
    if (row.sourceId) existingSourceIds.add(row.sourceId);
  }

  // Start from the existing array — we only ever APPEND.
  const result: ProgressRow[] = [...existing];

  for (const item of items) {
    if (!item || !item.id) continue;
    const sourceId = item.id.trim();
    if (!sourceId) continue;

    // Skip if this sourceId already exists in storage (prevents re-adding on re-render)
    if (existingSourceIds.has(sourceId)) continue;

    // Brand-new construction item → seed a fresh row.
    // Add to tracking set so we don't add it again if the same item appears
    // twice in the same payload.
    existingSourceIds.add(sourceId);
    const rowType = resolveRowType(sourceId);

    const prevWeekPct   = item.previousWeek?.percentage     ?? 0;
    const thisWeekPct   = item.thisWeek?.percentage         ?? 0;
    const upToThisWkPct = item.upToThisWeek?.percentage     ?? 0;
    const remainingPct  = item.remaining?.percentage        ?? Math.max(0, 100 - upToThisWkPct);
    const nxtWkPlanPct  = item.nextWeekPlan?.percentage     ?? 0;
    const upNxtWkPct    = item.upToNextWeekPlan?.percentage ?? (upToThisWkPct + nxtWkPlanPct);

    result.push({
      id: `cp-${sourceId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceId,
      description: item.scopeOfWorks || sourceId,
      rowType,
      pctUpToPrevWeek:   prevWeekPct.toString(),
      pctThisWeek:       thisWeekPct,
      pctUpToThisWeek:   upToThisWkPct,
      pctRemaining:      remainingPct,
      pctNextWeekPlan:   nxtWkPlanPct,
      pctUpNextWeekPlan: upNxtWkPct,
      searchTerm: '',
      isCustomInput: false,
      isDeleted: false,
    } as ProgressRow);
  }

  return result;
}