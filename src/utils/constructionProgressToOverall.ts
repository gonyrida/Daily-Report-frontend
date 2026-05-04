import { ConstructionProgressItem } from '@/types/constructionProgress';
import { ProgressRow } from '@/types/progress.types';

/**
 * Row-type classifier based on construction item's ID pattern.
 *   Roman numerals (I, II, III, IV, V, …)  → title row
 *   Pure integers (1, 2, 3, …)             → detail row
 *   Decimal (1.1, 2.3, …)                  → subDetail row
 *   Anything else (A, B, F1, …)            → custom row (preserved, never skipped)
 *
 * This function ONLY classifies — it never filters or drops rows.
 * Filtering for display is the view layer's responsibility.
 */
function resolveRowType(id: string): 'title' | 'detail' | 'subDetail' | 'custom' {
  if (!id) return 'custom';
  const trimmed = id.trim();
  if (!trimmed) return 'custom';

  // Strict roman numeral: only uppercase I, V, X, L, C, D, M in valid order.
  // No case-insensitive flag — lowercase should NOT be a title.
  const ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
  if (trimmed.length > 0 && ROMAN.test(trimmed) && /[IVXLCDM]/.test(trimmed)) {
    return 'title';
  }

  // Decimal detail: "1.1", "2.3", "1.1.1", "1.1.2", etc.
  if (/^\d+(\.\d+)+$/.test(trimmed)) return 'subDetail';

  // Pure integer: "1", "2", "12", etc.
  if (/^\d+$/.test(trimmed)) return 'detail';

  // Dash-only id → skip
  if (/^[-]+$/.test(trimmed)) return 'custom';

  // Alpha, mixed, punctuation, etc. → custom (filtered out in overall progress)
  return 'custom';
}

/**
 * Build scoped source IDs for construction items.
 * Prefixes all non-title rows with their parent title (e.g., "I::1", "II::F1")
 * to prevent collisions between items with the same raw ID in different phases.
 * Every item gets a non-empty scoped ID — nothing is dropped here.
 */
function buildScopedSourceIds(items: ConstructionProgressItem[]): string[] {
  const keys: string[] = [];
  let currentTitle = 'ROOT';

  for (const item of items) {
    if (!item || !item.id) {
      keys.push('');
      continue;
    }
    const id = item.id.trim();
    const type = resolveRowType(id);

    if (type === 'title') {
      currentTitle = id;
      keys.push(currentTitle);
    } else {
      // detail, subDetail, and custom all get scoped under the current title
      keys.push(`${currentTitle}::${id}`);
    }
  }
  return keys;
}

/**
 * Merge construction progress into Overall Progress rows.
 *
 * Contract:
 *   1. Tombstones are sacred. A row with `isDeleted === true` is NEVER
 *      revived in-place. It stays in the stored array so the next merge
 *      still sees it. If its sourceId reappears in the live set, Phase 2
 *      appends a fresh active row — the tombstone remains as history.
 *   2. Existing active rows keep their React id, their position in the
 *      array, and all user edits. Construction data does not overwrite them.
 *   3. New construction items are appended. The same scopedId appearing
 *      twice in one payload is deduplicated within that payload.
 *   4. User-added custom rows (no sourceId) are never touched.
 *   5. Construction-sourced rows whose sourceId is absent from the current
 *      items payload are tombstoned (isDeleted: true) by Phase 1.
 *      CALLER NOTE: do not call this function with an empty items array
 *      while construction data is still loading — Phase 1 will tombstone
 *      all sourced rows because none are "live".
 *
 * The caller is responsible for filtering `isDeleted` out of the UI. This
 * function operates on the full stored array, tombstones included.
 */
export function mergeConstructionIntoOverallRows(
  items: ConstructionProgressItem[],
  existingRows: ProgressRow[]
): ProgressRow[] {
  const existing = existingRows ?? [];

  // Build scoped IDs for all incoming items up front (needed by both phases).
  const scopedIds = items?.length ? buildScopedSourceIds(items) : [];

  // Build the live set: scoped IDs that survive the row-type filter.
  // Only these IDs should remain active after the merge.
  const liveScopedIds = new Set<string>();
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item?.id) continue;
      const rawId = item.id.trim();
      if (!rawId) continue;
      const rowType = resolveRowType(rawId);
      if (rowType === 'custom' || rowType === 'subDetail') continue;
      const scopedId = scopedIds[i];
      if (scopedId) liveScopedIds.add(scopedId);
    }
  }

  // Phase 1 — Sync deletions.
  // Construction-sourced rows (have a sourceId) whose sourceId is absent from
  // the live set are tombstoned. User-added rows (no sourceId) and rows that
  // are already tombstoned are returned unchanged.
  const result: ProgressRow[] = existing.map(row => {
    if (!row.sourceId || row.isDeleted) return row;
    if (!liveScopedIds.has(row.sourceId)) return { ...row, isDeleted: true };
    return row;
  });

  if (!items?.length) return result;

  // Phase 2 — Append new items.
  // Track active sourceIds after Phase 1 to avoid re-adding rows that are
  // already present and alive. Tombstoned rows are intentionally excluded so
  // that a reappearing sourceId creates a fresh active row (resurrection).
  const activeSourceIds = new Set<string>();
  for (const row of result) {
    if (row.sourceId && !row.isDeleted) activeSourceIds.add(row.sourceId);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item?.id) continue;

    const rawId = item.id.trim();
    if (!rawId) continue;

    const rowType = resolveRowType(rawId);

    // Only allow: title (Roman numerals) and detail (pure integers).
    if (rowType === 'custom' || rowType === 'subDetail') continue;

    const scopedId = scopedIds[i];
    if (!scopedId) continue;

    if (activeSourceIds.has(scopedId)) continue;
    activeSourceIds.add(scopedId); // guard against duplicate scopedIds in the same payload

    const prevWeekPct   = item.previousWeek?.percentage     ?? 0;
    const thisWeekPct   = item.thisWeek?.percentage         ?? 0;
    const upToThisWkPct = item.upToThisWeek?.percentage     ?? 0;
    const remainingPct  = item.remaining?.percentage        ?? Math.max(0, 100 - upToThisWkPct);
    const nxtWkPlanPct  = item.nextWeekPlan?.percentage     ?? 0;
    const upNxtWkPct    = item.upToNextWeekPlan?.percentage ?? (upToThisWkPct + nxtWkPlanPct);

    result.push({
      id: `cp-${scopedId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceId: scopedId,
      no: rawId,
      description: item.scopeOfWorks || rawId,
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