import * as pdfMakeModule from "pdfmake/build/pdfmake";
import * as pdfFontsModule from "pdfmake/build/vfs_fonts";
import type { WeeklyReportExportData } from "./weeklyreportexcel";

const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
const pdfFonts: any = (pdfFontsModule as any).default ?? pdfFontsModule;
const vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;
if (vfs) {
  pdfMake.vfs = vfs;
} else {
  console.warn("pdfmake vfs bundle could not be initialized.");
}

const formatDateValue = (value?: string | number | Date): string => {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const text = String(value).trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return text;
};

const safeString = (value?: string | number | null): string => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const loadImageAsDataUrl = async (src?: string): Promise<string | undefined> => {
  if (!src) return undefined;
  if (src.startsWith("data:")) {
    return src;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) {
      console.warn("Failed to fetch image for PDF", src, response.status);
      return undefined;
    }

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert image blob to data URL"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Unable to load PDF image", src, error);
    return undefined;
  }
};

const buildMetaTable = (data: WeeklyReportExportData) => {
  const rows = [
    [
      { text: "Project Name", style: "metaLabel" },
      { text: safeString(data.projectTitle), style: "metaValue" },
    ],
    [
      { text: "Project Subtitle", style: "metaLabel" },
      { text: safeString(data.projectSubtitle), style: "metaValue" },
    ],
    [
      { text: "Project Subtitle 2", style: "metaLabel" },
      { text: safeString(data.projectSubtitle2), style: "metaValue" },
    ],
    [
      { text: "Week", style: "metaLabel" },
      { text: safeString(data.weekNumber), style: "metaValue" },
    ],
    [
      { text: "Date Range", style: "metaLabel" },
      {
        text: `${safeString(data.reportDateFrom)}${data.reportDateTo ? ` - ${safeString(data.reportDateTo)}` : ""}`,
        style: "metaValue",
      },
    ],
    [
      { text: "Employer", style: "metaLabel" },
      { text: safeString(data.employer), style: "metaValue" },
    ],
    [
      { text: "Consultant", style: "metaLabel" },
      { text: safeString(data.consultant), style: "metaValue" },
    ],
    [
      { text: "Contractor", style: "metaLabel" },
      { text: safeString(data.contractor), style: "metaValue" },
    ],
  ];
  return {
    table: {
      widths: [100, "auto"],
      body: rows,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => "#cccccc",
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
};

const buildContactTable = (data: WeeklyReportExportData) => {
  const rows = [
    [
      { text: "Project Manager", style: "metaLabel" },
      { text: safeString(data.projectManager), style: "metaValue" },
    ],
    [
      { text: "Constructor", style: "metaLabel" },
      { text: safeString(data.constructorName), style: "metaValue" },
    ],
    [
      { text: "Location", style: "metaLabel" },
      { text: safeString(data.companyLocation), style: "metaValue" },
    ],
    [
      { text: "Phone", style: "metaLabel" },
      { text: `${safeString(data.companyPhone1)}${data.companyPhone2 ? ` / ${safeString(data.companyPhone2)}` : ""}`, style: "metaValue" },
    ],
    [
      { text: "Email", style: "metaLabel" },
      { text: `${safeString(data.companyEmail1)}${data.companyEmail2 ? ` / ${safeString(data.companyEmail2)}` : ""}`, style: "metaValue" },
    ],
  ];
  return {
    table: {
      widths: [100, "auto"],
      body: rows,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => "#cccccc",
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
};

const buildOverallProgressTable = (items?: WeeklyReportExportData["overallProgressItems"]) => {
  const body = [
    [
      { text: "No", style: "tableHeader" },
      { text: "Scope of Works", style: "tableHeader" },
      { text: "Prev %", style: "tableHeader" },
      { text: "This %", style: "tableHeader" },
      { text: "Up To This Week %", style: "tableHeader" },
      { text: "Remaining %", style: "tableHeader" },
      { text: "Next Week %", style: "tableHeader" },
      { text: "Up Next %", style: "tableHeader" },
    ],
  ];

  (items ?? []).forEach((item) => {
    body.push([
      { text: safeString(item.no), style: "tableCell" },
      { text: safeString(item.scopeOfWorks), style: "tableCell" },
      { text: safeString(item.pctUpToPrevWeek), style: "tableCell" },
      { text: safeString(item.pctThisWeek), style: "tableCell" },
      { text: safeString(item.pctUpToThisWeek), style: "tableCell" },
      { text: safeString(item.pctRemaining), style: "tableCell" },
      { text: safeString(item.pctNextWeekPlan), style: "tableCell" },
      { text: safeString(item.pctUpNextWeekPlan), style: "tableCell" },
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: [30, "auto", 35, 35, 55, 45, 45, 45],
      body,
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f2f2f2" : null),
    },
  };
};

const buildNwdpTable = (items?: WeeklyReportExportData["nwdpItems"]) => {
  const body = [
    [
      { text: "Work Done", style: "tableHeader" },
      { text: "%", style: "tableHeader" },
      { text: "Next Week Plan", style: "tableHeader" },
      { text: "%", style: "tableHeader" },
    ],
  ];

  (items ?? []).forEach((item) => {
    body.push([
      { text: safeString(item.workDoneLabel), style: "tableCell" },
      { text: safeString(item.workDonePct), style: "tableCell" },
      { text: safeString(item.nextWeekLabel), style: "tableCell" },
      { text: safeString(item.nextWeekPct), style: "tableCell" },
    ]);
  });

  if (!items || items.length === 0) {
    body.push([
      { text: "No activities available", colSpan: 4, style: "tableCell" }
    ]);
  }

  return {
    table: {
      headerRows: 1,
      widths: ["auto", 35, "auto", 35],
      body,
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f2f2f2" : null),
    },
  };
};

const buildQaqcSection = (section: WeeklyReportExportData["qaqcSections"][number]) => {
  const body = [
    [
      { text: section.codeHeader || "Code", style: "tableHeader" },
      { text: section.statusHeader || "Status", style: "tableHeader" },
      { text: section.dateHeader || "Date Responded", style: "tableHeader" },
      { text: "Description", style: "tableHeader" },
    ],
  ];

  (section.items ?? []).forEach((item) => {
    body.push([
      { text: safeString(item.code), style: "tableCell" },
      { text: safeString(item.status), style: "tableCell" },
      { text: safeString(item.date), style: "tableCell" },
      { text: safeString(item.description || item.comment), style: "tableCell" },
    ]);
  });

  if (!section.items || section.items.length === 0) {
    body.push([
      { text: "No QAQC items available", colSpan: 4, style: "tableCell" }
    ]);
  }

  return {
    table: {
      headerRows: 1,
      widths: [55, 80, 65, "auto"],
      body,
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f2f2f2" : null),
    },
  };
};

const buildSimpleTable = (headers: string[], rows: Array<string[]> | Array<(string | number)[]>) => {
  const body = [headers.map((text) => ({ text, style: "tableHeader" }))];
  rows.forEach((row) => {
    body.push(row.map((cell) => ({ text: safeString(cell), style: "tableCell" })));
  });
  return {
    table: {
      headerRows: 1,
      widths: Array(headers.length).fill("auto"),
      body,
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f2f2f2" : null),
    },
  };
};

export async function exportWeeklyReportToPdf(data: WeeklyReportExportData, filename = "WeeklyReport.pdf") {
  const companyLogo = await loadImageAsDataUrl("/cacpm_logo.png");
  const clientLogo = await loadImageAsDataUrl(data.clientLogo);
  const signatureImage = await loadImageAsDataUrl(data.signatureImage);

  const sectionList = [
    "Cover",
    "Letter",
    "CONTENT",
    "1.Intro",
    "2.OP",
    "3.NWDP",
    "4.QAQC",
    "5.HSE",
    "6.Resources",
    "7.Site Activity Photos",
    "8.Construction Issues",
  ];

  const projectTitles = [data.projectTitle, data.projectSubtitle, data.projectSubtitle2].filter(Boolean);

  const content: any[] = [
    {
      table: {
        widths: [10, 6, "*"],  // Column 1 = banner, Column 2 = all content
        body: [
          [
            // Column 1: Dark blue banner cell (rowspan for full height)
            {
              text: "",
              fillColor: "#16365C",
              border: [false, false, false, false],
              rowSpan: 4,  // Spans all rows
            },
            {
              text: "",
              fillColor: "#FFFFFF",
              border: [false, false, false, false],
              rowSpan: 4,  // Spans all rows
            },
            // Column 2 Row 1: Header (logos, title)
            {
              stack: [
                {
                  columns: [
                    { width: 120, stack: companyLogo ? [{ image: companyLogo, width: 90 }] : [] },
                    { width: "*", text: "" },
                    { width: 120, stack: clientLogo ? [{ image: clientLogo, width: 90, alignment: "right" }] : [] },
                  ],
                  columnGap: 10,
                },
                {
                  table: {
                    widths: ["*"],           // Full width
                    body: [
                      [
                        {
                          text: "WEEKLY PROGRESS REPORT",
                          style: "coverTitleBanner",
                          fillColor: "#002060",    // Blue background on CELL, not style
                          color: "#FFFFFF",        // White text
                          alignment: "center",
                          margin: [0, 0, 0, 0],    // Padding inside the cell
                        },
                      ],
                    ],
                  },
                  layout: { defaultBorder: false },
                  margin: [0, 75, 0, 12],       // Bottom spacing
                },
                { text: `Week - ${safeString(data.weekNumber)}`, style: "coverWeek" },
                { text: `From ${safeString(data.reportDateFrom)} ~ ${safeString(data.reportDateTo)}`, style: "coverDateRange", margin: [0, 4, 0, 0] },
              ],
              margin: [14, 14, 14, 14],
            },
          ],
          [
            {}, // Empty - rowSpan handles this
            {}, // Empty - rowSpan handles this
            // Column 2 Row 2: Cover image
            {
              stack: data.coverImage
                ? [{ image: data.coverImage, fit: [520, 260], alignment: "center" }]
                : [{ text: "No Cover Image Available", style: "coverPlaceholder" }],
              fillColor: "#FFFFFF",
            },
          ],
          [
            {}, // Empty - rowSpan handles this
            {}, // Empty - rowSpan handles this
            // Column 2 Row 3: Project titles
            {
              stack: projectTitles.map((line) => ({ text: line, style: "coverProjectTitle" })),
              margin: [21, 18, 21, 0],
            },
          ],
          [
            {}, // Empty - rowSpan handles this
            {}, // Empty - rowSpan handles this
            // Column 2 Row 4: Employee/Contractor
            {
              table: {
                widths: [90, 12, "*"],
                body: [
                  [{ text: "Employee", style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: safeString(data.employer), style: "partyValue" }],
                  [{ text: "", style: "partyLabel" }, { text: "", style: "partyLabel" }, { text: "", style: "partyValue" }],
                  [{ text: "Contractor", style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: safeString(data.contractor), style: "partyValue" }],
                ],
              },
              layout: { defaultBorder: false },
              margin: [0, 18, 0, 0],
            },
          ],
        ],
      },
      layout: { defaultBorder: false },
    },
    { text: "", pageBreak: "after" },
    { text: "Letter", style: "sectionHeader" },
    { text: `Ref. No. ${safeString(data.refNo)}`, style: "paragraph" },
    { text: `Date: ${formatDateValue(data.letterDate)}`, style: "paragraph" },
    { text: `To: ${safeString(data.toName)}`, style: "paragraph" },
    { text: `Company: ${safeString(data.recipientCompany)}`, style: "paragraph" },
    { text: `Location: ${safeString(data.recipientLocation)}`, style: "paragraph" },
    { text: "", margin: [0, 8, 0, 0] },
    {
      text: `Dear ${safeString(data.toName) || "Sir / Madam"},\n\nPlease find attached the weekly progress report for the project. The report identifies the construction progress, overall progress, next week plan, QA/QC updates, HSE activities, resources analysis, site activity photos, and construction issues.\n\nShould you require any further clarification, please feel free to contact the project team.`,
      style: "bodyText",
    },
    { text: "", margin: [0, 12, 0, 0] },
    { text: `Yours faithfully,`, style: "paragraph" },
    { text: safeString(data.projectManager) || "Project Manager", style: "paragraph" },
    { text: safeString(data.constructorName), style: "paragraph" },
    { text: "", pageBreak: "after" },
    { text: "CONTENT", style: "sectionHeader" },
    {
      ol: sectionList.map((section) => ({ text: section, style: "contentItem" })),
      margin: [0, 8, 0, 0],
    },
    { text: "", pageBreak: "after" },
    { text: "1.Intro", style: "sectionHeader" },
    { text: safeString(data.projectOverview), style: "bodyText" },
    { text: "", margin: [0, 8, 0, 0] },
    { text: safeString(data.designConstruction), style: "bodyText" },
    { text: "", pageBreak: "after" },
    { text: "2.OP Overall Progress", style: "sectionHeader" },
    buildOverallProgressTable(data.overallProgressItems),
  ];

  if (data.overallProgressRemark) {
    content.push({ text: `Remark: ${safeString(data.overallProgressRemark)}`, style: "bodyText", margin: [0, 8, 0, 0] });
  }

  content.push({ text: "", pageBreak: "after" });
  content.push({ text: "3.NWDP", style: "sectionHeader" });
  content.push(buildNwdpTable(data.nwdpItems));
  content.push({ text: "", pageBreak: "after" });
  content.push({ text: "4.QAQC", style: "sectionHeader" });

  if (data.qaqcSections && data.qaqcSections.length > 0) {
    data.qaqcSections.forEach((section) => {
      content.push({ text: section.sectionTitle || "QAQC Section", style: "tableSubheader", margin: [0, 8, 0, 4] });
      content.push(buildQaqcSection(section));
      if (section.comments) {
        content.push({ text: `Comments: ${safeString(section.comments)}`, style: "bodyText", margin: [0, 4, 0, 0] });
      }
    });
  } else {
    content.push({ text: "No QAQC data available.", style: "bodyText" });
  }

  content.push({ text: "", pageBreak: "after" });
  content.push({ text: "5.HSE", style: "sectionHeader" });

  if (data.hseTraining && data.hseTraining.length > 0) {
    content.push({ text: "Training", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push(
      buildSimpleTable(
        ["Training Type", "Date", "Venue", "Trainer", "Attendee", "Remarks"],
        data.hseTraining.map((row) => [
          safeString(row.typeOfTraining),
          safeString(row.date),
          safeString(row.venue),
          safeString(row.trainer),
          safeString(row.attendee),
          safeString(row.remarks),
        ])
      )
    );
  }

  if (data.hseInspection && data.hseInspection.length > 0) {
    content.push({ text: "Inspection", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push(
      buildSimpleTable(
        ["Inspection Type", "Date", "Inspector", "Remarks"],
        data.hseInspection.map((row) => [
          safeString(row.typeOfInspection),
          safeString(row.date),
          safeString(row.inspector),
          safeString(row.remarks),
        ])
      )
    );
  }

  if (data.hsePermits && data.hsePermits.length > 0) {
    content.push({ text: "Permits", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push(
      buildSimpleTable(
        ["Permit Type", "Start Date", "End Date", "Inspector", "Approver", "Remarks"],
        data.hsePermits.map((row) => [
          safeString(row.typeOfPermit),
          safeString(row.startDate),
          safeString(row.endDate),
          safeString(row.inspector),
          safeString(row.approver),
          safeString(row.remarks),
        ])
      )
    );
  }

  if (data.hseFirstAid) {
    content.push({ text: "First Aid / Accident", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push({ text: safeString(data.hseFirstAid), style: "bodyText" });
  }

  if (data.hseOtherConcerns) {
    content.push({ text: "Other HSE Concerns", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push({ text: safeString(data.hseOtherConcerns), style: "bodyText" });
  }

  content.push({ text: "", pageBreak: "after" });
  content.push({ text: "6.Resources", style: "sectionHeader" });

  if (data.manpowerRows && data.manpowerRows.length > 0) {
    const headerRow = ["Description", ...(data.weekDates ?? ["D1", "D2", "D3", "D4", "D5", "D6", "D7"])];
    const rows = data.manpowerRows.map((row) => [
      safeString(row.description),
      ...(row.dailyCounts ?? []).map((count) => safeString(count)),
    ]);
    content.push({ text: "Manpower", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push(buildSimpleTable(headerRow, rows));
  }

  if (data.materialRows && data.materialRows.length > 0) {
    const rows = data.materialRows.map((row) => [
      safeString(row.description),
      safeString(row.unit),
      safeString(row.previous),
      safeString(row.thisPeriod),
      safeString(row.accumulate),
    ]);
    content.push({ text: "Material", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push(buildSimpleTable(["Description", "Unit", "Prev", "This", "Accumulate"], rows));
  }

  if (data.equipmentRows && data.equipmentRows.length > 0) {
    const rows = data.equipmentRows.map((row) => [
      safeString(row.description),
      safeString(row.unit),
      safeString(row.previous),
      safeString(row.thisPeriod),
      safeString(row.accumulate),
    ]);
    content.push({ text: "Equipment", style: "tableSubheader", margin: [0, 8, 0, 4] });
    content.push(buildSimpleTable(["Description", "Unit", "Prev", "This", "Accumulate"], rows));
  }

  content.push({ text: "", pageBreak: "after" });
  content.push({ text: "7.Site Activity Photos", style: "sectionHeader" });

  if (data.sitePhotoCaptions && data.sitePhotoCaptions.length > 0) {
    data.sitePhotoCaptions.forEach((entry) => {
      content.push({ text: safeString(entry.siteLocation), style: "tableSubheader", margin: [0, 8, 0, 4] });
      content.push({ text: safeString(entry.caption1), style: "bodyText" });
      if (entry.caption2) {
        content.push({ text: safeString(entry.caption2), style: "bodyText", margin: [0, 2, 0, 0] });
      }
    });
  } else {
    content.push({ text: "No site activity photo captions available.", style: "bodyText" });
  }

  content.push({ text: "", pageBreak: "after" });
  content.push({ text: "8.Construction Issues", style: "sectionHeader" });

  if (data.constructionIssues && data.constructionIssues.length > 0) {
    const rows = data.constructionIssues.map((issue) => [
      safeString(issue.number),
      safeString(issue.siteLocation),
      safeString(issue.problemDescription),
      safeString(issue.actionBy),
    ]);
    content.push(buildSimpleTable(["No", "Site Location", "Problem Description", "Action By"], rows));
  } else {
    content.push({ text: "No construction issues available.", style: "bodyText" });
  }

  const docDefinition = {
    // pageSize: "A4",
    pageSize: { width: 617.28, height: 786.89 },  // Landscape A4
    pageMargins: [65, 65, 65, 65],
    info: {
      title: filename,
    },
    content,
    styles: {
      coverTitle: { fontSize: 22, bold: true, alignment: "center", margin: [0, 0, 0, 6] },
      coverSubtitle: { fontSize: 14, alignment: "center", margin: [0, 0, 0, 4] },
      coverLabel: { fontSize: 11, alignment: "center", color: "#666666" },
      coverBannerText: { fontSize: 18, bold: true, color: "#002060", alignment: "center" },
      coverTitleBanner: { fontSize: 16, bold: true, color: "#FFFFFF", alignment: "center" },
      coverWeek: { fontSize: 14, bold: true, color: "#000000", alignment: "center" },
      coverDateRange: { fontSize: 10, bold: true, color: "#000000", alignment: "center" },
      coverProjectTitle: { fontSize: 14, bold: true, italics: true, alignment: "center", margin: [0, 2, 0, 2] },
      coverPlaceholder: { fontSize: 12, italics: true, color: "#FFFFFF", alignment: "center", margin: [0, 80, 0, 80] },
      partyLabel: { fontSize: 12, bold: true, color: "#000000", alignment: "left" },
      partyValue: { fontSize: 12, bold: true, alignment: "left" },
      sectionHeader: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
      tableSubheader: { fontSize: 12, bold: true },
      tableHeader: { fontSize: 9, bold: true, color: "#000000" },
      tableCell: { fontSize: 9, margin: [0, 2, 0, 2] },
      metaLabel: { fontSize: 10, bold: true, color: "#1f2937" },
      metaValue: { fontSize: 10, color: "#1f2937" },
      bodyText: { fontSize: 10, lineHeight: 1.3 },
      contentItem: { fontSize: 11, margin: [0, 2, 0, 2] },
      paragraph: { fontSize: 10, margin: [0, 2, 0, 2] },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  pdfMake.createPdf(docDefinition).download(filename);
}
