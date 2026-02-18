import React, { useState, useEffect } from "react";

interface SubRow {
  description: string;
  dailyData: string[];
  previousWeek: string;
  thisWeek: string;
  upToThisWeek: string;
}

interface Section {
  title: string;
  subtitle: string;
  subRows: SubRow[];
}

interface ResourceTableComponentProps {
  sharedData?: {
    dateRange?: string;
  };
  showTitles?: boolean;
}

const ResourceTableComponent: React.FC<ResourceTableComponentProps> = ({ sharedData, showTitles = true }) => {
  const [sections, setSections] = useState<Section[]>([
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

  const dayNames = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
  
  // Generate month-year display and dates from sharedData dateRange
  const [monthYearDisplay, setMonthYearDisplay] = useState<string>("Feb-26");
  const [dates, setDates] = useState<string[]>(["-", "-", "-", "-", "-", "-", "-"]);

  useEffect(() => {
    if (sharedData?.dateRange) {
      // Parse dateRange to extract month-year and generate dates
      // dateRange format: "DD-MMM-YY ~ DD-MMM-YY"
      const dateRangeMatch = sharedData.dateRange.match(/(\d{1,2}-[A-Za-z]{3}-\d{2})\s*~\s*(\d{1,2}-[A-Za-z]{3}-\d{2})/);
      
      if (dateRangeMatch) {
        const startDateStr = dateRangeMatch[1];
        const endDateStr = dateRangeMatch[2];
        
        // Parse start date
        const [startDay, startMonth, startYear] = startDateStr.split('-');
        
        // Set month-year display (using start date's month and year)
        setMonthYearDisplay(`${startMonth}-${startYear}`);
        
        // Generate dates for the week based on actual day of week
        const startDate = new Date(`${startMonth} ${startDay}, 20${startYear}`);
        const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        
        // Initialize all dates with "-"
        const weekDates = ["-", "-", "-", "-", "-", "-", "-"];
        
        // Map day index to our day names array
        // dayNames: ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"]
        // JavaScript getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        const dayMapping = {
          0: 2, // Sunday -> index 2 in dayNames
          1: 3, // Monday -> index 3
          2: 4, // Tuesday -> index 4
          3: 5, // Wednesday -> index 5
          4: 6, // Thursday -> index 6
          5: 0, // Friday -> index 0
          6: 1, // Saturday -> index 1
        };
        
        // Place the start date in the correct column
        const correctColumnIndex = dayMapping[startDayOfWeek as keyof typeof dayMapping];
        if (correctColumnIndex !== undefined) {
          // Fill dates starting from the start date, but only up to Thursday (index 6)
          for (let i = 0; i < 7; i++) {
            const targetColumnIndex = (correctColumnIndex + i) % 7;
            
            // Stop if we've reached Thursday (index 6) and are about to wrap to Friday (index 0)
            if (targetColumnIndex === 0 && i > 0) break;
            
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            weekDates[targetColumnIndex] = currentDate.getDate().toString();
          }
        }
        
        setDates(weekDates);
      }
    }
  }, [sharedData?.dateRange]);

  const handleInputChange = (
    sectionIndex: number,
    rowIndex: number,
    field: keyof SubRow,
    value: string,
    dayIndex?: number,
  ) => {
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
  };

  const removeSubRow = (sectionIndex: number, rowIndex: number) => {
    if (sections[sectionIndex].subRows.length > 1) {
      const newSections = [...sections];
      newSections[sectionIndex].subRows = newSections[sectionIndex].subRows.filter((_, i) => i !== rowIndex);
      setSections(newSections);
    }
  };

  const calculateGrandTotal = () => {
    const grandTotal = {
      description: "Grand Total",
      dailyData: ["", "", "", "", "", "", ""],
      previousWeek: "0",
      thisWeek: "0",
      upToThisWeek: "0",
    };

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
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th
              rowSpan={3}
              className="border border-gray-300 bg-blue-100 px-4 py-2 text-left font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              Description
            </th>
            <th
              colSpan={7}
              className="border border-gray-300 bg-blue-100 px-4 py-2 text-center font-semibold"
            >
              {monthYearDisplay}
            </th>
            <th
              rowSpan={3}
              className="border border-gray-300 bg-blue-100 px-4 py-2 text-center font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              Previous Week
            </th>
            <th
              rowSpan={3}
              className="border border-gray-300 bg-blue-100 px-4 py-2 text-center font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              This Week
            </th>
            <th
              rowSpan={3}
              className="border border-gray-300 bg-blue-100 px-4 py-2 text-center font-semibold"
              style={{ verticalAlign: "middle" }}
            >
              Up to This Week
            </th>
          </tr>
          <tr>
            {dayNames.map((day, index) => (
              <th
                key={index}
                className="border border-gray-300 bg-blue-100 px-4 py-2 text-center font-medium"
              >
                {day}
              </th>
            ))}
          </tr>
          <tr>
            {dates.map((date, index) => (
              <th
                key={index}
                className="border border-gray-300 bg-blue-100 px-4 py-2 text-center font-medium"
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
                    className="border border-gray-300 bg-gray-100 px-4 py-2 font-bold text-left"
                  >
                    {section.title} {section.subtitle}
                  </td>
                </tr>
              )}
              
              {/* Sub-rows */}
              {section.subRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "description", e.target.value)
                      }
                      className="w-full px-2 py-1 border-none outline-none bg-transparent"
                      placeholder="Enter description"
                    />
                  </td>
                  {row.dailyData.map((value, dayIndex) => (
                    <td
                      key={dayIndex}
                      className="border border-gray-300 px-4 py-2 text-center"
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
                        className="w-full text-center px-2 py-1 border-none outline-none bg-transparent"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="text"
                      value={row.previousWeek}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "previousWeek", e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="text"
                      value={row.thisWeek}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "thisWeek", e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="text"
                      value={row.upToThisWeek}
                      onChange={(e) =>
                        handleInputChange(sectionIndex, rowIndex, "upToThisWeek", e.target.value)
                      }
                      className="w-full text-center px-2 py-1 border-none outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          {/* Grand Total Row */}
          <tr>
            <td className="border border-gray-300 px-4 py-2 bg-blue-50 font-bold">
              {calculateGrandTotal().description}
            </td>
            {calculateGrandTotal().dailyData.map((value, dayIndex) => (
              <td
                key={dayIndex}
                className="border border-gray-300 px-4 py-2 text-center bg-blue-50 font-bold"
              >
                {value}
              </td>
            ))}
            <td className="border border-gray-300 px-4 py-2 text-center bg-blue-50 font-bold">
              {calculateGrandTotal().previousWeek}
            </td>
            <td className="border border-gray-300 px-4 py-2 text-center bg-blue-50 font-bold">
              {calculateGrandTotal().thisWeek}
            </td>
            <td className="border border-gray-300 px-4 py-2 text-center bg-blue-50 font-bold">
              {calculateGrandTotal().upToThisWeek}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ResourceTableComponent;
