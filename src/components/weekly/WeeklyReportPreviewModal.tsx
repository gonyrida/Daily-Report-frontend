import React, { useState } from 'react';
import { X, Edit3, Save, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyReport {
  id: string;
  userId: string;
  projectName: string;
  weekStart: Date;
  weekEnd: Date;
  totalReports: number;
  submittedReports: number;
  manpower: number;
  machineryTypes: number;
  materialTypes: number;
  overallProgress: string;
}

interface WeeklyReportPreviewModalProps {
  report: WeeklyReport;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave: (editedData: any) => void;
}

const WeeklyReportPreviewModal: React.FC<WeeklyReportPreviewModalProps> = ({
  report,
  mode,
  onClose,
  onSave
}) => {
  const [editedReport, setEditedReport] = useState(report);
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(editedReport);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (mode === 'edit') {
      setEditedReport(report);
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Weekly Report' : 'Weekly Report Preview'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {report.projectName} • {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit Report"
              >
                <Edit3 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedReport.projectName}
                      onChange={(e) => setEditedReport({
                        ...editedReport,
                        projectName: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{report.projectName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Period
                  </label>
                  <p className="text-gray-900">
                    {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
                  </p>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
              {isEditing ? (
                <textarea
                  value={editedReport.overallProgress}
                  onChange={(e) => setEditedReport({
                    ...editedReport,
                    overallProgress: e.target.value
                  })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter overall progress summary..."
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {report.overallProgress || 'No progress data available'}
                  </p>
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{report.totalReports}</div>
                  <div className="text-sm text-blue-600 font-medium">Total Reports</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{report.submittedReports}</div>
                  <div className="text-sm text-green-600 font-medium">Submitted</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{report.manpower}</div>
                  <div className="text-sm text-purple-600 font-medium">Manpower</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {report.machineryTypes + report.materialTypes}
                  </div>
                  <div className="text-sm text-orange-600 font-medium">Resource Types</div>
                </div>
              </div>
            </div>

            {/* Resource Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Manpower</h4>
                  <p className="text-2xl font-bold text-gray-900">{report.manpower}</p>
                  <p className="text-sm text-gray-600">Total personnel</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Machinery</h4>
                  <p className="text-2xl font-bold text-gray-900">{report.machineryTypes}</p>
                  <p className="text-sm text-gray-600">Equipment types</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Materials</h4>
                  <p className="text-2xl font-bold text-gray-900">{report.materialTypes}</p>
                  <p className="text-sm text-gray-600">Material types</p>
                </div>
              </div>
            </div>

            {/* Daily Reports Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Status</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                  <span className="text-sm font-bold text-gray-900">
                    {report.totalReports > 0 
                      ? Math.round((report.submittedReports / report.totalReports) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${report.totalReports > 0 
                        ? (report.submittedReports / report.totalReports) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>{report.submittedReports} submitted</span>
                  <span>{report.totalReports - report.submittedReports} draft</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
              title="Export options will be available here"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportPreviewModal;
