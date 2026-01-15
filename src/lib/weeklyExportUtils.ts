import jsPDF from 'jspdf';

export interface WeeklyReportData {
  startDate: string;
  endDate: string;
  totalReports: number;
  submittedReports: number;
  projectInfo: {
    projectName: string;
    client: string;
    contractor: string;
  };
  summary: {
    overallProgress: string;
    keyHighlights: string[];
    concerns: string[];
  };
  manpower: {
    daily: Array<{
      date: string;
      total: number;
      byRole: Array<{
        role: string;
        count: number;
      }>;
    }>;
    weeklyTotals: Array<{
      role: string;
      total: number;
    }>;
  };
  machinery: Array<{
    description: string;
    unit: string;
    totalUsage: number;
    dailyUsage: Array<{
      date: string;
      usage: number;
    }>;
  }>;
  materials: Array<{
    description: string;
    unit: string;
    totalDelivered: number;
    deliveries: Array<{
      date: string;
      quantity: number;
      status: string;
    }>;
  }>;
  activities: Array<{
    date: string;
    description: string;
    photos: string[];
  }>;
  issues: Array<{
    description: string;
    impact: string;
    mitigation: string;
    status: string;
    date: string;
  }>;
}

// Helper function to generate PDF content for weekly report
const generateWeeklyPDFContent = (data: WeeklyReportData) => {
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 20;
  let yPosition = margin;

  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    if (yPosition > pageHeight - margin) {
      // Add new page if needed
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.35;
    });
    
    return yPosition;
  };

  const doc = new jsPDF('p', 'mm', 'a4');

  // Title
  yPosition = addText('WEEKLY CONSTRUCTION REPORT', 20, true);
  yPosition += 10;

  // Project Information
  yPosition = addText(`Project: ${data.projectInfo?.projectName || 'N/A'}`, 14, true);
  yPosition = addText(`Client: ${data.projectInfo?.client || 'N/A'}`, 12);
  yPosition = addText(`Contractor: ${data.projectInfo?.contractor || 'N/A'}`, 12);
  yPosition = addText(`Period: ${data.startDate} to ${data.endDate}`, 12, true);
  yPosition += 10;

  // Summary Statistics
  yPosition = addText('REPORT SUMMARY', 16, true);
  yPosition = addText(`Total Daily Reports: ${data.totalReports}`, 12);
  yPosition = addText(`Submitted Reports: ${data.submittedReports}`, 12);
  yPosition += 10;

  // Overall Progress
  if (data.summary?.overallProgress) {
    yPosition = addText('OVERALL PROGRESS', 14, true);
    yPosition = addText(data.summary.overallProgress, 11);
    yPosition += 10;
  }

  // Key Highlights
  if (data.summary?.keyHighlights && data.summary.keyHighlights.length > 0) {
    yPosition = addText('KEY HIGHLIGHTS', 14, true);
    data.summary.keyHighlights.forEach((highlight, index) => {
      yPosition = addText(`${index + 1}. ${highlight}`, 11);
    });
    yPosition += 10;
  }

  // Manpower Summary
  if (data.manpower?.weeklyTotals && data.manpower.weeklyTotals.length > 0) {
    yPosition = addText('MANPOWER SUMMARY', 14, true);
    data.manpower.weeklyTotals.forEach((role) => {
      yPosition = addText(`${role.role}: ${role.total} personnel`, 11);
    });
    yPosition += 10;
  }

  // Machinery Summary
  if (data.machinery && data.machinery.length > 0) {
    yPosition = addText('MACHINERY USED', 14, true);
    data.machinery.forEach((machine) => {
      yPosition = addText(`${machine.description}: ${machine.totalUsage} ${machine.unit}`, 11);
    });
    yPosition += 10;
  }

  // Materials Summary
  if (data.materials && data.materials.length > 0) {
    yPosition = addText('MATERIALS DELIVERED', 14, true);
    data.materials.forEach((material) => {
      yPosition = addText(`${material.description}: ${material.totalDelivered} ${material.unit}`, 11);
    });
  }

  return doc;
};

// Helper function to get PDF as blob
const exportWeeklyPDFAsBlob = async (data: WeeklyReportData): Promise<Blob> => {
  const doc = generateWeeklyPDFContent(data);
  return doc.output('blob');
};

// Main export function for weekly reports
export const exportWeeklyToPDF = async (
  data: WeeklyReportData,
  preview: boolean = false
): Promise<string | void> => {
  const blob = await exportWeeklyPDFAsBlob(data);
  const fileName = `Weekly_Report_${
    data.projectInfo?.projectName?.replace(/\s+/g, "_") || "Report"
  }_${data.startDate}_to_${data.endDate}.pdf`;

  if (preview) {
    // Return blob URL for preview instead of downloading
    return URL.createObjectURL(blob);
  } else {
    // Download the PDF
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
