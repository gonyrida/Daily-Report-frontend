import React from 'react';
import { X, Eye, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklySummaryData {
  period: {
    start: string;
    end: string;
  };
  totalReports: number;
  submittedReports: number;
  projectName: string;
  overallProgress: string;
  manpower: number;
  machineryTypes: number;
  materialTypes: number;
}

interface WeeklyReportSummaryProps {
  summary: WeeklySummaryData;
  onClose: () => void;
  onPreview: () => void;
  onExport: (format: 'pdf' | 'excel' | 'zip') => void;
}

const WeeklyReportSummary: React.FC<WeeklyReportSummaryProps> = ({
  summary,
  onClose,
  onPreview,
  onExport
}) => {
  const handleExport = (format: 'pdf' | 'excel' | 'zip') => {
    onExport(format);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Weekly Report Summary</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Project Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{summary.projectName}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="h-4 w-4 mr-2" />
              Period: {summary.period.start} to {summary.period.end}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.totalReports}</div>
              <div className="text-sm text-blue-600 font-medium">Total Reports</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.submittedReports}</div>
              <div className="text-sm text-green-600 font-medium">Submitted</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.manpower}</div>
              <div className="text-sm text-purple-600 font-medium">Manpower</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {summary.machineryTypes + summary.materialTypes}
              </div>
              <div className="text-sm text-orange-600 font-medium">Resources</div>
            </div>
          </div>

          {/* Progress Summary */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Overall Progress</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {summary.overallProgress || 'No progress data available'}
              </p>
            </div>
          </div>

          {/* Resource Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Resources</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Manpower</span>
                  <span className="text-sm font-bold text-gray-900">{summary.manpower} personnel</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Machinery Types</span>
                  <span className="text-sm font-bold text-gray-900">{summary.machineryTypes}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Material Types</span>
                  <span className="text-sm font-bold text-gray-900">{summary.materialTypes}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Report Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                  <span className="text-sm font-bold text-gray-900">
                    {summary.totalReports > 0 
                      ? Math.round((summary.submittedReports / summary.totalReports) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Draft Reports</span>
                  <span className="text-sm font-bold text-gray-900">
                    {summary.totalReports - summary.submittedReports}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </button>
            <button
              onClick={() => handleExport('zip')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              ZIP
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onPreview}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportSummary;
