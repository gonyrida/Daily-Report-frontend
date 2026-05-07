import React, { useMemo } from 'react';
import { ProgressRow } from '@/types/progress.types';
import { MasterWeeklyReport } from '@/types/masterReport.types';
import { ConstructionProgressItem, ProgressData } from '@/types/constructionProgress';
import { toRoman } from '@/lib/numberUtils';
import { BarChart3 } from 'lucide-react';

interface MasterOverallProgressProps {
  masterReport: MasterWeeklyReport;
}

// Row-type classifier based on construction item's ID pattern (copied from constructionProgressToOverall.ts)
function resolveRowType(id: string): 'title' | 'detail' | 'subDetail' | 'custom' {
  if (!id) return 'custom';
  const trimmed = id.trim();
  if (!trimmed) return 'custom';

  // Strict roman numeral: only uppercase I, V, X, L, C, D, M in valid order.
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

// Build scoped source IDs for construction items (copied from constructionProgressToOverall.ts)
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

export default function MasterOverallProgress({ masterReport }: MasterOverallProgressProps) {
  // Debug: Log the received data
  console.log('🔍 MasterOverallProgress - Received masterReport:', {
    constructionProgressKeys: Object.keys(masterReport.aggregated.constructionProgress || {}),
    constructionProgressData: masterReport.aggregated.constructionProgress,
    reportsCount: masterReport.reports?.length || 0
  });

  // Helper to extract percentage from ProgressData
  const extractPercentage = (progressData: ProgressData | number | undefined): number => {
    if (typeof progressData === 'number') return progressData;
    if (progressData && typeof progressData === 'object' && 'percentage' in progressData) {
      return progressData.percentage;
    }
    return 0;
  };

  // Combine and filter all progress rows from all reports using the same logic as constructionProgressToOverall.ts
  const combinedProgressRows = useMemo(() => {
    const allRows: ProgressRow[] = [];

    // Iterate through all projects' construction progress data
    Object.entries(masterReport.aggregated.constructionProgress).forEach(([projectName, projectData]) => {
      if (projectData && projectData.items) {
        // Build scoped IDs for this project's items
        const scopedIds = buildScopedSourceIds(projectData.items);

        // Process each item using the same filtering logic as constructionProgressToOverall.ts
        projectData.items.forEach((item, index) => {
          if (!item?.id) return;

          const rawId = item.id.trim();
          if (!rawId) return;

          const rowType = resolveRowType(rawId);

          // Only allow: title (Roman numerals) and detail (pure integers) - same as constructionProgressToOverall.ts
          if (rowType === 'custom' || rowType === 'subDetail') return;

          const scopedId = scopedIds[index];
          if (!scopedId) return;

          // Transform construction progress item to progress row format
          const prevWeekPct   = extractPercentage(item.previousWeek);
          const thisWeekPct   = extractPercentage(item.thisWeek);
          const upToThisWkPct = extractPercentage(item.upToThisWeek);
          const remainingPct  = extractPercentage(item.remaining) || Math.max(0, 100 - upToThisWkPct);
          const nxtWkPlanPct  = extractPercentage(item.nextWeekPlan);
          const upNxtWkPct    = extractPercentage(item.upToNextWeekPlan) || (upToThisWkPct + nxtWkPlanPct);

          // Clean up scope of works to remove project name if it's included
          let cleanScopeOfWorks = item.scopeOfWorks || item.detailDescription || rawId;
          
          // If scope of works contains project name, try to extract just the scope part
          if (cleanScopeOfWorks && typeof cleanScopeOfWorks === 'string') {
            // Remove project name if it's at the beginning (common pattern: "Project Name - Scope")
            const projectNameIndex = cleanScopeOfWorks.indexOf(' - ');
            if (projectNameIndex > 0) {
              cleanScopeOfWorks = cleanScopeOfWorks.substring(projectNameIndex + 3).trim();
            }
            
            // Remove project name if it's at the beginning followed by colon
            const colonIndex = cleanScopeOfWorks.indexOf(': ');
            if (colonIndex > 0 && colonIndex < 50) { // Only if colon is early in the string
              cleanScopeOfWorks = cleanScopeOfWorks.substring(colonIndex + 2).trim();
            }
          }

          const progressRow: ProgressRow = {
            id: `cp-${scopedId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sourceId: scopedId,
            no: rawId,
            description: cleanScopeOfWorks,
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
          };
          allRows.push(progressRow);
        });
      }
    });

    return allRows;
  }, [masterReport]);

  // Format rows with numbering (same logic as OverallProgressTable.tsx)
  const formattedRows = useMemo(() => {
    // Filter out deleted rows and subDetail rows for cleaner display
    const filtered = combinedProgressRows.filter((row) => {
      if (row.isDeleted) return false;
      if (!row.sourceId) return true;
      const trimmed = row.sourceId.trim();
      const isSingleAlpha = /^[a-zA-Z]$/i.test(trimmed);
      const isRomanIorV = /^(I|V)$/i.test(trimmed);
      return !(isSingleAlpha && !isRomanIorV);
    });

    // Apply numbering using the same logic as OverallProgressTable.tsx
    let titleCount = 0;
    let detailCount = 0;
    let subDetailCount = 0;

    return filtered.map((row) => {
      if (row.rowType === "title") {
        titleCount += 1;
        // New title resets BOTH child counters — the rules call for this.
        detailCount = 0;
        subDetailCount = 0;
        return { ...row, displayIndex: `${toRoman(titleCount)}.` };
      }

      if (row.rowType === "detail") {
        detailCount += 1;
        // New detail resets subDetail — sub-items belong to their nearest detail.
        subDetailCount = 0;
        return { ...row, displayIndex: `${detailCount}.` };
      }

      if (row.rowType === "subDetail") {
        subDetailCount += 1;
        // If a subDetail appears before any detail (edge case — user dragged
        // one above everything), show it as "0.1", "0.2", … Clear signal that
        // it needs a parent.
        const parent = detailCount > 0 ? detailCount : 0;
        return { ...row, displayIndex: `${parent}.${subDetailCount}` };
      }

      // Unknown rowType — leave untouched.
      return { ...row, displayIndex: row.displayIndex ?? "" };
    });
  }, [combinedProgressRows]);

  // Custom formatter for percentage display
  const formatPercentageDisplay = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === "") return "";
    const numValue = typeof value === "string" ? parseFloat(value.replace("%", "")) : value;
    if (isNaN(numValue)) return "";
    return `${numValue.toFixed(1)}%`;
  };

  if (formattedRows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground italic">
        No overall progress data available from any project reports.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Combined Overall Progress</h3>
        <span className="text-sm text-muted-foreground">
          ({masterReport.reports.length} projects)
        </span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground p-4 rounded-lg">
                <th className="text-left px-4 py-2.5 text-sm font-medium w-[5%]">#</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium w-[300px]">
                  Scope of work
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium w-[12%]">
                  % Up to Previous Week
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium w-[12%]">
                  % This Week
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium w-[12%]">
                  % Up to This Week
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium w-[12%]">
                  % Remaining
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium w-[12%]">
                  % Next Week Plan
                </th>
                <th className="text-center px-4 py-2.5 text-sm font-medium w-[12%]">
                  % Up Next Week Plan
                </th>
              </tr>
            </thead>
            <tbody>
              {formattedRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b transition-colors ${
                    row.rowType === "title"
                      ? "bg-slate-200 dark:bg-slate-800/50"
                      : row.rowType === "subDetail"
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-muted/30"
                  }`}
                >
                  <td className={`px-4 py-2 text-sm ${row.rowType === "title" ? "font-semibold text-muted-foreground" : "text-muted-foreground"}`}>
                    {row.displayIndex || ""}
                  </td>

                  {/* Description */}
                  <td className="px-3 py-2">
                    <span className={`text-sm px-2 ${row.rowType === 'title' ? 'font-semibold' : ''}`}>
                      {row.description || <span className="text-muted-foreground italic">—</span>}
                    </span>
                  </td>

                  {/* % Up to Previous Week */}
                  <td className="px-3 py-2 text-center text-sm">
                    {formatPercentageDisplay(row.pctUpToPrevWeek)}
                  </td>

                  {/* % This Week */}
                  <td className="px-3 py-2 text-center text-sm">
                    {formatPercentageDisplay(row.pctThisWeek)}
                  </td>

                  {/* % Up to This Week */}
                  <td className="px-3 py-2 text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                    {formatPercentageDisplay(row.pctUpToThisWeek)}
                  </td>

                  {/* Remaining */}
                  <td className="px-3 py-2 text-center text-sm text-orange-600 dark:text-orange-400">
                    {formatPercentageDisplay(row.pctRemaining)}
                  </td>

                  {/* % Next Week Plan */}
                  <td className="px-3 py-2 text-center text-sm">
                    {formatPercentageDisplay(row.pctNextWeekPlan)}
                  </td>

                  {/* % Up Next Week Plan */}
                  <td className="px-3 py-2 text-center text-sm font-medium text-green-600 dark:text-green-400">
                    {formatPercentageDisplay(row.pctUpNextWeekPlan)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
