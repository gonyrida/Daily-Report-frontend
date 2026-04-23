import { ConstructionProgressItem } from '@/types/constructionProgress';
import { ProgressRow } from '@/types/progress.types';

/**
 * Row-type classifier based on construction item's ID pattern.
 *   "I", "II", "III" …  → title row
 *   "1", "2", "3" …     → detail row
 *   "1.1", "2.3" …      → skipped upstream (see merge)
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
  if (/^\d+(\.\d+)*$/.test(trimmed)) return 'detail';
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
 *   3. Brand-new construction items — items whose sourceId has never been
 *      seen before — are appended to the end.
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

  // Every sourceId the existing array already knows about, deleted or not.
  // This is the tombstone shield: once a sourceId is here, we will not
  // append it again.
  const knownSourceIds = new Set<string>();
  for (const row of existing) {
    if (row.sourceId) knownSourceIds.add(row.sourceId);
  }

  // Start from the existing array — we only ever APPEND.
  const result: ProgressRow[] = [...existing];
  const seenInThisPass = new Set<string>();

  for (const item of items) {
    if (!item || !item.id) continue;
    const sourceId = item.id.trim();
    if (!sourceId) continue;

    // Skip dotted sub-level IDs (1.1, 2.3.1, etc.) — these aren't surfaced
    // in Overall Progress per the existing convention.
    if (/^\d+\.\d+/.test(sourceId)) continue;

    // Duplicate guard within a single construction payload.
    if (seenInThisPass.has(sourceId)) continue;
    seenInThisPass.add(sourceId);

    // Already known — either an active row or a tombstone. Either way, leave
    // it alone. User edits and deletions both survive.
    if (knownSourceIds.has(sourceId)) continue;

    // Brand-new construction item → seed a fresh row.
    const rowType = resolveRowType(sourceId);

    const prevWeekPct   = item.previousWeek?.percentage     ?? 0;
    const thisWeekPct   = item.thisWeek?.percentage         ?? 0;
    const upToThisWkPct = item.upToThisWeek?.percentage     ?? 0;
    const remainingPct  = item.remaining?.percentage        ?? Math.max(0, 100 - upToThisWkPct);
    const nxtWkPlanPct  = item.nextWeekPlan?.percentage     ?? 0;
    const upNxtWkPct    = item.upToNextWeekPlan?.percentage ?? (upToThisWkPct + nxtWkPlanPct);

    result.push({
      id: `cp-${sourceId}`,
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