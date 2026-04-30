import React from "react";
import ReferenceSection from "../../ReferenceSection";
import { createDefaultSiteActivitiesSections } from "@/utils/referenceHelpers";
import { RefreshCw, ImageIcon } from "lucide-react";
import { updateReportImages, previewAggregatedImages } from "@/services/weeklyReportService";

interface SitePhotosProps {
  data?: {
    title?: string;
    locations?: any[];
  };
  onChange?: (data: any) => void;
  isEditing?: boolean;
  reportId?: string;
  sharedData?: any;
}

const SitePhotos: React.FC<SitePhotosProps> = ({ 
  data, 
  onChange, 
  isEditing = false,
  reportId,
  sharedData
}) => {
  const [isAggregating, setIsAggregating] = React.useState(false);
  
  const photosData = data || {
    title: "Site Activities Photos",
    locations: createDefaultSiteActivitiesSections()
  };

  const handleAggregateSitePhotos = async () => {
    // Check if we have the required data
    if (!sharedData?.dateRange || (!sharedData?.projectId && !sharedData?.projectName)) {
      alert('Project and date range are required for image aggregation');
      return;
    }

    setIsAggregating(true);
    try {
      // Parse date range "DD-MMM-YY ~ DD-MMM-YY"
      const dateRangeStr = sharedData.dateRange.trim().replace(/\s*~\s*/, '~');
      const [startDateStr, endDateStr] = dateRangeStr.split('~');

      const parseDate = (dateStr: string) => {
        const cleanDateStr = dateStr.trim();
        const [day, month, year] = cleanDateStr.split('-');
        const monthMap: { [key: string]: string } = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
          'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const fullYear = `20${year}`;
        return `${fullYear}-${monthMap[month]}-${day.padStart(2, '0')}`;
      };

      const startDate = parseDate(startDateStr);
      const endDate = parseDate(endDateStr);

      if (reportId) {
        // Saved report: Update directly in database
        const result = await updateReportImages(reportId, { maxImagesPerReport: 2 });

        if (result.success && result.data) {
          const newPhotosData = result.data.sections?.photos;
          onChange?.(newPhotosData);
          alert(`✅ Successfully aggregated ${result.aggregated?.sitePhotoCount || 0} site photos from ${result.aggregated?.dailyReportCount || 0} daily reports`);
        } else {
          alert(`Aggregation failed: ${result.error}`);
        }
      } else {
        // Unsaved report: Preview and update local state only
        const projectIdentifier = sharedData.projectId || sharedData.projectName;
        const result = await previewAggregatedImages(
          projectIdentifier,
          startDate,
          endDate,
          { useProjectId: !!sharedData.projectId, maxImagesPerReport: 2 }
        );

        if (result.success && result.data) {
          const newPhotosData = result.data.photosSection || {
            title: "Site Activities Photos",
            locations: []
          };
          onChange?.(newPhotosData);
          alert(`✅ Preview: ${result.data.sitePhotoCount || 0} site photos from ${result.data.dailyReportCount || 0} daily reports. Will be saved when you save the report.`);
        } else {
          alert(`Aggregation failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error aggregating site photos:', error);
      alert('Error during image aggregation');
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">7</span> Site Activity Photos
        </h3>
        
        <button
          onClick={handleAggregateSitePhotos}
          disabled={isAggregating || !sharedData?.dateRange || (!sharedData?.projectId && !sharedData?.projectName)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={!sharedData?.dateRange || (!sharedData?.projectId && !sharedData?.projectName) ? "Project and date range are required" : reportId ? "Aggregate images from daily reports" : "Preview images (will save when report is saved)"}
        >
          <ImageIcon className="w-4 h-4" />
          <RefreshCw className={`w-4 h-4 ${isAggregating ? 'animate-spin' : ''}`} />
          {isAggregating ? 'Aggregating...' : reportId ? 'Aggregate Images' : 'Preview Images'}
        </button>
      </div>

      {/* Photos display */}
      <ReferenceSection
        sections={photosData.locations || createDefaultSiteActivitiesSections()}
        setSections={(sections) => onChange?.({ title: photosData.title || "Site Activities Photos", locations: sections })}
        hideTitle={true}
        hideShadow={true}
      />
    </div>
  );
};

export default SitePhotos;
