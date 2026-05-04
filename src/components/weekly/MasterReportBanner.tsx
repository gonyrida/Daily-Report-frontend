// src/components/weekly/MasterReportBanner.tsx
// Banner component displayed when viewing Master Report in WeeklyReportContent

import React from 'react';
import { Folder } from 'lucide-react';
import { MasterReportMetadata } from '@/utils/masterReportTransform';

interface MasterReportBannerProps {
  metadata: MasterReportMetadata;
}

const MasterReportBanner: React.FC<MasterReportBannerProps> = ({ metadata }) => {
  const { folderName, weekNumber } = metadata;

  return (
    <div className="mb-6">
      {/* Main Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Folder className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Master Weekly Report</h2>
            <p className="text-sm text-blue-100">
              {folderName} • Week {weekNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterReportBanner;
