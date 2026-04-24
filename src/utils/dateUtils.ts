// Helper to format date as 'DD-MMM-YY'
export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

// Parse initial start date from dateRange string to yyyy-MM-dd format for HTML date input
export const parseStartDateFromRange = (dateRange: string): string => {
  if (!dateRange) return "";
  
  const match = dateRange.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const monthStr = match[2];
    const year = match[3];
    
    // Convert month abbreviation to month number
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const monthNum = monthMap[monthStr] || '01';
    const fullYear = `20${year}`; // Convert YY to 20YY format
    
    return `${fullYear}-${monthNum}-${day}`; // Return in yyyy-MM-dd format
  }
  
  return "";
};
