import { ConstructionProgressItem } from '@/types/constructionProgress';
import { ProgressRow } from '@/types/progress.types';

/**
 * Determines the row type for an Overall Progress row based on the
 * construction progress item's ID pattern.
 *
 * Convention:
 *   "I", "II", "III" … → roman numeral  → title row
 *   "1", "2", "3" …    → numeric only   → detail row (level 1)
 *   "1.1", "2.3" …     → dotted numeric → detail row (level 1, treated as level 1)
 *   anything else       → detail row (safe fallback)
 */
function resolveRowType(id: string): 'title' | 'detail' | 'subDetail' {
  if (!id || id.trim() === '') return 'detail';

  const trimmed = id.trim();

  // Common single-char Roman numerals
  if (/^(I|V)$/i.test(trimmed)) {
    return 'title';
  }

  // Roman numerals (I – XXXIX is enough for any real project)
  if (/^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(trimmed) && trimmed.length > 1) {
    return 'title';
  }

  // All numeric patterns (including dotted like "1.1", "2.3") now treated as detail (level 1)
  if (/^\d+(\.\d+)*$/.test(trimmed)) {
    return 'detail';
  }

  return 'detail';
}

/**
 * Converts construction progress items into OverallProgress rows.
 *
 * - Descriptions are always taken from the source (locked / read-only in the UI).
 * - Percentage columns are seeded from construction progress on first load,
 *   then preserved from `existingRows` on subsequent merges so user edits survive.
 *
 * @param items          Raw items from useConstructionProgress hook
 * @param existingRows   Current rows already in the Overall Progress table
 */
export function mergeConstructionIntoOverallRows(
  items: ConstructionProgressItem[],
  existingRows: ProgressRow[]
): ProgressRow[] {
  if (!items || items.length === 0) return existingRows;

  // Build a lookup so we can preserve user edits by sourceId
  const existingBySourceId = new Map<string, ProgressRow>();
  existingRows.forEach(row => {
    if (row.sourceId) existingBySourceId.set(row.sourceId, row);
  });

  const rows: ProgressRow[] = [];

  items.forEach((item) => {
    // Skip items with empty IDs or multi-level dotted IDs (1.1, 1.1.1, etc.)
    // Only allow: roman numerals (I, II) and plain numbers (1, 2, 3)
    
    if (!item.scopeOfWorks && !item.id) {
      return;
    }
    if (!item.id || item.id.trim() === '') {
      return;
    }
    
    const trimmed = item.id.trim();
    // Skip dotted IDs like "1.1", "2.1", "1.1.1", "1.1.2"
    if (/^\d+\.\d+/.test(trimmed)) {
      return;
    }

    const rowType = resolveRowType(item.id);
    const existing = existingBySourceId.get(item.id);

    // Safely read percentage values, defaulting to 0
    const prevWeekPct   = item.previousWeek?.percentage   ?? 0;
    const thisWeekPct   = item.thisWeek?.percentage        ?? 0;
    const upToThisWkPct = item.upToThisWeek?.percentage   ?? 0;
    const remainingPct  = item.remaining?.percentage       ?? Math.max(0, 100 - upToThisWkPct);
    const nxtWkPlanPct  = item.nextWeekPlan?.percentage    ?? 0;
    const upNxtWkPct    = item.upToNextWeekPlan?.percentage ?? (upToThisWkPct + nxtWkPlanPct);

    rows.push({
      // Keep the existing React key stable so the table doesn't remount rows
      id: existing?.id ?? `cp-${item.id}-${crypto.randomUUID()}`,

      // Track which construction progress row this came from
      sourceId: item.id,

      // Description is always driven by the source data (read-only in OverallProgress)
      description: item.scopeOfWorks || item.id,

      rowType,

      // ── Percentage columns ──────────────────────────────────────────────────
      // Field mapping (matches OverallProgressTable column headers):
      //   pctUpToPrevWeek → % Up to Previous Week
      //   pctThisWeek     → % This Week
      //   pctUpToThisWeek → % Up to This Week
      //   pctRemaining    → Remaining
      //   pctNextWeekPlan → % Next Week Plan
      //   pctUpNextWeekPlan→ % Up Next Week Plan
      //
      // If the row already existed, preserve the user's values; otherwise seed
      // from construction progress so the table is pre-populated on first load.
      pctUpToPrevWeek:   existing ? existing.pctUpToPrevWeek   : prevWeekPct.toString(),
      pctThisWeek:       existing ? existing.pctThisWeek       : thisWeekPct,
      pctUpToThisWeek:   existing ? existing.pctUpToThisWeek   : upToThisWkPct,
      pctRemaining:      existing ? existing.pctRemaining      : remainingPct,
      pctNextWeekPlan:   existing ? existing.pctNextWeekPlan   : nxtWkPlanPct,
      pctUpNextWeekPlan: existing ? existing.pctUpNextWeekPlan : upNxtWkPct,

      searchTerm:    '',
      isCustomInput: false,
    });
  });

  return rows;
}