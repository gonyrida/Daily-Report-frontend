import React from "react";
import ResourceTableComponent from "./ResourceTableComponent";
import ResourceTable, { ResourceRow } from "../../ResourceTable";
import { Package, Download, RefreshCw } from "lucide-react";
import { Resources } from "@/types/resources.types";
import { generateWeekDates } from "@/lib/weekDateUtils";
import { transformResourceDataToNewPayload } from "@/utils/resourceDataTransform";
import { updateReportManpower, aggregateManpower } from "@/services/weeklyReportService";

const Resource: React.FC<{ 
  sharedData?: any;
  resources?: Resources;
  setResources?: (resources: Resources) => void;
  sections?: any[];
  setSections?: any;
  handleInputChange?: any;
  removeSubRow?: any;
  monthYearDisplay?: string;
  dates?: string[];
  onResourcesChange?: (resources: Resources) => void;
  reportId?: string; // Add reportId prop
}> = ({ 
  sharedData,
  resources,
  setResources,
  sections,
  setSections,
  handleInputChange,
  removeSubRow,
  monthYearDisplay,
  dates,
  onResourcesChange,
  reportId
}) => {
  // State for aggregated data
  const [aggregatedSections, setAggregatedSections] = React.useState<any[]>([]);
  const [useAggregatedData, setUseAggregatedData] = React.useState(false);

  // Material delivery status data
  const [materials, setMaterials] = React.useState<ResourceRow[]>([]);
  const [machinery, setMachinery] = React.useState<ResourceRow[]>([]);
  const [isAggregating, setIsAggregating] = React.useState(false);

  // Create sections for materials without titles
  const materialSections = [
    {
      title: "",
      subtitle: "",
      subRows: [
        {
          description: "",
          dailyData: ["", "", "", "", "", "", ""],
          previousWeek: "",
          thisWeek: "",
          upToThisWeek: "",
        },
      ],
    }
  ];

  // Create sections for machinery without titles
  const machinerySections = [
    {
      title: "",
      subtitle: "",
      subRows: [
        {
          description: "",
          dailyData: ["", "", "", "", "", "", ""],
          previousWeek: "",
          thisWeek: "",
          upToThisWeek: "",
        },
      ],
    }
  ];

  // Generate dates from sharedData if available
  const getDateDisplay = () => {
    if (sharedData?.dateRange) {
      const { monthYearDisplay } = generateWeekDates(sharedData.dateRange);
      return monthYearDisplay;
    }
    return "Feb-26"; // default fallback
  };

  const getDates = () => {
    if (sharedData?.dateRange) {
      const { dates } = generateWeekDates(sharedData.dateRange);
      return dates;
    }
    return ["-", "-", "-", "-", "-", "-"]; // default fallback
  };

  // Get transformed payload for backend API calls
  const getTransformedResources = (): Resources => {
    if (sections) {
      return transformResourceDataToNewPayload(sections, sharedData?.dateRange);
    }
    // Return empty structure if no sections
    return {
      manPower: {
        dateRange: sharedData?.dateRange || "",
        managementTeam: [],
        workingTeamInterior: [],
        workingTeamMEP: []
      }
    };
  };

  // Notify parent component when resources change
  React.useEffect(() => {
    if (onResourcesChange && sections) {
      const transformedResources = getTransformedResources();
      onResourcesChange(transformedResources);
    }
  }, [sections, sharedData?.dateRange, onResourcesChange]);

  // Handle manpower aggregation
  const handleAggregateManpower = async () => {
    console.log('=== Starting Aggregation ===');
    console.log('sharedData:', sharedData);
    console.log('reportId:', reportId);
    console.log('projectName:', sharedData?.projectName);
    console.log('dateRange:', sharedData?.dateRange);
    
    if (!sharedData?.projectName || !sharedData?.dateRange) {
      alert('Project name and date range are required for manpower aggregation');
      return;
    }

    setIsAggregating(true);
    
    try {
      // Parse the dateRange string "06-Mar-26 ~ 12-Mar-26"
      const dateRangeStr = sharedData.dateRange;
      const [startDateStr, endDateStr] = dateRangeStr.split(' ~ ');
      
      // Convert "DD-MMM-YY" to "YYYY-MM-DD" format
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split('-');
        const monthMap: { [key: string]: string } = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
          'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const fullYear = `20${year}`;
        return `${fullYear}-${monthMap[month]}-${day.padStart(2, '0')}`;
      };
      
      const startDate = parseDate(startDateStr);
      const endDate = parseDate(endDateStr);
      
      console.log('Parsed dates:', { startDate, endDate });
      
      if (reportId) {
        // Update existing report
        const result = await updateReportManpower(reportId, {
          includePrevWeek: true,
          includeAccumulated: true
        });
        
        if (result.success && result.data?.sections?.resources?.manPower) {
          // Debug: Log the actual API response
          console.log('API Response data:', JSON.stringify(result.data, null, 2));
          console.log('ManPower data:', JSON.stringify(result.data.sections.resources.manPower, null, 2));
          
          // Transform the aggregated data to frontend format
          const transformedSections = transformBackendToFrontendFormat(result.data.sections.resources.manPower);
          setAggregatedSections(transformedSections);
          setUseAggregatedData(true);
          setSections(transformedSections);
          console.log('Manpower aggregated and updated successfully');
        } else {
          console.error('Aggregation failed:', result.error);
          console.log('Full API response:', JSON.stringify(result, null, 2));
          alert(`Aggregation failed: ${result.error}`);
        }
      } else {
        // Just aggregate data (no report to update)
        const result = await aggregateManpower(
          sharedData.projectName,
          startDate,
          endDate,
          {
            includePrevWeek: true,
            includeAccumulated: true
          }
        );
        
        // Debug: Log the actual API response
        console.log('Direct API Response data:', JSON.stringify(result.data, null, 2));
        console.log('Direct ManPower data:', JSON.stringify(result.data?.manPower, null, 2));
        
        if (result.success && result.data?.manPower) {
          // Transform the aggregated data to frontend format
          const transformedSections = transformBackendToFrontendFormat(result.data.manPower);
          setAggregatedSections(transformedSections);
          setUseAggregatedData(true);
          setSections(transformedSections);
          console.log('Manpower aggregated successfully');
        } else {
          console.error('Aggregation failed:', result.error);
          console.log('Full direct API response:', JSON.stringify(result, null, 2));
          alert(`Aggregation failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error during aggregation:', error);
      alert('Error during manpower aggregation');
    } finally {
      setIsAggregating(false);
    }
  };

  // Transform backend format to frontend format
  const transformBackendToFrontendFormat = (manPowerData: any) => {
    const transformed = [
      {
        title: "I. Site Management Team",
        subtitle: "",
        subRows: manPowerData.managementTeam?.map((item: any) => ({
          description: item.description || "",
          dailyData: [
            item.date?.fri?.toString() || "0",
            item.date?.sat?.toString() || "0", 
            item.date?.sun?.toString() || "0",
            item.date?.mon?.toString() || "0",
            item.date?.tue?.toString() || "0",
            item.date?.wed?.toString() || "0",
            item.date?.thu?.toString() || "0"
          ],
          previousWeek: item.prevWeek?.toString() || "0",
          thisWeek: item.thisWeek?.toString() || "0",
          upToThisWeek: item.accumulated?.toString() || "0",
        })) || []
      },
      {
        title: "II. Site Working Team Interior", 
        subtitle: "",
        subRows: manPowerData.workingTeamInterior?.map((item: any) => ({
          description: item.description || "",
          dailyData: [
            item.date?.fri?.toString() || "0",
            item.date?.sat?.toString() || "0",
            item.date?.sun?.toString() || "0", 
            item.date?.mon?.toString() || "0",
            item.date?.tue?.toString() || "0",
            item.date?.wed?.toString() || "0",
            item.date?.thu?.toString() || "0"
          ],
          previousWeek: item.prevWeek?.toString() || "0",
          thisWeek: item.thisWeek?.toString() || "0",
          upToThisWeek: item.accumulated?.toString() || "0",
        })) || []
      },
      {
        title: "III. Site Working Team MEP",
        subtitle: "", 
        subRows: manPowerData.workingTeamMEP?.map((item: any) => ({
          description: item.description || "",
          dailyData: [
            item.date?.fri?.toString() || "0",
            item.date?.sat?.toString() || "0",
            item.date?.sun?.toString() || "0",
            item.date?.mon?.toString() || "0", 
            item.date?.tue?.toString() || "0",
            item.date?.wed?.toString() || "0",
            item.date?.thu?.toString() || "0"
          ],
          previousWeek: item.prevWeek?.toString() || "0",
          thisWeek: item.thisWeek?.toString() || "0",
          upToThisWeek: item.accumulated?.toString() || "0",
        })) || []
      }
    ];
    
    console.log('Transformed sections:', JSON.stringify(transformed, null, 2));
    return transformed;
  };

  return (
    <div className="space-y-6">
      <div id="section-6.1">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.1</span> Manpower Status</h3>
          <button
            onClick={handleAggregateManpower}
            disabled={isAggregating || !sharedData?.projectName || !sharedData?.dateRange}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isAggregating ? 'animate-spin' : ''}`} />
            {isAggregating ? 'Aggregating...' : 'Aggregate from Daily Reports'}
          </button>
        </div>
        {/* Debug info */}
        {useAggregatedData && (
          <div className="text-xs text-green-600 mb-2">
            Using aggregated data ({aggregatedSections.length} sections)
          </div>
        )}
        <ResourceTableComponent 
          sharedData={sharedData}
          sections={useAggregatedData ? aggregatedSections : sections}
          setSections={setSections}
          handleInputChange={handleInputChange}
          removeSubRow={removeSubRow}
          monthYearDisplay={monthYearDisplay}
          dates={dates}
          showTitles={true}
        />
      </div>
      <div id="section-6.2">
        <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.2</span> Material Delivery Status</h3>
        <ResourceTableComponent 
          sharedData={sharedData}
          sections={materialSections}
          setSections={() => {}}
          handleInputChange={() => {}}
          removeSubRow={() => {}}
          monthYearDisplay={getDateDisplay()}
          dates={getDates()}
          showTitles={false}
        />
      </div>
      <div id="section-6.3">
        <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.3</span> Machinery & Equipment Status</h3>
        <ResourceTableComponent 
          sharedData={sharedData}
          sections={machinerySections}
          setSections={() => {}}
          handleInputChange={() => {}}
          removeSubRow={() => {}}
          monthYearDisplay={getDateDisplay()}
          dates={getDates()}
          showTitles={false}
        />
      </div>
      <div id="section-6.4">
        <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.4</span> Other Resources</h3>
        <ResourceTableComponent 
          sharedData={sharedData}
          sections={materialSections}
          setSections={() => {}}
          handleInputChange={() => {}}
          removeSubRow={() => {}}
          monthYearDisplay={getDateDisplay()}
          dates={getDates()}
          showTitles={false}
        />
      </div>
    </div>
  );
};

export default Resource;
