import React from "react";
import HsesTableComponent from "./HsesTableComponent";
import ReferenceSection from "../../ReferenceSection";
import { createReferenceSection } from "@/utils/referenceHelpers";
import { HsesData, HsesProps } from "@/types/hses.types";
import { createHSESections, createHSEActivityPhotoSections } from "@/utils/hseSectionUtils";
import { defaultHsesData } from "@/hooks/useHsesData";
import { RefreshCw, ImageIcon } from "lucide-react";
import { updateReportImages, previewAggregatedImages } from "@/services/weeklyReportService";

const Hses: React.FC<HsesProps & { 
  sharedData?: any;
  reportId?: string;
}> = ({ data, onChange, isEditing = false, sharedData, reportId }) => {
  
  const hsesData = data || defaultHsesData;
  const [isAggregating, setIsAggregating] = React.useState(false);

  const updateData = (section: keyof HsesData, value: any) => {
    const newData = { ...hsesData, [section]: value };
    onChange?.(newData);
  };

  const handleAggregateImages = async () => {
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
          const newHsesData = {
            ...hsesData,
            hsePhotoReferences: result.data.sections?.hses?.hsePhotoReferences
          };
          onChange?.(newHsesData);
          alert(`✅ Successfully aggregated ${result.aggregated?.hsePhotoCount || 0} HSE photos from ${result.aggregated?.dailyReportCount || 0} daily reports`);
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
          const newHsesData = {
            ...hsesData,
            hsePhotoReferences: result.data.hsePhotoReferences
          };
          onChange?.(newHsesData);
          alert(`✅ Preview: ${result.data.hsePhotoCount || 0} HSE photos from ${result.data.dailyReportCount || 0} daily reports. Will be saved when you save the report.`);
        } else {
          alert(`Aggregation failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error aggregating images:', error);
      alert('Error during image aggregation');
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* <h3 className="text-lg font-semibold text-gray-800">
        5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
      </h3> */}

      {/* 5.1 HSES Training */}
      <div className="section-card p-4 sm:p-6">
        <div className="mb-3">
          <h4 className="text-sm sm:text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.1</span> 
            <span className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span>HSES Training / Introduction / Toolbox Meeting</span>
            </span>
          </h4>
        </div>
        <HsesTableComponent
          data={hsesData.training}
          onChange={(training) => updateData("training", training)}
          isEditing={isEditing}
          columns={[
            { key: "typeOfTraining", label: "Type of Training", type: "text", placeholder: "Enter training type", width: "min-w-36" },
            { key: "date", label: "Date", type: "date" },
            { key: "venue", label: "Venue", type: "text", placeholder: "Enter venue", width: "min-w-36" },
            { key: "trainer", label: "Trainer", type: "text", placeholder: "Enter trainer name", width: "min-w-36" },
            { key: "attendee", label: "Attendee", type: "text", placeholder: "Enter attendee", width: "min-w-36" },
            { key: "remarks", label: "Remarks", type: "text", placeholder: "Enter remarks", width: "min-w-36" }
          ]}
          emptyMessage="No training records available"
          addButtonText="Add Training"
        />
      </div>

      {/* 5.2 HSES Inspection */}
      <div className="section-card p-4 sm:p-6">
        <div className="mb-3">
          <h4 className="text-sm sm:text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.2</span> 
            <span className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span>HSES Inspection / Audit / Heavy Equipment</span>
              <span className="text-xs sm:text-sm">/ Hand&Power Tool Checklist</span>
            </span>
          </h4>
        </div>
        <HsesTableComponent
          data={hsesData.inspection}
          onChange={(inspection) => updateData("inspection", inspection)}
          isEditing={isEditing}
          columns={[
            { key: "typeOfInspection", label: "Type of Inspection", type: "text", placeholder: "Enter inspection type", width: "min-w-36" },
            { key: "date", label: "Date", type: "date" },
            { key: "inspector", label: "Inspector", type: "text", placeholder: "Enter inspector name", width: "min-w-36" },
            { key: "remarks", label: "Remarks", type: "text", placeholder: "Enter remarks", width: "min-w-36" }
          ]}
          emptyMessage="No inspection records available"
          addButtonText="Add Inspection"
        />
      </div>

      {/* 5.3 Permit to Work */}
      <div className="section-card p-4 sm:p-6">
        <div className="mb-3">
          <h4 className="text-sm sm:text-md font-medium text-foreground flex items-center gap-2">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.3</span> Permit to Work
          </h4>
        </div>
        <HsesTableComponent
          data={hsesData.permit}
          onChange={(permit) => updateData("permit", permit)}
          isEditing={isEditing}
          columns={[
            { key: "typeOfPermit", label: "Type of Permit", type: "text", placeholder: "Enter permit type", width: "min-w-36" },
            { key: "startDate", label: "Start Date", type: "date" },
            { key: "endDate", label: "End Date", type: "date" },
            { key: "inspector", label: "Inspector", type: "text", placeholder: "Enter inspector name", width: "min-w-36" },
            { key: "approver", label: "Approver", type: "text", placeholder: "Enter approver name", width: "min-w-36" },
            { key: "remarks", label: "Remarks", type: "text", placeholder: "Enter remarks", width: "min-w-36" }
          ]}
          emptyMessage="No permit records available"
          addButtonText="Add Permit"
        />
      </div>

      {/* 5.4 First Aid / Accident / Incident */}
      <div className="section-card p-4 sm:p-6">
        <div className="mb-3">
          <h4 className="text-sm sm:text-md font-medium text-foreground flex flex-col items-start gap-1">
            <span className="flex items-center gap-2">
              <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.4</span> First Aid / Accident / Incident / Near Miss / Fatalities (if Any)
            </span>
          </h4>
        </div>
        {!isEditing ? (
          <div className="min-h-[100px] p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {hsesData.firstAidAccident || 'No incidents recorded'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={hsesData.firstAidAccident}
              onChange={(e) => updateData("firstAidAccident", e.target.value)}
              placeholder="Enter details about first aid, accidents, incidents, near misses, or fatalities (if any)..."
              className="w-full min-h-[100px] sm:min-h-[120px] p-3 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y dark:bg-card dark:border-border"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Please provide detailed information about any first aid administered, accidents, incidents, near misses, or fatalities that occurred during this reporting period.
            </p>
          </div>
        )}
      </div>

      {/* 5.5 Other HSES Activities */}
      <div className="section-card p-4 sm:p-6">
        <div className="mb-3">
          <h4 className="text-sm sm:text-md font-medium text-foreground flex flex-col items-start gap-1">
            <span className="flex items-center gap-2">
              <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.5</span> Other HSES Activities Concerns
            </span>
          </h4>
        </div>
        {!isEditing ? (
          <div className="min-h-[100px] p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {hsesData.otherActivities || 'No other HSES activities recorded'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={hsesData.otherActivities}
              onChange={(e) => updateData("otherActivities", e.target.value)}
              placeholder="Enter details about other HSES activities and concerns..."
              className="w-full min-h-[100px] sm:min-h-[120px] p-3 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y dark:bg-card dark:border-border"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Please provide information about any other HSES-related activities, concerns, observations, or improvements that were implemented or identified during this reporting period.
            </p>
          </div>
        )}
      </div>

      {/* 5.6 HSES Photo Reference */}
      <div className="section-card p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm sm:text-md font-medium text-foreground flex flex-col items-start gap-1">
            <span className="flex items-center gap-2">
              <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">5.6</span> 
              HSES Photo Reference
            </span>
          </h4>
          
          <button
            onClick={handleAggregateImages}
            disabled={isAggregating || !sharedData?.dateRange || (!sharedData?.projectId && !sharedData?.projectName)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!sharedData?.dateRange || (!sharedData?.projectId && !sharedData?.projectName) ? "Project and date range are required" : reportId ? "Aggregate images from daily reports" : "Preview images (will save when report is saved)"}
          >
            <ImageIcon className="w-4 h-4" />
            <RefreshCw className={`w-4 h-4 ${isAggregating ? 'animate-spin' : ''}`} />
            {isAggregating ? 'Aggregating...' : reportId ? 'Aggregate Images' : 'Preview Images'}
          </button>
        </div>
        <ReferenceSection
          sections={hsesData.hsePhotoReferences?.hseToolboxMeeting?.length > 0 ? hsesData.hsePhotoReferences.hseToolboxMeeting : createHSESections()}
          setSections={(sections) => updateData("hsePhotoReferences", { ...hsesData.hsePhotoReferences, hseToolboxMeeting: sections })}
          hideTitle={false}
          hideShadow={true}
        />
        <div className="border-t border-border pt-6">
          
          <ReferenceSection
            sections={hsesData.hsePhotoReferences?.hseActivityPhotos?.length > 0 ? hsesData.hsePhotoReferences.hseActivityPhotos : createHSEActivityPhotoSections()}
            setSections={(sections) => updateData("hsePhotoReferences", { ...hsesData.hsePhotoReferences, hseActivityPhotos: sections })}
            hideTitle={false}
            hideShadow={true}
          />
        </div>
      </div>
    </div>
  );
};

export default Hses;
