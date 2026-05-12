import * as pdfMakeModule from "pdfmake/build/pdfmake";
import * as pdfFontsModule from "pdfmake/build/vfs_fonts";
import type { MasterWeeklyReport, MasterQaqcItem, MasterHsesTraining, MasterHsesInspection, MasterHsesPermit } from "@/types/masterReport.types";
import type { ManPowerEntry, MaterialEntry, MachineryEntry } from "@/types/resources.types";

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
const SEC_FILL = "#9BC2E6";
const TBL_ALT = "#F2F2F2";
const GRP_FILL = "#D9E1F2";
const TOTAL_FILL = "#E2EFDA";
const LTR_FILL = "#2F75B5";
const QAQC_FILL = "#DCE6F1";

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

const dataBarCell = (
  pct: string | number | null | undefined,
  width = 45,
  barColor = "#FFC000",
): any => {
  const raw = typeof pct === "string" ? parseFloat(pct) : Number(pct);
  const value = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
  const innerW = Math.max(1, width - 8);
  const barW = Math.round((value / 100) * innerW);
  const restW = innerW - barW;
  const label = value.toFixed(1) + "%";
  const fz = 8;

  if (barW <= 0) return { text: label, fontSize: fz, alignment: "center" };
  if (restW <= 0) return { text: label, fontSize: fz, alignment: "center", fillColor: barColor };

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

const mkTable = (
  headers: { text: string; w?: any; align?: string; colSpan?: number }[],
  rows: Array<Array<{ text: string; align?: string; fill?: string; bold?: boolean; colSpan?: number; margin?: number[] } | null>>,
  opts: { hFill?: string; altRows?: boolean; compact?: boolean } = {},
): any => {
  const hFill = opts.hFill ?? "#A6A6A6";
  const altRows = opts.altRows !== false;
  const fSize = opts.compact ? 8 : 9;

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
        return {
          text: cell.text,
          style: "tblCell",
          fontSize: fSize,
          fillColor: cell.fill ?? (alt ? TBL_ALT : "#FFFFFF"),
          alignment: cell.align ?? "left",
          ...(cell.colSpan ? { colSpan: cell.colSpan } : {}),
          ...(cell.bold ? { bold: true } : {}),
          ...(cell.margin ? { margin: cell.margin } : {}),
        };
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

// ── QAQC definitions ───────────────────────────────────────────────────────────
const QAQC_DEFS = [
  { id: "4.1", title: "Non-Conformity Report (NCR)", key: "ncr", col3: "Status", col4: "Date Responded" },
  { id: "4.2", title: "Corrective Action Request (CAR)", key: "car", col3: "Status", col4: "Date Responded" },
  { id: "4.3", title: "Safety Corrective Action Request (SCAR)", key: "scar", col3: "Status", col4: "Date Responded" },
  { id: "4.4", title: "PM Site Instruction (SI)", key: "pmsi", col3: "Status", col4: "Date Responded" },
  { id: "4.5", title: "Client Site Instruction (SI)", key: "csi", col3: "Issued By", col4: "Issued Date" },
  { id: "4.6", title: "Inspection Request (IR)", key: "ir", col3: "Received Date", col4: "Inspection Date" },
  { id: "4.7", title: "Material for Approval (MFA)", key: "mfa", col3: "Status", col4: "Date Responded" },
  { id: "4.8", title: "Request for Information (RFI)", key: "rfi", col3: "Status", col4: "Date Responded" },
  { id: "4.9", title: "Request for Approval (RFA)", key: "rfa", col3: "Status", col4: "Date Responded" },
  { id: "4.10", title: "Field Change Request (FCR)", key: "fcr", col3: "Status", col4: "Date Responded" },
  { id: "4.11", title: "Variation Order (VO)", key: "vo", col3: "Status", col4: "Date Responded" },
  { id: "4.12", title: "Transmittal (TR)", key: "tr", col3: "Status", col4: "Date Responded" },
  { id: "4.13", title: "Material Inspection Approval (MIR)", key: "mir", col3: "Status", col4: "Date Responded" },
];

// ── SECTION BUILDERS ───────────────────────────────────────────────────────────

// ── Cover page ────────────────────────────────────────────────────────────────
function buildCover(data: MasterWeeklyReport, companyLogo?: string, clientLogo?: string, coverImage?: string): any[] {
  const rpt = data.reports[0];
  const weekNum = s(data.weekNumber);
  const dateRange = s(rpt?.cover?.dateRange) ||
    (rpt?.startDate && rpt?.endDate ? `From ${s(rpt.startDate)} ~ ${s(rpt.endDate)}` : "");
  const projectTitle = s(rpt?.cover?.projectTitle) || s(rpt?.projectName);
  const employer = s(rpt?.cover?.employer) || s(rpt?.employer);
  const contractor = s(rpt?.letter?.constructorName);

  const projectTitles = [projectTitle].filter(Boolean);

  return [
    {
      table: {
        widths: [10, 6, "*"],
        body: [
          [
            { text: "", fillColor: "#16365C", border: [false, false, false, false], rowSpan: 4 },
            { text: "", fillColor: "#FFFFFF", border: [false, false, false, false], rowSpan: 4 },
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
                    body: [[{
                      text: "MASTER WEEKLY PROGRESS REPORT",
                      style: "coverTitleBanner",
                      fillColor: "#002060",
                      color: "#FFFFFF",
                      alignment: "center",
                    }]],
                  },
                  layout: { defaultBorder: false },
                  margin: [0, 75, 0, 12],
                },
                { text: `Week - ${weekNum}`, style: "coverWeek" },
                { text: dateRange, style: "coverDateRange", margin: [0, 4, 0, 0] },
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
                  [{ text: "Employer", style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: employer, style: "partyValue" }],
                  [{ text: "", style: "partyLabel" }, { text: "", style: "partyLabel" }, { text: "", style: "partyValue" }],
                  [{ text: "Contractor", style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: contractor, style: "partyValue" }],
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
}

// ── Letter page ────────────────────────────────────────────────────────────────
function buildLetter(data: MasterWeeklyReport, sig?: string): any[] {
  const ld = data.reports[0]?.letter;
  const weekNum = s(data.weekNumber);
  const refNo = ld?.refNoPrefix
    ? `${ld.refNoPrefix}-${weekNum}/${new Date().getFullYear()}`
    : `MWR-${weekNum}/${new Date().getFullYear()}`;
  const dateTxt = fmtDate(ld?.reportDate) ||
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const company = s(ld?.recipientCompany);
  const location = s(ld?.recipientLocation);
  const attTo = s(ld?.recipientName) || "Project Manager";
  const ccLines = ld?.ccList ?? [];

  const toBody: any[][] = [
    [
      { text: "To", style: "ltBold" },
      { text: ":", style: "ltBold" },
      { stack: [{ text: company || "—", style: "ltBold" }, ...(location ? [{ text: location, style: "ltBold" }] : [])] },
    ],
    [
      { text: "Att.", style: "ltBold", margin: [0, 4, 0, 0] },
      { text: ":", style: "ltBold", margin: [0, 4, 0, 0] },
      { text: attTo, style: "ltBold", margin: [0, 4, 0, 0] },
    ],
  ];
  ccLines.forEach((cc, i) => {
    toBody.push([
      { text: i === 0 ? "CC" : "", style: "ltBold", margin: [0, 4, 0, 0] },
      { text: ":", style: "ltBold", margin: [0, 4, 0, 0] },
      { text: cc, style: "ltBold", margin: [0, 4, 0, 0] },
    ]);
  });

  const sigBlock: any[] = [];
  if (sig) {
    sigBlock.push({ image: sig, width: 130, margin: [12, 4, 0, 4] });
  } else {
    sigBlock.push({
      canvas: [{ type: "rect", x: 0, y: 0, w: 140, h: 55, r: 2, lineWidth: 0.5, lineColor: "#CCCCCC", dash: { length: 4 } }],
      margin: [0, 4, 0, 0],
    });
    sigBlock.push({ text: "[Digital Signature]", style: "sigPlaceholder", margin: [0, -38, 0, 4] });
  }

  const rpt0 = data.reports[0];
  const reportDateFrom = s(rpt0?.startDate);
  const reportDateTo = s(rpt0?.endDate);
  const projectTitle = s(rpt0?.cover?.projectTitle) || s(rpt0?.projectName);
  const bodyText =
    `We are pleased to submit Weekly Progress Report No.${weekNum} from ` +
    `${reportDateFrom} to ${reportDateTo} for ${projectTitle}.\n\n`;

  return [
    {
      table: { widths: ["*"], body: [[{ text: `LETTER FOR MASTER WEEKLY PROGRESS REPORT   No. ${weekNum}`, style: "ltBanner", fillColor: LTR_FILL }]] },
      layout: { defaultBorder: false },
      margin: [15, -8, 10, 0],
    },
    {
      table: {
        widths: [58, 6, "*"],
        body: [
          [{ text: "Ref. No.", style: "ltLabel" }, { text: ":", style: "ltLabel" }, { text: refNo, style: "ltBold" }],
          [{ text: "Date", style: "ltLabel" }, { text: ":", style: "ltLabel" }, { text: dateTxt, style: "ltBold" }],
        ],
      },
      layout: { defaultBorder: false },
      margin: [12, 12, 10, 0],
    },
    { table: { widths: [42, 6, "*"], body: toBody }, layout: { defaultBorder: false }, margin: [12, 30, 10, 16] },
    { text: "Dear Sir,", style: "ltBody", bold: true, margin: [12, 0, 10, 0] },
    { text: bodyText, style: "ltBody", margin: [12, 0, 10, 20] },
    { text: "Sincerely Yours,", style: "ltBody", margin: [12, 0, 10, 10] },
    ...sigBlock,
    {
      stack: [
        {
          text: [
            { text: s(ld?.signatoryName || "Project Manager"), bold: true },
            { text: `  |  ${s(ld?.signatoryPosition || "Project Manager")}`, bold: true },
          ],
          style: "sigLine",
          margin: [12, 0, 0, 0],
        },
        { text: s(ld?.constructorName), style: "sigLine", bold: true, margin: [12, 0, 0, 15] },
        ...(ld?.companyLocation ? [{ text: s(ld.companyLocation), style: "sigContact", margin: [12, 0, 0, 15] }] : []),
        {
          text: [s(ld?.companyPhone1 ?? ""), ld?.companyPhone2 ? `  | M +855 (0) ${s(ld.companyPhone2)}` : ""].join(""),
          style: "sigContact",
          margin: [12, 0, 0, 0],
        },
        ...(ld?.companyEmail1 ? [{ text: s(ld.companyEmail1), style: "sigContact", margin: [12, 0, 0, 0] }] : []),
        ...(ld?.companyEmail2 ? [{ text: s(ld.companyEmail2), style: "sigContact", margin: [12, 0, 0, 0] }] : []),
      ],
    },
  ];
}

// ── Table of Contents ──────────────────────────────────────────────────────────
function buildTOC(): any[] {
  const items: { text: string; sub: boolean }[] = [
    { text: "1.  INTRODUCTION", sub: false },
    { text: "2.  OVERALL PROGRESS", sub: false },
    { text: "3.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN", sub: false },
    { text: "4.  QA/QC STATUS", sub: false },
    { text: "4.1  Non-Conformity Report (NCR)", sub: true },
    { text: "4.2  Corrective Action Request (CAR)", sub: true },
    { text: "4.3  Safety Corrective Action Request (SCAR)", sub: true },
    { text: "4.4  PM Site Instruction (SI)", sub: true },
    { text: "4.5  Client Site Instruction (SI)", sub: true },
    { text: "4.6  Inspection Request (IR)", sub: true },
    { text: "4.7  Material for Approval (MFA)", sub: true },
    { text: "4.8  Request for Information (RFI)", sub: true },
    { text: "4.9  Request for Approval (RFA)", sub: true },
    { text: "4.10  Field Change Request (FCR)", sub: true },
    { text: "4.11  Variation Order (VO)", sub: true },
    { text: "4.12  Transmittal (TR)", sub: true },
    { text: "4.13  Material Inspection Approval (MIR)", sub: true },
    { text: "5.  HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)", sub: false },
    { text: "5.1  HSES Training / Introduction / Toolbox Meeting", sub: true },
    { text: "5.2  HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist", sub: true },
    { text: "5.3  Permit to Work", sub: true },
    { text: "5.4  First Aid / Accident / Incident / Near Miss / Fatalities (if Any)", sub: true },
    { text: "5.5  Other HSES Activities Concerns", sub: true },
    { text: "5.6  HSES Photo Reference", sub: true },
    { text: "6.  RESOURCES STATUS", sub: false },
    { text: "6.1  Manpower Status", sub: true },
    { text: "6.2  Material Delivery Status", sub: true },
    { text: "6.3  Machinery / Equipment Status", sub: true },
    { text: "7.  SITE PHOTOS", sub: false },
    { text: "8.  CONSTRUCTION ISSUES", sub: false },
    { text: "9.  MASTER SCHEDULE", sub: false },
  ];

  return [
    secBanner("TABLE OF CONTENTS"),
    {
      stack: items.map(it => ({
        text: it.text,
        style: it.sub ? "tocSub" : "tocMajor",
        margin: it.sub ? [46, 3, 0, 3] : [34, 3, 0, 3],
      })),
    },
  ];
}

// ── 1. Introduction ────────────────────────────────────────────────────────────
function buildIntro(data: MasterWeeklyReport, coverImg?: string): any[] {
  const items: any[] = [secBanner("1.  INTRODUCTION")];
  const rpt = data.reports[0];

  const projectOverview = s(rpt?.introduction?.projectOverview);
  const designConstruction = s(rpt?.introduction?.designNConstruction);

  items.push(subHdr("Project Overview", 0));
  (items[items.length - 1] as any).margin = [25, 0, 0, 8];
  items.push({ text: projectOverview || "—", style: "bodyText", margin: [25, 0, 0, 0] });

  if (designConstruction) {
    items.push(subHdr("Design & Construction"));
    (items[items.length - 1] as any).margin = [25, 8, 0, 8];
    items.push({ text: designConstruction, style: "bodyText", margin: [25, 0, 0, 0] });
  }

  if (coverImg) {
    items.push({ image: coverImg, width: 400, margin: [0, 20, 0, 0], alignment: "center" });
  }

  return items;
}

// ── 2. Overall Progress ────────────────────────────────────────────────────────
function buildOP(data: MasterWeeklyReport): any[] {
  const items: any[] = [secBanner("2.  OVERALL PROGRESS")];

  const BLUE = "#4472C4";
  const ORANGE = "#ED7D31";
  const GREEN = "#70AD47";

  const isRomanId = (id: string): boolean => /^[IVXLCDM]+\./.test(id.trim());
  const isLevel1Id = (id: string): boolean => /^\d+\.?$/.test(id.trim());
  const isHeaderId = (id: string): boolean => isRomanId(id) || isLevel1Id(id);

  const constructionProgress = data.aggregated.constructionProgress ?? {};
  const projectNames = Object.keys(constructionProgress);

  if (projectNames.length === 0) {
    items.push({ text: "No overall progress data available.", style: "bodyText" });
  } else {
    // Combine all items from all projects into one array
    const allItems: any[] = [];
    projectNames.forEach(projName => {
      const projData = constructionProgress[projName];
      const projItems = projData?.items ?? [];
      allItems.push(...projItems);
    });

    const filtered = allItems.filter(it => it.id && isHeaderId(it.id));

    const rows = filtered.map(it => {
      const roman = isRomanId(it.id || "");
      const bc = (text: string | number | undefined, align: "center" | "left" = "center"): any =>
        ({ text: s(text ?? ""), align, bold: roman });
      return [
        bc(it.id, "center"),
        bc(it.scopeOfWorks, "left"),
        bc(it.previousWeek?.percentage, "center"),
        bc(it.thisWeek?.percentage, "center"),
        dataBarCell(it.upToThisWeek?.percentage, 54, BLUE),
        dataBarCell(it.remaining?.percentage, 50, ORANGE),
        bc(it.nextWeekPlan?.percentage, "center"),
        dataBarCell(it.upToNextWeekPlan?.percentage, 55, GREEN),
      ];
    });

    items.push(mkTable(
      [
        { text: "No", w: 28 },
        { text: "Scope of Works", w: "*" },
        { text: "% Up to\nPrev Week", w: 50 },
        { text: "% This\nWeek", w: 44 },
        { text: "% Up to\nThis Week", w: 54 },
        { text: "% Remaining", w: 50 },
        { text: "% Next\nWeek Plan", w: 50 },
        { text: "% Up Next\nWeek Plan", w: 55 },
      ],
      rows.length ? rows : [[
        { text: "No progress data.", colSpan: 8, align: "center" as const },
        null, null, null, null, null, null, null,
      ]],
      { hFill: SEC_FILL, altRows: false },
    ));
  }


  return items;
}

// ── 3. Activities / Next Week Plan ────────────────────────────────────────────
function buildActivities(data: MasterWeeklyReport): any[] {
  const items: any[] = [secBanner("3.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN")];

  const buildDisplayText = (id: string, text: string): string => {
    if (!id) return text || "";
    if (id === "-") return text ? `- ${text}` : "-";
    if (!text) return id;
    return id.endsWith(".") ? `${id} ${text}` : `${id}. ${text}`;
  };

  const getIdStyle = (id: string): { bold: boolean; leftPt: number } => {
    const t = id.trim();
    if (/^[IVX]/i.test(t)) return { bold: true, leftPt: 8 };
    if (t === "-") return { bold: false, leftPt: 40 };
    if (/^\d+$/.test(t)) return { bold: true, leftPt: 16 };
    return { bold: false, leftPt: 16 };
  };

  const weeklyActs = data.aggregated.activities?.weeklyActivities ?? [];
  const nextWeekActs = data.aggregated.activities?.nextWeekPlan ?? [];
  const fSize = 9;

  const headerRow: any[] = [
    { text: "Activities of Work Done", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 2 },
    {},
    { text: "Next Week Plan", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 2 },
    {},
  ];

  const dataRows: any[][] = [];
  const maxLen = Math.max(weeklyActs.length, nextWeekActs.length);

  if (maxLen === 0) {
    dataRows.push([
      { text: "No activity data available.", colSpan: 4, alignment: "center" as const, style: "tblCell", fontSize: fSize },
      {}, {}, {},
    ]);
  } else {
    for (let i = 0; i < maxLen; i++) {
      const wa = weeklyActs[i];
      const nw = nextWeekActs[i];

      const waId = wa?.id || "";
      const nwId = nw?.id || "";
      const { bold: waBold, leftPt: waLeft } = getIdStyle(waId);
      const { bold: nwBold, leftPt: nwLeft } = getIdStyle(nwId);
      const waPct = wa ? (wa.percent ?? (wa.percentage ? parseFloat(wa.percentage) : 0)) : null;
      const nwPct = nw ? (nw.percent ?? (nw.percentage ? parseFloat(nw.percentage) : 0)) : null;

      dataRows.push([
        { text: wa ? buildDisplayText(waId, wa.description) : "", style: "tblCell", fontSize: fSize, alignment: "left", bold: waBold, margin: [waLeft, 2, 2, 2] },
        dataBarCell(waPct, 45),
        { text: nw ? buildDisplayText(nwId, nw.description) : "", style: "tblCell", fontSize: fSize, alignment: "left", bold: nwBold, margin: [nwLeft, 2, 2, 2] },
        dataBarCell(nwPct, 45),
      ]);
    }
  }

  items.push({
    table: {
      headerRows: 1,
      widths: ["*", 45, "*", 45],
      body: [headerRow, ...dataRows],
    },
    layout: {
      hLineWidth: (i: number, node: any) =>
        i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
      vLineWidth: (i: number) => (i === 1 || i === 3) ? 0 : 0.5,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
  });

  return items;
}

// ── 4. QA/QC Status ───────────────────────────────────────────────────────────
function buildQAQC(data: MasterWeeklyReport): any[] {
  const items: any[] = [];

  const mainBanner = secBanner("4.  QA/QC STATUS");
  mainBanner.pageBreak = "before";
  items.push(mainBanner);

  const qaqcStatus = data.aggregated.qaqcStatus ?? {};

  QAQC_DEFS.forEach((def, index) => {
    if (index > 0 && index % 3 === 0) {
      const cont = secBanner("4.  QA/QC STATUS (Continued)");
      cont.pageBreak = "before";
      items.push(cont);
    }

    const sec = qaqcStatus[def.key];
    const secItems: MasterQaqcItem[] = sec?.items ?? [];

    const subTitle = {
      table: {
        widths: ["*"],
        body: [[{
          text: [{ text: `${def.id}  `, bold: true }, { text: def.title }],
          style: "qaqcSubTitle",
          fillColor: QAQC_FILL,
        }]],
      },
      layout: { defaultBorder: false },
      margin: [0, 8, 0, 2],
    };

    const qRows = secItems.map((it: MasterQaqcItem) => {
      let col3Val = "";
      let col4Val = "";
      if (def.id === "4.5") {
        col3Val = s((it as any).issuedBy ?? it.status);
        col4Val = s((it as any).issuedDate ?? (it as any).dateResponded);
      } else if (def.id === "4.6") {
        col3Val = s((it as any).receivedDate ?? (it as any).dateResponded);
        col4Val = s((it as any).inspectionDate);
      } else {
        col3Val = s(it.status);
        col4Val = s((it as any).dateResponded ?? (it as any).dateResponse);
      }
      return [
        { text: s(it.code), align: "center" as const },
        { text: s(it.description ?? (it as any).comment), align: "left" as const },
        { text: col3Val, align: "center" as const },
        { text: col4Val, align: "center" as const },
      ];
    });

    const emptyRows = Array(Math.max(0, 5 - qRows.length)).fill(null).map(() => [
      { text: "", align: "center" as const },
      { text: "", align: "left" as const },
      { text: "", align: "center" as const },
      { text: "", align: "center" as const },
    ]);

    const table = mkTable(
      [
        { text: "Code", w: 80 },
        { text: "Description", w: "*" },
        { text: def.col3, w: 75 },
        { text: def.col4, w: 75 },
      ],
      [...qRows, ...emptyRows],
      { hFill: SEC_FILL, altRows: false },
    );

    const commentsRow = {
      table: {
        widths: ["*"],
        body: [[{
          text: [{ text: "Comments: ", bold: true }, { text: sec?.comments ?? "" }],
          style: "tblCell",
          fontSize: 9,
          margin: [4, 8, 4, 8],
          alignment: "left",
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

    items.push({ stack: [subTitle, table, commentsRow], pageBreak: "avoid", margin: [0, 0, 0, 10] });
  });

  return items;
}

// ── 5. HSES ───────────────────────────────────────────────────────────────────
function buildHSES(data: MasterWeeklyReport, hsePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("5.  HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)")];
  const hses = data.aggregated.hses;

  const resolveImage = (img: string | undefined): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith("data:")) return img;
    return hsePhotos.get(img) || img;
  };

  // 5.1 Training
  items.push(subHdr("5.1  HSES Training / Introduction / Toolbox Meeting", 0));
  const trainingRows = (hses?.training ?? []).map((r: MasterHsesTraining) => [
    { text: s(r.typeOfTraining) },
    { text: s(r.date), align: "center" as const },
    { text: s(r.venue) },
    { text: s(r.trainer) },
    { text: s(r.attendee), align: "center" as const },
    { text: s(r.remarks) },
  ]);
  const trainingEmpty = Array(Math.max(0, 3 - trainingRows.length)).fill(null).map(() => [
    { text: "", align: "left" as const },
    { text: "", align: "center" as const },
    { text: "", align: "left" as const },
    { text: "", align: "left" as const },
    { text: "", align: "center" as const },
    { text: "", align: "left" as const },
  ]);
  items.push(mkTable(
    [
      { text: "Type of Training", w: "*" },
      { text: "Date", w: 55 },
      { text: "Venue", w: 70 },
      { text: "Trainer", w: 70 },
      { text: "Attendee", w: 50 },
      { text: "Remarks", w: 80 },
    ],
    [...trainingRows, ...trainingEmpty],
    { hFill: SEC_FILL, altRows: false },
  ));

  // 5.2 Inspection
  items.push(subHdr("5.2  HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist"));
  const inspectionRows = (hses?.inspection ?? []).map((r: MasterHsesInspection) => [
    { text: s(r.typeOfInspection) },
    { text: s(r.date), align: "center" as const },
    { text: s(r.inspector) },
    { text: s(r.remarks) },
  ]);
  const inspectionEmpty = Array(Math.max(0, 3 - inspectionRows.length)).fill(null).map(() => [
    { text: "", align: "left" as const },
    { text: "", align: "center" as const },
    { text: "", align: "left" as const },
    { text: "", align: "left" as const },
  ]);
  items.push(mkTable(
    [
      { text: "Type of Inspection", w: "*" },
      { text: "Date", w: 55 },
      { text: "Inspector", w: 80 },
      { text: "Remarks", w: 100 },
    ],
    [...inspectionRows, ...inspectionEmpty],
    { hFill: SEC_FILL, altRows: false },
  ));

  // 5.3 Permits
  items.push(subHdr("5.3  Permit to Work"));
  const permitRows = (hses?.permit ?? []).map((r: MasterHsesPermit) => [
    { text: s(r.typeOfPermit) },
    { text: s(r.startDate), align: "center" as const },
    { text: s(r.endDate), align: "center" as const },
    { text: s(r.inspector) },
    { text: s(r.approver) },
    { text: s(r.remarks) },
  ]);
  const permitEmpty = Array(Math.max(0, 3 - permitRows.length)).fill(null).map(() => [
    { text: "", align: "left" as const },
    { text: "", align: "center" as const },
    { text: "", align: "center" as const },
    { text: "", align: "left" as const },
    { text: "", align: "left" as const },
    { text: "", align: "left" as const },
  ]);
  items.push(mkTable(
    [
      { text: "Type of Permit", w: "*" },
      { text: "Start Date", w: 55 },
      { text: "End Date", w: 55 },
      { text: "Inspector", w: 65 },
      { text: "Approver", w: 65 },
      { text: "Remarks", w: 75 },
    ],
    [...permitRows, ...permitEmpty],
    { hFill: SEC_FILL, altRows: false },
  ));

  // 5.4 First Aid
  items.push(subHdr("5.4  First Aid / Accident / Incident / Near Miss / Fatalities (if Any)"));
  const firstAid = s(hses?.firstAidAccident ?? "");
  items.push({
    stack: [
      { text: firstAid || "", style: "bodyText" },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineColor: "#000000", lineWidth: 0.5, lineDash: [1, 1] }], margin: [0, 4, 0, 0] },
    ],
    margin: [0, 0, 0, 8],
  });

  // 5.5 Other Activities
  items.push(subHdr("5.5  Other HSES Activities Concerns"));
  const otherActs = s(hses?.otherActivities ?? "");
  items.push({
    stack: [
      { text: otherActs || "", style: "bodyText" },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineColor: "#000000", lineWidth: 0.5, lineDash: [1, 1] }], margin: [0, 4, 0, 0] },
    ],
    margin: [0, 0, 0, 8],
  });
  
  // 5.6 HSE Photo Reference
  const tb = hses?.hsePhotoReferences?.hseToolboxMeeting ?? [];
  const ap = hses?.hsePhotoReferences?.hseActivityPhotos ?? [];

  if (tb.length || ap.length) {
    items.push({ text: "", pageBreak: "before" });
    items.push(subHdr("5.6  HSES Photo Reference"));

    const HSE_IMG_W = 300, HSE_IMG_H = 125, HSE_ROW_H = 129, HSE_CAP_H = 18;

    const makeHseImgCell = (slot: { img?: string; desc: string } | undefined): any => {
      if (!slot) return { text: "", fillColor: "#FFFFFF" };
      const resolvedImg = resolveImage(slot.img);
      return resolvedImg
        ? { stack: [{ image: resolvedImg, fit: [HSE_IMG_W, HSE_IMG_H], alignment: "center" as const }], margin: [0, 2, 0, 2], alignment: "center" as const }
        : { text: "", margin: [0, 55, 0, 55] };
    };

    const makeHseCapCell = (slot: { img?: string; desc: string } | undefined): any => ({
      text: slot?.desc || "",
      style: "photoCaption",
      alignment: "center" as const,
      fontSize: 9,
      margin: [2, 3, 2, 3],
    });

    const createPhotoHeader = (title: string): any => ({
      table: {
        widths: ["*"],
        body: [[{ text: title, bold: true, fontSize: 10, fillColor: SEC_FILL, alignment: "center" as const, margin: [0, 2, 0, 2] }]],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
      margin: [0, 0, 0, 0],
    });

    const renderPhotoGroup = (headerText: string, sections: any[]) => {
      if (!sections.length) return;
      const flat: { img?: string; desc: string }[] = [];
      sections.forEach(section => {
        (section.entries ?? []).forEach((entry: any) => {
          (entry.slots ?? []).forEach((slot: any) => {
            flat.push({ img: slot.image, desc: slot.caption ?? "" });
          });
        });
      });
      if (!flat.length) return;

      // Display header with images on new pages, 8 images per page
      for (let pi = 0; pi < flat.length; pi += 8) {
        // Add page break before each new page (except first)
        if (pi > 0) {
          items.push({ text: "", pageBreak: "before" });
        }

        // Add header for each page
        items.push(createPhotoHeader(headerText));

        const pageSlots = flat.slice(pi, pi + 8);
        const numRows = Math.ceil(pageSlots.length / 2);
        const tableBody: any[][] = [];
        const heights: number[] = [];
        for (let row = 0; row < numRows; row++) {
          const L = pageSlots[row * 2];
          const R = pageSlots[row * 2 + 1];
          tableBody.push([makeHseImgCell(L), makeHseImgCell(R)]);
          tableBody.push([makeHseCapCell(L), makeHseCapCell(R)]);
          heights.push(HSE_ROW_H, HSE_CAP_H);
        }
        const tableObj: any = {
          table: { widths: ["*", "*"], heights, body: tableBody },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
          margin: [0, 0, 0, 0],
        };
        items.push(tableObj);
      }
    };

    renderPhotoGroup("HSE Toolbox Meeting", tb);
    renderPhotoGroup("HSE Activity Photo", ap);
  }

  return items;
}

// ── 6. Resources Status ────────────────────────────────────────────────────────
function buildResources(data: MasterWeeklyReport): any[] {
  const items: any[] = [secBanner("6.  RESOURCES STATUS")];
  const DAY_LABELS = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
  const DAY_KEYS = ["fri", "sat", "sun", "mon", "tue", "wed", "thu"] as const;
  const fSize = 9;
  const mp = data.aggregated.manpower;
  const resources = data.aggregated.resources;

  const getDay = (dates: any, key: string): string => {
    if (!dates) return "";
    const v = dates[key];
    return v === 0 ? "0" : v ? String(v) : "";
  };

  // ── 6.1 Manpower Status ──────────────────────────────────────────────────────
  items.push(subHdr("6.1  Manpower Status", 0));

  if (resources?.manPower) {
    const mpHdr1: any[] = [
      { text: "Description", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "Daily Counts", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 7 },
      "", "", "", "", "",
      { text: "Prev\nWeek", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "This\nWeek", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "Up to\nThis Week", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
    ];
    const mpHdr2: any[] = [
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      ...DAY_LABELS.map(d => ({ text: d, bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" })),
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
    ];

    const buildMpGroup = (label: string, entries: ManPowerEntry[]): any[][] => {
      const rows: any[][] = [];
      rows.push([
        { text: label, bold: true, fontSize: fSize, fillColor: GRP_FILL, colSpan: 10, alignment: "left" },
        ...Array(9).fill(null),
      ]);
      entries.forEach((e, idx) => {
        rows.push([
          { text: `${idx + 1}. ${s(e.description)}`, fontSize: fSize },
          ...DAY_KEYS.map(k => ({ text: getDay(e.date, k), fontSize: fSize, alignment: "center" as const })),
          { text: s(e.prevWeek), fontSize: fSize, alignment: "center" as const },
          { text: s(e.thisWeek), fontSize: fSize, alignment: "center" as const },
          { text: s(e.accumulated), fontSize: fSize, alignment: "center" as const },
        ]);
      });
      return rows;
    };

    const mpRows: any[][] = [
      ...buildMpGroup("Management Team", resources.manPower.managementTeam ?? []),
      ...buildMpGroup("Working Team (Interior)", resources.manPower.workingTeamInterior ?? []),
      ...buildMpGroup("Working Team (MEP)", resources.manPower.workingTeamMEP ?? []),
      [
        { text: "Grand Total", bold: true, fontSize: fSize, fillColor: TOTAL_FILL },
        ...Array(7).fill({ text: "", fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const }),
        { text: "", bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
        { text: "", bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
        { text: String(mp?.grandTotal ?? 0), bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
      ],
    ];

    items.push({
      table: { widths: ["*", 26, 26, 26, 26, 26, 26, 26, 44, 44, 52], body: [mpHdr1, mpHdr2, ...mpRows] },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
      margin: [0, 0, 0, 10],
    });
  } else {
    // Fallback: aggregated summary only
    const hdr1: any[] = [
      { text: "Team", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "Daily Counts", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 7 },
      "", "", "", "", "",
      { text: "Total", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
    ];
    const hdr2: any[] = [
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      ...DAY_LABELS.map(d => ({ text: d, bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" })),
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
    ];
    const teamRows: any[][] = [
      [{ text: "Management", bold: true, fontSize: fSize, fillColor: GRP_FILL }, ...DAY_KEYS.map(k => ({ text: getDay(mp?.managementDates, k), fontSize: fSize, alignment: "center" as const })), { text: String(mp?.managementTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: GRP_FILL }],
      [{ text: "Working (Interior)", bold: true, fontSize: fSize, fillColor: GRP_FILL }, ...DAY_KEYS.map(k => ({ text: getDay(mp?.workingInteriorDates, k), fontSize: fSize, alignment: "center" as const })), { text: String(mp?.workingInteriorTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: GRP_FILL }],
      [{ text: "Working (MEP)", bold: true, fontSize: fSize, fillColor: GRP_FILL }, ...DAY_KEYS.map(k => ({ text: getDay(mp?.workingMEPDates, k), fontSize: fSize, alignment: "center" as const })), { text: String(mp?.workingMEPTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: GRP_FILL }],
      [{ text: "Grand Total", bold: true, fontSize: fSize, fillColor: TOTAL_FILL }, ...DAY_KEYS.map(() => ({ text: "", fontSize: fSize, alignment: "center" as const, fillColor: TOTAL_FILL })), { text: String(mp?.grandTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: TOTAL_FILL }],
    ];
    items.push({
      table: { widths: ["*", 30, 30, 30, 30, 30, 30, 30, 50], body: [hdr1, hdr2, ...teamRows] },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
      margin: [0, 0, 0, 10],
    });
  }

  // ── 6.2 Material Delivery Status ─────────────────────────────────────────────
  items.push(subHdr("6.2  Material Delivery Status"));

  const matEntries: MaterialEntry[] = (resources?.material ?? (data.aggregated as any).materials ?? []) as MaterialEntry[];

  if (matEntries.length > 0) {
    const matHdr1: any[] = [
      { text: "Description", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "Daily Counts", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 7 },
      "", "", "", "", "",
      { text: "Previous", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "This\nPeriod", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "Accumulate", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
    ];
    const matHdr2: any[] = [
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      ...DAY_LABELS.map(d => ({ text: d, bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" })),
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
    ];

    let prevTotal = 0, thisTotal = 0, accumTotal = 0;
    const matDataRows = matEntries.map(e => {
      prevTotal += e.prevWeek ?? 0;
      thisTotal += e.thisWeek ?? 0;
      accumTotal += e.accumulated ?? 0;
      const desc = e.unit ? `${s(e.description)} (${s(e.unit)})` : s(e.description);
      return [
        { text: desc, fontSize: fSize },
        ...DAY_KEYS.map(k => ({ text: getDay(e.date, k), fontSize: fSize, alignment: "center" as const })),
        { text: s(e.prevWeek), fontSize: fSize, alignment: "center" as const },
        { text: s(e.thisWeek), fontSize: fSize, alignment: "center" as const },
        { text: s(e.accumulated), fontSize: fSize, alignment: "center" as const },
      ];
    });
    matDataRows.push([
      { text: "Total", bold: true, fontSize: fSize, fillColor: TOTAL_FILL },
      ...Array(7).fill({ text: "", fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const }),
      { text: String(prevTotal), bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
      { text: String(thisTotal), bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
      { text: String(accumTotal), bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
    ]);
    items.push({
      table: { widths: ["*", 26, 26, 26, 26, 26, 26, 26, 44, 44, 52], body: [matHdr1, matHdr2, ...matDataRows] },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
      margin: [0, 0, 0, 10],
    });
  } else {
    items.push(mkTable(
      [
        { text: "Description", w: "*" },
        { text: "Fri", w: 26 }, { text: "Sat", w: 26 }, { text: "Sun", w: 26 },
        { text: "Mon", w: 26 }, { text: "Tue", w: 26 }, { text: "Wed", w: 26 }, { text: "Thu", w: 26 },
        { text: "Previous", w: 44 },
        { text: "This Period", w: 44 },
        { text: "Accumulate", w: 52 },
      ],
      [[{ text: "No material data available.", colSpan: 11, align: "center" as const }, ...Array(10).fill(null)]],
      { hFill: SEC_FILL, altRows: false },
    ));
  }

  // ── 6.3 Machinery / Equipment Status ─────────────────────────────────────────
  items.push(subHdr("6.3  Machinery / Equipment Status"));

  const eqEntries: MachineryEntry[] = (resources?.machinery ?? (data.aggregated as any).machinery ?? []) as MachineryEntry[];

  if (eqEntries.length > 0) {
    const eqHdr1: any[] = [
      { text: "Description", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "Daily Counts", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 7 },
      "", "", "", "", "",
      { text: "Previous", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "This\nPeriod", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
      { text: "Accumulate", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
    ];
    const eqHdr2: any[] = [
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      ...DAY_LABELS.map(d => ({ text: d, bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" })),
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
      { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL },
    ];

    let eqPrevTotal = 0, eqThisTotal = 0, eqAccumTotal = 0;
    const eqDataRows = eqEntries.map(e => {
      eqPrevTotal += e.prevWeek ?? 0;
      eqThisTotal += e.thisWeek ?? 0;
      eqAccumTotal += e.accumulated ?? 0;
      return [
        { text: s(e.description), fontSize: fSize },
        ...DAY_KEYS.map(k => ({ text: getDay(e.date, k), fontSize: fSize, alignment: "center" as const })),
        { text: s(e.prevWeek), fontSize: fSize, alignment: "center" as const },
        { text: s(e.thisWeek), fontSize: fSize, alignment: "center" as const },
        { text: s(e.accumulated), fontSize: fSize, alignment: "center" as const },
      ];
    });
    eqDataRows.push([
      { text: "Total", bold: true, fontSize: fSize, fillColor: TOTAL_FILL },
      ...Array(7).fill({ text: "", fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const }),
      { text: String(eqPrevTotal), bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
      { text: String(eqThisTotal), bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
      { text: String(eqAccumTotal), bold: true, fontSize: fSize, fillColor: TOTAL_FILL, alignment: "center" as const },
    ]);
    items.push({
      table: { widths: ["*", 26, 26, 26, 26, 26, 26, 26, 44, 44, 52], body: [eqHdr1, eqHdr2, ...eqDataRows] },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
      margin: [0, 0, 0, 10],
    });
  } else {
    items.push(mkTable(
      [
        { text: "Description", w: "*" },
        { text: "Fri", w: 26 }, { text: "Sat", w: 26 }, { text: "Sun", w: 26 },
        { text: "Mon", w: 26 }, { text: "Tue", w: 26 }, { text: "Wed", w: 26 }, { text: "Thu", w: 26 },
        { text: "Previous", w: 44 },
        { text: "This Period", w: 44 },
        { text: "Accumulate", w: 52 },
      ],
      [[{ text: "No equipment data available.", colSpan: 11, align: "center" as const }, ...Array(10).fill(null)]],
      { hFill: SEC_FILL, altRows: false },
    ));
  }

  return items;
}

// ── 7. Site Photos ─────────────────────────────────────────────────────────────
function buildSitePhotos(data: MasterWeeklyReport, sitePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("7.  SITE PHOTOS")];

  const resolveImage = (img: string | undefined): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith("data:")) return img;
    return sitePhotos.get(img) || img;
  };

  const SP_IMG_W = 228, SP_IMG_H = 150, SP_ROW_H = 154, SP_CAP_H = 18;

  const makeSpImgCell = (slot: { img?: string; desc: string } | undefined): any => {
    if (!slot) return { text: "", fillColor: "#FFFFFF" };
    const resolvedImg = resolveImage(slot.img);
    return resolvedImg
      ? { stack: [{ image: resolvedImg, fit: [SP_IMG_W, SP_IMG_H], alignment: "center" as const }], margin: [2, 2, 2, 2], alignment: "center" as const }
      : { text: "", margin: [0, 70, 0, 70] };
  };

  const makeSpCapCell = (slot: { img?: string; desc: string } | undefined): any => ({
    text: slot?.desc || "",
    style: "photoCaption",
    alignment: "center" as const,
    fontSize: 9,
    margin: [2, 3, 2, 3],
  });

  const createProjectBanner = (title: string): any => ({
    table: {
      widths: ["*"],
      body: [[{ text: title, bold: true, fontSize: 12, fillColor: SEC_FILL, alignment: "center" as const, margin: [0, 5, 0, 5] }]],
    },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
    margin: [0, 8, 0, 0],
  });

  const photosRecord = data.aggregated.photos ?? {};
  const projectNames = Object.keys(photosRecord);

  if (projectNames.length === 0) {
    items.push({ text: "No site photos available.", style: "bodyText" });
    return items;
  }

  projectNames.forEach((projName, projIdx) => {
    const locations = photosRecord[projName] ?? [];
    const flat: { img?: string; desc: string }[] = [];
    locations.forEach(loc => {
      (loc.entries ?? []).forEach(entry => {
        (entry.slots ?? []).forEach(slot => {
          flat.push({ img: slot.image, desc: slot.caption ?? "" });
        });
      });
    });
    if (!flat.length) return;

    const isLastProject = projIdx === projectNames.length - 1;
    for (let pi = 0; pi < flat.length; pi += 8) {
      if (pi === 0) items.push(createProjectBanner(projName));
      const pageSlots = flat.slice(pi, pi + 8);
      const numRows = Math.ceil(pageSlots.length / 2);
      const tableBody: any[][] = [];
      const heights: number[] = [];
      for (let row = 0; row < numRows; row++) {
        const L = pageSlots[row * 2];
        const R = pageSlots[row * 2 + 1];
        tableBody.push([makeSpImgCell(L), makeSpImgCell(R)]);
        tableBody.push([makeSpCapCell(L), makeSpCapCell(R)]);
        heights.push(SP_ROW_H, SP_CAP_H);
      }
      const isLastChunk = pi + 8 >= flat.length;
      const tableObj: any = {
        table: { widths: ["*", "*"], heights, body: tableBody },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
        margin: [0, 0, 0, 0],
      };
      if (!isLastChunk || !isLastProject) tableObj.pageBreak = "after";
      items.push(tableObj);
    }
  });

  return items;
}

// ── 8. Construction Issues ────────────────────────────────────────────────────
function buildIssues(data: MasterWeeklyReport, issuePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("8.  CONSTRUCTION ISSUES")];

  const resolveImage = (img: string | undefined): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith("data:")) return img;
    return issuePhotos.get(img) || img;
  };

  items.push({
    table: {
      widths: ["*"],
      body: [[{ text: "Construction Issue", bold: true, fontSize: 12, fillColor: SEC_FILL, alignment: "center", margin: [0, 6, 0, 6] }]],
    },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
    margin: [0, 0, 0, 0],
  });

  const issues = data.aggregated.issues ?? [];
  const issueRows = issues.map((iss, i) => [
    { text: s(iss.no ?? i + 1), align: "center" as const },
    { text: s(iss.projectSource), align: "left" as const },
    { text: s(iss.location), align: "left" as const },
    { text: s(iss.problem), align: "left" as const },
    { text: s(iss.actionBy), align: "left" as const },
  ]);

  items.push(mkTable(
    [
      { text: "No.", w: 30 },
      { text: "Project", w: 100 },
      { text: "Location", w: 80 },
      { text: "Problem", w: "*" },
      { text: "Action By", w: 80 },
    ],
    issueRows.length ? issueRows : [[
      { text: "No construction issues.", colSpan: 5, align: "center" as const },
      null, null, null, null,
    ]],
    { hFill: SEC_FILL, altRows: true },
  ));

  const allSlots = issues.filter(iss =>
    iss.problem?.trim() || iss.location?.trim() || iss.photo?.trim() || iss.actionBy?.trim()
  );

  const tableBody: any[][] = [];
  allSlots.forEach((issue, i) => {
    const issueNum = issue?.no ?? (i + 1);
    tableBody.push([{ text: String(issueNum), bold: true, fontSize: 11, decoration: "underline", alignment: "left", margin: [4, 4, 4, 4], colSpan: 2 }, null]);
    tableBody.push([
      {
        text: [
          { text: "Project: ", bold: true }, { text: s(issue?.projectSource) },
          { text: "   Site Location: ", bold: true }, { text: s(issue?.location) },
        ],
        fontSize: 10, alignment: "left", margin: [4, 4, 4, 4],
      },
      { text: "Photo Reference", fontSize: 10, alignment: "center", margin: [4, 4, 4, 4] },
    ]);
    const resolvedPhoto = resolveImage(issue?.photo);
    const photoCell = resolvedPhoto
      ? { image: resolvedPhoto, fit: [320, 180], alignment: "center" as const }
      : { text: "", alignment: "center" as const, margin: [0, 85, 0, 85] };
    tableBody.push([
      { stack: [{ text: "Problems / Descriptions:", fontSize: 10, margin: [0, 0, 0, 6] }, { text: s(issue?.problem ?? ""), fontSize: 10, alignment: "left" }], margin: [4, 4, 4, 4] },
      { stack: [photoCell], margin: [4, 4, 4, 4], alignment: "center" },
    ]);
    tableBody.push([
      { text: `Action by: ${s(issue?.actionBy ?? "")}`, fontSize: 10, alignment: "left", margin: [4, 4, 4, 4] },
      { text: "", margin: [4, 4, 4, 4] },
    ]);
  });

  if (tableBody.length > 0) {
    items.push({
      table: { widths: ["*", "*"], body: tableBody },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
      margin: [0, 8, 0, 0],
    });
  }

  return items;
}

// ── 9. Master Schedule ────────────────────────────────────────────────────────
function buildMasterSchedule(scheduleImages: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("9.  MASTER SCHEDULE")];

  if (scheduleImages.size === 0) {
    items.push({ text: "No master schedule images available.", style: "bodyText" });
    return items;
  }

  const createPhotoBox = (url: string, caption: string): any => {
    const resolvedImg = scheduleImages.get(url) || (url.startsWith("data:") ? url : undefined);
    const photoCell = resolvedImg
      ? { stack: [{ image: resolvedImg, fit: [490, 320], alignment: "center" as const }], margin: [2, 2, 2, 2], alignment: "center" as const }
      : { text: "", margin: [0, 80, 0, 80] };
    return {
      table: {
        widths: ["*"],
        body: [
          [photoCell],
          [{ text: caption || "", style: "photoCaption", alignment: "center" as const, fontSize: 9, margin: [2, 3, 2, 3] }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#000000", vLineColor: () => "#000000" },
      margin: [0, 0, 0, 8],
    };
  };

  Array.from(scheduleImages.entries()).forEach(([url, _]) => {
    items.push(createPhotoBox(url, ""));
  });

  return items;
}

// ── Load all images ────────────────────────────────────────────────────────────
async function loadAllImages(data: MasterWeeklyReport): Promise<{
  companyLogo?: string;
  clientLogo?: string;
  signatureImage?: string;
  coverImage?: string;
  sitePhotos: Map<string, string | undefined>;
  issuePhotos: Map<string, string | undefined>;
  hsePhotos: Map<string, string | undefined>;
  scheduleImages: Map<string, string | undefined>;
}> {
  const rpt0 = data.reports[0];
  const clientLogoUrl = rpt0?.cover?.clientLogo ?? '/koica_logo.png';
  const sigUrl = rpt0?.letter?.signatureImage;
  const coverImgUrl = data.availableCoverImages?.[0]?.coverImage || rpt0?.cover?.coverImage || rpt0?.introduction?.coverImage;

  const [companyLogo, clientLogo, signatureImage, coverImage] = await Promise.all([
    loadImg("/cacpm_logo.png"),
    loadImg(clientLogoUrl),
    loadImg(sigUrl),
    loadImg(coverImgUrl),
  ]);

  // Site photos
  const sitePhotoUrls = new Set<string>();
  const photosRecord = data.aggregated.photos ?? {};
  Object.values(photosRecord).forEach(locations => {
    locations.forEach(loc => {
      loc.entries.forEach(entry => {
        entry.slots.forEach(slot => {
          if (slot.image && !slot.image.startsWith("data:")) sitePhotoUrls.add(slot.image);
        });
      });
    });
  });
  const sitePhotos = new Map<string, string | undefined>();
  await Promise.all(Array.from(sitePhotoUrls).map(async url => {
    sitePhotos.set(url, await loadImg(url));
  }));

  // Issue photos
  const issuePhotoUrls = new Set<string>();
  (data.aggregated.issues ?? []).forEach(iss => {
    if (iss.photo && !iss.photo.startsWith("data:")) issuePhotoUrls.add(iss.photo);
  });
  const issuePhotos = new Map<string, string | undefined>();
  await Promise.all(Array.from(issuePhotoUrls).map(async url => {
    issuePhotos.set(url, await loadImg(url));
  }));

  // HSE photos
  const hsePhotoUrls = new Set<string>();
  const hsePhotoRefs = data.aggregated.hses?.hsePhotoReferences;
  [...(hsePhotoRefs?.hseToolboxMeeting ?? []), ...(hsePhotoRefs?.hseActivityPhotos ?? [])].forEach(section => {
    (section.entries ?? []).forEach((entry: any) => {
      (entry.slots ?? []).forEach((slot: any) => {
        if (slot.image && !slot.image.startsWith("data:")) hsePhotoUrls.add(slot.image);
      });
    });
  });
  const hsePhotos = new Map<string, string | undefined>();
  await Promise.all(Array.from(hsePhotoUrls).map(async url => {
    hsePhotos.set(url, await loadImg(url));
  }));

  // Schedule images (per-project, from cover images used as schedule placeholders)
  const scheduleImageUrls = new Set<string>();
  data.reports.forEach(r => {
    const ci = r.cover?.coverImage ?? r.introduction?.coverImage;
    if (ci && !ci.startsWith("data:")) scheduleImageUrls.add(ci);
  });
  const scheduleImages = new Map<string, string | undefined>();
  await Promise.all(Array.from(scheduleImageUrls).map(async url => {
    scheduleImages.set(url, await loadImg(url));
  }));

  return { companyLogo, clientLogo, signatureImage, coverImage, sitePhotos, issuePhotos, hsePhotos, scheduleImages };
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function exportMasterToPdf(
  data: MasterWeeklyReport,
  filename = "MasterWeeklyReport.pdf",
  mode: 'download' | 'preview' = 'download',
): Promise<void> {
  const { companyLogo, clientLogo, signatureImage, coverImage, sitePhotos, issuePhotos, hsePhotos, scheduleImages } =
    await loadAllImages(data);

  const content: any[] = [
    ...buildCover(data, companyLogo, clientLogo, coverImage),
    pb(),
    ...buildLetter(data, signatureImage),
    pb(),
    ...buildTOC(),
    pb(),
    ...buildIntro(data, coverImage),
    pb(),
    ...buildOP(data),
    pb(),
    ...buildActivities(data),
    ...buildQAQC(data),
    pb(),
    ...buildHSES(data, hsePhotos),
    pb(),
    ...buildResources(data),
    pb(),
    ...buildSitePhotos(data, sitePhotos),
    pb(),
    ...buildIssues(data, issuePhotos),
    pb(),
    ...buildMasterSchedule(scheduleImages),
  ];

  const docDefinition: any = {
    pageSize: { width: 617.28, height: 786.89 },
    pageMargins: [50, 50, 50, 50],
    info: { title: filename },
    content,
    styles: {
      // Cover
      coverTitleBanner: { fontSize: 16, bold: true, color: "#FFFFFF", alignment: "center" },
      coverWeek: { fontSize: 14, bold: true, color: "#000000", alignment: "center" },
      coverDateRange: { fontSize: 10, bold: true, color: "#000000", alignment: "center" },
      coverProjectTitle: { fontSize: 14, bold: true, italics: true, alignment: "center", margin: [0, 2, 0, 2] },
      coverPlaceholder: { fontSize: 12, italics: true, color: "#FFFFFF", alignment: "center", margin: [0, 80, 0, 80] },
      partyLabel: { fontSize: 12, bold: true, color: "#000000", alignment: "left" },
      partyValue: { fontSize: 12, bold: true, alignment: "left" },
      // Page chrome
      pageHdrLeft: { fontSize: 9, bold: true, color: "#1F2937" },
      pageHdrRight: { fontSize: 9, color: "#4B5563" },
      pageFooter: { fontSize: 8, color: "#6B7280" },
      // Section chrome
      secBanner: { fontSize: 12, bold: true, color: "#000000", margin: [5, 5, 5, 5] },
      subHdr: { fontSize: 10, bold: true, color: "#000000" },
      // Letter
      ltBanner: { fontSize: 17, bold: true, color: "#FFFFFF", margin: [0, -2, 0, -2] },
      ltLabel: { fontSize: 11, bold: true },
      ltBold: { fontSize: 11, bold: true },
      ltValue: { fontSize: 11 },
      ltBody: { fontSize: 11, lineHeight: 1.4 },
      sigLine: { fontSize: 11, color: "#000000" },
      sigContact: { fontSize: 11, color: "#000000" },
      sigPlaceholder: { fontSize: 9, color: "#9CA3AF", italics: true, alignment: "center" },
      // TOC
      tocMajor: { fontSize: 11, color: "#000000" },
      tocSub: { fontSize: 11, color: "#000000" },
      // Tables
      tblHdr: { fontSize: 9, bold: true, color: "#000000", margin: [2, 3, 2, 3] },
      tblCell: { fontSize: 9, margin: [2, 2, 2, 2] },
      qaqcSubTitle: { fontSize: 10, margin: [4, 4, 4, 4] },
      // Body
      bodyText: { fontSize: 10, lineHeight: 1.35 },
      // Photos
      photoLocBanner: { fontSize: 11, bold: true, alignment: "center", margin: [4, 4, 4, 4] },
      photoSecTitle: { fontSize: 10, bold: true },
      photoCaption: { fontSize: 9, color: "#4B5563" },
    },
    defaultStyle: { font: "Roboto" },
  };

  if (mode === 'preview') {
    pdfMake.createPdf(docDefinition).open();
  } else {
    pdfMake.createPdf(docDefinition).download(filename);
  }
}
