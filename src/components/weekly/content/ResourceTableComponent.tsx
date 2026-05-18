import React, { useState, useEffect, useRef } from "react";
import { SubRow, Section, ResourceTableComponentProps } from "@/types/resourceTable.types";
import { DAY_NAMES } from "@/constants/dayNames";
import { calculateGrandTotal } from "@/utils/calculationUtils";
import { generateWeekDates } from "@/lib/weekDateUtils";
import { Resources } from "@/types/resources.types";
import { transformResourceDataToNewPayload } from "@/utils/resourceDataTransform";

const ResourceTableComponent: React.FC<ResourceTableComponentProps> = ({ 
  sharedData, 
  showTitles = true, 
  sections: passedSections,
  setSections: passedSetSections,
  handleInputChange: passedHandleInputChange,
  removeSubRow: passedRemoveSubRow,
  monthYearDisplay: passedMonthYearDisplay,
  dates: passedDates,
  showUnit = false
}) => {
  const [localSections, setLocalSections] = useState<Section[]>(passedSections || [
    {
      title: "I. Site Management Team",
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
    },
    {
      title: "II. Site Working Team Interior",
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
    },
    {
      title: "III. Site Working Team MEP",
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
    },
  ]);

  // Sync localSections with passedSections when they change (e.g., after aggregation)
  // Use a ref to track previous data to prevent infinite loops
  const prevSectionsRef = useRef<string>('');
  
  useEffect(() => {
    if (passedSections && passedSections.length > 0) {
      // Only update if the data is actually different (not just reference)
      const hasData = passedSections.some(s => s.subRows && s.subRows.length > 0);
      const sectionsJson = JSON.stringify(passedSections);
      
      if (hasData && sectionsJson !== prevSectionsRef.current) {
        // console.log('🔄 ResourceTableComponent syncing passedSections:', passedSections);
        setLocalSections(passedSections);
        prevSectionsRef.current = sectionsJson;
      }
    }
  }, [passedSections]);

  const sections = Array.isArray(passedSections) ? passedSections : localSections;
  const setSections = passedSetSections || setLocalSections;
  const handleInputChange = passedHandleInputChange || ((sectionIndex, rowIndex, field, value, dayIndex) => {
    const newSections = [...sections];
    if (dayIndex !== undefined && field === "dailyData") {
      newSections[sectionIndex].subRows[rowIndex].dailyData[dayIndex] = value;
      
      // Auto-calculate This Week when any daily data changes
      let weekSum = 0;
      newSections[sectionIndex].subRows[rowIndex].dailyData.forEach(dayValue => {
        weekSum += parseFloat(dayValue) || 0;
      });
      newSections[sectionIndex].subRows[rowIndex].thisWeek = weekSum.toString();
      
      // Auto-calculate Up to This Week when This Week changes
      const prevWeek = parseFloat(newSections[sectionIndex].subRows[rowIndex].previousWeek) || 0;
      newSections[sectionIndex].subRows[rowIndex].upToThisWeek = (prevWeek + weekSum).toString();
    } else if (field !== "dailyData") {
      newSections[sectionIndex].subRows[rowIndex][field] = value;
      
      // Auto-calculate Up to This Week when Previous Week changes
      if (field === "previousWeek") {
        const prevWeek = parseFloat(newSections[sectionIndex].subRows[rowIndex].previousWeek) || 0;
        const thisWeek = parseFloat(newSections[sectionIndex].subRows[rowIndex].thisWeek) || 0;
        newSections[sectionIndex].subRows[rowIndex].upToThisWeek = (prevWeek + thisWeek).toString();
      }
    }
    setSections(newSections);
  });

  const removeSubRow = passedRemoveSubRow || ((sectionIndex, rowIndex) => {
    if (sections[sectionIndex].subRows.length > 1) {
      const newSections = [...sections];
      newSections[sectionIndex].subRows = newSections[sectionIndex].subRows.filter((_, i) => i !== rowIndex);
      setSections(newSections);
    }
  });

  const getTodayDisplay = () => {
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'short' });
    const day = today.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  };
  const monthYearDisplay = passedMonthYearDisplay || (sharedData?.dateRange ? generateWeekDates(sharedData.dateRange).monthYearDisplay : getTodayDisplay());
  const getTodayDates = () => {
    const today = new Date();
    const dates: string[] = [];
    // Generate dates for the current week (Monday to Sunday)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date.getDate().toString().padStart(2, '0'));
    }
    return dates;
  };
  const dates = passedDates || (sharedData?.dateRange ? generateWeekDates(sharedData.dateRange).dates : getTodayDates());

  const dayNames = DAY_NAMES;

  // Helper function to format values: display "-" instead of "0" or empty string
  const formatValue = (value: string): string => {
    return value === "0" || value === "" ? "-" : value;
  };

  useEffect(() => {
    if (sharedData?.dateRange) {
      const { monthYearDisplay: newMonthYearDisplay, dates: newDates } = generateWeekDates(sharedData.dateRange);
      // Update local state if no external control
      if (!passedMonthYearDisplay) {
        setLocalSections(prev => ({ ...prev, monthYearDisplay: newMonthYearDisplay, dates: newDates }));
      }
    }
  }, [sharedData?.dateRange, passedMonthYearDisplay]);

  const grandTotal = {
    description: "Grand Total",
    dailyData: ["", "", "", "", "", "", ""],
    previousWeek: "0",
    thisWeek: "0",
    upToThisWeek: "0",
  };

  const getGrandTotal = () => {
    let totalPreviousWeek = 0;
    let totalThisWeek = 0;

    sections.forEach(section => {
      section.subRows.forEach(subRow => {
        totalPreviousWeek += parseFloat(subRow.previousWeek) || 0;
        // Sum thisWeek directly — for manpower thisWeek == sum(dailyData) so the
        // result is identical, but for materials thisWeek is set independently
        // while daily columns are blank, so we must use thisWeek here.
        totalThisWeek += parseFloat(subRow.thisWeek) || 0;
      });
    });

    grandTotal.dailyData = ["", "", "", "", "", "", ""]; // Keep empty for date range columns
    grandTotal.previousWeek = totalPreviousWeek.toString();
    grandTotal.thisWeek = totalThisWeek.toString();
    grandTotal.upToThisWeek = (totalPreviousWeek + totalThisWeek).toString();

    return grandTotal;
  };

  // Transform data to new payload structure when needed
  const transformToNewPayload = (): Resources => {
    const dateRange = sharedData?.dateRange || "";
    // For backward compatibility, pass empty arrays for material and machinery sections
    // since this component doesn't have access to them directly
    return transformResourceDataToNewPayload(sections, dateRange, [], []);
  };

  // Expose the transformed data through a callback or global state
  useEffect(() => {
    // This can be used to sync with parent component
    if (passedSetSections) {
      const transformedData = transformToNewPayload();
      // You can pass this data up to parent if needed
    }
  }, [sections]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border">
        <thead>
          <tr>
            <th
              rowSpan={3}
              className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-left font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              Description
            </th>
            {showUnit && (
              <th
                rowSpan={3}
                className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold"
                style={{ verticalAlign: "middle" }}
              >
                Unit
              </th>
            )}
            <th
              colSpan={7}
              className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold"
            >
              {monthYearDisplay}
            </th>
            <th
              rowSpan={3}
              className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              Previous Week
            </th>
            <th
              rowSpan={3}
              className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              This Week
            </th>
            <th
              rowSpan={3}
              className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              Up to This Week
            </th>
          </tr>
          <tr>
            {dayNames.map((day, index) => (
              <th
                key={index}
                className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-medium"
              >
                {day}
              </th>
            ))}
          </tr>
          <tr>
            {dates.map((date, index) => (
              <th
                key={index}
                className="border border-border bg-blue-100 dark:bg-blue-900/30 px-4 py-2 text-center font-medium"
              >
                {date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sectionIndex) => (
            <React.Fragment key={sectionIndex}>
              {/* Section Header */}
              {showTitles && (
                <tr>
                  <td
                    colSpan={11}
                    className="border border-border bg-gray-100 dark:bg-gray-800 px-4 py-2 font-bold text-left"
                  >
                    {section.title} {section.subtitle}
                  </td>
                </tr>
              )}
              
              {/* Sub-rows */}
              {section.subRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="border border-border px-4 py-2">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "description", e.target.value)
                      }
                      className="w-full px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                      placeholder="Enter description"
                    />
                  </td>
                  {showUnit && (
                    <td className="border border-border px-4 py-2 text-center">
                      <input
                        type="text"
                        value={row.unit || ''}
                        onChange={(e) =>
                          handleInputChange(sectionIndex, rowIndex, "unit", e.target.value)
                        }
                        className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                        placeholder="Unit"
                      />
                    </td>
                  )}
                  {row.dailyData.map((value, dayIndex) => (
                    <td
                      key={dayIndex}
                      className="border border-border px-4 py-2 text-center"
                    >
                      <input
                        type="text"
                        value={formatValue(value)}
                        onChange={(e) =>
                          handleInputChange(
                            sectionIndex,
                            rowIndex,
                            "dailyData",
                            e.target.value === "-" ? "" : e.target.value,
                            dayIndex,
                          )
                        }
                        className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="border border-border px-4 py-2 text-center">
                    <input
                      type="text"
                      value={formatValue(row.previousWeek)}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "previousWeek", e.target.value === "-" ? "0" : e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-border px-4 py-2 text-center">
                    <input
                      type="text"
                      value={formatValue(row.thisWeek)}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "thisWeek", e.target.value === "-" ? "0" : e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-border px-4 py-2 text-center">
                    <input
                      type="text"
                      value={formatValue(row.upToThisWeek)}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "upToThisWeek", e.target.value === "-" ? "0" : e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          {/* Grand Total Row */}
          <tr>
            <td className="border border-border px-4 py-2 bg-blue-50 dark:bg-blue-900/20 font-bold">
              {getGrandTotal().description}
            </td>
            {showUnit && (
              <td className="border border-border px-4 py-2 bg-blue-50 dark:bg-blue-900/20 font-bold text-center">
                -
              </td>
            )}
            {getGrandTotal().dailyData.map((value, dayIndex) => (
              <td
                key={dayIndex}
                className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold"
              >
                {value}
              </td>
            ))}
            <td className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold">
              {formatValue(getGrandTotal().previousWeek)}
            </td>
            <td className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold">
              {formatValue(getGrandTotal().thisWeek)}
            </td>
            <td className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold">
              {formatValue(getGrandTotal().upToThisWeek)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ResourceTableComponent;
