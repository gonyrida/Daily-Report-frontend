/**
 * WeeklyReportExcelExport.tsx
 * Place at: src/components/weekly/WeeklyReportExcelExport.tsx
 *
 * Drop-in export button for the WeeklyReport.tsx top toolbar.
 *
 * Usage in WeeklyReport.tsx:
 * ─────────────────────────────────────────────────────────
 * import { WeeklyReportExcelExport } from "@/components/weekly/WeeklyReportExcelExport";
 * import { buildWeeklyReportExportData } from "@/lib/Weeklyreportexcelmapper";
 *
 * // Inside your component:
 * const excelData = buildWeeklyReportExportData({
 *   coverData,
 *   constructionProgress,
 *   overallProgress,
 *   nwdpItems,
 *   qaqcSections,
 *   hseTraining, hseInspection, hsePermits,
 *   weekDates, manpowerRows, materialRows, equipmentRows,
 *   sitePhotoCaptions,
 *   constructionIssues,
 * });
 *
 * <WeeklyReportExcelExport reportData={excelData} />
 * ─────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { FileSpreadsheet, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportWeeklyReportToExcel, type WeeklyReportExportData } from "@/lib/weeklyreportexcel";

interface Props {
  reportData: WeeklyReportExportData;
  filename?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

// Single-section partial export (keeps cover info)
function exportSection(
  reportData: WeeklyReportExportData,
  key: keyof WeeklyReportExportData,
  label: string
) {
  const partial: WeeklyReportExportData = {
    weekNumber:     reportData.weekNumber,
    reportDateFrom: reportData.reportDateFrom,
    reportDateTo:   reportData.reportDateTo,
    projectTitle:   reportData.projectTitle,
    contractor:     reportData.contractor,
    [key]: reportData[key],
  };
  exportWeeklyReportToExcel(
    partial,
    `WeeklyReport_${label}_W${reportData.weekNumber ?? "XX"}.xlsx`
  );
}

export function WeeklyReportExcelExport({ reportData, filename, className, variant = "outline" }: Props) {
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => void) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 100));
    try { fn(); } catch (e) { console.error("Excel export error:", e); }
    finally { setLoading(false); }
  };

  const btnClass =
    "border-emerald-600 text-emerald-700 hover:bg-emerald-50 " +
    "dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950";

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {/* Primary — export all */}
      <Button
        variant={variant}
        size="sm"
        disabled={loading}
        onClick={() => run(() => exportWeeklyReportToExcel(reportData, filename))}
        className={`gap-2 rounded-r-none ${btnClass}`}
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <FileSpreadsheet className="h-4 w-4" />}
        {loading ? "Exporting…" : "Export Excel"}
      </Button>

      {/* Dropdown — per-section */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            disabled={loading}
            className={`rounded-l-none border-l-0 px-2 ${btnClass}`}
            aria-label="Export options"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            className="font-semibold"
            onClick={() => run(() => exportWeeklyReportToExcel(reportData, filename))}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            Export All (12 sheets)
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {([
            ["conProgressItems",    "ConProgress"],
            ["overallProgressItems","OverallProgress"],
            ["nwdpItems",          "Activities"],
            ["qaqcSections",       "QAQC"],
            ["hseTraining",        "HSE"],
            ["manpowerRows",       "Resources"],
            ["sitePhotoCaptions",  "SitePhotos"],
            ["constructionIssues", "Issues"],
          ] as [keyof WeeklyReportExportData, string][]).map(([key, label]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => run(() => exportSection(reportData, key, label))}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default WeeklyReportExcelExport;