import { SubRow } from "@/types/resourceTable.types";

export const calculateGrandTotal = (sections: { subRows: SubRow[] }[]) => {
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

  // Set calculated totals
  grandTotal.previousWeek = totalPreviousWeek.toString();
  grandTotal.thisWeek = totalThisWeek.toString();
  
  // Auto-calculate Up to This Week as Previous Week + This Week
  grandTotal.upToThisWeek = (totalPreviousWeek + totalThisWeek).toString();

  return grandTotal;
};
