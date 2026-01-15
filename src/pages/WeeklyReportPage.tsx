import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Eye, Edit, Calendar, Users, Wrench, Package } from 'lucide-react';
import { toast } from 'sonner';
import WeeklyReportSearch from '../components/weekly/WeeklyReportSearch';
import WeeklyReportSummary from '../components/weekly/WeeklyReportSummary';
import WeeklyReportPreviewModal from '../components/weekly/WeeklyReportPreviewModal';
import { getWeeklyReports, getWeeklyReportSummary, exportWeeklyReport } from '../services/weeklyReportService';

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

interface WeeklyReportSummary {
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

const WeeklyReportPage: React.FC = () => {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [summaryData, setSummaryData] = useState<WeeklyReportSummary | null>(null);
  const [previewMode, setPreviewMode] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    fetchWeeklyReports();
  }, []);

  useEffect(() => {
    // Filter reports based on search query
    if (searchQuery.trim() === '') {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter(report =>
        report.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredReports(filtered);
    }
  }, [searchQuery, reports]);

  const fetchWeeklyReports = async () => {
    try {
      setLoading(true);
      const response = await getWeeklyReports(searchQuery);
      setReports(response.data);
      setFilteredReports(response.data);
    } catch (error) {
      console.error('Error fetching weekly reports:', error);
      toast.error('Failed to fetch weekly reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleGenerateSummary = async (report: WeeklyReport) => {
    try {
      setSelectedReport(report);
      const weekStart = report.weekStart.toISOString().split('T')[0];
      const response = await getWeeklyReportSummary(weekStart, report.projectName);
      setSummaryData(response.data);
      setShowSummaryModal(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate report summary');
    }
  };

  const handlePreviewReport = (report: WeeklyReport, mode: 'view' | 'edit' = 'view') => {
    setSelectedReport(report);
    setPreviewMode(mode);
    setShowPreviewModal(true);
  };

  const handleExport = async (report: WeeklyReport, format: 'pdf' | 'excel' | 'zip') => {
    try {
      const weekStart = report.weekStart.toISOString().split('T')[0];
      const weekEnd = report.weekEnd.toISOString().split('T')[0];
      
      await exportWeeklyReport({
        startDate: weekStart,
        endDate: weekEnd,
        projectName: report.projectName,
        format,
        data: {
          summary: {
            period: { start: weekStart, end: weekEnd },
            totalReports: report.totalReports,
            submittedReports: report.submittedReports,
            projectName: report.projectName,
            overallProgress: report.overallProgress,
            manpower: report.manpower,
            machineryTypes: report.machineryTypes,
            materialTypes: report.materialTypes
          }
        }
      });
      
      toast.success(`Weekly report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Failed to export report as ${format.toUpperCase()}`);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Reports</h1>
        <p className="text-gray-600">Manage and export your weekly construction reports</p>
      </div>

      {/* Search Component */}
      <WeeklyReportSearch onSearch={handleSearch} loading={loading} />

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No reports found' : 'No weekly reports available'}
          </h3>
          <p className="text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search criteria'
              : 'Weekly reports will appear here once you have daily reports for a complete week'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {report.projectName}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{report.totalReports}</div>
                  <div className="text-xs text-gray-500">Total Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{report.submittedReports}</div>
                  <div className="text-xs text-gray-500">Submitted</div>
                </div>
              </div>

              {/* Resources */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    Manpower
                  </div>
                  <span className="font-medium">{report.manpower}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Wrench className="w-4 h-4 mr-2" />
                    Machinery
                  </div>
                  <span className="font-medium">{report.machineryTypes} types</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Package className="w-4 h-4 mr-2" />
                    Materials
                  </div>
                  <span className="font-medium">{report.materialTypes} types</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleGenerateSummary(report)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Generate
                </button>
                <button
                  onClick={() => handlePreviewReport(report, 'view')}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </button>
                <button
                  onClick={() => handlePreviewReport(report, 'edit')}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <div className="relative group">
                  <button className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center">
                    <Download className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => handleExport(report, 'pdf')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={() => handleExport(report, 'excel')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export as Excel
                    </button>
                    <button
                      onClick={() => handleExport(report, 'zip')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export as ZIP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && summaryData && selectedReport && (
        <WeeklyReportSummary
          summary={summaryData}
          onClose={() => setShowSummaryModal(false)}
          onPreview={() => handlePreviewReport(selectedReport)}
          onExport={(format) => handleExport(selectedReport, format)}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedReport && (
        <WeeklyReportPreviewModal
          report={selectedReport}
          mode={previewMode}
          onClose={() => setShowPreviewModal(false)}
          onSave={(editedData) => {
            // Handle save logic here
            console.log('Saving edited report:', editedData);
            toast.success('Report saved successfully');
            setShowPreviewModal(false);
          }}
        />
      )}
    </div>
  );
};

export default WeeklyReportPage;
