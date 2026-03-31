import { ConstructionProgressItem } from '@/types/constructionProgress';
import { ActivityRow } from '@/types/activity.types';

/**
 * Converts construction progress items into Activity rows for Activities Of Work Done / Next Week Plan.
 * 
 * - ALL levels are included (unlike Overall Progress which filters out some)
 * - ID is preserved from source
 * - Description comes from scopeOfWorks
 * - Percentage columns mapped:
 *   - Work Done: % up to this week (upToThisWeek.percentage)
 *   - Next Week Plan: % next week plan (nextWeekPlan.percentage)
 * 
 * @param items          Raw items from useConstructionProgress hook
 * @param existingRows   Current rows already in the Activities table
 * @param type           'weekly' for work done, 'next' for next week plan
 */
export function mergeConstructionIntoActivityRows(
  items: ConstructionProgressItem[],
  existingRows: ActivityRow[],
  type: 'weekly' | 'next'
): ActivityRow[] {
  if (!items || items.length === 0) return existingRows;

  // Build a lookup so we can preserve user edits by sourceId
  const existingBySourceId = new Map<string, ActivityRow>();
  existingRows.forEach(row => {
    if (row.sourceId) existingBySourceId.set(row.sourceId, row);
  });

  const rows: ActivityRow[] = [];

  // Deduplicate items by id to prevent duplicate React keys
  const seenIds = new Set<string>();
  const uniqueItems = items.filter((item) => {
    if (!item.id || seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  uniqueItems.forEach((item) => {
    // Skip items with no ID and no description
    if (!item.scopeOfWorks && !item.id) return;
    if (!item.id || item.id.trim() === '') return;

    const existing = existingBySourceId.get(item.id);

    // Determine percentage based on type
    let percent = 0;
    if (type === 'weekly') {
      percent = item.upToThisWeek?.percentage ?? 0;
    } else {
      percent = item.nextWeekPlan?.percentage ?? 0;
    }

    // Calculate indentation level and display ID based on ID pattern
    const { level, displayId } = calculateIndentLevel(item.id);

    rows.push({
      // Keep existing React key stable
      id: existing?.id ?? `act-${item.id}-${crypto.randomUUID()}`,

      // Track which construction progress row this came from
      sourceId: displayId,

      // Description is always driven by source data
      description: item.scopeOfWorks || item.id,

      // Percentage value
      percent: existing ? existing.percent : percent,
      percentage: existing ? existing.percentage : percent.toString(),

      // Source tracking
      source: 'manual',

      // Indentation level for display hierarchy
      indentLevel: level,

      // Preserve other fields if existing
      bulkImportId: existing?.bulkImportId,
      addedAt: existing?.addedAt || new Date(),
    });
  });

  return rows;
}

/**
 * Calculate indentation level based on ID pattern
 * - Roman numerals (I, II, III) -> level 0
 * - Plain numbers (1, 2, 3) -> level 0  
 * - Single dot (1.1, 2.1) -> level 0 (parent)
 * - Two dots (1.1.1, 1.1.2) -> level 1 (child, shows 1.1 as parent)
 * - Alpha (A, B, C) -> display "-" with level 3 (child of 1.1.1)
 */
function calculateIndentLevel(id: string): { level: number; displayId: string } {
  if (!id) return { level: 0, displayId: id };
  
  const trimmed = id.trim();
  
  // Check if it's an alpha ID (single letter A-Z) but NOT a Roman numeral
  // Roman numerals: I, V, X, L, C, D, M (and combinations like II, III, IV, etc.)
  // Only multi-character Roman numerals count (I and V are exceptions as common single-char numerals)
  const isRomanNumeral = trimmed.length > 1 && 
    /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(trimmed);
  const isCommonSingleCharRoman = /^(I|V)$/i.test(trimmed); // I and V are commonly used as single-char
    
  if (/^[a-zA-Z]$/i.test(trimmed) && !isRomanNumeral && !isCommonSingleCharRoman) {
    return { level: 3, displayId: "-" }; // Alpha becomes "-" with level 3 indent
  }
  
  // Count dots in the ID
  const dotCount = (trimmed.match(/\./g) || []).length;
  
  // Level 1 (no dots): I, II, 1, 2, 3 -> level 0
  if (dotCount === 0) {
    return { level: 0, displayId: trimmed };
  }
  
  // Level 2 (one dot): 1.1, 2.1 -> level 0 (parent)
  if (dotCount === 1) {
    return { level: 0, displayId: trimmed };
  }
  
  // Level 3+ (two or more dots): 1.1.1, 1.1.2 -> level 1 (indented to show 1.1 as parent)
  return { level: 1, displayId: trimmed };
}
