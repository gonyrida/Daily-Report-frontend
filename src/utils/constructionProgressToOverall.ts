import { ConstructionProgressItem } from '@/types/constructionProgress';
import { ProgressRow } from '@/types/progress.types';

/**
 * Row-type classifier based on construction item's ID pattern.
 *   Roman numerals (I, II, III, IV, V, …)  → title row
 *   Pure integers (1, 2, 3, …)             → detail row
 *   Decimal (1.1, 2.3, …)                  → subDetail row
 *   Anything else (A, B, a, 1a, …)         → skip (caller drops it)
 */
function resolveRowType(id: string): 'title' | 'detail' | 'subDetail' | 'skip' {
  if (!id) return 'skip';
  const trimmed = id.trim();
  if (!trimmed) return 'skip';

  // Strict roman numeral: only uppercase I, V, X, L, C, D, M in valid order.
  // No case-insensitive flag — lowercase should NOT be a title.
  const ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
  if (trimmed.length > 0 && ROMAN.test(trimmed) && /[IVXLCDM]/.test(trimmed)) {
    return 'title';
  }

  // Decimal detail: "1.1", "2.3", etc.
  if (/^\d+\.\d+$/.test(trimmed)) return 'subDetail';

  // Pure integer: "1", "2", "12", etc.
  if (/^\d+$/.test(trimmed)) return 'detail';

  // Everything else (alpha, mixed, punctuation) → skip
  return 'skip';
}

/**
 * Build scoped source IDs for construction items.
 * Prefixes detail/subDetail rows with their parent title (e.g., "I::1", "II::3")
 * to prevent collisions between items with the same raw ID in different phases.
 * Returns empty string for skipped items to keep indices aligned.
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
    } else if (type === 'skip') {
      keys.push(''); // placeholder so indices line up with items array
    } else {
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

  // Build scoped IDs to prevent collisions between items with same raw ID in different phases
  const scopedIds = buildScopedSourceIds(items);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !item.id) continue;

    const rawId = item.id.trim();
    if (!rawId) continue;

    const rowType = resolveRowType(rawId);

    // Skip non-standard IDs (alpha, mixed, etc.)
    if (rowType === 'skip') continue;

    const scopedId = scopedIds[i];
    if (!scopedId) continue;

    // Skip if this scoped sourceId already exists in storage (prevents re-adding on re-render)
    if (existingSourceIds.has(scopedId)) continue;

    // Brand-new construction item → seed a fresh row.
    // Add to tracking set so we don't add it again if the same item appears
    // twice in the same payload.
    existingSourceIds.add(scopedId);

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