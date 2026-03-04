import { ClipboardList, CalendarCheck, Plus, Trash2, Upload } from "lucide-react";
import { ActivityRow, ActivitiesProps } from "@/types/activity.types";
import { adjustHeight } from "@/utils/autoResizeTextarea";
import { useState, useCallback } from "react";
import BulkActivitiesModal from "./BulkActivitiesModal";
import { bulkImportActivities } from "@/integrations/reportsApi";

const Activities = (props: ActivitiesProps) => {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importContext, setImportContext] = useState<"weekly" | "next">("weekly");
  
  console.log("🔍 DEBUG Activities: props.reportId =", props.reportId); // DEBUG: Log reportId
  
  // Helper function to detect indentation level
  const getIndentationLevel = (description: string): number => {
    const trimmed = description.trim();
    if (!trimmed) return 0;
    
    const firstWord = trimmed.split(/\s+/)[0];
    
    // Roman numerals (level 0)
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\.?$/i.test(firstWord)) {
      return 0;
    }
    
    // Numbers with dots (level 1 or 2)
    if (/^\d+(?:\.\d+)*\.?$/.test(firstWord)) {
      const dotCount = (firstWord.match(/\./g) || []).length;
      return dotCount; // 1. = level 1, 1.1 = level 2, 1.1.1 = level 3
    }
    
    // Bullets (level 3)
    if (/^[-•]$/i.test(firstWord)) {
      return 3;
    }
    
    return 0;
  };

  // Helper function to get indentation style
  const getIndentationStyle = (description: string) => {
    const level = getIndentationLevel(description);
    const indentPixels = level * 20; // 20px per level
    return { paddingLeft: `${indentPixels}px` };
  };
  
  // Use props directly or fallback to local state
  const weeklyActivities = props.weeklyActivities || [];
  const nextWeekPlan = props.nextWeekPlan || [];

  // Helper functions using props
  const addRow = useCallback((type: "weekly" | "next") => {
    const newRow: ActivityRow = { 
      description: "", 
      percent: 0,
      percentage: "0", // Legacy field - matches backend
      source: "manual",
      bulkImportId: undefined,
      addedAt: new Date()
    };
    
    if (type === "weekly") {
      const newWeeklyActivities = [...weeklyActivities, newRow];
      props.setWeeklyActivities?.(newWeeklyActivities);
    } else {
      const newNextWeekPlan = [...nextWeekPlan, newRow];
      props.setNextWeekPlan?.(newNextWeekPlan);
    }
  }, [weeklyActivities, nextWeekPlan, props.setWeeklyActivities, props.setNextWeekPlan]);

  const deleteRow = useCallback((type: "weekly" | "next", index: number) => {
    if (type === "weekly") {
      const newActivities = weeklyActivities.filter((_, idx) => idx !== index);
      props.setWeeklyActivities?.(newActivities);
    } else {
      const newPlan = nextWeekPlan.filter((_, idx) => idx !== index);
      props.setNextWeekPlan?.(newPlan);
    }
  }, [weeklyActivities, nextWeekPlan, props.setWeeklyActivities, props.setNextWeekPlan]);

  const updateRow = useCallback((
    type: "weekly" | "next",
    index: number,
    field: "description" | "percent",
    value: string
  ) => {
    if (type === "weekly") {
      const newActivities = [...weeklyActivities];
      if (field === "percent") {
        newActivities[index][field] = value === "" ? 0 : Number(value);
      } else {
        newActivities[index][field] = value;
      }
      props.setWeeklyActivities?.(newActivities);
    } else {
      const newPlan = [...nextWeekPlan];
      if (field === "percent") {
        newPlan[index][field] = value === "" ? 0 : Number(value);
      } else {
        newPlan[index][field] = value;
      }
      props.setNextWeekPlan?.(newPlan);
    }
  }, [weeklyActivities, nextWeekPlan, props.setWeeklyActivities, props.setNextWeekPlan]);

  // Auto-resize textarea in table
  const adjustHeightWrapper = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight(e);
  };

  // Handle bulk import
  const handleBulkImport = async (importedWeekly: ActivityRow[], importedNext: ActivityRow[]) => {
    console.log("🔍 DEBUG Bulk Import: Starting import...");
    console.log("🔍 DEBUG Bulk Import: props.reportId =", props.reportId);
    console.log("🔍 DEBUG Bulk Import: importContext =", importContext);
    console.log("🔍 DEBUG Bulk Import: importedWeekly =", importedWeekly);
    console.log("🔍 DEBUG Bulk Import: importedNext =", importedNext);
    
    try {
      // Get current report ID (you'll need to pass this as a prop)
      const reportId = props.reportId; // Make sure to add reportId to ActivitiesProps
      
      if (!reportId) {
        console.error("🔍 DEBUG Bulk Import: No report ID provided for bulk import");
        // Fallback to local state update
        if (importContext === "weekly") {
          const newWeeklyActivities = [...weeklyActivities, ...importedWeekly, ...importedNext];
          props.setWeeklyActivities?.(newWeeklyActivities);
        } else if (importContext === "next") {
          const newNextWeekPlan = [...nextWeekPlan, ...importedWeekly, ...importedNext];
          props.setNextWeekPlan?.(newNextWeekPlan);
        }
        return;
      }

      console.log("🔍 DEBUG Bulk Import: Calling bulkImportActivities API...");
      // Call bulk import API
      const result = await bulkImportActivities(reportId, {
        weeklyActivities: importContext === "weekly" ? importedWeekly : [],
        nextWeekPlan: importContext === "next" ? importedNext : []
      });

      console.log("🔍 DEBUG Bulk Import: API result:", result);

      // Update local state with API response
      if (result.weeklyActivities) {
        props.setWeeklyActivities?.(result.weeklyActivities);
      }
      if (result.nextWeekPlan) {
        props.setNextWeekPlan?.(result.nextWeekPlan);
      }

    } catch (error) {
      console.error("🔍 DEBUG Bulk Import: Error occurred:", error);
      // Fallback to local state update
      if (importContext === "weekly") {
        const newWeeklyActivities = [...weeklyActivities, ...importedWeekly, ...importedNext];
        props.setWeeklyActivities?.(newWeeklyActivities);
      } else if (importContext === "next") {
        const newNextWeekPlan = [...nextWeekPlan, ...importedWeekly, ...importedNext];
        props.setNextWeekPlan?.(newNextWeekPlan);
      }
    }
  };

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
      
      {/* Weekly Activities */}
      <div className="section-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Activities Of Work Done</h2>
              <p className="text-sm text-muted-foreground">Describe this week's completed work</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setImportContext("weekly");
                setShowBulkModal(true);
              }}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 hover:underline"
              title="Bulk import activities"
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button
              onClick={() => addRow("weekly")}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2">Description</th>
              <th className="text-left py-2 px-2 w-20">%</th>
              <th className="text-left py-2 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(weeklyActivities || []).map((row, idx) => (
              <tr key={idx}>
                <td className="py-2 px-2 align-top">
                  <div className="relative">
                    <textarea
                      value={row.description}
                      onChange={(e) => {
                        updateRow("weekly", idx, "description", e.target.value);
                        adjustHeightWrapper(e);
                      }}
                      className={`w-full resize-none overflow-hidden dark:bg-transparent dark:text-foreground ${
                        /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\.?\s*$/i.test(row.description.trim().split(/\s+/)[0])
                          ? 'font-bold'
                          : 'font-normal'
                      }`}
                      placeholder="Enter description"
                      rows={1}
                      style={{ 
                        border: 'none', 
                        outline: 'none', 
                        padding: '2px',
                        ...getIndentationStyle(row.description)
                      }}
                    />
                    {/* Bulk import indicator - REMOVED */}
                    {/* {row.source === "bulk" && (
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          Bulk
                        </div>
                      </div>
                    )} */}
                  </div>
                </td>
                <td className="py-2 px-2 align-top">
                  <div className="relative w-full">
                    <div 
                      className={`absolute inset-0 rounded transition-all duration-300 ${
                        row.percent === 100 
                          ? 'bg-green-200 dark:bg-green-300' 
                          : 'bg-yellow-200 dark:bg-yellow-300'
                      }`}
                      style={{ width: `${Math.min(row.percent, 100)}%` }}
                    />
                    <input
                      type="text"
                      value={row.percent !== undefined && row.percent !== null && row.percent !== "" ? `${Number(row.percent).toFixed(2)}%` : ""}
                      onChange={(e) => {
                        // Remove % and convert to number
                        const value = e.target.value.replace('%', '');
                        const numValue = parseFloat(value);
                        updateRow("weekly", idx, "percent", isNaN(numValue) ? 0 : numValue);
                      }}
                      className={`relative bg-transparent z-10 dark:text-foreground text-center w-20 px-2 py-1 ${
                        row.percent === 100 
                          ? 'text-green-800 dark:text-green-300 font-semibold' 
                          : 'text-yellow-800 dark:text-yellow-300'
                      }`}
                      placeholder="0.00%"
                      min={0}

                      max={100}

                    />
                  </div>
                </td>
                <td className="py-2 px-2 align-top">
                  <button
                    onClick={() => deleteRow("weekly", idx)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Next Week Plan */}
      <div className="section-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <CalendarCheck className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Next Week Plan</h2>
              <p className="text-sm text-muted-foreground">Plan next week's activities</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setImportContext("next");
                setShowBulkModal(true);
              }}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 hover:underline"
              title="Bulk import activities"
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button
              onClick={() => addRow("next")}
              className="flex items-center gap-1 text-sm text-accent hover:underline"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2">Description</th>
              <th className="text-left py-2 px-2 w-20">%</th>
              <th className="text-left py-2 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(nextWeekPlan || []).map((row, idx) => (
              <tr key={idx}>
                <td className="py-2 px-2 align-top">
                  <textarea
                    value={row.description}
                    onChange={(e) => {
                      updateRow("next", idx, "description", e.target.value);
                      adjustHeightWrapper(e);
                    }}
                    className={`w-full resize-none overflow-hidden dark:bg-transparent dark:text-foreground ${
                      /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\.?\s*$/i.test(row.description.trim().split(/\s+/)[0])
                        ? 'font-bold'
                        : 'font-normal'
                    }`}
                    placeholder="Enter description"
                    rows={1}
                    style={{ 
                      border: 'none', 
                      outline: 'none', 
                      padding: '2px',
                      ...getIndentationStyle(row.description)
                    }}
                  />
                  {/* Bulk import indicator - REMOVED */}
                  {/* {row.source === "bulk" && (
                    <div className="absolute -top-1 -right-1">
                      <div className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        Bulk
                      </div>
                    </div>
                  )} */}
                </td>
                <td className="py-2 px-2 align-top">
                  <div className="relative w-full">
                    <div 
                      className={`absolute inset-0 rounded transition-all duration-300 ${
                        row.percent === 100 
                          ? 'bg-green-200 dark:bg-green-400/70' 
                          : 'bg-yellow-200 dark:bg-yellow-400/70'
                      }`}
                      style={{ width: `${Math.min(row.percent, 100)}%` }}
                    />
                    <input
                      type="text"
                      value={row.percent !== undefined && row.percent !== null && row.percent !== "" ? `${Number(row.percent).toFixed(2)}%` : ""}
                      onChange={(e) => {
                        // Remove % and convert to number
                        const value = e.target.value.replace('%', '');
                        const numValue = parseFloat(value);
                        updateRow("next", idx, "percent", isNaN(numValue) ? 0 : numValue);
                      }}
                      className={`relative bg-transparent z-10 dark:text-foreground text-center w-20 px-2 py-1 ${
                        row.percent === 100 
                          ? 'text-green-800 dark:text-green-300 font-semibold' 
                          : 'text-yellow-800 dark:text-yellow-300'
                      }`}
                      placeholder="0.00%"
                      style={{ border: 'none', outline: 'none' }}
                    />
                  </div>
                </td>
                <td className="py-2 px-2 align-top">
                  <button
                    onClick={() => deleteRow("next", idx)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
    
    {/* Bulk Import Modal */}
    <BulkActivitiesModal
      open={showBulkModal}
      onOpenChange={setShowBulkModal}
      onImport={handleBulkImport}
      context={importContext}
    />
    </>
  );
};

export default Activities;
