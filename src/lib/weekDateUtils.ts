export const generateWeekDates = (dateRange: string) => {
  // Parse dateRange to extract month-year and generate dates
  // dateRange format: "DD-MMM-YY ~ DD-MMM-YY"
  const dateRangeMatch = dateRange.match(/(\d{1,2}-[A-Za-z]{3}-\d{2})\s*~\s*(\d{1,2}-[A-Za-z]{3}-\d{2})/);
  
  if (!dateRangeMatch) return { monthYearDisplay: "Feb-26", dates: ["-", "-", "-", "-", "-", "-", "-"] };
  
  const startDateStr = dateRangeMatch[1];
  const endDateStr = dateRangeMatch[2];
  
  // Parse start date
  const [startDay, startMonth, startYear] = startDateStr.split('-');
  
  // Set month-year display (using start date's month and year)
  const monthYearDisplay = `${startMonth}-${startYear}`;
  
  // Generate dates for week based on actual day of week
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
  } as const;
  
  // Place start date in correct column
  const correctColumnIndex = dayMapping[startDayOfWeek as keyof typeof dayMapping];
  if (correctColumnIndex !== undefined) {
    // Fill dates starting from start date, but only up to Thursday (index 6)
    for (let i = 0; i < 7; i++) {
      const targetColumnIndex = (correctColumnIndex + i) % 7;
      
      // Stop if we've reached Thursday (index 6) and are about to wrap to Friday (index 0)
      if (targetColumnIndex === 0 && i > 0) break;
      
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      weekDates[targetColumnIndex] = currentDate.getDate().toString();
    }
  }
  
  return { monthYearDisplay, dates: weekDates };
};
