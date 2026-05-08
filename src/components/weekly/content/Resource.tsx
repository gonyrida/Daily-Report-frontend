import React, { useMemo } from "react";
import ResourceTableComponent from "./ResourceTableComponent";
import { SubRow, Section } from "@/types/resourceTable.types";
import { Package, Download, RefreshCw } from "lucide-react";
import { Resources } from "@/types/resources.types";
import { generateWeekDates } from "@/lib/weekDateUtils";
import {
  transformResourceDataToNewPayload,
  transformBackendToFrontendFormat,
  transformMaterialsToFrontendFormat,
  transformMachineryToFrontendFormat
} from "@/utils/resourceDataTransform";
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
  initialResourcesData?: any; // Initial resources data from saved report (for rolling total)
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
  reportId,
  initialResourcesData
}) => {
    // State for aggregated data
    const [aggregatedSections, setAggregatedSections] = React.useState<any[]>([]);
    const [useAggregatedData, setUseAggregatedData] = React.useState(false);
    const hasAppliedInitialData = React.useRef(false); // Track if initial data was applied

    // Material delivery status data
    const [isAggregating, setIsAggregating] = React.useState(false);

    // State for aggregated material and machinery sections
    const [materialSections, setMaterialSections] = React.useState<Section[]>([
      {
        title: "",
        subtitle: "",
        subRows: [],
      }
    ]);

    const [machinerySections, setMachinerySections] = React.useState<Section[]>([
      {
        title: "",
        subtitle: "",
        subRows: [],
      }
    ]);

    // Generate dates from sharedData if available
    const getDateDisplay = () => {
      if (sharedData?.dateRange) {
        const { monthYearDisplay } = generateWeekDates(sharedData.dateRange);
        return monthYearDisplay;
      }
      const today = new Date();
      const month = today.toLocaleString('en-US', { month: 'short' });
      const day = today.getDate().toString().padStart(2, '0');
      return `${month}-${day}`; // default fallback - today's date
    };

    // Use useMemo to cache dates and prevent flickering during re-renders
    const memoizedDates = useMemo(() => {
      if (sharedData?.dateRange) {
        const { dates } = generateWeekDates(sharedData.dateRange);
        console.log('🔍 getDates useMemo:', { dateRange: sharedData.dateRange, generatedDates: dates });
        return dates;
      }
      return ["-", "-", "-", "-", "-", "-", "-"]; // default fallback - 7 days
    }, [sharedData?.dateRange]);

    const memoizedMonthYear = useMemo(() => {
      if (sharedData?.dateRange) {
        const { monthYearDisplay } = generateWeekDates(sharedData.dateRange);
        return monthYearDisplay;
      }
      return ""; // default fallback
    }, [sharedData?.dateRange]);

    // Legacy function for backwards compatibility
    const getDates = () => memoizedDates;

    // Get transformed payload for backend API calls
    const getTransformedResources = (): Resources => {
      if (sections) {
        return transformResourceDataToNewPayload(
          sections, 
          sharedData?.dateRange,
          materialSections,
          machinerySections
        );
      }
      // Return empty structure if no sections
      return {
        manPower: {
          dateRange: sharedData?.dateRange || "",
          managementTeam: [],
          workingTeamInterior: [],
          workingTeamMEP: []
        },
        material: [],
        machinery: []
      };
    };

    // Notify parent component when resources change
    // Skip if using aggregated data (parent already notified in handleAggregateManpower)
    const lastNotifiedRef = React.useRef<string>("");
    
    React.useEffect(() => {
      if (!onResourcesChange || !sections || useAggregatedData) return;
      
      const transformedResources = getTransformedResources();
      const serialized = JSON.stringify(transformedResources);
      
      // Only notify parent if the data actually changed
      if (serialized !== lastNotifiedRef.current) {
        lastNotifiedRef.current = serialized;
        onResourcesChange(transformedResources);
      }
    }, [sections, sharedData?.dateRange, useAggregatedData]);
    // NOTE: onResourcesChange intentionally omitted from deps to prevent infinite loop

    // Handle initialResourcesData prop - convert to sections format when data is loaded
    // Only run once and don't overwrite aggregated data
    React.useEffect(() => {
      console.log('🔍 Resource useEffect triggered:', {
        hasInitialData: !!initialResourcesData,
        hasManPower: !!initialResourcesData?.manPower,
        hasMaterial: !!initialResourcesData?.material,
        hasMachinery: !!initialResourcesData?.machinery,
        hasSetSections: !!setSections,
        hasAppliedInitialData: hasAppliedInitialData.current,
        useAggregatedData,
        currentSectionsLength: sections?.length || 0,
        currentMaterialSectionsLength: materialSections?.[0]?.subRows?.length || 0,
        currentMachinerySectionsLength: machinerySections?.[0]?.subRows?.length || 0
      });

      // Process data if we have initial data but no sections yet, or if we haven't applied initial data yet
      const shouldProcessData = (
        initialResourcesData?.manPower && 
        setSections && 
        !useAggregatedData &&
        (
          !hasAppliedInitialData.current || 
          sections?.length === 0 || 
          materialSections?.[0]?.subRows?.length === 0 || 
          machinerySections?.[0]?.subRows?.length === 0
        )
      );

      if (shouldProcessData) {
        
        // Transform and set manpower sections if available
        if (initialResourcesData.manPower) {
          console.log('🔍 Processing manpower data:', {
            manPowerData: initialResourcesData.manPower,
            managementTeam: initialResourcesData.manPower.managementTeam?.length || 0,
            workingTeamInterior: initialResourcesData.manPower.workingTeamInterior?.length || 0,
            workingTeamMEP: initialResourcesData.manPower.workingTeamMEP?.length || 0
          });
          
          const transformedManpower = transformBackendToFrontendFormat(initialResourcesData.manPower);
          console.log('🔍 Transformed manpower sections:', {
            sectionsCount: transformedManpower.length,
            sections: transformedManpower.map(s => ({
              title: s.title,
              subRowsCount: s.subRows?.length || 0
            }))
          });
          setSections(transformedManpower);
        }
        
        // Transform and set materials sections if available
        if (initialResourcesData.material) {
          console.log('🔍 Processing materials data:', {
            materialsCount: initialResourcesData.material.length,
            materialsSample: initialResourcesData.material.slice(0, 3)
          });
          
          const transformedMaterials = transformMaterialsToFrontendFormat(initialResourcesData.material);
          console.log('🔍 Transformed materials:', {
            transformedCount: transformedMaterials.length,
            transformedSample: transformedMaterials.slice(0, 2)
          });
          
          setMaterialSections([{
            title: "",
            subtitle: "",
            subRows: transformedMaterials
          }]);
        }
        
        // Also transform and set machinery sections if available
        if (initialResourcesData.machinery) {
          console.log('🔍 Processing machinery data:', {
            machineryCount: initialResourcesData.machinery.length,
            machinerySample: initialResourcesData.machinery.slice(0, 3)
          });
          
          const transformedMachinery = transformMachineryToFrontendFormat(initialResourcesData.machinery);
          console.log('🔍 Transformed machinery:', {
            transformedCount: transformedMachinery.length,
            transformedSample: transformedMachinery.slice(0, 2)
          });
          
          setMachinerySections([{
            title: "",
            subtitle: "",
            subRows: transformedMachinery
          }]);
        }
        
        hasAppliedInitialData.current = true;
        console.log('✅ Resource data processing completed');
      } else {
        console.log('⚠️ Resource useEffect conditions not met:', {
          hasManPower: !!initialResourcesData?.manPower,
          hasSetSections: !!setSections,
          hasAppliedInitialData: hasAppliedInitialData.current,
          useAggregatedData,
          shouldProcessData,
          sectionsEmpty: sections?.length === 0,
          materialSectionsEmpty: materialSections?.[0]?.subRows?.length === 0,
          machinerySectionsEmpty: machinerySections?.[0]?.subRows?.length === 0,
          anySectionEmpty: sections?.length === 0 || materialSections?.[0]?.subRows?.length === 0 || machinerySections?.[0]?.subRows?.length === 0
        });
      }
    }, [initialResourcesData, setSections, useAggregatedData]);

    // Handle manpower aggregation
    const handleAggregateManpower = async () => {
      console.log('🔍 Aggregating for:', {
        projectName: sharedData?.projectName,
        dateRange: sharedData?.dateRange,
        projectId: sharedData?.projectId
      });

      if (
        !sharedData?.dateRange || 
        (!sharedData?.projectId && (!sharedData?.projectName || sharedData.projectName === "Default Project Name"))
      ) {
        alert('Project ID or valid project name and date range are required for manpower aggregation');
        return;
      }

      setIsAggregating(true);

      try {
        // Parse the dateRange string "06-Mar-26 ~ 12-Mar-26"
        // Handle extra whitespace and tabs
        const dateRangeStr = sharedData.dateRange.trim().replace(/\s*~\s*/, '~');
        const [startDateStr, endDateStr] = dateRangeStr.split('~');

        console.log('🔍 Date parsing:', {
          original: sharedData.dateRange,
          cleaned: dateRangeStr,
          startDateStr,
          endDateStr
        });

        // Convert "DD-MMM-YY" to "YYYY-MM-DD" format
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

        console.log('🔍 Parsed dates:', { startDate, endDate });


        // Always use aggregateManpower with date parameters
        console.log('🔍 Calling aggregateManpower with:', {
          projectName: sharedData.projectName,
          startDate,
          endDate,
          projectId: sharedData.projectId,
          reportId: reportId || 'none'
        });
        
        const result = await aggregateManpower(
          (sharedData.projectName || '').trim(),  // Trim whitespace/tabs
          startDate,
          endDate,
          {
            includePrevWeek: true,
            includeAccumulated: true,
            projectId: sharedData.projectId
          }
        );

        if (result.success && result.data) {
          console.log('✅ Aggregation success - raw data:', result.data);
          console.log('🔍 Aggregation response structure:', {
            hasManPower: !!result.data.manPower,
            hasMaterial: !!result.data.material,
            hasMachinery: !!result.data.machinery,
            manPowerCount: result.data.manPower ? Object.keys(result.data.manPower).length : 0,
            materialCount: result.data.material ? result.data.material.length : 0,
            machineryCount: result.data.machinery ? result.data.machinery.length : 0,
            dataKeys: Object.keys(result.data)
          });
          
          // Transform manpower data - keep local to prevent parent state conflict
          if (result.data.manPower) {
            console.log('🔍 Transforming manPower:', result.data.manPower);
            const transformedSections = transformBackendToFrontendFormat(result.data.manPower);
            console.log('✅ Transformed sections:', transformedSections);
            setAggregatedSections(transformedSections);
            setUseAggregatedData(true);
            // NOTE: Don't call setSections(transformedSections) - it triggers parent re-render and overwrites data
            console.log('✅ State updated - useAggregatedData: true, sections count:', transformedSections.length);
          } else {
            console.log('⚠️ No manPower data in result');
          }
          
          // Transform and set materials data
          if (result.data.material) {
            console.log('🔍 Processing aggregated materials:', {
              materialsCount: result.data.material.length,
              materialsSample: result.data.material.slice(0, 2)
            });
            
            const transformedMaterials = transformMaterialsToFrontendFormat(result.data.material);
            console.log('🔍 Setting material sections:', {
              transformedCount: transformedMaterials.length,
              firstRow: transformedMaterials[0]
            });
            
            setMaterialSections([{
              title: "",
              subtitle: "",
              subRows: transformedMaterials
            }]);
          } else {
            console.log('⚠️ No materials data in aggregation result:', result.data);
          }
          
          // Transform and set machinery data
          if (result.data.machinery) {
            const transformedMachinery = transformMachineryToFrontendFormat(result.data.machinery);
            setMachinerySections([{
              title: "",
              subtitle: "",
              subRows: transformedMachinery
            }]);
          }
          
          // Notify parent with aggregated data for save functionality
          if (onResourcesChange) {
            const newResources: Resources = {
              manPower: {
                dateRange: sharedData?.dateRange || "",
                managementTeam: result.data.manPower?.managementTeam || [],
                workingTeamInterior: result.data.manPower?.workingTeamInterior || [],
                workingTeamMEP: result.data.manPower?.workingTeamMEP || []
              },
              material: result.data.material || [],
              machinery: result.data.machinery || []
            };
            onResourcesChange(newResources);
            console.log('✅ Notified parent with aggregated resources');
          }
          
        } else {
          const errorMessage = (result as any).details || result.error || 'Unknown error';
          console.error('Aggregation failed:', { error: result.error, details: (result as any).details });
          alert(`Aggregation failed: ${errorMessage}`);
        }
      } catch (error) {
        console.error('Error during aggregation:', error);
        alert('Error during manpower aggregation');
      } finally {
        setIsAggregating(false);
      }
    };

    return (
      <div className="space-y-6">
        <div id="section-6.1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.1</span> Manpower Status</h3>
            <button
              onClick={handleAggregateManpower}
              disabled={isAggregating || !sharedData?.dateRange || (!sharedData?.projectId && (!sharedData?.projectName || sharedData.projectName === "Default Project Name"))}
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
            monthYearDisplay={monthYearDisplay || getDateDisplay()}
            dates={dates && dates.length > 0 && dates[0] !== "-" ? dates : getDates()}
            showTitles={true}
          />
        </div>
        <div id="section-6.2">
          <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.2</span> Material Delivery Status</h3>
          <ResourceTableComponent
            sharedData={sharedData}
            sections={materialSections}
            setSections={() => { }}
            handleInputChange={() => { }}
            removeSubRow={() => { }}
            monthYearDisplay={monthYearDisplay || getDateDisplay()}
            dates={dates && dates.length > 0 && dates[0] !== "-" ? dates : getDates()}
            showTitles={true}
            showUnit={false}
          />
        </div>
        <div id="section-6.3">
          <h3 className="text-lg font-semibold mb-4"><span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">6.3</span> Machinery & Equipment Status</h3>
          <ResourceTableComponent
            sharedData={sharedData}
            sections={machinerySections}
            setSections={() => { }}
            handleInputChange={() => { }}
            removeSubRow={() => { }}
            monthYearDisplay={monthYearDisplay || getDateDisplay()}
            dates={dates && dates.length > 0 && dates[0] !== "-" ? dates : getDates()}
            showTitles={true}
            showUnit={false}
          />
        </div>
      </div>
    );
  };

export default Resource;
