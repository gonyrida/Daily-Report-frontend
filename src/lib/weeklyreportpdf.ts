import * as pdfMakeModule from "pdfmake/build/pdfmake";
import * as pdfFontsModule from "pdfmake/build/vfs_fonts";
import type { WeeklyReportExportData } from "./weeklyreportexcel";

const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
const pdfFonts: any = (pdfFontsModule as any).default ?? pdfFontsModule;
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

// ── Helpers ────────────────────────────────────────────────────────────────────
const s = (v?: string | number | null): string =>
  v === undefined || v === null ? "" : String(v);

const fmtDate = (v?: string | number | Date): string => {
  if (!v) return "";
  if (v instanceof Date)
    return v.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const str = String(v).trim();
  const d = new Date(str);
  if (!Number.isNaN(d.getTime()))
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  return str;
};

const loadImg = async (src?: string): Promise<string | undefined> => {
  if (!src) return undefined;
  if (src.startsWith("data:")) return src;
  try {
    const r = await fetch(src);
    if (!r.ok) return undefined;
    const blob = await r.blob();
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        typeof reader.result === "string" ? res(reader.result) : rej(new Error("FileReader failed"));
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
};

// ── Design tokens ──────────────────────────────────────────────────────────────
const SEC_FILL   = "#9BC2E6"; // Section banner fill (light blue)
const TBL_HDR    = "#A6A6A6"; // Table column header (grey)
const TBL_ALT    = "#F2F2F2"; // Alternate table row
const GRP_FILL   = "#D9E1F2"; // Group header row (resources manpower)
const TOTAL_FILL = "#E2EFDA"; // Total row fill (light green)
const LTR_FILL   = "#2F75B5"; // Letter page header
const QAQC_FILL  = "#DCE6F1"; // QAQC sub-section title fill
const LOC_FILL   = "#D6DCE4"; // Site photo location banner

// ── Layout helpers ─────────────────────────────────────────────────────────────

const secBanner = (title: string, mt = 0): any => ({
  table: { widths: ["*"], body: [[{ text: title, style: "secBanner", fillColor: SEC_FILL }]] },
  layout: { defaultBorder: false },
  margin: [0, mt, 0, 14],
});

const subHdr = (text: string, mt = 8): any => ({
  text,
  style: "subHdr",
  margin: [0, mt, 0, 4],
});

const pb = (): any => ({ text: "", pageBreak: "after" });

/**
 * Create an Excel-style data bar cell with percentage value.
 * Shows a horizontal bar (0-100% width) with centered text on top.
 * @param pct - Percentage value (0-100)
 * @param width - Total cell width in points (default: 45)
 * @param height - Bar height in points (default: 12)
 * @param barColor - Color of the bar (default: light blue)
 * @param bgColor - Background color behind the bar (default: white)
 */
const dataBarCell = (
  pct: string | number | null | undefined,
  width = 45,
  barColor = "#FFC000",
): any => {
  const raw = typeof pct === "string" ? parseFloat(pct) : Number(pct);
  const value = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
  // Account for outer cell padding (4 pt each side) so inner widths don't overflow
  const innerW = Math.max(1, width - 8);
  const barW = Math.round((value / 100) * innerW);
  const restW = innerW - barW;
  const label = value.toFixed(1) + "%";
  const fz = 8;

  // 0% — plain text, no bar
  if (barW <= 0) {
    return { text: label, fontSize: fz, alignment: "center" };
  }

  // 100% — full colored cell with centered text
  if (restW <= 0) {
    return { text: label, fontSize: fz, alignment: "center", fillColor: barColor };
  }

  // Partial — nested 2-column table: [colored bar | white + text]
  return {
    table: {
      widths: [barW, restW],
      body: [[
        { text: "", fillColor: barColor, border: [false, false, false, false] },
        { text: label, fontSize: fz, alignment: "right", border: [false, false, false, false], margin: [0, 1, 0, 0] },
      ]],
    },
    layout: {
      defaultBorder: false,
      paddingLeft: () => 0, paddingRight: () => 0,
      paddingTop: () => 0, paddingBottom: () => 0,
    },
  };
};

/**
 * Create a text line with dashed underline (for form-style fields)
 * @param text - The text content to display
 * @param lines - Number of dashed lines to show (default: 1)
 */
const dashedLineText = (text: string, lines = 1): any => {
  const content: any[] = [{ text: text || "", style: "bodyText" }];
  // Add dashed lines
  for (let i = 0; i < lines; i++) {
    content.push({
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineColor: "#000000",
          lineWidth: 0.5,
          lineDash: [1, 1],
        },
      ],
      margin: [0, 4, 0, 0],
    });
  }
  return { stack: content, margin: [0, 0, 0, 8] };
};

/**
 * Build a styled table.
 * Headers: { text, w?, align?, colSpan? }
 * Row cells: { text, align?, fill?, bold?, colSpan? } | null (null = colspan placeholder)
 */
const mkTable = (
  headers: { text: string; w?: any; align?: string; colSpan?: number }[],
  rows: Array<Array<{ text: string; align?: string; fill?: string; bold?: boolean; colSpan?: number; margin?: number[]; borderLeft?: boolean } | null>>,
  opts: { hFill?: string; altRows?: boolean; compact?: boolean } = {},
): any => {
  const hFill   = opts.hFill ?? TBL_HDR;
  const altRows = opts.altRows !== false;
  const fSize   = opts.compact ? 8 : 9;

  const headerRow: any[] = headers.map(h => {
    if (h === null) return {};
    return {
      text: h.text,
      style: "tblHdr",
      fontSize: fSize,
      fillColor: hFill,
      alignment: h.align ?? "center",
      ...(h.colSpan ? { colSpan: h.colSpan } : {}),
    };
  });

  const body: any[] = [headerRow];

  rows.forEach((row, ri) => {
    const alt = altRows && ri % 2 === 1;
    body.push(
      row.map(cell => {
        if (cell === null) return {};
        const result: any = {
          text: cell.text,
          style: "tblCell",
          fontSize: fSize,
          fillColor: cell.fill ?? (alt ? TBL_ALT : "#FFFFFF"),
          alignment: cell.align ?? "left",
          ...(cell.colSpan ? { colSpan: cell.colSpan } : {}),
          ...(cell.bold ? { bold: true } : {}),
          ...(cell.margin ? { margin: cell.margin } : {}),
        };
        if (cell.borderLeft === false) {
          result.border = [0, 1, 1, 1];
        }
        return result;
      }),
    );
  });

  return {
    table: {
      headerRows: 1,
      widths: headers.map(h => h?.w ?? "auto"),
      body,
    },
    layout: {
      hLineWidth: (r: number, n: any) => (r === 0 || r === n.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
  };
};

// ── SECTION BUILDERS ───────────────────────────────────────────────────────────

// ── Letter ────────────────────────────────────────────────────────────────────
function buildLetter(data: WeeklyReportExportData, sig?: string): any[] {
  const refNo   = s(data.refNo) || `WR-${s(data.weekNumber)}/${new Date().getFullYear()}`;
  const dateTxt = fmtDate(data.letterDate) ||
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const company  = s(data.recipientCompany) || s(data.toName);
  const location = s(data.recipientLocation);
  const attTo    = s(data.recipientName) || s(data.consultant) || "Project Manager";
  const ccLines  = data.ccLines ?? [];
  const bodyText =
    `We are pleased to submit Weekly Progress Report No.${s(data.weekNumber)} from ` +
    `${s(data.reportDateFrom)} to ${s(data.reportDateTo)} for ${s(data.projectTitle)}.\n\n` ;
  const toBody: any[][] = [
    [
      { text: "To",   style: "ltBold" },
      { text: ":",    style: "ltBold" },
      {
        stack: [
          { text: company,  style: "ltBold" },
          ...(location ? [{ text: location, style: "ltBold" }] : []),
        ],
      },
    ],
    [
      { text: "Att.", style: "ltBold" },
      { text: ":",    style: "ltBold" },
      { text: attTo,  style: "ltBold" },
    ],
  ];
  ccLines.forEach((cc, i) => {
    toBody.push([
      { text: i === 0 ? "CC" : "", style: "ltBold" },
      { text: ":",                  style: "ltBold" },
      { text: cc,                   style: "ltBold" },
    ]);
  });

  const sigBlock: any[] = [];
  if (sig) {
    sigBlock.push({ image: sig, width: 130, margin: [0, 4, 0, 4] });
  } else {
    sigBlock.push({
      canvas: [{ type: "rect", x: 0, y: 0, w: 140, h: 55, r: 2, lineWidth: 0.5, lineColor: "#CCCCCC", dash: { length: 4 } }],
      margin: [0, 4, 0, 0],
    });
    sigBlock.push({ text: "[Digital Signature]", style: "sigPlaceholder", margin: [0, -38, 0, 4] });
  }

  return [
    {
      table: { widths: ["*"], body: [[{ text: `LETTER FOR WEEKLY PROGRESS REPORT   No. ${s(data.weekNumber)}`, style: "ltBanner", fillColor: LTR_FILL }]] },
      layout: { defaultBorder: false },
      margin: [0, 0, 0, 14],
    },
    {
      table: {
        widths: [58, 6, "*"],
        body: [
          [{ text: "Ref. No.", style: "ltLabel" }, { text: ":", style: "ltLabel" }, { text: refNo,   style: "ltBold" }],
          [{ text: "Date",     style: "ltLabel" }, { text: ":", style: "ltLabel" }, { text: dateTxt, style: "ltBold" }],
        ],
      },
      layout: { defaultBorder: false },
      margin: [0, 0, 0, 10],
    },
    { table: { widths: [42, 6, "*"], body: toBody }, layout: { defaultBorder: false }, margin: [0, 0, 0, 16] },
    { text: "Dear Sir,", style: "ltBody", bold: true, margin: [0, 0, 0, 8] },
    { text: bodyText, style: "ltBody", margin: [0, 0, 0, 20] },
    { text: "Sincerely Yours,", style: "ltBody", margin: [0, 0, 0, 50] },
    ...sigBlock,
    {
      stack: [
        {
          text: [
            { text: s(data.projectManager), bold: true },
            { text: "  |  Project Manager", bold: true },
          ],
          style: "sigLine",
        },
        { text: s(data.contractor), style: "sigLine", bold: true, margin: [0, 0, 0, 15] },
        ...(data.companyLocation ? [{ text: s(data.companyLocation), style: "sigContact", margin: [0, 0, 0, 15] }] : []),
        {
          text: [s(data.companyPhone1), data.companyPhone2 ? `  |  ${s(data.companyPhone2)}` : ""].join(""),
          style: "sigContact",
        },
        ...(data.companyEmail1 ? [{ text: s(data.companyEmail1), style: "sigContact" }] : []),
        ...(data.companyEmail2 ? [{ text: s(data.companyEmail2), style: "sigContact" }] : []),
      ],
    },
  ];
}

// ── Table of Contents ─────────────────────────────────────────────────────────
function buildTOC(): any[] {
  const items: { text: string; sub: boolean }[] = [
    { text: "1.  INTRODUCTION",                                                                       sub: false },
    { text: "2.  OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK",                                        sub: false },
    { text: "3.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN",                                           sub: false },
    { text: "4.  QA/QC STATUS",                                                                       sub: false },
    { text: "4.1  Non-Conformity Report (NCR)",                                                       sub: true  },
    { text: "4.2  Corrective Action Request (CAR)",                                                   sub: true  },
    { text: "4.3  Safety Corrective Action Request (SCAR)",                                           sub: true  },
    { text: "4.4  PM Site Instruction (SI)",                                                          sub: true  },
    { text: "4.5  Client Site Instruction (SI)",                                                      sub: true  },
    { text: "4.6  Inspection Request (IR)",                                                           sub: true  },
    { text: "4.7  Material for Approval (MFA)",                                                       sub: true  },
    { text: "4.8  Request for Information (RFI)",                                                     sub: true  },
    { text: "4.9  Request for Approval (RFA)",                                                        sub: true  },
    { text: "4.10  Field Change Request (FCR)",                                                       sub: true  },
    { text: "4.11  Variation Order (VO)",                                                             sub: true  },
    { text: "4.12  Transmittal (TR)",                                                                 sub: true  },
    { text: "4.13  Material Inspection Approval (MIR)",                                               sub: true  },
    { text: "5.  HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)",                                   sub: false },
    { text: "5.1  HSES Training / Introduction / Toolbox Meeting",                                    sub: true  },
    { text: "5.2  HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist",             sub: true  },
    { text: "5.3  Permit to Work",                                                                    sub: true  },
    { text: "5.4  First Aid / Accident / Incident / Near Miss / Fatalities (if Any)",                sub: true  },
    { text: "5.5  Other HSES Activities Concerns",                                                    sub: true  },
    { text: "5.6  HSES Photo Reference",                                                              sub: true  },
    { text: "6.  RESOURCES STATUS",                                                                   sub: false },
    { text: "6.1  Manpower Status",                                                                   sub: true  },
    { text: "6.2  Material Delivery Status",                                                          sub: true  },
    { text: "6.3  Machinery / Equipment Status",                                                      sub: true  },
    { text: "7.  SITE ACTIVITY PHOTOS",                                                               sub: false },
    { text: "8.  CONSTRUCTION ISSUE",                                                                 sub: false },
    { text: "9.  MASTER SCHEDULE",                                                                    sub: false },
  ];

  return [
    secBanner("TABLE OF CONTENTS"),
    {
      stack: items.map(it => ({
        text: it.text,
        style: it.sub ? "tocSub" : "tocMajor",
        margin: [it.sub ? 20 : 0, 3, 0, 3],
      })),
    },
  ];
}

// ── Introduction ──────────────────────────────────────────────────────────────
function buildIntro(data: WeeklyReportExportData, coverImg?: string): any[] {
  const items: any[] = [secBanner("1.  INTRODUCTION")];
  items.push(subHdr("Project Overview", 0));
  items[items.length - 1].margin = [0, 0, 0, 8];
  items.push({ text: s(data.projectOverview) || "—", style: "bodyText" });
  if (data.designConstruction) {
    items.push(subHdr("Design & Construction"));
    items[items.length - 1].margin = [0, 0, 0, 8];
    items.push({ text: data.designConstruction, style: "bodyText" });
  }
  if (data.designList?.length) {
    items.push({
      ul: data.designList.filter(Boolean).map(l => ({ text: l, style: "bodyText" })),
      margin: [8, 8, 0, 0],
    });
  }
  if (coverImg) {
    items.push({ image: coverImg, width: 400, margin: [0, 20, 0, 0], alignment: "center" });
  }
  return items;
}

// ── Overall Progress ──────────────────────────────────────────────────────────
function buildOP(data: WeeklyReportExportData): any[] {
  const items: any[] = [secBanner("2.  OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK")];

  // Check if ID is Roman numeral (e.g., "I.", "II.", "III.", "IV.", "V.", etc.)
  const isRomanId = (id: string | number | undefined): boolean => {
    const str = String(id || '');
    return /^[IVXLCDM]+\./.test(str.trim());
  };

  const rows = (data.overallProgressItems ?? []).map((it) => {
    const roman = isRomanId(it.no);

    // Data bar colors
    const BLUE = "#4472C4";
    const ORANGE = "#ED7D31";
    const GREEN = "#70AD47";

    // Build cells with bold for Roman IDs and data bars for specific columns
    const baseCell = (text: string | number | undefined, align: "center" | "left" = "center") => ({
      text: s(text ?? ''),
      align,
      bold: roman,
      fill: "#FFFFFF",
    });

    return [
      baseCell(it.no, "center"),
      baseCell(it.scopeOfWorks, "left"),
      baseCell(it.pctUpToPrevWeek, "center"),
      baseCell(it.pctThisWeek, "center"),
      // % Up to This Week - blue data bar
      dataBarCell(it.pctUpToThisWeek, 54, BLUE),
      // % Remaining - orange data bar
      dataBarCell(it.pctRemaining, 50, ORANGE),
      baseCell(it.pctNextWeekPlan, "center"),
      // % Up Next Week Plan - green data bar
      dataBarCell(it.pctUpNextWeekPlan, 55, GREEN),
    ];
  });

  const emptyRow = [[
    { text: "No overall progress data available.", colSpan: 8, align: "center" as const, fill: "#FFFFFF" },
    null, null, null, null, null, null, null,
  ]];

  items.push(mkTable(
    [
      { text: "No",                      w: 28  },
      { text: "Scope of Works",          w: "*" },
      { text: "% Up to\nPrev Week",      w: 50  },
      { text: "% This\nWeek",            w: 44  },
      { text: "% Up to\nThis Week",      w: 54  },
      { text: "% Remaining",             w: 50  },
      { text: "% Next\nWeek Plan",       w: 50  },
      { text: "% Up Next\nWeek Plan",    w: 55  },
    ],
    rows.length ? rows : emptyRow,
    { hFill: SEC_FILL, altRows: false }
  ));

  if (data.overallProgressRemark) {
    items.push({ text: `Remark: ${s(data.overallProgressRemark)}`, style: "bodyText", margin: [0, 8, 0, 0] });
  }
  return items;
}

// ── NWDP ──────────────────────────────────────────────────────────────────────
function buildNWDP(data: WeeklyReportExportData): any[] {
  const buildDisplayText = (id: string, text: string): string => {
    if (!id) return text || '';
    if (id === '-') return text ? `- ${text}` : '-';
    if (!text) return id;
    return id.endsWith('.') ? `${id} ${text}` : `${id}. ${text}`;
  };

  const getIdStyle = (id: string): { bold: boolean; leftPt: number } => {
    const t = id.trim();
    if (/^[IVX]/i.test(t))  return { bold: true,  leftPt: 8  };
    if (t === '-')           return { bold: false, leftPt: 40 };
    if (/^\d+$/.test(t))    return { bold: true,  leftPt: 16 };
    return                         { bold: false, leftPt: 16 };
  };

  const fSize = 9;

  // Header row that will repeat on each page
  const headerRow: any[] = [
    { text: "Activities of Work Done", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 2 },
    {},
    { text: "Next Week Plan", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 2 },
    {},
  ];

  const dataRows = (data.nwdpItems ?? []).map(it => {
    const itemId = it.sourceId || it.id || '';
    const { bold: isBold, leftPt } = getIdStyle(itemId);
    const workDoneText = buildDisplayText(itemId, it.workDoneLabel || '');
    const nextWeekText = buildDisplayText(itemId, it.nextWeekLabel || '');
    return [
      { text: workDoneText, style: "tblCell", fontSize: fSize, alignment: "left", bold: isBold, margin: [leftPt, 2, 2, 2] },
      dataBarCell(it.workDonePct, 45),
      { text: nextWeekText, style: "tblCell", fontSize: fSize, alignment: "left", bold: isBold, margin: [leftPt, 2, 2, 2] },
      dataBarCell(it.nextWeekPct, 45),
    ];
  });

  const emptyRow: any[][] = [[
    { text: "No activity data available.", colSpan: 4, alignment: "center" as const, style: "tblCell", fontSize: fSize },
    {}, {}, {},
  ]];

  if (!dataRows.length) {
    return [
      secBanner("3.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN"),
      {
        table: { headerRows: 1, widths: ["*", 45, "*", 45], body: [headerRow, ...emptyRow] },
        layout: {
          hLineWidth: (i: number, node: any) => i === 0 || i === 1 || i === node.table.body.length ? 1 : 0,
          vLineWidth: (i: number) => (i === 1 || i === 3) ? 0 : 0.5,
          hLineColor: () => "#000000",
          vLineColor: () => "#000000",
        },
      },
    ];
  }

  // Split into chunks to repeat banner on new pages (~25 rows per page)
  const ROWS_PER_PAGE = 25;
  const chunks: any[][][] = [];
  for (let i = 0; i < dataRows.length; i += ROWS_PER_PAGE) {
    chunks.push(dataRows.slice(i, i + ROWS_PER_PAGE));
  }

  const result: any[] = [];
  chunks.forEach((chunk, index) => {
    const isFirst = index === 0;
    const bannerText = isFirst
      ? "3.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN"
      : "3.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN";
    const banner = secBanner(bannerText);
    if (!isFirst) banner.pageBreak = 'before';
    result.push(banner);

    // Deep copy headerRow to avoid pdfmake mutation issues across tables
    const freshHeaderRow = JSON.parse(JSON.stringify(headerRow));

    result.push({
      table: {
        headerRows: 1,
        widths: ["*", 45, "*", 45],
        body: [freshHeaderRow, ...chunk],
      },
      layout: {
        hLineWidth: (i: number, node: any) =>
          i === 0 || i === 1 || i === node.table.body.length ? 1 : 0,
        vLineWidth: (i: number) => (i === 1 || i === 3) ? 0 : 0.5,
        hLineColor: () => "#000000",
        vLineColor: () => "#000000",
      },
    });
  });

  return result;
}

// ── QAQC ──────────────────────────────────────────────────────────────────────
const QAQC_DEFS = [
  { id: "4.1",  title: "Non-Conformity Report (NCR)",             keys: ["ncr"],  col3: "Status",        col4: "Date Responded"  },
  { id: "4.2",  title: "Corrective Action Request (CAR)",          keys: ["car"],  col3: "Status",        col4: "Date Responded"  },
  { id: "4.3",  title: "Safety Corrective Action Request (SCAR)",  keys: ["scar"], col3: "Status",        col4: "Date Responded"  },
  { id: "4.4",  title: "PM Site Instruction (SI)",                 keys: ["pmsi"], col3: "Status",        col4: "Date Responded"  },
  { id: "4.5",  title: "Client Site Instruction (SI)",             keys: ["csi"],  col3: "Issued By",     col4: "Issued Date"     },
  { id: "4.6",  title: "Inspection Request (IR)",                  keys: ["ir"],   col3: "Received Date", col4: "Inspection Date" },
  { id: "4.7",  title: "Material for Approval (MFA)",              keys: ["mfa"],  col3: "Status",        col4: "Date Responded"  },
  { id: "4.8",  title: "Request for Information (RFI)",            keys: ["rfi"],  col3: "Status",        col4: "Date Responded"  },
  { id: "4.9",  title: "Request for Approval (RFA)",               keys: ["rfa"],  col3: "Status",        col4: "Date Responded"  },
  { id: "4.10", title: "Field Change Request (FCR)",               keys: ["fcr"],  col3: "Status",        col4: "Date Responded"  },
  { id: "4.11", title: "Variation Order (VO)",                     keys: ["vo"],   col3: "Status",        col4: "Date Responded"  },
  { id: "4.12", title: "Transmittal (TR)",                         keys: ["tr"],   col3: "Status",        col4: "Date Responded"  },
  { id: "4.13", title: "Material Inspection Approval (MIR)",       keys: ["mir"],  col3: "Status",        col4: "Date Responded"  },
];

function buildQAQC(data: WeeklyReportExportData): any[] {
  const items: any[] = [];

  // Main section header - force new page
  items.push(secBanner("4.  QA/QC STATUS"));
  items[0].pageBreak = 'before';

  QAQC_DEFS.forEach((def, index) => {
    // Repeat header banner every 3 sections (new page indicator)
    if (index > 0 && index % 3 === 0) {
      const continuedBanner = secBanner("4.  QA/QC STATUS (Continued)");
      continuedBanner.pageBreak = 'before';
      items.push(continuedBanner);
    }

    const sec = data.qaqcSections?.find(
      sec => sec.sectionTitle === def.id || def.keys.includes((sec.sectionTitle ?? "").toLowerCase()),
    );

    // Sub-section title
    const subTitle = {
      table: {
        widths: ["*"],
        body: [[{
          text: [{ text: `${def.id}  `, bold: true }, { text: def.title }],
          style: "qaqcSubTitle",
        }]],
      },
      layout: { defaultBorder: false },
      margin: [0, 8, 0, 2],
    };

    const qRows = (sec?.items ?? []).map(it => {
      // Handle special fields for sections 4.5 and 4.6
      let col3Value: string;
      let col4Value: string;

      if (def.id === "4.5") {
        // Client Site Instruction: Issued By, Issued Date
        col3Value = (it as any).issuedBy || it.status || "";
        col4Value = (it as any).issuedDate || (it as any).dateResponse || "";
      } else if (def.id === "4.6") {
        // Inspection Request: Received Date, Inspection Date
        col3Value = (it as any).receivedDate || (it as any).dateResponse || "";
        col4Value = (it as any).inspectionDate || "";
      } else {
        // Standard: Status, Date Responded
        col3Value = it.status || "";
        col4Value = (it as any).dateResponse || "";
      }

      return [
        { text: s(it.code),                     align: "center" },
        { text: s(it.description || it.comment), align: "left"  },
        { text: s(col3Value),                   align: "center" },
        { text: s(col4Value),                   align: "center" },
      ];
    });

    // Always show exactly 5 rows total (data + empty padding like Excel)
    const emptyRowsNeeded = Math.max(0, 5 - qRows.length);
    const emptyRows = Array(emptyRowsNeeded).fill(null).map(() => [
      { text: "", align: "center" as const },
      { text: "", align: "left"   as const },
      { text: "", align: "center" as const },
      { text: "", align: "center" as const },
    ]);
    const dataRows = [...qRows, ...emptyRows];

    const table = mkTable(
      [
        { text: "Code",        w: 125 },
        { text: "Description", w: 200 },
        { text: def.col3,      w: 75  },
        { text: def.col4,      w: 75  },
      ],
      dataRows,
      { hFill: SEC_FILL, altRows: false },
    );

    // Comments row - match Excel style: "Comments:" bold+underline, then value
    const comments = sec?.comments ?? "";
    const commentsRow = {
      table: {
        widths: ["*"],
        body: [[{
          text: [
            { text: "Comments: ", bold: true, decoration: "underline" },
            { text: comments }
          ],
          style: "tblCell",
          fontSize: 9,
          margin: [4, 8, 4, 8],
          alignment: "left",
          valign: "top",
        }]],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#000000",
        vLineColor: () => "#000000",
      },
      margin: [0, 0, 0, 0],
    };

    // Wrap section title, table, and comments in a stack to keep them together
    items.push({
      stack: [subTitle, table, commentsRow],
      pageBreak: 'avoid',
      margin: [0, 0, 0, 10],
    });
  });

  return items;
}

// ── HSE ───────────────────────────────────────────────────────────────────────
function buildHSE(data: WeeklyReportExportData, hsePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("5.  HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)")];

  // Helper to resolve image (use loaded dataURL if available)
  const resolveImage = (img: string | undefined): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith("data:")) return img;
    return hsePhotos.get(img) || img;
  };

  // 5.1 HSES Training - always show with min 3 rows like Excel
  items.push(subHdr("5.1  HSES Training / Introduction / Toolbox Meeting", 0));
  const trainingRows = (data.hseTraining ?? []).map(r => [
    { text: s(r.typeOfTraining)                },
    { text: s(r.date),    align: "center" },
    { text: s(r.venue)                         },
    { text: s(r.trainer)                       },
    { text: s(r.attendee), align: "center" },
    { text: s(r.remarks)                       },
  ]);
  const trainingEmpty = Array(Math.max(0, 3 - trainingRows.length)).fill(null).map(() => [
    { text: "", align: "left"   as const },
    { text: "", align: "center" as const },
    { text: "", align: "left"   as const },
    { text: "", align: "left"   as const },
    { text: "", align: "center" as const },
    { text: "", align: "left"   as const },
  ]);
  items.push(mkTable(
    [
      { text: "Type of Training", w: "*" },
      { text: "Date",             w: 55  },
      { text: "Venue",            w: 70  },
      { text: "Trainer",          w: 70  },
      { text: "Attendee",         w: 50  },
      { text: "Remarks",          w: 80  },
    ],
    [...trainingRows, ...trainingEmpty],
    { hFill: SEC_FILL, altRows: false },
  ));

  // 5.2 HSES Inspection - always show with min 3 rows like Excel
  items.push(subHdr("5.2  HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist"));
  const inspectionRows = (data.hseInspection ?? []).map(r => [
    { text: s(r.typeOfInspection)               },
    { text: s(r.date),       align: "center" },
    { text: s(r.inspector)                      },
    { text: s(r.remarks)                        },
  ]);
  const inspectionEmpty = Array(Math.max(0, 3 - inspectionRows.length)).fill(null).map(() => [
    { text: "", align: "left"   as const },
    { text: "", align: "center" as const },
    { text: "", align: "left"   as const },
    { text: "", align: "left"   as const },
  ]);
  items.push(mkTable(
    [
      { text: "Type of Inspection", w: "*"  },
      { text: "Date",               w: 55   },
      { text: "Inspector",          w: 80   },
      { text: "Remarks",            w: 100  },
    ],
    [...inspectionRows, ...inspectionEmpty],
    { hFill: SEC_FILL, altRows: false },
  ));

  // 5.3 Permit to Work - always show with min 3 rows like Excel
  items.push(subHdr("5.3  Permit to Work"));
  const permitRows = (data.hsePermits ?? []).map(r => [
    { text: s(r.typeOfPermit)                    },
    { text: s(r.startDate), align: "center" },
    { text: s(r.endDate),   align: "center" },
    { text: s(r.inspector)                       },
    { text: s(r.approver)                        },
    { text: s(r.remarks)                         },
  ]);
  const permitEmpty = Array(Math.max(0, 3 - permitRows.length)).fill(null).map(() => [
    { text: "", align: "left"   as const },
    { text: "", align: "center" as const },
    { text: "", align: "center" as const },
    { text: "", align: "left"   as const },
    { text: "", align: "left"   as const },
    { text: "", align: "left"   as const },
  ]);
  items.push(mkTable(
    [
      { text: "Type of Permit", w: "*" },
      { text: "Start Date",     w: 55  },
      { text: "End Date",       w: 55  },
      { text: "Inspector",      w: 65  },
      { text: "Approver",       w: 65  },
      { text: "Remarks",        w: 75  },
    ],
    [...permitRows, ...permitEmpty],
    { hFill: SEC_FILL, altRows: false },
  ));

  // 5.4 First Aid - always show with dashed line
  items.push(subHdr("5.4  First Aid / Accident / Incident / Near Miss / Fatalities (if Any)"));
  items.push(dashedLineText(s(data.hseFirstAid ?? ""), 1));

  // 5.5 Other Concerns - always show with dashed line
  items.push(subHdr("5.5  Other HSES Activities Concerns"));
  items.push(dashedLineText(s(data.hseOtherConcerns ?? ""), 1));

  // 5.6 HSES Photo Reference - only show if there are any photos; no empty table
  const tb = data.hsePhotoReferences?.hseToolboxMeeting ?? [];
  const ap = data.hsePhotoReferences?.hseActivityPhotos ?? [];
  if (tb.length || ap.length) {
    items.push(subHdr("5.6  HSES Photo Reference"));

    // Photo cell: fixed-height image area + caption row, connected borders.
    const createPhotoBox = (img: string | undefined, desc: string): any => {
      const resolvedImg = resolveImage(img);
      const photoCell = resolvedImg
        ? {
            stack: [{ image: resolvedImg, fit: [230, 150], alignment: "center" as const }],
            margin: [2, 2, 2, 2],
            alignment: "center" as const,
            // Force consistent height regardless of image presence
            minHeight: 100,
          }
        : {
            text: "",
            margin: [0, 50, 0, 50], // empty cell ~100pt tall, matches photo height
          };

      return {
        table: {
          widths: ["*"],
          heights: [100, 18], // pin photo row + caption row
          body: [
            [photoCell],
            [{
              text: desc || "",
              style: "photoCaption",
              alignment: "center" as const,
              fontSize: 9,
              margin: [2, 3, 2, 3],
            }],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#000000",
          vLineColor: () => "#000000",
        },
      };
    };

    // Blue banner header — single full-width cell, no surrounding margin so
    // the first photo row sits flush underneath it (matches the source PDF).
    const createPhotoHeader = (title: string): any => ({
      table: {
        widths: ["*"],
        body: [[{
          text: title,
          bold: true,
          fontSize: 11,
          fillColor: SEC_FILL,
          alignment: "center" as const,
          margin: [0, 5, 0, 5],
        }]],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#000000",
        vLineColor: () => "#000000",
      },
      margin: [0, 8, 0, 0], // small space above, none below — flush with photos
    });

    const renderPhotoGroup = (headerText: string, entries: any[]) => {
      if (!entries.length) return;

      // Flatten all photo+caption pairs from all entries into a single sequence.
      const flat: { img?: string; desc: string }[] = [];
      entries.forEach(entry => {
        const imgs: string[] = entry.images ?? [];
        const descs: string[] = entry.descriptions ?? [];
        const n = Math.max(imgs.length, descs.length);
        for (let i = 0; i < n; i++) {
          flat.push({ img: imgs[i], desc: descs[i] ?? "" });
        }
      });

      // Header (banner) — emitted once for the group; pdfmake will carry
      // photos onto subsequent pages without repeating it, matching the
      // template behavior on pages 14→15 and 16→17.
      items.push(createPhotoHeader(headerText));

      // Render in pairs of two cells per row.
      for (let i = 0; i < flat.length; i += 2) {
        const left = flat[i];
        const right = flat[i + 1];
        items.push({
          columns: [
            createPhotoBox(left.img, left.desc),
            right
              ? createPhotoBox(right.img, right.desc)
              : { text: "", width: "*" }, // odd-count tail
          ],
          columnGap: 0, // borders touch — matches source layout
          margin: [0, 0, 0, 0],
        });
      }
    };

    renderPhotoGroup("HSE Toolbox Meeting", tb);
    renderPhotoGroup("HSE Activity Photo", ap);
  }

  return items;
}

// ── Resources ─────────────────────────────────────────────────────────────────
function buildResources(data: WeeklyReportExportData): any[] {
  const items: any[] = [secBanner("6.  RESOURCES STATUS")];
  const DAY_LABELS = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
  const dates = data.weekDates?.length === 7 ? data.weekDates : Array(7).fill("");
  const weekLabel = (dates[0] && dates[6]) ? `Day ${dates[0]}–${dates[6]}` : "This Week";

  // Ensure arrays exist (fallback to empty if undefined)
  const manpowerRows = data.manpowerRows ?? [];
  const materialRows = data.materialRows ?? [];
  const equipmentRows = data.equipmentRows ?? [];

  // Debug logging
  console.log("[PDF Resources] manpowerRows:", manpowerRows.length, manpowerRows);
  console.log("[PDF Resources] materialRows:", materialRows.length, materialRows);
  console.log("[PDF Resources] equipmentRows:", equipmentRows.length, equipmentRows);
  console.log("[PDF Resources] weekDates:", dates);

  // Helper to get daily array from various field names (like Excel)
  const pickDailyArray = (row: any): any[] => {
    if (Array.isArray(row?.dailyData)) return row.dailyData;
    if (Array.isArray(row?.dailyCounts)) return row.dailyCounts;
    if (Array.isArray(row?.daily)) return row.daily;
    if (Array.isArray(row?.days)) return row.days;
    return [];
  };

  // Helper to check if row is a group header
  const isGroupHeaderRow = (row: any): boolean => {
    if (row?.isGroupHeader === true) return true;
    const desc = String(row?.description ?? "").trim();
    return /^[IVXLCDM]+\.\s/i.test(desc);
  };

  // Helper to create header rows array (to be combined with data in single table)
  const createHeaderRows = (weekLabelText: string, prevLabel: string, thisLabel: string, uptoLabel: string): any[] => {
    const hdrFill = SEC_FILL;
    const fontSize = 9;

    return [
      // Row 1: Main headers
      [
        { text: "Description", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        { text: weekLabelText, bold: true, fontSize, fillColor: hdrFill, alignment: "center", colSpan: 7 },
        "", "", "", "", "",
        { text: prevLabel, bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        { text: thisLabel, bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        { text: uptoLabel, bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
      ],
      // Row 2: Day labels
      [
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        ...DAY_LABELS.map(d => ({ text: d, bold: true, fontSize, fillColor: hdrFill, alignment: "center" })),
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
      ],
      // Row 3: Dates
      [
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        ...dates.map(dt => ({ text: dt, bold: true, fontSize, fillColor: hdrFill, alignment: "center" })),
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
        { text: "", bold: true, fontSize, fillColor: hdrFill, alignment: "center" },
      ],
    ];
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 6.1 Manpower Status - SINGLE CONTINUOUS TABLE
  // ═══════════════════════════════════════════════════════════════════════
  items.push(subHdr("6.1  Manpower Status", 0));

  const mpHeaderRows = createHeaderRows(weekLabel, "Previous\nWeek", "This\nWeek", "Up to\nThis Week");
  const mpDataRows: any[] = [];
  let mpItemNo = 0;
  const mpDataIndices: number[] = [];

  manpowerRows.forEach(row => {
    if (isGroupHeaderRow(row)) {
      mpItemNo = 0;
      mpDataRows.push([
        { text: s(row.description), bold: true, fillColor: GRP_FILL, colSpan: 11, fontSize: 9 },
        ...Array(10).fill(null),
      ]);
    } else {
      mpItemNo++;
      const rowIndex = mpDataRows.length;
      mpDataIndices.push(rowIndex);
      const dc = pickDailyArray(row);
      mpDataRows.push([
        { text: `${mpItemNo}. ${s(row.description)}`, fontSize: 9 },
        ...dc.slice(0, 7).map((v: any) => ({ text: s(v), align: "center" as const, fontSize: 9 })),
        { text: s(row.previousWeek), align: "center", fontSize: 9 },
        { text: s(row.thisWeek), align: "center", fontSize: 9 },
        { text: s(row.upToThisWeek), align: "center", fontSize: 9 },
      ]);
    }
  });

  if (mpDataRows.length === 0) {
    mpDataRows.push([{ text: "", colSpan: 11, align: "center" as const, fontSize: 9 }, ...Array(10).fill(null)]);
  }

  // Add total row
  const calcMpTotal = (colIndex: number): number => {
    return mpDataIndices.reduce((sum, idx) => {
      const val = parseFloat(mpDataRows[idx][colIndex]?.text || "0");
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  };

  mpDataRows.push([
    { text: "Grand Total", bold: true, fillColor: TOTAL_FILL, fontSize: 9 },
    ...Array(7).fill({ text: "", fillColor: TOTAL_FILL, align: "center" as const, fontSize: 9 }),
    { text: String(calcMpTotal(8)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
    { text: String(calcMpTotal(9)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
    { text: String(calcMpTotal(10)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
  ]);

  // SINGLE TABLE: Headers + Data + Total
  items.push({
    table: {
      widths: ["*", 26, 26, 26, 26, 26, 26, 26, 44, 44, 52],
      body: [...mpHeaderRows, ...mpDataRows],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
    margin: [0, 0, 0, 10],
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6.2 Material Delivery Status - SINGLE CONTINUOUS TABLE
  // ═══════════════════════════════════════════════════════════════════════
  items.push(subHdr("6.2  Material Delivery Status"));

  const matHeaderRows = createHeaderRows(weekLabel, "Previous", "This\nPeriod", "Accumulate");
  const matDataRows: any[] = [];
  const matDataIndices: number[] = [];

  materialRows.forEach(row => {
    const rowIndex = matDataRows.length;
    matDataIndices.push(rowIndex);
    const dd = pickDailyArray(row);
    const desc = row.unit ? `${s(row.description)} (${s(row.unit)})` : s(row.description);
    matDataRows.push([
      { text: desc, fontSize: 9 },
      ...dd.slice(0, 7).map((v: any) => ({ text: s(v), align: "center" as const, fontSize: 9 })),
      { text: s(row.previous), align: "center", fontSize: 9 },
      { text: s(row.thisPeriod), align: "center", fontSize: 9 },
      { text: s(row.accumulate), align: "center", fontSize: 9 },
    ]);
  });

  if (matDataRows.length === 0) {
    matDataRows.push([{ text: "", colSpan: 11, align: "center" as const, fontSize: 9 }, ...Array(10).fill(null)]);
  }

  // Add total row
  const calcMatTotal = (colIndex: number): number => {
    return matDataIndices.reduce((sum, idx) => {
      const val = parseFloat(matDataRows[idx][colIndex]?.text || "0");
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  };

  matDataRows.push([
    { text: "Total", bold: true, fillColor: TOTAL_FILL, fontSize: 9 },
    ...Array(7).fill({ text: "", fillColor: TOTAL_FILL, align: "center" as const, fontSize: 9 }),
    { text: String(calcMatTotal(8)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
    { text: String(calcMatTotal(9)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
    { text: String(calcMatTotal(10)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
  ]);

  // SINGLE TABLE: Headers + Data + Total
  items.push({
    table: {
      widths: ["*", 26, 26, 26, 26, 26, 26, 26, 44, 44, 52],
      body: [...matHeaderRows, ...matDataRows],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
    margin: [0, 0, 0, 10],
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6.3 Machinery / Equipment Status - SINGLE CONTINUOUS TABLE
  // ═══════════════════════════════════════════════════════════════════════
  items.push(subHdr("6.3  Machinery / Equipment Status"));

  const eqHeaderRows = createHeaderRows(weekLabel, "Previous", "This\nPeriod", "Accumulate");
  const eqDataRows: any[] = [];
  const eqDataIndices: number[] = [];

  equipmentRows.forEach(row => {
    const rowIndex = eqDataRows.length;
    eqDataIndices.push(rowIndex);
    const dd = pickDailyArray(row);
    const desc = row.unit ? `${s(row.description)} (${s(row.unit)})` : s(row.description);
    eqDataRows.push([
      { text: desc, fontSize: 9 },
      ...dd.slice(0, 7).map((v: any) => ({ text: s(v), align: "center" as const, fontSize: 9 })),
      { text: s(row.previous), align: "center", fontSize: 9 },
      { text: s(row.thisPeriod), align: "center", fontSize: 9 },
      { text: s(row.accumulate), align: "center", fontSize: 9 },
    ]);
  });

  if (eqDataRows.length === 0) {
    eqDataRows.push([{ text: "", colSpan: 11, align: "center" as const, fontSize: 9 }, ...Array(10).fill(null)]);
  }

  // Add total row
  const calcEqTotal = (colIndex: number): number => {
    return eqDataIndices.reduce((sum, idx) => {
      const val = parseFloat(eqDataRows[idx][colIndex]?.text || "0");
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  };

  eqDataRows.push([
    { text: "Total", bold: true, fillColor: TOTAL_FILL, fontSize: 9 },
    ...Array(7).fill({ text: "", fillColor: TOTAL_FILL, align: "center" as const, fontSize: 9 }),
    { text: String(calcEqTotal(8)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
    { text: String(calcEqTotal(9)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
    { text: String(calcEqTotal(10)), bold: true, fillColor: TOTAL_FILL, align: "center", fontSize: 9 },
  ]);

  // SINGLE TABLE: Headers + Data + Total
  items.push({
    table: {
      widths: ["*", 26, 26, 26, 26, 26, 26, 26, 44, 44, 52],
      body: [...eqHeaderRows, ...eqDataRows],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
    margin: [0, 0, 0, 10],
  });

  return items;
}

// ── Site Activity Photos ───────────────────────────────────────────────────────
function buildSitePhotos(data: WeeklyReportExportData, sitePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("7.  SITE ACTIVITY PHOTOS")];

  if (!data.sitePhotoCaptions?.length) {
    items.push({ text: "No site activity photos available.", style: "bodyText" });
    return items;
  }

  const resolveImage = (img: string | undefined): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith("data:")) return img;
    return sitePhotos.get(img) || img;
  };

  const createPhotoBox = (img: string | undefined, desc: string): any => {
    const resolvedImg = resolveImage(img);
    const photoCell = resolvedImg
      ? {
          stack: [{ image: resolvedImg, fit: [230, 150], alignment: "center" as const }],
          margin: [2, 2, 2, 2],
          alignment: "center" as const,
          minHeight: 100,
        }
      : {
          text: "",
          margin: [0, 50, 0, 50],
        };

    return {
      table: {
        widths: ["*"],
        heights: [100, 18],
        body: [
          [photoCell],
          [{
            text: desc || "",
            style: "photoCaption",
            alignment: "center" as const,
            fontSize: 9,
            margin: [2, 3, 2, 3],
          }],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#000000",
        vLineColor: () => "#000000",
      },
    };
  };

  const createLocationHeader = (title: string): any => ({
    table: {
      widths: ["*"],
      body: [[{
        text: title,
        bold: true,
        fontSize: 11,
        fillColor: LOC_FILL,
        alignment: "center" as const,
        margin: [0, 5, 0, 5],
      }]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
    margin: [0, 8, 0, 0],
  });

  data.sitePhotoCaptions.forEach(entry => {
    if (entry.siteLocation) {
      items.push(createLocationHeader(s(entry.siteLocation)));
    }

    const flat: { img?: string; desc: string }[] = [];
    if (entry.image1 || entry.caption1) flat.push({ img: entry.image1, desc: entry.caption1 ?? "" });
    if (entry.image2 || entry.caption2) flat.push({ img: entry.image2, desc: entry.caption2 ?? "" });

    for (let i = 0; i < flat.length; i += 2) {
      const left = flat[i];
      const right = flat[i + 1];
      items.push({
        columns: [
          createPhotoBox(left.img, left.desc),
          right ? createPhotoBox(right.img, right.desc) : { text: "", width: "*" },
        ],
        columnGap: 0,
        margin: [0, 0, 0, 0],
      });
    }
  });

  return items;
}

// ── Construction Issues ────────────────────────────────────────────────────────
function buildConstructionIssues(data: WeeklyReportExportData, issuePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("8.  CONSTRUCTION ISSUE")];

  // Helper to resolve image (use loaded dataURL if available)
  const resolveImage = (img: string | undefined): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith("data:")) return img;
    return issuePhotos.get(img) || img;
  };

  // Inner banner matching Excel - "Construction Issue" centered with blue fill
  items.push({
    table: {
      widths: ["*"],
      body: [[{
        text: "Construction Issue",
        bold: true,
        fontSize: 12,
        fillColor: SEC_FILL,
        alignment: "center",
        margin: [0, 6, 0, 6],
      }]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
    margin: [0, 0, 0, 0],
  });

  const issues = data.constructionIssues ?? [];
  const issuesToRender: any[] = [];

  // Always render up to 4 boxes - actual issues first, then empty placeholders
  const actualIssues = issues.slice(0, 4); // Take first 4 actual issues
  const emptySlotsNeeded = Math.max(0, 4 - actualIssues.length);

  issuesToRender.push(...actualIssues);

  // Add empty placeholder boxes for remaining slots
  for (let i = 0; i < emptySlotsNeeded; i++) {
    issuesToRender.push({ number: actualIssues.length + i + 1 });
  }

  // Build a single continuous table with all issue blocks
  const tableBody: any[][] = [];

  for (let i = 0; i < issuesToRender.length; i++) {
    const issue = issuesToRender[i];
    const issueNum = issue.number ?? (i + 1);

    // ── Issue number row (full width, underlined number) ──
    tableBody.push([
      { text: String(issueNum), bold: true, fontSize: 11, decoration: "underline", alignment: "left", margin: [4, 4, 4, 4], colSpan: 2 },
      null,
    ]);

    // ── Site Location header row + Photo Reference header (two columns) ──
    tableBody.push([
      { text: `Site Location: ${s(issue.siteLocation || "")}`, fontSize: 10, alignment: "left", margin: [4, 4, 4, 4] },
      { text: "Photo Reference", fontSize: 10, alignment: "center", margin: [4, 4, 4, 4] },
    ]);

    // ── Body row: Problems/Descriptions on left, Photo on right ──
    const resolvedPhoto = resolveImage(issue.photo);
    const photoCell = resolvedPhoto
      ? { image: resolvedPhoto, fit: [240, 270], alignment: "center" as const }
      : { text: "", alignment: "center" as const, margin: [0, 130, 0, 130] };

    tableBody.push([
      {
        stack: [
          { text: "Problems / Descriptions:", fontSize: 10, margin: [0, 0, 0, 6] },
          { text: s(issue.problemDescription || ""), fontSize: 10, alignment: "left" },
        ],
        margin: [4, 4, 4, 4],
      },
      {
        stack: [photoCell],
        margin: [4, 4, 4, 4],
        alignment: "center",
      },
    ]);

    // ── Action by row (left side only) ──
    tableBody.push([
      { text: `Action by: ${s(issue.actionBy || "")}`, fontSize: 10, alignment: "left", margin: [4, 4, 4, 4] },
      { text: "", margin: [4, 4, 4, 4] },
    ]);
  }

  // Single continuous table for all issues
  items.push({
    table: {
      widths: ["*", "*"],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
  });

  return items;
}

// ── Helper: Load all images from data ─────────────────────────────────────────
async function loadAllImages(data: WeeklyReportExportData): Promise<{
  companyLogo?: string;
  clientLogo?: string;
  signatureImage?: string;
  coverImage?: string;
  sitePhotos: Map<string, string | undefined>;
  issuePhotos: Map<string, string | undefined>;
  hsePhotos: Map<string, string | undefined>;
}> {
  // Load main images
  const [companyLogo, clientLogo, signatureImage, coverImage] = await Promise.all([
    loadImg("/cacpm_logo.png"),
    loadImg(data.clientLogo),
    loadImg(data.signatureImage),
    loadImg(data.coverImage),
  ]);

  // Collect and load site photo images
  const sitePhotoUrls = new Set<string>();
  data.sitePhotoCaptions?.forEach(entry => {
    if (entry.image1 && !entry.image1.startsWith("data:")) sitePhotoUrls.add(entry.image1);
    if (entry.image2 && !entry.image2.startsWith("data:")) sitePhotoUrls.add(entry.image2);
  });

  const sitePhotos = new Map<string, string | undefined>();
  await Promise.all(
    Array.from(sitePhotoUrls).map(async url => {
      sitePhotos.set(url, await loadImg(url));
    })
  );

  // Collect and load construction issue photos
  const issuePhotoUrls = new Set<string>();
  data.constructionIssues?.forEach(issue => {
    if (issue.photo && !issue.photo.startsWith("data:")) issuePhotoUrls.add(issue.photo);
  });

  const issuePhotos = new Map<string, string | undefined>();
  await Promise.all(
    Array.from(issuePhotoUrls).map(async url => {
      issuePhotos.set(url, await loadImg(url));
    })
  );

  // Collect and load HSE photo images
  const hsePhotoUrls = new Set<string>();
  data.hsePhotoReferences?.hseToolboxMeeting?.forEach((entry: any) => {
    entry.images?.forEach((img: string) => {
      if (img && !img.startsWith("data:")) hsePhotoUrls.add(img);
    });
  });
  data.hsePhotoReferences?.hseActivityPhotos?.forEach((entry: any) => {
    entry.images?.forEach((img: string) => {
      if (img && !img.startsWith("data:")) hsePhotoUrls.add(img);
    });
  });

  const hsePhotos = new Map<string, string | undefined>();
  await Promise.all(
    Array.from(hsePhotoUrls).map(async url => {
      hsePhotos.set(url, await loadImg(url));
    })
  );

  return { companyLogo, clientLogo, signatureImage, coverImage, sitePhotos, issuePhotos, hsePhotos };
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function exportWeeklyReportToPdf(data: WeeklyReportExportData, filename = "WeeklyReport.pdf") {
  const { companyLogo, clientLogo, signatureImage, coverImage, sitePhotos, issuePhotos, hsePhotos } = await loadAllImages(data);

  const projectTitles = [data.projectTitle, data.projectSubtitle, data.projectSubtitle2].filter(Boolean);

  // ── Cover page (unchanged) ────────────────────────────────────────────────
  const coverContent: any[] = [
    {
      table: {
        widths: [10, 6, "*"],
        body: [
          [
            {
              text: "",
              fillColor: "#16365C",
              border: [false, false, false, false],
              rowSpan: 4,
            },
            {
              text: "",
              fillColor: "#FFFFFF",
              border: [false, false, false, false],
              rowSpan: 4,
            },
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
                    widths: ["*"],
                    body: [
                      [
                        {
                          text: "WEEKLY PROGRESS REPORT",
                          style: "coverTitleBanner",
                          fillColor: "#002060",
                          color: "#FFFFFF",
                          alignment: "center",
                          margin: [0, 0, 0, 0],
                        },
                      ],
                    ],
                  },
                  layout: { defaultBorder: false },
                  margin: [0, 75, 0, 12],
                },
                { text: `Week - ${s(data.weekNumber)}`, style: "coverWeek" },
                { text: `From ${s(data.reportDateFrom)} ~ ${s(data.reportDateTo)}`, style: "coverDateRange", margin: [0, 4, 0, 0] },
              ],
              margin: [14, 14, 14, 14],
            },
          ],
          [
            {},
            {},
            {
              stack: coverImage
                ? [{ image: coverImage, fit: [520, 260], alignment: "center" }]
                : [{ text: "No Cover Image Available", style: "coverPlaceholder" }],
              fillColor: "#FFFFFF",
            },
          ],
          [
            {},
            {},
            {
              stack: projectTitles.map(line => ({ text: line, style: "coverProjectTitle" })),
              margin: [21, 18, 21, 0],
            },
          ],
          [
            {},
            {},
            {
              table: {
                widths: [90, 12, "*"],
                body: [
                  [{ text: "Employee",   style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: s(data.employer),   style: "partyValue" }],
                  [{ text: "",           style: "partyLabel" }, { text: "", style: "partyLabel" },   { text: "",                 style: "partyValue" }],
                  [{ text: "Contractor", style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: s(data.contractor), style: "partyValue" }],
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
  ];

  // ── Assemble all pages ────────────────────────────────────────────────────
  const content: any[] = [
    ...coverContent,
    pb(),
    ...buildLetter(data, signatureImage),
    pb(),
    ...buildTOC(),
    pb(),
    ...buildIntro(data, coverImage),
    pb(),
    ...buildOP(data),
    pb(),
    ...buildNWDP(data),
    pb(),
    ...buildQAQC(data),
    pb(),
    ...buildHSE(data, hsePhotos),
    pb(),
    ...buildResources(data),
    pb(),
    ...buildSitePhotos(data, sitePhotos),
    pb(),
    ...buildConstructionIssues(data, issuePhotos),
  ];

  // ── Document definition ───────────────────────────────────────────────────
  const docDefinition: any = {
    pageSize: { width: 617.28, height: 786.89 },
    pageMargins: [50, 50, 50, 50],

    info: { title: filename },
    content,

    styles: {
      // Cover
      coverTitleBanner:  { fontSize: 16, bold: true, color: "#FFFFFF", alignment: "center" },
      coverWeek:         { fontSize: 14, bold: true, color: "#000000", alignment: "center" },
      coverDateRange:    { fontSize: 10, bold: true, color: "#000000", alignment: "center" },
      coverProjectTitle: { fontSize: 14, bold: true, italics: true, alignment: "center", margin: [0, 2, 0, 2] },
      coverPlaceholder:  { fontSize: 12, italics: true, color: "#FFFFFF", alignment: "center", margin: [0, 80, 0, 80] },
      partyLabel:        { fontSize: 12, bold: true, color: "#000000", alignment: "left" },
      partyValue:        { fontSize: 12, bold: true, alignment: "left" },
      // Page chrome
      pageHdrLeft:  { fontSize: 9, bold: true, color: "#1F2937" },
      pageHdrRight: { fontSize: 9, color: "#4B5563" },
      pageFooter:   { fontSize: 8, color: "#6B7280" },
      // Section chrome
      secBanner: { fontSize: 12, bold: true, color: "#000000", margin: [5, 5, 5, 5] },
      subHdr:    { fontSize: 13, bold: true, color: "#000000" },
      // Letter
      ltBanner:      { fontSize: 15, bold: true, color: "#FFFFFF", margin: [0, 0, 0, 0] },
      ltLabel:       { fontSize: 11, bold: true },
      ltBold:        { fontSize: 11, bold: true },
      ltValue:       { fontSize: 11 },
      ltBody:        { fontSize: 11, lineHeight: 1.4 },
      sigLine:       { fontSize: 12, color: "#000000" },
      sigContact:    { fontSize: 11, color: "#000000" },
      sigPlaceholder:{ fontSize: 9, color: "#9CA3AF", italics: true, alignment: "center" },
      // TOC
      tocMajor: { fontSize: 11, color: "#000000" },
      tocSub:   { fontSize: 11, color: "#000000" },
      // Tables
      tblHdr:      { fontSize: 9, bold: true, color: "#000000", margin: [2, 3, 2, 3] },
      tblCell:     { fontSize: 9, margin: [2, 2, 2, 2] },
      qaqcSubTitle:{ fontSize: 10, margin: [4, 4, 4, 4] },
      // Body
      bodyText: { fontSize: 10, lineHeight: 1.35 },
      // Photos
      photoLocBanner: { fontSize: 11, bold: true, alignment: "center", margin: [4, 4, 4, 4] },
      photoSecTitle:  { fontSize: 10, bold: true },
      photoCaption:   { fontSize: 9, color: "#4B5563" },
    },

    defaultStyle: { font: "Roboto" },
  };

  pdfMake.createPdf(docDefinition).download(filename);
}
