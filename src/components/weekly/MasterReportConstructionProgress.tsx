// src/components/weekly/MasterReportConstructionProgress.tsx
// Read-only display of aggregated construction progress for master report

import React from 'react';
import { Building2, Folder } from 'lucide-react';
import { MasterConstructionProgressItem } from '@/types/masterReport.types';

interface MasterReportConstructionProgressProps {
  constructionProgress: Record<string, {
    projectInfo: {
      project: string;
      subtitle: string;
    };
    items: MasterConstructionProgressItem[];
  }>;
}

const MasterReportConstructionProgress: React.FC<MasterReportConstructionProgressProps> = ({
  constructionProgress
}) => {
  const projects = Object.entries(constructionProgress);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Building2 className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Construction Progress Data</p>
        <p className="text-sm">No construction progress data available for this week</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {projects.map(([projectName, data]) => (
        <div key={projectName} className="bg-card rounded-lg border overflow-hidden">
          {/* Project Header */}
          <div className="bg-muted/50 px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <Folder className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">{data.projectInfo.project}</h3>
                {data.projectInfo.subtitle && (
                  <p className="text-sm text-muted-foreground">{data.projectInfo.subtitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Construction Progress Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="px-4 py-3 text-left font-medium">No.</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-center font-medium">Unit</th>
                  <th className="px-4 py-3 text-right font-medium">BoQ Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Previous %</th>
                  <th className="px-4 py-3 text-right font-medium">This Week %</th>
                  <th className="px-4 py-3 text-right font-medium">Up to This Week %</th>
                  <th className="px-4 py-3 text-right font-medium">Remaining %</th>
                  <th className="px-4 py-3 text-right font-medium">Next Week %</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={item.id || index} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{item.id || index + 1}</td>
                    <td className="px-4 py-3">{item.scopeOfWorks || '-'}</td>
                    <td className="px-4 py-3 text-center">{item.unit || '-'}</td>
                    <td className="px-4 py-3 text-right">{item.boQ?.amount?.toLocaleString() ?? '-'}</td>
                    <td className="px-4 py-3 text-right">{item.previousWeek?.percentage ? `${item.previousWeek.percentage}%` : '-'}</td>
                    <td className="px-4 py-3 text-right">{item.thisWeek?.percentage ? `${item.thisWeek.percentage}%` : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      {item.upToThisWeek?.percentage ? `${item.upToThisWeek.percentage}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">{item.remaining?.percentage ? `${item.remaining.percentage}%` : '-'}</td>
                    <td className="px-4 py-3 text-right">{item.nextWeekPlan?.percentage ? `${item.nextWeekPlan.percentage}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-muted/20 px-6 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Total Items: {data.items.length}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MasterReportConstructionProgress;
