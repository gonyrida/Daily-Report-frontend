// src/components/weekly/MasterReportConstructionProgress.tsx
// Read-only display of aggregated construction progress for master report

import React from 'react';
import { Building2, Folder } from 'lucide-react';
import { MasterConstructionProgressItem } from '@/types/masterReport.types';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const projects = Object.entries(constructionProgress);

  if (projects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20" />
          <div className={`relative p-4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
            <Building2 className={`h-10 w-10 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        </div>
        <p className={`text-lg font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          No Construction Progress Data
        </p>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          No construction progress data available for this week
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
      {/* Section Header */}
      <div className="flex items-center gap-2 pt-2">
        <div className={`w-2 h-2 ${isDark ? 'bg-blue-400' : 'bg-blue-500'} rounded-full`} />
        <span className={`text-xs sm:text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
          Construction Progress
        </span>
      </div>

      {projects.map(([projectName, data]) => (
        <div
          key={projectName}
          className={`${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50' : 'bg-gradient-to-br from-white to-blue-50/20 border-blue-100/50'} rounded-2xl border overflow-hidden`}
        >
          {/* Project Header */}
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-b ${isDark ? 'border-slate-700/50 bg-gradient-to-r from-indigo-600/20 to-transparent' : 'border-blue-100/50 bg-gradient-to-r from-indigo-50/50 to-transparent'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                <Folder className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <div>
                <h3 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {data.projectInfo.project}
                </h3>
                {data.projectInfo.subtitle && (
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {data.projectInfo.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Construction Progress Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-blue-50/40 border-blue-100/50'}`}>
                  {['No.', 'Description', 'Unit', 'BoQ Amount', 'Previous %', 'This Week %', 'Up to This Week %', 'Remaining %', 'Next Week %'].map((header, i) => (
                    <th
                      key={header}
                      className={`px-4 py-3 font-semibold text-xs uppercase tracking-wide ${i === 0 || i === 2 ? 'text-center' : i >= 3 ? 'text-right' : 'text-left'} ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={`border-b transition-colors duration-150 ${isDark ? 'border-slate-700/30 hover:bg-slate-700/20' : 'border-blue-50 hover:bg-blue-50/30'}`}
                  >
                    <td className={`px-4 py-3 text-center font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {item.id || index + 1}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {item.scopeOfWorks || '-'}
                    </td>
                    <td className={`px-4 py-3 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.unit || '-'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.boQ?.amount?.toLocaleString() ?? '-'}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.previousWeek?.percentage ? `${item.previousWeek.percentage}%` : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {item.thisWeek?.percentage ? `${item.thisWeek.percentage}%` : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${isDark ? 'text-cyan-300' : 'text-indigo-700'}`}>
                      {item.upToThisWeek?.percentage ? `${item.upToThisWeek.percentage}%` : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.remaining?.percentage ? `${item.remaining.percentage}%` : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                      {item.nextWeekPlan?.percentage ? `${item.nextWeekPlan.percentage}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 border-t ${isDark ? 'border-slate-700/50 bg-slate-800/40' : 'border-blue-100/50 bg-blue-50/20'}`}
          >
            <div className={`w-1.5 h-1.5 ${isDark ? 'bg-blue-400' : 'bg-blue-500'} rounded-full`} />
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Items: <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data.items.length}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MasterReportConstructionProgress;
