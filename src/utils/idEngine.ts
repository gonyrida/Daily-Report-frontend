import { ConstructionProgressItem, IdType, AmbiguousIdType } from '../types/constructionProgress';

const ROMAN_VALUES: [string, number][] = [
  ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
  ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
  ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
];

export function toRoman(num: number): string {
  if (num <= 0) return 'I';
  let result = '';
  for (const [s, v] of ROMAN_VALUES) {
    while (num >= v) { result += s; num -= v; }
  }
  return result;
}

export function fromRoman(str: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const cur = map[str[i]] ?? 0;
    const next = map[str[i + 1]] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

// Pure string classifier. Returns 'ambiguous' for single letters that could
// be either roman (I, V, X...) or alpha (A, B, C...).
// Never call this directly in computation — use resolveIdType() instead.
export const detectIdType = (id: string): AmbiguousIdType => {
  if (!id || id.trim() === '') return 'empty';
  if (/^\d+$/.test(id)) return 'level1';
  if (/^\d+\.\d+$/.test(id)) return 'level2';
  if (/^\d+\.\d+\.\d+$/.test(id)) return 'level3';

  // 2+ roman chars → unambiguously roman (II, IV, XII, etc.)
  if (/^[IVXLCDM]{2,}$/.test(id)) return 'roman';

  if (/^[A-Z]$/.test(id)) {
    // Single letter: roman-numeral chars are ambiguous, others are always alpha
    return /^[IVXLCDM]$/.test(id) ? 'ambiguous' : 'alpha';
  }

  return 'empty';
};

// Context-aware resolver — use this everywhere in computation & rendering.
// Scans backward from `index` to find the nearest structural ancestor.
export const resolveIdType = (
  id: string,
  items: { id: string }[],
  index: number
): IdType => {
  const raw = detectIdType(id);
  if (raw !== 'ambiguous') return raw as IdType;

  for (let i = index - 1; i >= 0; i--) {
    if (!items[i]) break;
    const t = detectIdType(items[i].id);

    // Unambiguous structural types — these settle it immediately
    if (t === 'level1' || t === 'level2' || t === 'level3') return 'alpha';
    if (t === 'roman') return 'roman';

    // Another ambiguous row — recurse to resolve IT first, then use that result
    if (t === 'ambiguous') {
      const resolved = resolveIdType(items[i].id, items, i);
      if (resolved === 'level1' || resolved === 'level2' || resolved === 'level3' || resolved === 'alpha') return 'alpha';
      if (resolved === 'roman') return 'roman';
    }

    // 'empty' and 'alpha' (non-ambiguous) — keep scanning upward
  }

  return 'roman'; // nothing structural above → first section
};

/** Classify a user-intent "section header" ID — single I means roman section 1 */
export function isRomanOne(id: string): boolean {
  return id.trim() === 'I';
}

/** Increment a single ID of its type */
export function incrementId(refId: string, type: IdType): string {
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
export function findNearestParent(items: ConstructionProgressItem[], insertAfterIndex: number, type: IdType): string | undefined {
  const parentType: IdType | null =
    type === 'level2' ? 'level1' :
      type === 'level3' ? 'level2' :
        type === 'alpha' ? 'level3' :   // alpha groups under level3
          null;

  if (!parentType) return undefined;

  for (let i = insertAfterIndex; i >= 0; i--) {
    if (!items[i]) break; // Bounds check
    const detectedType = resolveIdType(items[i].id, items, i);
    if (detectedType === parentType) return items[i].id;
    // Don't cross a higher-level boundary going up
    // e.g. for level2, stop scanning if we hit a roman (section boundary)
    if (type === 'level2' && detectedType === 'roman') break;
    if (type === 'level3' && detectedType === 'level1') break;
    if (type === 'alpha' && detectedType === 'level2') break;
  }

  // Fallback: scan without boundary restriction
  for (let i = insertAfterIndex; i >= 0; i--) {
    if (!items[i]) continue; // Bounds check
    const detectedType = resolveIdType(items[i].id, items, i);
    if (detectedType === parentType) return items[i].id;
  }
  return undefined;
}

/** Find the last same-type SIBLING above insertAfterIndex.
 * "Sibling" means: shares the same parent prefix.
 *   - roman/level1: any roman/level1 (global siblings)
 *   - level2: same level1 prefix  e.g. "1.x" only matches other "1.x"
 *   - level3: same level2 prefix  e.g. "1.1.x" only matches other "1.1.x"
 *   - alpha: same nearest-level3-or-level2 parent scope
 */
export function findLastSibling(
  items: ConstructionProgressItem[],
  insertAfterIndex: number,
  type: IdType
): string | null {
  if (type === 'roman') {
    for (let i = insertAfterIndex; i >= 0; i--) {
      if (!items[i]) break; // Bounds check
      const detectedType = resolveIdType(items[i].id, items, i);
      if (detectedType === 'roman') return items[i].id;
    }
    return null;
  }
  if (type === 'level1') {
    // Level1 is scoped under its nearest roman parent.
    // Scan backwards: return last level1 found, but STOP if we cross a roman boundary.
    for (let i = insertAfterIndex; i >= 0; i--) {
      if (!items[i]) break; // Bounds check
      const detectedType = resolveIdType(items[i].id, items, i);
      if (detectedType === 'roman') break; // crossed into previous roman section — stop
      if (detectedType === 'level1') return items[i].id;
    }
    return null; // no sibling in this roman section → start from 1
  }

  if (type === 'level2') {
    // Find nearest level1 parent first
    const parent = findNearestParent(items, insertAfterIndex, 'level2');
    const prefix = parent ?? null; // e.g. "1"
    for (let i = insertAfterIndex; i >= 0; i--) {
      if (!items[i]) break; // Bounds check
      const t = resolveIdType(items[i].id, items, i);
      if (t === 'level2') {
        const p = items[i].id.split('.')[0];
        if (!prefix || p === prefix) return items[i].id;
      }
      // Stop if we cross into a different level1 or roman section
      if (t === 'level1' || t === 'roman') break;
    }
    return null;
  }

  if (type === 'level3') {
    // Find nearest level2 parent
    const parent = findNearestParent(items, insertAfterIndex, 'level3');
    const prefix = parent ?? null; // e.g. "1.1"
    for (let i = insertAfterIndex; i >= 0; i--) {
      if (!items[i]) break; // Bounds check
      const t = resolveIdType(items[i].id, items, i);
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
      if (!items[i]) break; // Bounds check
      const t = resolveIdType(items[i].id, items, i);
      if (t === 'level3' || t === 'level2' || t === 'level1' || t === 'roman') {
        scopeBoundaryIndex = i;
        break;
      }
    }
    // Scan backwards from insertAfterIndex down to scopeBoundaryIndex for last alpha
    for (let i = insertAfterIndex; i > scopeBoundaryIndex; i--) {
      if (!items[i]) continue; // Bounds check
      const detectedType = resolveIdType(items[i].id, items, i);
      if (detectedType === 'alpha') return items[i].id;
    }
    return null;
  }

  return null;
}

/**
 * Compute the next ID to assign when inserting a row of `type` after `insertAfterIndex`.
 * Uses parent-aware sibling detection.
 */
export function computeNextId(items: ConstructionProgressItem[], insertAfterIndex: number, type: IdType): string {
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
 * Build a globally unique ID for the item at `index` by concatenating its
 * full ancestor chain, separated by "-".
 *
 * Each level contributes its own display ID:
 *   roman → "I"
 *   level1 under I → "I-1"
 *   level2 under I>1 → "I-1-1.1"
 *   alpha under I>1>1.1 → "I-1-1.1-A"
 *   empty leaf (F1) under I>1>1.1>A → "I-1-1.1-A-F1"
 *
 * The key boundary rule: when scanning upward for an ancestor of type T,
 * we start the scan from the immediately-preceding ancestor of type T+1
 * (one level higher), so ancestors from sibling branches are never picked up.
 */
export function buildUniqueId(
  items: Array<{ id: string; scopeOfWorks: string }>,
  index: number
): string {
  const asItems = items as ConstructionProgressItem[];
  const item = asItems[index];
  if (!item) return '';

  const type = resolveIdType(item.id, asItems, index);

  if (type === 'roman') return item.id;

  // Locate the nearest ancestor of a specific type by scanning backward
  // from `from` down to (exclusive) `stopBefore`.
  const findAncestor = (from: number, stopBefore: number, targetType: IdType): { id: string; idx: number } | null => {
    for (let i = from; i > stopBefore; i--) {
      if (resolveIdType(asItems[i].id, asItems, i) === targetType) {
        return { id: asItems[i].id, idx: i };
      }
    }
    return null;
  };

  const roman = findAncestor(index - 1, -1, 'roman');
  const romanIdx = roman?.idx ?? -1;
  const parts: string[] = roman ? [roman.id] : [];

  if (type === 'level1') { parts.push(item.id); return parts.join('-'); }

  const l1 = findAncestor(index - 1, romanIdx, 'level1');
  const l1Idx = l1?.idx ?? romanIdx;
  if (l1) parts.push(l1.id);

  if (type === 'level2') { parts.push(item.id); return parts.join('-'); }

  const l2 = findAncestor(index - 1, l1Idx, 'level2');
  const l2Idx = l2?.idx ?? l1Idx;
  if (l2) parts.push(l2.id);

  if (type === 'level3') { parts.push(item.id); return parts.join('-'); }

  const l3 = findAncestor(index - 1, l2Idx, 'level3');
  const l3Idx = l3?.idx ?? l2Idx;
  if (l3) parts.push(l3.id);

  if (type === 'alpha') { parts.push(item.id); return parts.join('-'); }

  // 'empty' — use alpha ancestor if present, then leaf id from id or scopeOfWorks
  const alpha = findAncestor(index - 1, l3Idx, 'alpha');
  if (alpha) parts.push(alpha.id);

  const leafId = item.id || item.scopeOfWorks.trim().split(/\s+/)[0] || `row${index}`;
  parts.push(leafId);
  return parts.join('-');
}

/**
 * After inserting `count` rows at `insertedAt`, renumber all same-type siblings below,
 * then cascade: if level1 IDs changed → fix level2 children → fix level3 grandchildren.
 */
export function renumberBelow(
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
    const detectedType = resolveIdType(item.id, result, i);
    const itemMatchesType = detectedType === type;

    // For level1: stop renumbering when we enter a new roman section
    if (type === 'level1' && detectedType === 'roman') break;

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

/**
 * After deleting a row at `startIndex`, renumber all same-type siblings from
 * that position onward, then cascade to children if needed.
 * Works for all types: roman, level1, level2, level3, alpha.
 */
export function renumberFromIndex(
  items: ConstructionProgressItem[],
  startIndex: number,
  type: IdType
): ConstructionProgressItem[] {
  if (type === 'empty') return items;
  const result = [...items];
  const idMap = new Map<string, string>();

  for (let i = startIndex; i < result.length; i++) {
    const item = result[i];
    const detectedType = resolveIdType(item.id, result, i);
    const itemType = detectedType;

    // Stop at a higher-level boundary (same logic as findLastSibling)
    if (type === 'level1' && detectedType === 'roman') break;
    if (type === 'level2' && (itemType === 'level1' || detectedType === 'roman')) break;
    if (type === 'level3' && (itemType === 'level2' || itemType === 'level1' || detectedType === 'roman')) break;
    if (type === 'alpha' && (itemType === 'level3' || itemType === 'level2' || itemType === 'level1' || detectedType === 'roman')) break;

    const currentType = itemType;
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
