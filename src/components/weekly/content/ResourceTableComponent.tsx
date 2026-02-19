import React, { useState, useEffect } from "react";
import { SubRow, Section, ResourceTableComponentProps } from "@/types/resourceTable.types";
import { DAY_NAMES } from "@/constants/dayNames";
import { calculateGrandTotal } from "@/utils/calculationUtils";
import { generateWeekDates } from "@/lib/weekDateUtils";

const ResourceTableComponent: React.FC<ResourceTableComponentProps> = ({ 
  sharedData, 
  showTitles = true, 
  sections: passedSections,
  setSections: passedSetSections,
  handleInputChange: passedHandleInputChange,
  removeSubRow: passedRemoveSubRow,
  monthYearDisplay: passedMonthYearDisplay,
  dates: passedDates
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

  const sections = passedSections || localSections;
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

  const monthYearDisplay = passedMonthYearDisplay || "Feb-26";
  const dates = passedDates || ["-", "-", "-", "-", "-", "-", "-"];

  const dayNames = DAY_NAMES;

  useEffect(() => {
    if (sharedData?.dateRange && !passedMonthYearDisplay) {
      const { monthYearDisplay: newMonthYearDisplay, dates: newDates } = generateWeekDates(sharedData.dateRange);
      setLocalSections(prev => ({ ...prev, monthYearDisplay: newMonthYearDisplay, dates: newDates }));
    }
  }, [sharedData?.dateRange, passedMonthYearDisplay]);

  const grandTotal = {
    description: "Grand Total",
    dailyData: ["", "", "", "", "", "", ""],
    previousWeek: "0",
    thisWeek: "0",
    upToThisWeek: "0",
  };

  const calculateGrandTotal = () => {
    let totalPreviousWeek = 0;
    let totalThisWeek = 0;

    sections.forEach(section => {
      // Calculate totals for Previous Week and daily data
      section.subRows.forEach(subRow => {
        const prevWeekValue = parseFloat(subRow.previousWeek) || 0;
        totalPreviousWeek += prevWeekValue;
        
        // Calculate This Week as sum of all daily data
        let weekSum = 0;
        subRow.dailyData.forEach(dayValue => {
          weekSum += parseFloat(dayValue) || 0;
        });
        totalThisWeek += weekSum;
      });
    });

    // Set the calculated totals
    grandTotal.previousWeek = totalPreviousWeek.toString();
    grandTotal.thisWeek = totalThisWeek.toString();
    
    // Auto-calculate Up to This Week as Previous Week + This Week
    grandTotal.upToThisWeek = (totalPreviousWeek + totalThisWeek).toString();

    return grandTotal;
  };

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
                  {row.dailyData.map((value, dayIndex) => (
                    <td
                      key={dayIndex}
                      className="border border-border px-4 py-2 text-center"
                    >
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          handleInputChange(
                            sectionIndex,
                            rowIndex,
                            "dailyData",
                            e.target.value,
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
                      value={row.previousWeek}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "previousWeek", e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-border px-4 py-2 text-center">
                    <input
                      type="text"
                      value={row.thisWeek}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "thisWeek", e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent dark:bg-card"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-border px-4 py-2 text-center">
                    <input
                      type="text"
                      value={row.upToThisWeek}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "upToThisWeek", e.target.value)
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
              {calculateGrandTotal(sections).description}
            </td>
            {calculateGrandTotal(sections).dailyData.map((value, dayIndex) => (
              <td
                key={dayIndex}
                className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold"
              >
                {value}
              </td>
            ))}
            <td className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold">
              {calculateGrandTotal(sections).previousWeek}
            </td>
            <td className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold">
              {calculateGrandTotal(sections).thisWeek}
            </td>
            <td className="border border-border px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 font-bold">
              {calculateGrandTotal(sections).upToThisWeek}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ResourceTableComponent;
