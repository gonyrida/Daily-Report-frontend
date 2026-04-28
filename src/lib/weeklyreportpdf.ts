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
 * Headers: { text, w?, align? }
 * Row cells: { text, align?, fill?, bold?, colSpan? } | null (null = colspan placeholder)
 */
const mkTable = (
  headers: { text: string; w?: any; align?: string }[],
  rows: Array<Array<{ text: string; align?: string; fill?: string; bold?: boolean; colSpan?: number } | null>>,
  opts: { hFill?: string; altRows?: boolean; compact?: boolean } = {},
): any => {
  const hFill   = opts.hFill ?? TBL_HDR;
  const altRows = opts.altRows !== false;
  const fSize   = opts.compact ? 8 : 9;

  const headerRow: any[] = headers.map(h => ({
    text: h.text,
    style: "tblHdr",
    fontSize: fSize,
    fillColor: hFill,
    alignment: h.align ?? "center",
  }));

  const body: any[] = [headerRow];

  rows.forEach((row, ri) => {
    const alt = altRows && ri % 2 === 1;
    body.push(
      row.map(cell => {
        if (cell === null) return {};
        return {
          text: cell.text,
          style: "tblCell",
          fontSize: fSize,
          fillColor: cell.fill ?? (alt ? TBL_ALT : "#FFFFFF"),
          alignment: cell.align ?? "left",
          ...(cell.colSpan ? { colSpan: cell.colSpan } : {}),
          ...(cell.bold ? { bold: true } : {}),
        };
      }),
    );
  });

  return {
    table: {
      headerRows: 1,
      widths: headers.map(h => h.w ?? "auto"),
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

  console.log('PDF DEBUG: overallProgressItems:', JSON.stringify(data.overallProgressItems, null, 2));

  const rows = (data.overallProgressItems ?? []).map((it, idx) => {
    console.log(`PDF DEBUG: Row ${idx} pctUpToPrevWeek=`, it.pctUpToPrevWeek, 'type=', typeof it.pctUpToPrevWeek);
    return [
      { text: s(it.no),                 align: "center" },
      { text: s(it.scopeOfWorks),       align: "left"   },
      { text: s(it.pctUpToPrevWeek ?? ''),    align: "center" },
      { text: s(it.pctThisWeek ?? ''),        align: "center" },
      { text: s(it.pctUpToThisWeek ?? ''),    align: "center" },
      { text: s(it.pctRemaining ?? ''),       align: "center" },
      { text: s(it.pctNextWeekPlan ?? ''),    align: "center" },
      { text: s(it.pctUpNextWeekPlan ?? ''),  align: "center" },
    ];
  });

  const emptyRow = [[
    { text: "No overall progress data available.", colSpan: 8, align: "center" as const },
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
  ));

  if (data.overallProgressRemark) {
    items.push({ text: `Remark: ${s(data.overallProgressRemark)}`, style: "bodyText", margin: [0, 8, 0, 0] });
  }
  return items;
}

// ── NWDP ──────────────────────────────────────────────────────────────────────
function buildNWDP(data: WeeklyReportExportData): any[] {
  const items: any[] = [secBanner("3.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN")];

  const rows = (data.nwdpItems ?? []).map(it => [
    { text: s(it.workDoneLabel),  align: "left"   },
    { text: it.workDonePct  != null ? `${s(it.workDonePct)}%`  : "", align: "center" },
    { text: s(it.nextWeekLabel), align: "left"   },
    { text: it.nextWeekPct  != null ? `${s(it.nextWeekPct)}%`  : "", align: "center" },
  ]);

  const emptyRow = [[
    { text: "No activity data available.", colSpan: 4, align: "center" as const },
    null, null, null,
  ]];

  items.push(mkTable(
    [
      { text: "Activities of Work Done", w: "*"  },
      { text: "%",                        w: 50  },
      { text: "Next Week Plan",           w: "*" },
      { text: "%",                        w: 50  },
    ],
    rows.length ? rows : emptyRow,
  ));
  return items;
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
function buildHSE(data: WeeklyReportExportData): any[] {
  const items: any[] = [secBanner("5.  HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)")];

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

  const tb = data.hsePhotoReferences?.hseToolboxMeeting ?? [];
  const ap = data.hsePhotoReferences?.hseActivityPhotos ?? [];
  if (tb.length || ap.length) {
    items.push(subHdr("5.6  HSES Photo Reference"));

    // Helper to create photo box with connected caption (like Excel)
    const createPhotoBox = (img: string | undefined, desc: string): any => {
      const photoContent = img
        ? { image: img, fit: [200, 140], alignment: "center" as const }
        : { text: "N/A", style: "tblCell", fontSize: 11, alignment: "center" as const, margin: [0, 60, 0, 0] };

      // Single table with 2 rows: photo row + caption row (connected borders)
      return {
        table: {
          widths: ["*"],
          body: [
            [{ stack: [photoContent], margin: [4, 4, 4, 4] }], // Photo cell
            [{ text: desc || "", style: "photoCaption", alignment: "center" as const, fontSize: 9, margin: [2, 2, 2, 2] }], // Caption cell
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 0.5 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#000000",
          vLineColor: () => "#000000",
        },
        width: "*",
      };
    };

    // Helper to create blue header box like Excel
    const createPhotoHeader = (title: string): any => ({
      table: {
        widths: ["*"],
        body: [[{
          text: title,
          bold: true,
          fontSize: 11,
          color: "#000000",
          fillColor: SEC_FILL, // Blue background like Excel
          alignment: "center" as const,
          margin: [0, 4, 0, 4],
        }]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000000",
        vLineColor: () => "#000000",
      },
      margin: [0, 0, 0, 0],
    });

    const renderPhotoGroup = (headerText: string, secTitle: string, entries: any[]) => {
      if (!entries.length) return;
      // Blue header box
      items.push(createPhotoHeader(headerText));
      items.push({ text: secTitle, style: "photoSecTitle", margin: [0, 6, 0, 4] });
      entries.forEach(entry => {
        const imgs: string[] = entry.images ?? [];
        const descs: string[] = entry.descriptions ?? [];
        for (let i = 0; i < Math.max(imgs.length, 1); i += 2) {
          const pair: any[] = [0, 1].map(j => {
            const img  = imgs[i + j];
            const desc = descs[i + j] ?? "";
            return createPhotoBox(img, desc);
          });
          items.push({ columns: pair, columnGap: 8, margin: [0, 0, 0, 8] });
        }
      });
    };

    renderPhotoGroup("HSE Toolbox Meeting", "5.6.1  HSES Training / Toolbox Meeting Photos", tb);
    renderPhotoGroup("HSE Activity Photo", "5.6.2  HSES Activity Photos", ap);
  }

  return items;
}

// ── Resources ─────────────────────────────────────────────────────────────────
function buildResources(data: WeeklyReportExportData): any[] {
  const items: any[] = [secBanner("6.  RESOURCES STATUS")];
  const DAY_LABELS = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
  const dates = data.weekDates?.length === 7 ? data.weekDates : Array(7).fill("");

  const dayHdrs = DAY_LABELS.map((d, i) => ({
    text: dates[i] ? `${d}\n${dates[i]}` : d,
    w: 26,
  }));

  // 6.1 Manpower
  items.push(subHdr("6.1  Manpower Status", 0));
  const mpHdrs = [
    { text: "Description", w: "*" },
    ...dayHdrs,
    { text: "Prev.\nWeek",        w: 44 },
    { text: "This\nWeek",         w: 44 },
    { text: "Up to\nThis Week",   w: 52 },
  ];
  const mpRows: any[] = [];
  (data.manpowerRows ?? []).forEach(row => {
    const isGrp = (row as any).isGroupHeader === true ||
      /^[IVXLCDM]+\.\s/i.test(s(row.description));
    const dc = row.dailyCounts ?? Array(7).fill("");
    if (isGrp) {
      mpRows.push([
        { text: s(row.description), bold: true, fill: GRP_FILL, colSpan: 11 },
        ...Array(10).fill(null),
      ]);
    } else {
      mpRows.push([
        { text: s(row.description) },
        ...dc.slice(0, 7).map(v => ({ text: s(v), align: "center" as const })),
        { text: s(row.previousWeek),  align: "center" },
        { text: s(row.thisWeek),      align: "center" },
        { text: s(row.upToThisWeek),  align: "center" },
      ]);
    }
  });
  if (!mpRows.length) {
    mpRows.push([{ text: "No manpower data.", colSpan: 11, align: "center" as const }, ...Array(10).fill(null)]);
  }
  items.push(mkTable(mpHdrs, mpRows, { compact: true }));

  // 6.2 Material
  items.push(subHdr("6.2  Material Delivery Status"));
  const matHdrs = [
    { text: "Description", w: "*" },
    ...dayHdrs,
    { text: "Previous",    w: 44 },
    { text: "This\nPeriod", w: 44 },
    { text: "Accumulate",  w: 52 },
  ];
  const matRows = (data.materialRows ?? []).map(row => [
    { text: `${s(row.description)}${row.unit ? ` (${s(row.unit)})` : ""}` },
    ...(row.dailyData ?? Array(7).fill("")).slice(0, 7).map(v => ({ text: s(v), align: "center" as const })),
    { text: s(row.previous),   align: "center" },
    { text: s(row.thisPeriod), align: "center" },
    { text: s(row.accumulate), align: "center" },
  ]);
  if (!matRows.length) {
    matRows.push([{ text: "No material data.", colSpan: 11, align: "center" as const }, ...Array(10).fill(null)]);
  }
  items.push(mkTable(matHdrs, matRows, { compact: true }));

  // 6.3 Equipment
  items.push(subHdr("6.3  Machinery / Equipment Status"));
  const eqHdrs = [
    { text: "Description", w: "*" },
    ...dayHdrs,
    { text: "Previous",    w: 44 },
    { text: "This\nPeriod", w: 44 },
    { text: "Accumulate",  w: 52 },
  ];
  const eqRows = (data.equipmentRows ?? []).map(row => [
    { text: `${s(row.description)}${row.unit ? ` (${s(row.unit)})` : ""}` },
    ...(row.dailyData ?? Array(7).fill("")).slice(0, 7).map(v => ({ text: s(v), align: "center" as const })),
    { text: s(row.previous),   align: "center" },
    { text: s(row.thisPeriod), align: "center" },
    { text: s(row.accumulate), align: "center" },
  ]);
  if (!eqRows.length) {
    eqRows.push([{ text: "No equipment data.", colSpan: 11, align: "center" as const }, ...Array(10).fill(null)]);
  }
  items.push(mkTable(eqHdrs, eqRows, { compact: true }));

  return items;
}

// ── Site Activity Photos ───────────────────────────────────────────────────────
function buildSitePhotos(data: WeeklyReportExportData): any[] {
  const items: any[] = [secBanner("7.  SITE ACTIVITY PHOTOS")];

  if (!data.sitePhotoCaptions?.length) {
    items.push({ text: "No site activity photos available.", style: "bodyText" });
    return items;
  }

  data.sitePhotoCaptions.forEach(entry => {
    if (entry.siteLocation) {
      items.push({
        table: { widths: ["*"], body: [[{ text: s(entry.siteLocation), style: "photoLocBanner", fillColor: LOC_FILL }]] },
        layout: { defaultBorder: false },
        margin: [0, 8, 0, 4],
      });
    }

    const pairs: [string | undefined, string | undefined][] = [
      [entry.image1, entry.caption1],
      [entry.image2, entry.caption2],
    ];
    const cols: any[] = pairs
      .filter(([img, cap]) => img || cap)
      .map(([img, cap]) =>
        img
          ? {
              stack: [
                { image: img, fit: [226, 155], alignment: "center" },
                { text: s(cap), style: "photoCaption", alignment: "center", margin: [0, 2, 0, 0] },
              ],
              width: "*",
            }
          : { text: s(cap), style: "bodyText", width: "*" },
      );

    if (cols.length) {
      items.push({ columns: cols, columnGap: 8, margin: [0, 0, 0, 8] });
    }
  });

  return items;
}

// ── Construction Issues ────────────────────────────────────────────────────────
function buildConstructionIssues(data: WeeklyReportExportData): any[] {
  const items: any[] = [secBanner("8.  CONSTRUCTION ISSUE")];

  const rows = (data.constructionIssues ?? []).map(issue => [
    { text: s(issue.number),             align: "center" },
    { text: s(issue.siteLocation)                        },
    { text: s(issue.problemDescription)                  },
    { text: s(issue.actionBy)                            },
  ]);

  const emptyRow = [[
    { text: "No construction issues available.", colSpan: 4, align: "center" as const },
    null, null, null,
  ]];

  items.push(mkTable(
    [
      { text: "No",                   w: 28  },
      { text: "Site Location",        w: 100 },
      { text: "Problem Description",  w: "*" },
      { text: "Action By",            w: 100 },
    ],
    rows.length ? rows : emptyRow,
  ));

  const withPhotos = (data.constructionIssues ?? []).filter(i => i.photo);
  if (withPhotos.length) {
    items.push(subHdr("Issue Photos"));
    for (let i = 0; i < withPhotos.length; i += 2) {
      const pair: any[] = [0, 1].map(j => {
        const issue = withPhotos[i + j];
        if (!issue?.photo) return { text: "", width: "*" };
        return {
          stack: [
            { image: issue.photo, fit: [226, 155], alignment: "center" },
            {
              text: `Issue ${s(issue.number)}: ${s(issue.siteLocation)}`,
              style: "photoCaption",
              alignment: "center",
              margin: [0, 2, 0, 0],
            },
          ],
          width: "*",
        };
      });
      items.push({ columns: pair, columnGap: 8, margin: [0, 0, 0, 8] });
    }
  }

  return items;
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function exportWeeklyReportToPdf(data: WeeklyReportExportData, filename = "WeeklyReport.pdf") {
  const [companyLogo, clientLogo, signatureImage, coverImage] = await Promise.all([
    loadImg("/cacpm_logo.png"),
    loadImg(data.clientLogo),
    loadImg(data.signatureImage),
    loadImg(data.coverImage),
  ]);

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
              stack: data.coverImage
                ? [{ image: data.coverImage, fit: [520, 260], alignment: "center" }]
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
    ...buildHSE(data),
    pb(),
    ...buildResources(data),
    pb(),
    ...buildSitePhotos(data),
    pb(),
    ...buildConstructionIssues(data),
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
