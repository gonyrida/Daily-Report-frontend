import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import { ResourceRow } from "@/components/ResourceTable";

interface ReportData {
  projectName: string;
  reportDate: Date | undefined;
  weatherAM: string;
  weatherPM: string;
  tempAM: string;
  tempPM: string;
  activityToday: string;
  workPlanNextDay: string;
  managementTeam: ResourceRow[];
  workingTeam: ResourceRow[];
  materials: ResourceRow[];
  machinery: ResourceRow[];
}

const formatDate = (date: Date | undefined): string => {
  if (!date) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const loadImageDataUrl = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas 2D context not available"));
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
      img.src = src;
    } catch (e) {
      reject(e);
    }
  });
};

// Helper function to get PDF as blob (for ZIP export and regular PDF export)
const exportToPDFAsBlob = async (data: ReportData): Promise<Blob> => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Load logos (public root)
  let leftLogo: string | null = null;
  let rightLogo: string | null = null;
  try {
    leftLogo = await loadImageDataUrl("/cacpm_logo.png");
  } catch (e) {
    leftLogo = null;
  }
  try {
    rightLogo = await loadImageDataUrl("/koica_logo.png");
  } catch (e) {
    rightLogo = null;
  }

  // Title and logos
  const logoHeight = 18; // mm
  const logoWidth = 50; // mm
  const cacpmLogoWidth = 65; // mm (larger for CACPM)
  const cacpmLogoHeight = 24; // mm
  try {
    if (leftLogo) {
      doc.addImage(leftLogo, "PNG", margin, 3, cacpmLogoWidth, cacpmLogoHeight);
    }
  } catch (e) {
    console.warn("Failed to add left logo:", e);
  }
  try {
    if (rightLogo) {
      doc.addImage(
        rightLogo,
        "PNG",
        pageWidth - margin - logoWidth,
        5,
        logoWidth,
        logoHeight
      );
    }
  } catch (e) {
    console.warn("Failed to add right logo:", e);
  }

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("DAILY REPORT", pageWidth / 2, 30, { align: "center" });
  y = 34;

  // Project Info - matching Excel structure (rows 7-9)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Project Name : ${data.projectName || ""}`, margin, y);
  y += 6;

  // Weather Summary in the format: Weather: AM Cloudy | PM Cloudy (row 8)
  const weatherAMDisplay = data.weatherAM || "";
  const weatherPMDisplay = data.weatherPM || "";
  doc.text(
    `Weather          : AM ${weatherAMDisplay}  |  PM ${weatherPMDisplay}`,
    margin,
    y
  );
  y += 6;

  // Temperature and Date on same line (row 9) - Date on right side like Excel I9
  const tempAMDisplay = data.tempAM ? `${data.tempAM}°C` : "";
  const tempPMDisplay = data.tempPM ? `${data.tempPM}°C` : "";
  const dateStr = data.reportDate
    ? data.reportDate.toISOString().split("T")[0] // yyyy-mm-dd format
    : "";
  doc.text(
    `Temperature  : AM ${tempAMDisplay}    |  PM ${tempPMDisplay}`,
    margin,
    y
  );
  // Date on the right side (matching Excel column I9 position)
  if (dateStr) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, pageWidth - margin, y, { align: "right" });
    doc.setFont("helvetica", "bold");
  }
  y += 10;

  // Activity Today and Work Plan side by side - matching Excel rows 12-21 (10 rows)
  const colWidth = (contentWidth - 4) / 2; // 2 columns with small gap
  const gap = 2;
  const activityRowCount = 10; // Match Excel: exactly 10 rows

  // Headers
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(52, 152, 219); // Blue color
  doc.setTextColor(255, 255, 255); // White text
  doc.rect(margin, y - 4, colWidth, 6, "F");
  doc.rect(margin + colWidth + gap, y - 4, colWidth, 6, "F");
  doc.text("Working Activity Today", margin + 2, y);
  doc.text("Work Plan for Next Day", margin + colWidth + gap + 2, y);
  doc.setTextColor(0, 0, 0); // Reset text color
  y += 8;

  // Split text into exactly 10 lines (matching Excel)
  const splitIntoRows = (text: string, maxRows: number, maxLen = 55) => {
    if (!text) return Array(maxRows).fill("");

    const lines: string[] = [];
    text.split(/\r?\n/).forEach((rawLine) => {
      const words = rawLine.split(/\s+/);
      let current = "";
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLen) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      if (lines.length >= maxRows) return;
    });

    return Array.from({ length: maxRows }, (_, i) => lines[i] || "");
  };

  const activityLines = splitIntoRows(
    data.activityToday || "",
    activityRowCount
  );
  const planLines = splitIntoRows(data.workPlanNextDay || "", activityRowCount);

  // Content - exactly 10 rows with borders
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const lineHeight = 5;
  const contentHeight = activityRowCount * lineHeight + 4;

  // Draw borders for all rows
  doc.rect(margin, y - 4, colWidth, contentHeight);
  doc.rect(margin + colWidth + gap, y - 4, colWidth, contentHeight);

  // Draw each line
  for (let i = 0; i < activityRowCount; i++) {
    const lineY = y + i * lineHeight;
    if (activityLines[i]) {
      doc.text(activityLines[i], margin + 2, lineY);
    }
    if (planLines[i]) {
      doc.text(planLines[i], margin + colWidth + gap + 2, lineY);
    }
  }

  y += contentHeight + 8;

  // Check if we need a new page
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // Resource Tables - side by side (matching Excel structure)
  const addResourceTablePair = (
    groupTitle: string = "",
    title1: string,
    rows1: ResourceRow[],
    title2: string,
    rows2: ResourceRow[],
    hasUnit = false
  ) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    const tableColWidth = (contentWidth - 2) / 2; // 2 columns with small gap
    const tableGap = 2;
    const leftX = margin;
    const rightX = margin + tableColWidth + tableGap;

    // Group Title with background color (only if provided) - matching Excel style
    if (groupTitle) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(52, 152, 219); // Blue color
      doc.setTextColor(255, 255, 255); // White text
      doc.rect(leftX, y - 4, contentWidth, 6, "F");
      doc.text(groupTitle, leftX + contentWidth / 2, y, { align: "center" });
      doc.setTextColor(0, 0, 0); // Reset text color
      y += 8;
    }

    // Sub-titles with color - matching Excel header style
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(52, 152, 219); // Blue color
    doc.setTextColor(255, 255, 255); // White text
    doc.rect(leftX, y - 4, tableColWidth, 6, "F");
    doc.rect(rightX, y - 4, tableColWidth, 6, "F");
    doc.text(title1, leftX + 2, y);
    doc.text(title2, rightX + 2, y);
    doc.setTextColor(0, 0, 0); // Reset text color
    y += 7;

    // Calculate totals for both tables
    let totalPrev1 = 0,
      totalToday1 = 0,
      totalAccum1 = 0;
    let totalPrev2 = 0,
      totalToday2 = 0,
      totalAccum2 = 0;
    rows1.forEach((row) => {
      totalPrev1 += Number(row.prev) || 0;
      totalToday1 += Number(row.today) || 0;
      totalAccum1 += Number(row.accumulated) || 0;
    });
    rows2.forEach((row) => {
      totalPrev2 += Number(row.prev) || 0;
      totalToday2 += Number(row.today) || 0;
      totalAccum2 += Number(row.accumulated) || 0;
    });

    // Column widths for each side-by-side table - matching Excel column structure
    // Excel: B-C (merged), D, E, F for left; G-H (merged), I, J, K for right
    const colWidths = hasUnit ? [38, 15, 12, 12, 12] : [53, 12, 12, 12];

    // Headers row with background - matching Excel header style
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(217, 225, 242); // Light blue background like Excel headers
    doc.setTextColor(0, 0, 0);

    // Draw header backgrounds
    const headerHeight = 5;
    doc.rect(leftX, y - 3, tableColWidth, headerHeight, "F");
    doc.rect(rightX, y - 3, tableColWidth, headerHeight, "F");

    // Headers text
    let x = leftX + 2;
    if (hasUnit) {
      doc.text("Description", x, y);
      x += colWidths[0];
      doc.text("Unit", x, y);
      x += colWidths[1];
      doc.text("Prev", x, y);
      x += colWidths[2];
      doc.text("Today", x, y);
      x += colWidths[3];
      doc.text("Accum", x, y);
    } else {
      doc.text("Description", x, y);
      x += colWidths[0];
      doc.text("Prev", x, y);
      x += colWidths[1];
      doc.text("Today", x, y);
      x += colWidths[2];
      doc.text("Accum", x, y);
    }

    x = rightX + 2;
    if (hasUnit) {
      doc.text("Description", x, y);
      x += colWidths[0];
      doc.text("Unit", x, y);
      x += colWidths[1];
      doc.text("Prev", x, y);
      x += colWidths[2];
      doc.text("Today", x, y);
      x += colWidths[3];
      doc.text("Accum", x, y);
    } else {
      doc.text("Description", x, y);
      x += colWidths[0];
      doc.text("Prev", x, y);
      x += colWidths[1];
      doc.text("Today", x, y);
      x += colWidths[2];
      doc.text("Accum", x, y);
    }
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Get max rows for height calculation - ensure minimum rows like Excel
    const maxRows = Math.max(
      rows1.length,
      rows2.length,
      hasUnit ? 1 : 6 // Minimum rows: 6 for teams, 1 for materials
    );
    const rowHeight = 5.5;
    const padding = 2;

    // Draw table borders
    const tableHeight = maxRows * rowHeight;
    doc.rect(leftX, y - 3, tableColWidth, tableHeight);
    doc.rect(rightX, y - 3, tableColWidth, tableHeight);

    // Data rows
    for (let i = 0; i < maxRows; i++) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      // Draw row background (alternating light gray) - matching Excel alternating rows
      if (i % 2 === 0) {
        doc.setFillColor(242, 242, 242); // Slightly darker gray to match Excel
        doc.rect(leftX, y - 3, tableColWidth, rowHeight, "F");
        doc.rect(rightX, y - 3, tableColWidth, rowHeight, "F");
      }

      // Draw vertical lines between columns (matching Excel structure)
      if (hasUnit) {
        // Left table: Description|Unit|Prev|Today|Accum
        doc.setDrawColor(200, 200, 200);
        let colX = leftX;
        colX += colWidths[0]; // After Description
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[1]; // After Unit
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[2]; // After Prev
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[3]; // After Today
        doc.line(colX, y - 3, colX, y + rowHeight - 3);

        // Right table: Description|Unit|Prev|Today|Accum
        colX = rightX;
        colX += colWidths[0]; // After Description
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[1]; // After Unit
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[2]; // After Prev
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[3]; // After Today
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
      } else {
        // Left table: Description|Prev|Today|Accum
        doc.setDrawColor(200, 200, 200);
        let colX = leftX;
        colX += colWidths[0]; // After Description
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[1]; // After Prev
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[2]; // After Today
        doc.line(colX, y - 3, colX, y + rowHeight - 3);

        // Right table: Description|Prev|Today|Accum
        colX = rightX;
        colX += colWidths[0]; // After Description
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[1]; // After Prev
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
        colX += colWidths[2]; // After Today
        doc.line(colX, y - 3, colX, y + rowHeight - 3);
      }

      // Draw horizontal line between rows
      doc.setDrawColor(200, 200, 200);
      doc.line(
        leftX,
        y + rowHeight - 3,
        leftX + tableColWidth,
        y + rowHeight - 3
      );
      doc.line(
        rightX,
        y + rowHeight - 3,
        rightX + tableColWidth,
        y + rowHeight - 3
      );

      // Left table
      if (i < rows1.length) {
        const row = rows1[i];
        x = leftX + padding;
        if (hasUnit) {
          doc.text(row.description.substring(0, 20) || "-", x, y);
          x += colWidths[0];
          doc.text(row.unit || "-", x, y);
          x += colWidths[1];
          doc.text(String(row.prev), x, y);
          x += colWidths[2];
          doc.text(String(row.today), x, y);
          x += colWidths[3];
          doc.text(String(row.accumulated), x, y);
        } else {
          doc.text(row.description.substring(0, 30) || "-", x, y);
          x += colWidths[0];
          doc.text(String(row.prev), x, y);
          x += colWidths[1];
          doc.text(String(row.today), x, y);
          x += colWidths[2];
          doc.text(String(row.accumulated), x, y);
        }
      }

      // Right table
      if (i < rows2.length) {
        const row = rows2[i];
        x = rightX + padding;
        if (hasUnit) {
          doc.text(row.description.substring(0, 20) || "-", x, y);
          x += colWidths[0];
          doc.text(row.unit || "-", x, y);
          x += colWidths[1];
          doc.text(String(row.prev), x, y);
          x += colWidths[2];
          doc.text(String(row.today), x, y);
          x += colWidths[3];
          doc.text(String(row.accumulated), x, y);
        } else {
          doc.text(row.description.substring(0, 30) || "-", x, y);
          x += colWidths[0];
          doc.text(String(row.prev), x, y);
          x += colWidths[1];
          doc.text(String(row.today), x, y);
          x += colWidths[2];
          doc.text(String(row.accumulated), x, y);
        }
      }
      y += rowHeight;
    }

    // Total rows - matching Excel total row style
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(217, 225, 242); // Light blue background like Excel total rows
    doc.rect(leftX, y - 3, tableColWidth, rowHeight, "F");
    doc.rect(rightX, y - 3, tableColWidth, rowHeight, "F");

    // Draw border for total row
    doc.setDrawColor(0, 0, 0);
    doc.rect(leftX, y - 3, tableColWidth, rowHeight);
    doc.rect(rightX, y - 3, tableColWidth, rowHeight);

    x = leftX;
    if (hasUnit) {
      doc.text("TOTAL", x, y);
      x += colWidths[0];
      doc.text("", x, y);
      x += colWidths[1];
      doc.text(String(totalPrev1), x, y);
      x += colWidths[2];
      doc.text(String(totalToday1), x, y);
      x += colWidths[3];
      doc.text(String(totalAccum1), x, y);
    } else {
      doc.text("TOTAL", x, y);
      x += colWidths[0];
      doc.text(String(totalPrev1), x, y);
      x += colWidths[1];
      doc.text(String(totalToday1), x, y);
      x += colWidths[2];
      doc.text(String(totalAccum1), x, y);
    }

    x = rightX;
    if (hasUnit) {
      doc.text("TOTAL", x, y);
      x += colWidths[0];
      doc.text("", x, y);
      x += colWidths[1];
      doc.text(String(totalPrev2), x, y);
      x += colWidths[2];
      doc.text(String(totalToday2), x, y);
      x += colWidths[3];
      doc.text(String(totalAccum2), x, y);
    } else {
      doc.text("TOTAL", x, y);
      x += colWidths[0];
      doc.text(String(totalPrev2), x, y);
      x += colWidths[1];
      doc.text(String(totalToday2), x, y);
      x += colWidths[2];
      doc.text(String(totalAccum2), x, y);
    }

    y += 10; // Extra spacing after table
  };

  // Resource tables - matching Excel row positions (row 25+ for teams, row 34+ for materials)
  addResourceTablePair(
    "Resources Employeed",
    "Site Management Team",
    data.managementTeam,
    "Site Working Team",
    data.workingTeam,
    false
  );
  addResourceTablePair(
    "",
    "Materials Deliveries",
    data.materials,
    "Machinery & Equipment",
    data.machinery,
    true
  );

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  // Return as blob
  return doc.output("blob");
};

export const exportToPDF = async (
  data: ReportData,
  preview: boolean = false
): Promise<string | void> => {
  const blob = await exportToPDFAsBlob(data);
  const fileName = `Daily_Report_${
    data.projectName?.replace(/\s+/g, "_") || "Report"
  }_${formatDate(data.reportDate).replace(/\s+/g, "_")}.pdf`;

  if (preview) {
    // Return blob URL for preview instead of downloading
    return URL.createObjectURL(blob);
  } else {
    // Download the PDF
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

export const exportToExcel = async (data: ReportData) => {
  // Load the provided Excel template so the export matches the exact layout
  const response = await apiGet("/template.xlsx");
  if (!response.ok) {
    throw new Error("Unable to load Excel template");
  }

  const templateBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const worksheet = workbook.getWorksheet("REPORT") || workbook.worksheets[0];

  // Get custom logos from localStorage
  const cacpmLogo = localStorage.getItem("customCacpmLogo");
  const koicaLogo = localStorage.getItem("customKoicaLogo");

  // Add logos to the worksheet if available
  if (cacpmLogo) {
    try {
      // Convert base64 data URL to buffer
      const base64Data = cacpmLogo.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const imageBuffer = bytes.buffer;
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: "png",
      });
      // Add CACPM logo at position (assuming row 1-3, column A-B based on template)
      worksheet.addImage(imageId, 'A1:B3');
    } catch (e) {
      console.warn("Failed to add CACPM logo to Excel:", e);
    }
  }

  if (koicaLogo) {
    try {
      // Convert base64 data URL to buffer
      const base64Data = koicaLogo.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const imageBuffer = bytes.buffer;
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: "png",
      });
      // Add KOICA logo at position (assuming row 1-3, column H-I based on template)
      worksheet.addImage(imageId, 'H1:I3');
    } catch (e) {
      console.warn("Failed to add KOICA logo to Excel:", e);
    }
  }

  const safeNumber = (value: number | string | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const cloneStyle = (cell: ExcelJS.Cell) =>
    JSON.parse(JSON.stringify(cell.style || {}));

  const mergeIfNeeded = (range: string) => {
    try {
      worksheet.mergeCells(range);
    } catch {
      // ignore if already merged in template
    }
  };

  const splitIntoRows = (text: string, maxRows: number, maxLen = 55) => {
    if (!text) return Array(maxRows).fill("");

    const lines: string[] = [];
    text.split(/\r?\n/).forEach((rawLine) => {
      const words = rawLine.split(/\s+/);
      let current = "";
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLen) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      if (lines.length >= maxRows) return;
    });

    return Array.from({ length: maxRows }, (_, i) => lines[i] || "");
  };

  const dateValue =
    data.reportDate instanceof Date
      ? data.reportDate
      : data.reportDate
      ? new Date(data.reportDate)
      : undefined;

  // Header info
  worksheet.getCell("B7").value = `Project Name : ${data.projectName || ""}`;
  // Weather Summary in the format: Weather: AM Cloudy | PM Cloudy
  const weatherAMDisplay = data.weatherAM || "";
  const weatherPMDisplay = data.weatherPM || "";
  worksheet.getCell(
    "B8"
  ).value = `Weather          : AM ${weatherAMDisplay}  |  PM ${weatherPMDisplay}`;
  // Temperature Summary in the format: Temperature: AM 28°C | PM 32°C
  const tempAMDisplay = data.tempAM ? `${data.tempAM}°C` : "";
  const tempPMDisplay = data.tempPM ? `${data.tempPM}°C` : "";
  worksheet.getCell(
    "B9"
  ).value = `Temperature  : AM ${tempAMDisplay}    |  PM ${tempPMDisplay}`;
  const dateCell = worksheet.getCell("I9");
  dateCell.value = dateValue || null;
  if (!dateCell.numFmt) {
    dateCell.numFmt = "yyyy-mm-dd";
  }

  // Activities (10 available rows in the template)
  const activityLines = splitIntoRows(data.activityToday || "", 10);
  const planLines = splitIntoRows(data.workPlanNextDay || "", 10);
  const baseActivityStyle = cloneStyle(worksheet.getCell("B12"));
  const basePlanStyle = cloneStyle(worksheet.getCell("G12"));

  for (let i = 0; i < 10; i++) {
    const row = 12 + i;
    const leftCell = worksheet.getCell(`B${row}`);
    leftCell.style = { ...baseActivityStyle, alignment: { wrapText: true } };
    leftCell.value = activityLines[i] || "";

    const rightCell = worksheet.getCell(`G${row}`);
    rightCell.style = { ...basePlanStyle, alignment: { wrapText: true } };
    rightCell.value = planLines[i] || "";
  }

  // Resource tables (Site Management / Working Team)
  const startTeamRow = 25;
  const baseTeamRows = 6;
  const teamRowsNeeded = Math.max(
    baseTeamRows,
    data.managementTeam.length,
    data.workingTeam.length
  );

  // Insert extra rows if more data than template rows
  if (teamRowsNeeded > baseTeamRows) {
    const rowsToInsert = teamRowsNeeded - baseTeamRows;
    worksheet.spliceRows(
      startTeamRow + baseTeamRows,
      0,
      ...new Array(rowsToInsert).fill([])
    );
  }

  const totalRowIndex = startTeamRow + teamRowsNeeded;

  // Preserve cell styles from the first data row
  // Ensure description merges exist for all dynamic rows
  for (let r = startTeamRow; r < totalRowIndex; r++) {
    mergeIfNeeded(`B${r}:C${r}`);
    mergeIfNeeded(`G${r}:H${r}`);
  }

  for (let i = 0; i < teamRowsNeeded; i++) {
    const rowIndex = startTeamRow + i;
    const mgmt = data.managementTeam[i];
    const work = data.workingTeam[i];

    const setCell = (
      address: string,
      value: string | number | null,
      styleCol: string
    ) => {
      const cell = worksheet.getCell(address);
      cell.style = cloneStyle(worksheet.getCell(`${styleCol}${startTeamRow}`));
      cell.value = value ?? "";
    };

    setCell(`B${rowIndex}`, mgmt?.description ?? "", "B");
    setCell(`D${rowIndex}`, safeNumber(mgmt?.prev), "D");
    setCell(`E${rowIndex}`, safeNumber(mgmt?.today), "E");
    const leftAccum = worksheet.getCell(`F${rowIndex}`);
    leftAccum.style = cloneStyle(worksheet.getCell(`F${startTeamRow}`));
    leftAccum.value = { formula: `SUM(D${rowIndex}:E${rowIndex})` };

    setCell(`G${rowIndex}`, work?.description ?? "", "G");
    setCell(`I${rowIndex}`, safeNumber(work?.prev), "I");
    setCell(`J${rowIndex}`, safeNumber(work?.today), "J");
    const rightAccum = worksheet.getCell(`K${rowIndex}`);
    rightAccum.style = cloneStyle(worksheet.getCell(`K${startTeamRow}`));
    rightAccum.value = { formula: `SUM(I${rowIndex}:J${rowIndex})` };
  }

  // Total row (re-merge and re-point formulas)
  mergeIfNeeded(`B${totalRowIndex}:C${totalRowIndex}`);
  mergeIfNeeded(`G${totalRowIndex}:H${totalRowIndex}`);
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.getCell("B").value = "TOTAL";
  totalRow.getCell("G").value = "TOTAL";
  totalRow.getCell("D").value = {
    formula: `SUM(D${startTeamRow}:D${totalRowIndex - 1})`,
  };
  totalRow.getCell("E").value = {
    formula: `SUM(E${startTeamRow}:E${totalRowIndex - 1})`,
  };
  totalRow.getCell("F").value = {
    formula: `SUM(F${startTeamRow}:F${totalRowIndex - 1})`,
  };
  totalRow.getCell("I").value = {
    formula: `SUM(I${startTeamRow}:I${totalRowIndex - 1})`,
  };
  totalRow.getCell("J").value = {
    formula: `SUM(J${startTeamRow}:J${totalRowIndex - 1})`,
  };
  totalRow.getCell("K").value = {
    formula: `SUM(I${totalRowIndex}:J${totalRowIndex})`,
  };

  // Materials & Machinery table
  const materialStartRow = 34; // first row below column headers
  const materialRowsNeeded = Math.max(
    data.materials.length,
    data.machinery.length,
    1
  );

  // Insert extra rows if needed (template has rows up to ~75)
  const availableMaterialRows = worksheet.rowCount - materialStartRow + 1;
  if (materialRowsNeeded > availableMaterialRows) {
    const rowsToInsert = materialRowsNeeded - availableMaterialRows;
    worksheet.spliceRows(
      materialStartRow + availableMaterialRows,
      0,
      ...new Array(rowsToInsert).fill([])
    );
  }

  for (let i = 0; i < materialRowsNeeded; i++) {
    const rowIndex = materialStartRow + i;
    const mat = data.materials[i];
    const mach = data.machinery[i];

    const setMatCell = (
      col: string,
      value: string | number | null,
      styleCol: string
    ) => {
      const cell = worksheet.getCell(`${col}${rowIndex}`);
      cell.style = cloneStyle(
        worksheet.getCell(`${styleCol}${materialStartRow}`)
      );
      cell.value = value ?? "";
    };

    setMatCell("B", mat?.description ?? "", "B");
    setMatCell("C", mat?.unit ?? "", "C");
    setMatCell("D", safeNumber(mat?.prev), "D");
    setMatCell("E", safeNumber(mat?.today), "E");
    const matAccum =
      mat?.accumulated ??
      (mat ? safeNumber(mat.prev) + safeNumber(mat.today) : "");
    setMatCell("F", matAccum, "F");

    setMatCell("G", mach?.description ?? "", "G");
    setMatCell("H", mach?.unit ?? "", "H");
    setMatCell("I", safeNumber(mach?.prev), "I");
    setMatCell("J", safeNumber(mach?.today), "J");
    const machAccum =
      mach?.accumulated ??
      (mach ? safeNumber(mach.prev) + safeNumber(mach.today) : "");
    setMatCell("K", machAccum, "K");
  }

  const fileName = `Daily_Report_${
    data.projectName?.replace(/\s+/g, "_") || "Report"
  }_${formatDate(data.reportDate).replace(/\s+/g, "_")}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Export both PDF and Excel as a ZIP
import { apiGet, apiPost } from "./apiFetch";
export const exportToZIP = async (data: ReportData): Promise<void> => {
  const zip = new JSZip();

  // Generate PDF blob
  const pdfBlob = await exportToPDFAsBlob(data);
  const pdfFileName = `Daily_Report_${
    data.projectName?.replace(/\s+/g, "_") || "Report"
  }_${formatDate(data.reportDate).replace(/\s+/g, "_")}.pdf`;
  zip.file(pdfFileName, pdfBlob);

  // Generate Excel blob
  const response = await apiGet("/template.xlsx");
  if (!response.ok) {
    throw new Error("Unable to load Excel template");
  }

  const templateBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const worksheet = workbook.getWorksheet("REPORT") || workbook.worksheets[0];

  const safeNumber = (value: number | string | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const cloneStyle = (cell: ExcelJS.Cell) =>
    JSON.parse(JSON.stringify(cell.style || {}));

  const mergeIfNeeded = (range: string) => {
    try {
      worksheet.mergeCells(range);
    } catch {
      // ignore if already merged in template
    }
  };

  const splitIntoRows = (text: string, maxRows: number, maxLen = 55) => {
    if (!text) return Array(maxRows).fill("");

    const lines: string[] = [];
    text.split(/\r?\n/).forEach((rawLine) => {
      const words = rawLine.split(/\s+/);
      let current = "";
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLen) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      if (lines.length >= maxRows) return;
    });

    return Array.from({ length: maxRows }, (_, i) => lines[i] || "");
  };

  const dateValue =
    data.reportDate instanceof Date
      ? data.reportDate
      : data.reportDate
      ? new Date(data.reportDate)
      : undefined;

  // Header info
  worksheet.getCell("B7").value = `Project Name : ${data.projectName || ""}`;
  // Weather Summary in the format: Weather: AM Cloudy | PM Cloudy
  const weatherAMDisplay = data.weatherAM || "";
  const weatherPMDisplay = data.weatherPM || "";
  worksheet.getCell(
    "B8"
  ).value = `Weather          : AM ${weatherAMDisplay}  |  PM ${weatherPMDisplay}`;
  // Temperature Summary in the format: Temperature: AM 28°C | PM 32°C
  const tempAMDisplay = data.tempAM ? `${data.tempAM}°C` : "";
  const tempPMDisplay = data.tempPM ? `${data.tempPM}°C` : "";
  worksheet.getCell(
    "B9"
  ).value = `Temperature  : AM ${tempAMDisplay}    |  PM ${tempPMDisplay}`;
  const dateCell = worksheet.getCell("I9");
  dateCell.value = dateValue || null;
  if (!dateCell.numFmt) {
    dateCell.numFmt = "yyyy-mm-dd";
  }

  // Activities (10 available rows in the template)
  const activityLines = splitIntoRows(data.activityToday || "", 10);
  const planLines = splitIntoRows(data.workPlanNextDay || "", 10);
  const baseActivityStyle = cloneStyle(worksheet.getCell("B12"));
  const basePlanStyle = cloneStyle(worksheet.getCell("G12"));

  for (let i = 0; i < 10; i++) {
    const row = 12 + i;
    const leftCell = worksheet.getCell(`B${row}`);
    leftCell.style = { ...baseActivityStyle, alignment: { wrapText: true } };
    leftCell.value = activityLines[i] || "";

    const rightCell = worksheet.getCell(`G${row}`);
    rightCell.style = { ...basePlanStyle, alignment: { wrapText: true } };
    rightCell.value = planLines[i] || "";
  }

  // Resource tables (Site Management / Working Team)
  const startTeamRow = 25;
  const baseTeamRows = 6;
  const teamRowsNeeded = Math.max(
    baseTeamRows,
    data.managementTeam.length,
    data.workingTeam.length
  );

  // Insert extra rows if more data than template rows
  if (teamRowsNeeded > baseTeamRows) {
    const rowsToInsert = teamRowsNeeded - baseTeamRows;
    worksheet.spliceRows(
      startTeamRow + baseTeamRows,
      0,
      ...new Array(rowsToInsert).fill([])
    );
  }

  const totalRowIndex = startTeamRow + teamRowsNeeded;

  // Preserve cell styles from the first data row
  // Ensure description merges exist for all dynamic rows
  for (let r = startTeamRow; r < totalRowIndex; r++) {
    mergeIfNeeded(`B${r}:C${r}`);
    mergeIfNeeded(`G${r}:H${r}`);
  }

  for (let i = 0; i < teamRowsNeeded; i++) {
    const rowIndex = startTeamRow + i;
    const mgmt = data.managementTeam[i];
    const work = data.workingTeam[i];

    const setCell = (
      address: string,
      value: string | number | null,
      styleCol: string
    ) => {
      const cell = worksheet.getCell(address);
      cell.style = cloneStyle(worksheet.getCell(`${styleCol}${startTeamRow}`));
      cell.value = value ?? "";
    };

    setCell(`B${rowIndex}`, mgmt?.description ?? "", "B");
    setCell(`D${rowIndex}`, safeNumber(mgmt?.prev), "D");
    setCell(`E${rowIndex}`, safeNumber(mgmt?.today), "E");
    const leftAccum = worksheet.getCell(`F${rowIndex}`);
    leftAccum.style = cloneStyle(worksheet.getCell(`F${startTeamRow}`));
    leftAccum.value = { formula: `SUM(D${rowIndex}:E${rowIndex})` };

    setCell(`G${rowIndex}`, work?.description ?? "", "G");
    setCell(`I${rowIndex}`, safeNumber(work?.prev), "I");
    setCell(`J${rowIndex}`, safeNumber(work?.today), "J");
    const rightAccum = worksheet.getCell(`K${rowIndex}`);
    rightAccum.style = cloneStyle(worksheet.getCell(`K${startTeamRow}`));
    rightAccum.value = { formula: `SUM(I${rowIndex}:J${rowIndex})` };
  }

  // Total row (re-merge and re-point formulas)
  mergeIfNeeded(`B${totalRowIndex}:C${totalRowIndex}`);
  mergeIfNeeded(`G${totalRowIndex}:H${totalRowIndex}`);
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.getCell("B").value = "TOTAL";
  totalRow.getCell("G").value = "TOTAL";
  totalRow.getCell("D").value = {
    formula: `SUM(D${startTeamRow}:D${totalRowIndex - 1})`,
  };
  totalRow.getCell("E").value = {
    formula: `SUM(E${startTeamRow}:E${totalRowIndex - 1})`,
  };
  totalRow.getCell("F").value = {
    formula: `SUM(F${startTeamRow}:F${totalRowIndex - 1})`,
  };
  totalRow.getCell("I").value = {
    formula: `SUM(I${startTeamRow}:I${totalRowIndex - 1})`,
  };
  totalRow.getCell("J").value = {
    formula: `SUM(J${startTeamRow}:J${totalRowIndex - 1})`,
  };
  totalRow.getCell("K").value = {
    formula: `SUM(I${totalRowIndex}:J${totalRowIndex})`,
  };

  // Materials & Machinery table
  const materialStartRow = 34; // first row below column headers
  const materialRowsNeeded = Math.max(
    data.materials.length,
    data.machinery.length,
    1
  );

  // Insert extra rows if needed (template has rows up to ~75)
  const availableMaterialRows = worksheet.rowCount - materialStartRow + 1;
  if (materialRowsNeeded > availableMaterialRows) {
    const rowsToInsert = materialRowsNeeded - availableMaterialRows;
    worksheet.spliceRows(
      materialStartRow + availableMaterialRows,
      0,
      ...new Array(rowsToInsert).fill([])
    );
  }

  for (let i = 0; i < materialRowsNeeded; i++) {
    const rowIndex = materialStartRow + i;
    const mat = data.materials[i];
    const mach = data.machinery[i];

    const setMatCell = (
      col: string,
      value: string | number | null,
      styleCol: string
    ) => {
      const cell = worksheet.getCell(`${col}${rowIndex}`);
      cell.style = cloneStyle(
        worksheet.getCell(`${styleCol}${materialStartRow}`)
      );
      cell.value = value ?? "";
    };

    setMatCell("B", mat?.description ?? "", "B");
    setMatCell("C", mat?.unit ?? "", "C");
    setMatCell("D", safeNumber(mat?.prev), "D");
    setMatCell("E", safeNumber(mat?.today), "E");
    const matAccum =
      mat?.accumulated ??
      (mat ? safeNumber(mat.prev) + safeNumber(mat.today) : "");
    setMatCell("F", matAccum, "F");

    setMatCell("G", mach?.description ?? "", "G");
    setMatCell("H", mach?.unit ?? "", "H");
    setMatCell("I", safeNumber(mach?.prev), "I");
    setMatCell("J", safeNumber(mach?.today), "J");
    const machAccum =
      mach?.accumulated ??
      (mach ? safeNumber(mach.prev) + safeNumber(mach.today) : "");
    setMatCell("K", machAccum, "K");
  }

  const excelBuffer = await workbook.xlsx.writeBuffer();
  const excelFileName = `Daily_Report_${
    data.projectName?.replace(/\s+/g, "_") || "Report"
  }_${formatDate(data.reportDate).replace(/\s+/g, "_")}.xlsx`;
  zip.file(excelFileName, excelBuffer);

  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipFileName = `Daily_Report_${
    data.projectName?.replace(/\s+/g, "_") || "Report"
  }_${formatDate(data.reportDate).replace(/\s+/g, "_")}.zip`;

  const url = window.URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Export to Word document
export const exportToWord = async (data: ReportData): Promise<void> => {
  const safeNumber = (value: number | string | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const splitIntoRows = (text: string, maxRows: number, maxLen = 55) => {
    if (!text) return Array(maxRows).fill("");

    const lines: string[] = [];
    text.split(/\r?\n/).forEach((rawLine) => {
      const words = rawLine.split(/\s+/);
      let current = "";
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLen) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      if (lines.length >= maxRows) return;
    });

    return Array.from({ length: maxRows }, (_, i) => lines[i] || "");
  };

  const dateValue =
    data.reportDate instanceof Date
      ? data.reportDate
      : data.reportDate
      ? new Date(data.reportDate)
      : undefined;

  const dateStr = dateValue
    ? dateValue.toISOString().split("T")[0] // yyyy-mm-dd format to match Excel
    : "";

  const weatherAMDisplay = data.weatherAM || "";
  const weatherPMDisplay = data.weatherPM || "";
  const tempAMDisplay = data.tempAM ? `${data.tempAM}°C` : "";
  const tempPMDisplay = data.tempPM ? `${data.tempPM}°C` : "";

  // Helper to create side-by-side resource tables (matching Excel structure)
  const createSideBySideResourceTables = (
    groupTitle: string | null,
    title1: string,
    rows1: ResourceRow[],
    title2: string,
    rows2: ResourceRow[],
    hasUnit: boolean
  ) => {
    // Calculate totals for both tables
    let totalPrev1 = 0,
      totalToday1 = 0,
      totalAccum1 = 0;
    let totalPrev2 = 0,
      totalToday2 = 0,
      totalAccum2 = 0;
    rows1.forEach((row) => {
      totalPrev1 += safeNumber(row.prev);
      totalToday1 += safeNumber(row.today);
      totalAccum1 += safeNumber(row.accumulated);
    });
    rows2.forEach((row) => {
      totalPrev2 += safeNumber(row.prev);
      totalToday2 += safeNumber(row.today);
      totalAccum2 += safeNumber(row.accumulated);
    });

    // Determine max rows (minimum 6 for teams, 1 for materials)
    const maxRows = Math.max(rows1.length, rows2.length, hasUnit ? 1 : 6);

    // Create a combined table with side-by-side layout
    // Each row will have cells for both left and right tables
    const tableRows: TableRow[] = [];

    // Group title row if provided (spans both tables)
    if (groupTitle) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: groupTitle,
                      bold: true,
                      color: "FFFFFF",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              columnSpan: hasUnit ? 10 : 8,
              shading: { fill: "3498DB" },
            }),
          ],
        })
      );
    }

    // Header row - both tables side by side
    const headerCells: TableCell[] = [];
    if (hasUnit) {
      headerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Description", bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
          shading: { fill: "D9E1F2" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Unit", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "D9E1F2" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Prev", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "D9E1F2" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Today", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "D9E1F2" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Accum", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "D9E1F2" },
        })
      );
    } else {
      headerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Description", bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
          shading: { fill: "D9E1F2" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Prev", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "D9E1F2" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Today", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "D9E1F2" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Accum", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "D9E1F2" },
        })
      );
    }

    // Sub-header row with table titles
    const subHeaderCells: TableCell[] = [];
    if (hasUnit) {
      subHeaderCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: title1, bold: true, color: "FFFFFF" }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          columnSpan: 5,
          shading: { fill: "3498DB" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: title2, bold: true, color: "FFFFFF" }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          columnSpan: 5,
          shading: { fill: "3498DB" },
        })
      );
    } else {
      subHeaderCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: title1, bold: true, color: "FFFFFF" }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          columnSpan: 4,
          shading: { fill: "3498DB" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: title2, bold: true, color: "FFFFFF" }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          columnSpan: 4,
          shading: { fill: "3498DB" },
        })
      );
    }
    tableRows.push(new TableRow({ children: subHeaderCells }));
    tableRows.push(
      new TableRow({ children: [...headerCells, ...headerCells] })
    );

    // Data rows - side by side
    for (let i = 0; i < maxRows; i++) {
      const row1 = rows1[i];
      const row2 = rows2[i];
      const rowCells: TableCell[] = [];

      // Left table cells
      if (hasUnit) {
        rowCells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: row1?.description || "" })],
                alignment: AlignmentType.LEFT,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: row1?.unit || "" })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row1?.prev)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row1?.today)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(
                      row1?.accumulated ??
                        safeNumber(row1?.prev) + safeNumber(row1?.today)
                    ),
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          })
        );
      } else {
        rowCells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: row1?.description || "" })],
                alignment: AlignmentType.LEFT,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row1?.prev)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row1?.today)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(
                      row1?.accumulated ??
                        safeNumber(row1?.prev) + safeNumber(row1?.today)
                    ),
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          })
        );
      }

      // Right table cells
      if (hasUnit) {
        rowCells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: row2?.description || "" })],
                alignment: AlignmentType.LEFT,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: row2?.unit || "" })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row2?.prev)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row2?.today)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(
                      row2?.accumulated ??
                        safeNumber(row2?.prev) + safeNumber(row2?.today)
                    ),
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          })
        );
      } else {
        rowCells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: row2?.description || "" })],
                alignment: AlignmentType.LEFT,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row2?.prev)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: String(safeNumber(row2?.today)) }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(
                      row2?.accumulated ??
                        safeNumber(row2?.prev) + safeNumber(row2?.today)
                    ),
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
          })
        );
      }
      tableRows.push(new TableRow({ children: rowCells }));
    }

    // Total row - side by side
    const totalCells: TableCell[] = [];
    if (hasUnit) {
      // Left table total
      totalCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "TOTAL", bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "" })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(totalPrev1), bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalToday1), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalAccum1), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        // Right table total
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "TOTAL", bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "" })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(totalPrev2), bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalToday2), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalAccum2), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        })
      );
    } else {
      // Left table total
      totalCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "TOTAL", bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(totalPrev1), bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalToday1), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalAccum1), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        // Right table total
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "TOTAL", bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(totalPrev2), bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalToday2), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(totalAccum2), bold: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        })
      );
    }
    tableRows.push(new TableRow({ children: totalCells }));

    return new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE },
        bottom: { style: BorderStyle.SINGLE },
        left: { style: BorderStyle.SINGLE },
        right: { style: BorderStyle.SINGLE },
        insideHorizontal: { style: BorderStyle.SINGLE },
        insideVertical: { style: BorderStyle.SINGLE },
      },
    });
  };

  // Helper to create side-by-side activity table (matching Excel structure)
  const createActivityTable = () => {
    const activityLines = splitIntoRows(data.activityToday || "", 10);
    const planLines = splitIntoRows(data.workPlanNextDay || "", 10);

    const tableRows: TableRow[] = [];

    // Header row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Working Activity Today",
                    bold: true,
                    color: "FFFFFF",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 1,
            shading: { fill: "3498DB" },
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Work Plan for Next Day",
                    bold: true,
                    color: "FFFFFF",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 1,
            shading: { fill: "3498DB" },
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      })
    );

    // Data rows - 10 rows side by side
    for (let i = 0; i < 10; i++) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  text: activityLines[i] || "",
                  spacing: { after: 100 },
                }),
              ],
              shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: planLines[i] || "",
                  spacing: { after: 100 },
                }),
              ],
              shading: i % 2 === 0 ? { fill: "F2F2F2" } : undefined,
            }),
          ],
        })
      );
    }

    return new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE },
        bottom: { style: BorderStyle.SINGLE },
        left: { style: BorderStyle.SINGLE },
        right: { style: BorderStyle.SINGLE },
        insideHorizontal: { style: BorderStyle.SINGLE },
        insideVertical: { style: BorderStyle.SINGLE },
      },
    });
  };

  // Build document sections
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: "DAILY REPORT",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Project Info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Project Name : ", bold: true }),
        new TextRun({ text: data.projectName || "" }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Weather          : AM ", bold: true }),
        new TextRun({ text: weatherAMDisplay }),
        new TextRun({ text: "  |  PM ", bold: true }),
        new TextRun({ text: weatherPMDisplay }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Temperature  : AM ", bold: true }),
        new TextRun({ text: tempAMDisplay }),
        new TextRun({ text: "    |  PM ", bold: true }),
        new TextRun({ text: tempPMDisplay }),
        new TextRun({
          text: `                                        Date: ${dateStr}`,
          bold: false,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Activity sections - side by side table (matching Excel)
  children.push(createActivityTable());

  children.push(
    new Paragraph({
      text: "",
      spacing: { after: 400 },
    })
  );

  // Resources section - side by side tables (matching Excel)
  // Resources Employeed - Site Management Team & Site Working Team
  children.push(
    createSideBySideResourceTables(
      "Resources Employeed",
      "Site Management Team",
      data.managementTeam,
      "Site Working Team",
      data.workingTeam,
      false
    )
  );

  children.push(
    new Paragraph({
      text: "",
      spacing: { after: 400 },
    })
  );

  // Materials & Machinery - side by side
  children.push(
    createSideBySideResourceTables(
      null,
      "Materials Deliveries",
      data.materials,
      "Machinery & Equipment",
      data.machinery,
      true
    )
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const fileName = `Daily_Report_${
    data.projectName?.replace(/\s+/g, "_") || "Report"
  }_${formatDate(data.reportDate).replace(/\s+/g, "_")}.docx`;
  saveAs(blob, fileName);
};
