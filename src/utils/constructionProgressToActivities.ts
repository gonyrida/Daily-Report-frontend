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
  type: 'weekly' | 'next',
  deletedRowIds?: Set<string>
): ActivityRow[] {
  if (!items || items.length === 0) return existingRows;

  // ── Step 1: build a lookup of all items by their stable key ──────────────
  // This does NOT determine output order — only provides data for each key.
  type ItemData = {
    item: ConstructionProgressItem;
    percent: number;
    level: number;
    displayId: string;
  };
  const itemsByKey = new Map<string, ItemData>();
  const occurrenceCount = new Map<string, number>();

  items.forEach((item) => {
    if (!item.id || item.id.trim() === '') return;
    const trimmedId = item.id.trim();
    const occIdx = occurrenceCount.get(trimmedId) ?? 0;
    occurrenceCount.set(trimmedId, occIdx + 1);
    const stableKey = occIdx === 0 ? trimmedId : `${trimmedId}:${occIdx}`;
    if (deletedRowIds?.has(stableKey)) return;

    const percent = type === 'weekly'
      ? (item.upToThisWeek?.percentage ?? 0)
      : (item.nextWeekPlan?.percentage ?? 0);
    const { level, displayId } = calculateIndentLevel(trimmedId);
    itemsByKey.set(stableKey, { item, percent, level, displayId });
  });

  // ── Step 1b: build reverse lookup description → stableKey ────────────────
  const descriptionToKey = new Map<string, string>();
  for (const [key, data] of itemsByKey) {
    const descKey = (data.item.scopeOfWorks || data.item.id).trim().toLowerCase();
    if (!descriptionToKey.has(descKey)) {
      descriptionToKey.set(descKey, key);
    }
  }

  // ── Step 2: walk existingRows in their current order ─────────────────────
  // This preserves any reordering the user did via drag-and-drop.
  const output: ActivityRow[] = [];
  const usedKeys = new Set<string>();
  const seenDescriptions = new Set<string>(); // Track descriptions to deduplicate manual rows

  for (const row of existingRows) {
    let rowKey = row.id || '';

    // Assign unique ID to rows with empty IDs to prevent duplicates
    if (!rowKey) {
      rowKey = `manual-${crypto.randomUUID()}`;
    }

    // Drop rows the user explicitly deleted
    if (deletedRowIds?.has(rowKey)) continue;

    if (row.sourceId) {
      // Construction-progress row: refresh data from source, keep user's position
      const data = itemsByKey.get(rowKey);
      if (!data) continue; // item was removed from source → drop the row
      usedKeys.add(rowKey);
      output.push({
        ...row,
        id: rowKey,
        description: data.item.scopeOfWorks || data.item.id,
        percent: data.percent,
        percentage: data.percent.toString(),
        indentLevel: data.level,
        displayId: data.displayId,
      });
    } else {
      // Manual row: keep as-is, but deduplicate by description
      const descKey = row.description.trim().toLowerCase();
      if (seenDescriptions.has(descKey)) {
        continue;
      }
      seenDescriptions.add(descKey);

      // If this manual row's description matches a construction progress item,
      // upgrade it so it won't be appended again in Step 3 (prevents duplicates).
      const matchingKey = descriptionToKey.get(descKey);
      if (matchingKey && !deletedRowIds?.has(matchingKey)) {
        const data = itemsByKey.get(matchingKey)!;
        usedKeys.add(matchingKey);
        output.push({
          ...row,
          id: matchingKey,
          sourceId: data.item.id.trim(),
          displayId: data.displayId,
          description: data.item.scopeOfWorks || data.item.id,
          percent: data.percent,
          percentage: data.percent.toString(),
          indentLevel: data.level,
        });
      } else {
        output.push({
          ...row,
          id: rowKey,
        });
      }
    }
  }

  // ── Step 3: append any NEW items not yet present in existingRows ──────────
  // Preserves insertion order from the source items array.
  for (const [key, data] of itemsByKey) {
    if (usedKeys.has(key)) continue;
    const { level, displayId } = data;
    output.push({
      id: key,
      sourceId: data.item.id.trim(),
      displayId,
      description: data.item.scopeOfWorks || data.item.id,
      percent: data.percent,
      percentage: data.percent.toString(),
      source: 'construction-progress',
      indentLevel: level,
      addedAt: new Date(),
    });
  }

  return output;
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
