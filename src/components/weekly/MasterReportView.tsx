// src/components/weekly/MasterReportView.tsx
// Read-only, dynamically aggregated folder-level weekly report view.
// Reuses shadcn/ui primitives already present in the project.

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Users,
  AlertTriangle,
  Camera,
  Activity,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getMasterWeeklyReport } from '@/services/weeklyReportService';
import type {
  MasterWeeklyReport,
  MasterActivityItem,
  MasterIssueItem,
  PhotoLocation,
} from '@/types/masterReport.types';
import MasterQaqcSection from './MasterQaqcSection';
import MasterHsePhotoSection from './MasterHsePhotoSection';

// ── Helpers ──────────────────────────────────────────────────────────────────

const currentISOWeek = (): number => {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d.getTime() - startOfWeek1.getTime();
  return Math.floor(diff / (7 * 86400000)) + 1;
};

const weekOptions = Array.from({ length: 52 }, (_, i) => i + 1);

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionToggle: React.FC<{ title: string; count?: number; children: React.ReactNode }> = ({
  title,
  count,
  children,
}) => {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between px-4 py-3 font-semibold text-left hover:bg-accent/40 rounded-t-lg transition-colors">
          <span className="flex items-center gap-2">
            {title}
            {count !== undefined && (
              <Badge variant="secondary" className="text-xs">{count}</Badge>
            )}
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
};

// Activities list grouped by source project
const ActivitiesSection: React.FC<{
  items: MasterActivityItem[];
  label: string;
}> = ({ items, label }) => {
  // Group by projectSource for readability
  const grouped = useMemo(() => {
    const map: Record<string, MasterActivityItem[]> = {};
    items.forEach(a => {
      const key = a.projectSource || 'Unknown';
      map[key] = map[key] ? [...map[key], a] : [a];
    });
    return map;
  }, [items]);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No {label.toLowerCase()} recorded.</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([project, acts]) => (
        <div key={project}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {project}
          </p>
          <ul className="space-y-1 pl-3 border-l-2 border-muted">
            {acts.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-muted-foreground">•</span>
                <span className="flex-1">{a.description || '—'}</span>
                {(a.percent ?? 0) > 0 && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {a.percent}%
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

// Issues table
const IssuesSection: React.FC<{ issues: MasterIssueItem[] }> = ({ issues }) => {
  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No issues reported.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-2 font-medium">No.</th>
            <th className="text-left p-2 font-medium">Project</th>
            <th className="text-left p-2 font-medium">Location</th>
            <th className="text-left p-2 font-medium">Problem</th>
            <th className="text-left p-2 font-medium">Action By</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr key={i} className="border-b hover:bg-accent/30">
              <td className="p-2 text-muted-foreground">{issue.no ?? i + 1}</td>
              <td className="p-2 font-medium text-xs">{issue.projectSource}</td>
              <td className="p-2">{issue.location || '—'}</td>
              <td className="p-2">{issue.problem || '—'}</td>
              <td className="p-2">{issue.actionBy || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Photos grouped by project – lazy-renders only visible
const PhotosSection: React.FC<{ byProject: Record<string, PhotoLocation[]> }> = ({ byProject }) => {
  const projects = Object.keys(byProject);
  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No photos available.</p>;
  }
  return (
    <div className="space-y-6">
      {projects.map(projectName => (
        <div key={projectName}>
          <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            {projectName}
          </p>
          {byProject[projectName].map((loc, li) => (
            <div key={li} className="mb-3">
              {(loc.title || loc.location) && (
                <p className="text-xs text-muted-foreground mb-1">{loc.title || loc.location}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {loc.entries.flatMap((entry, ei) =>
                  entry.slots.map((slot, si) =>
                    slot.image ? (
                      <div key={`${ei}-${si}`} className="relative">
                        <img
                          src={slot.image}
                          alt={slot.caption || `Photo ${si + 1}`}
                          className="w-full h-32 object-cover rounded border"
                          loading="lazy"
                        />
                        {slot.caption && (
                          <p className="text-xs text-center mt-1 text-muted-foreground truncate">
                            {slot.caption}
                          </p>
                        )}
                      </div>
                    ) : null
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Manpower summary card table
const ManpowerSection: React.FC<{
  manpower: MasterWeeklyReport['aggregated']['manpower'];
}> = ({ manpower }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b bg-muted/50">
          <th className="text-left p-2 font-medium">Team</th>
          <th className="text-right p-2 font-medium">This Week Total</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b hover:bg-accent/30">
          <td className="p-2">Management</td>
          <td className="p-2 text-right">{manpower.managementTotal}</td>
        </tr>
        <tr className="border-b hover:bg-accent/30">
          <td className="p-2">Working Team (Interior)</td>
          <td className="p-2 text-right">{manpower.workingInteriorTotal}</td>
        </tr>
        <tr className="border-b hover:bg-accent/30">
          <td className="p-2">Working Team (MEP)</td>
          <td className="p-2 text-right">{manpower.workingMEPTotal}</td>
        </tr>
        <tr className="bg-muted/30 font-semibold">
          <td className="p-2">Grand Total</td>
          <td className="p-2 text-right">{manpower.grandTotal}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// Per-project progress table
const ProgressSection: React.FC<{
  progress: MasterWeeklyReport['aggregated']['progress'];
  reports: MasterWeeklyReport['reports'];
}> = ({ progress, reports }) => (
  <div className="space-y-4">
    {/* Weighted average callout */}
    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
      <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">
          Weighted Average Progress
          <span className="ml-1 text-[10px]">(formula: Σ progress×manpower / Σ manpower)</span>
        </p>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          {progress.weighted.toFixed(1)}%
        </p>
      </div>
    </div>

    {/* Per-project breakdown */}
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-2 font-medium">Project</th>
            <th className="text-left p-2 font-medium">Status</th>
            <th className="text-right p-2 font-medium">Progress</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r, i) => (
            <tr key={i} className="border-b hover:bg-accent/30">
              <td className="p-2 font-medium">{r.projectName}</td>
              <td className="p-2">
                <Badge
                  variant="outline"
                  className={
                    r.status === 'submitted'
                      ? 'border-green-400 text-green-700'
                      : r.status === 'approved'
                      ? 'border-blue-400 text-blue-700'
                      : 'border-yellow-400 text-yellow-700'
                  }
                >
                  {r.status}
                </Badge>
              </td>
              <td className="p-2 text-right">
                {(progress.perProject[r.projectId] ?? 0).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Export helpers ────────────────────────────────────────────────────────────

const exportMasterToPdf = async (data: MasterWeeklyReport) => {
  // Dynamically import pdfMake to keep the bundle split
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
  (pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

  const projectRows = data.reports.map(r => [
    r.projectName,
    r.status,
    `${(data.aggregated.progress.perProject[r.projectId] ?? 0).toFixed(1)}%`,
    r.activityCount.toString(),
    r.issueCount.toString(),
  ]);

  const actRows = data.aggregated.activities.weeklyActivities.map(a => [
    a.projectSource,
    a.description,
    `${a.percent ?? 0}%`,
  ]);

  const issueRows = data.aggregated.issues.map((iss, i) => [
    String(iss.no ?? i + 1),
    iss.projectSource,
    iss.location ?? '',
    iss.problem ?? '',
    iss.actionBy ?? '',
  ]);

  const mp = data.aggregated.manpower;

  const docDefinition: any = {
    pageSize: 'A4',
    content: [
      {
        text: `📊 Master Weekly Report – Week ${data.weekNumber}`,
        style: 'title',
        margin: [0, 0, 0, 4],
      },
      { text: `Folder: ${data.folder.name}`, style: 'subtitle', margin: [0, 0, 0, 16] },

      // Summary stats
      {
        columns: [
          { text: `Projects: ${data.reports.length}`, style: 'stat' },
          {
            text: `Weighted Progress: ${data.aggregated.progress.weighted.toFixed(1)}%`,
            style: 'stat',
          },
          { text: `Total Manpower: ${mp.grandTotal}`, style: 'stat' },
        ],
        margin: [0, 0, 0, 16],
      },

      // Project summary table
      data.reports.length > 0
        ? [
            { text: 'Project Summaries', style: 'sectionHeader', margin: [0, 0, 0, 6] },
            {
              table: {
                widths: ['*', 70, 60, 50, 50],
                body: [
                  ['Project', 'Status', 'Progress', 'Activities', 'Issues'],
                  ...projectRows,
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 16],
            },
          ]
        : [],

      // Activities
      actRows.length > 0
        ? [
            {
              text: 'This Week Activities',
              style: 'sectionHeader',
              margin: [0, 0, 0, 6],
            },
            {
              table: {
                widths: [80, '*', 40],
                body: [['Project', 'Activity', '%'], ...actRows],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 16],
            },
          ]
        : [],

      // Manpower
      {
        text: 'Manpower Summary',
        style: 'sectionHeader',
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          widths: ['*', 80],
          body: [
            ['Team', 'This Week'],
            ['Management', mp.managementTotal],
            ['Working (Interior)', mp.workingInteriorTotal],
            ['Working (MEP)', mp.workingMEPTotal],
            [{ text: 'Grand Total', bold: true }, { text: mp.grandTotal, bold: true }],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
      },

      // Issues
      issueRows.length > 0
        ? [
            { text: 'Construction Issues', style: 'sectionHeader', margin: [0, 0, 0, 6] },
            {
              table: {
                widths: [20, 60, '*', '*', 60],
                body: [
                  ['No.', 'Project', 'Location', 'Problem', 'Action By'],
                  ...issueRows,
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 16],
            },
          ]
        : [],
    ],
    styles: {
      title: { fontSize: 16, bold: true },
      subtitle: { fontSize: 11, color: '#666' },
      stat: { fontSize: 10, color: '#444' },
      sectionHeader: { fontSize: 12, bold: true, color: '#1d4ed8' },
    },
    defaultStyle: { fontSize: 9 },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Master_Report_${data.folder.name}_Week${data.weekNumber}.pdf`);
};

// ── Main component ────────────────────────────────────────────────────────────

interface MasterReportViewProps {
  folderId: string;
}

const MasterReportView: React.FC<MasterReportViewProps> = ({ folderId }) => {
  const navigate = useNavigate();
  const [weekNumber, setWeekNumber] = useState<number>(currentISOWeek());

  const { data, isLoading, error } = useQuery({
    queryKey: ['masterReport', folderId, weekNumber],
    queryFn: () => getMasterWeeklyReport(folderId, weekNumber),
    enabled: !!folderId,
    staleTime: 2 * 60 * 1000, // 2 min – data changes when underlying reports are submitted
  });

  const report: MasterWeeklyReport | undefined = data?.success ? data.data : undefined;

  const summaryCards = useMemo(() => {
    if (!report) return null;
    const mp = report.aggregated.manpower;
    const progress = report.aggregated.progress;
    return [
      {
        label: 'Projects Reporting',
        value: report.reports.length,
        icon: <Activity className="h-4 w-4 text-blue-500" />,
      },
      {
        label: 'Weighted Progress',
        value: `${progress.weighted.toFixed(1)}%`,
        icon: <BarChart3 className="h-4 w-4 text-green-500" />,
      },
      {
        label: 'Total Manpower',
        value: mp.grandTotal,
        icon: <Users className="h-4 w-4 text-purple-500" />,
      },
      {
        label: 'Open Issues',
        value: report.aggregated.issues.length,
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      },
      {
        label: 'Photo Groups',
        value: Object.keys(report.aggregated.photos).length,
        icon: <Camera className="h-4 w-4 text-pink-500" />,
      },
    ];
  }, [report]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h1 className="text-xl font-bold">Master Weekly Report</h1>
            </div>
            {report && (
              <p className="text-sm text-muted-foreground">
                Folder: <span className="font-medium">{report.folder.name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Week selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Week</span>
            <Select
              value={weekNumber.toString()}
              onValueChange={v => setWeekNumber(parseInt(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map(w => (
                  <SelectItem key={w} value={w.toString()}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PDF export */}
          {report && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMasterToPdf(report)}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">Failed to load master report.</p>
          <p className="text-sm text-muted-foreground mt-1">{String(error)}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && report && report.reports.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No reports for Week {weekNumber}</p>
          <p className="text-sm mt-1">
            No projects in this folder have submitted a weekly report for the selected week.
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && report && report.reports.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {summaryCards?.map((card, i) => (
              <Card key={i} className="shadow-none">
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {card.icon}
                    <span className="text-xs">{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Project summaries */}
          <SectionToggle title="Project Summaries" count={report.reports.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Project</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-right p-2 font-medium">Progress</th>
                    <th className="text-right p-2 font-medium">Activities</th>
                    <th className="text-right p-2 font-medium">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {report.reports.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-accent/30">
                      <td className="p-2 font-medium">{r.projectName}</td>
                      <td className="p-2">
                        <Badge
                          variant="outline"
                          className={
                            r.status === 'submitted'
                              ? 'border-green-400 text-green-700 dark:text-green-400'
                              : r.status === 'approved'
                              ? 'border-blue-400 text-blue-700 dark:text-blue-400'
                              : 'border-yellow-400 text-yellow-700 dark:text-yellow-400'
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">
                        {(report.aggregated.progress.perProject[r.projectId] ?? 0).toFixed(1)}%
                      </td>
                      <td className="p-2 text-right">{r.activityCount}</td>
                      <td className="p-2 text-right">{r.issueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionToggle>

          {/* Progress */}
          <SectionToggle title="Progress Overview">
            <ProgressSection
              progress={report.aggregated.progress}
              reports={report.reports}
            />
          </SectionToggle>

          {/* Manpower */}
          <SectionToggle title="Manpower Summary">
            <ManpowerSection manpower={report.aggregated.manpower} />
          </SectionToggle>

          {/* Activities – This Week */}
          <SectionToggle
            title="This Week Activities"
            count={report.aggregated.activities.weeklyActivities.length}
          >
            <ActivitiesSection
              items={report.aggregated.activities.weeklyActivities}
              label="Activities"
            />
          </SectionToggle>

          {/* Activities – Next Week Plan */}
          <SectionToggle
            title="Next Week Plan"
            count={report.aggregated.activities.nextWeekPlan.length}
          >
            <ActivitiesSection
              items={report.aggregated.activities.nextWeekPlan}
              label="Next Week Plan"
            />
          </SectionToggle>

          {/* Issues */}
          <SectionToggle
            title="Construction Issues"
            count={report.aggregated.issues.length}
          >
            <IssuesSection issues={report.aggregated.issues} />
          </SectionToggle>

          {/* QAQC Status */}
          <SectionToggle
            title="QA/QC Status"
            count={report.aggregated.qaqcStatus ? Object.values(report.aggregated.qaqcStatus).reduce((sum, section) => sum + section.items.length, 0) : 0}
          >
            <MasterQaqcSection qaqcData={report.aggregated.qaqcStatus || {}} />
          </SectionToggle>

          {/* HSE Photo References */}
          {(() => {
            console.log('🔍 Frontend: Checking HSE Photo References:', {
              hasAggregated: !!report.aggregated,
              hasHses: !!report.aggregated?.hses,
              hasPhotoReferences: !!report.aggregated?.hses?.hsePhotoReferences,
              hsesData: report.aggregated?.hses,
              photoReferences: report.aggregated?.hses?.hsePhotoReferences
            });
            return report.aggregated?.hses?.hsePhotoReferences;
          })() && (
            <SectionToggle
              title="HSE Photo References"
              count={
                (report.aggregated.hses.hsePhotoReferences.hseToolboxMeeting?.reduce((sum, section) => 
                  sum + section.entries?.reduce((entrySum, entry) => 
                    entrySum + (entry.slots?.filter(slot => slot.image).length || 0), 0) || 0, 0) || 0) +
                (report.aggregated.hses.hsePhotoReferences.hseActivityPhotos?.reduce((sum, section) => 
                  sum + section.entries?.reduce((entrySum, entry) => 
                    entrySum + (entry.slots?.filter(slot => slot.image).length || 0), 0) || 0, 0) || 0)
              }
            >
              <MasterHsePhotoSection hsePhotoReferences={report.aggregated.hses.hsePhotoReferences} />
            </SectionToggle>
          )}

          {/* Photos */}
          <SectionToggle
            title="Site Photos (by Project)"
            count={Object.keys(report.aggregated.photos).length}
          >
            <PhotosSection byProject={report.aggregated.photos} />
          </SectionToggle>
        </>
      )}
    </div>
  );
};

export default MasterReportView;
