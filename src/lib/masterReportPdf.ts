import * as pdfMakeModule from "pdfmake/build/pdfmake";
import * as pdfFontsModule from "pdfmake/build/vfs_fonts";
import type { MasterWeeklyReport, MasterQaqcItem, MasterHsesTraining, MasterHsesInspection, MasterHsesPermit } from "@/types/masterReport.types";

const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
const pdfFonts: any = (pdfFontsModule as any).default ?? pdfFontsModule;
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

// ── Helpers ────────────────────────────────────────────────────────────────────
const s = (v?: string | number | null): string =>
  v === undefined || v === null ? "" : String(v);

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
const SEC_FILL   = "#9BC2E6";
const TBL_HDR    = "#A6A6A6";
const TBL_ALT    = "#F2F2F2";
const GRP_FILL   = "#D9E1F2";
const TOTAL_FILL = "#E2EFDA";
const LOC_FILL   = "#D6DCE4";
const LTR_FILL   = "#2F75B5";
const QAQC_FILL  = "#DCE6F1";

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

const mkTable = (
  headers: { text: string; w?: any; align?: string; colSpan?: number }[],
  rows: Array<Array<{ text: string; align?: string; fill?: string; bold?: boolean; colSpan?: number; margin?: number[] } | null>>,
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

// ── QAQC definitions (matching weeklyreportpdf.ts exactly) ────────────────────
const QAQC_DEFS = [
  { id: "4.1",  title: "Non-Conformity Report (NCR)",             key: "ncr",  col3: "Status",        col4: "Date Responded"  },
  { id: "4.2",  title: "Corrective Action Request (CAR)",          key: "car",  col3: "Status",        col4: "Date Responded"  },
  { id: "4.3",  title: "Safety Corrective Action Request (SCAR)",  key: "scar", col3: "Status",        col4: "Date Responded"  },
  { id: "4.4",  title: "PM Site Instruction (SI)",                 key: "pmsi", col3: "Status",        col4: "Date Responded"  },
  { id: "4.5",  title: "Client Site Instruction (SI)",             key: "csi",  col3: "Issued By",     col4: "Issued Date"     },
  { id: "4.6",  title: "Inspection Request (IR)",                  key: "ir",   col3: "Received Date", col4: "Inspection Date" },
  { id: "4.7",  title: "Material for Approval (MFA)",              key: "mfa",  col3: "Status",        col4: "Date Responded"  },
  { id: "4.8",  title: "Request for Information (RFI)",            key: "rfi",  col3: "Status",        col4: "Date Responded"  },
  { id: "4.9",  title: "Request for Approval (RFA)",               key: "rfa",  col3: "Status",        col4: "Date Responded"  },
  { id: "4.10", title: "Field Change Request (FCR)",               key: "fcr",  col3: "Status",        col4: "Date Responded"  },
  { id: "4.11", title: "Variation Order (VO)",                     key: "vo",   col3: "Status",        col4: "Date Responded"  },
  { id: "4.12", title: "Transmittal (TR)",                         key: "tr",   col3: "Status",        col4: "Date Responded"  },
  { id: "4.13", title: "Material Inspection Approval (MIR)",       key: "mir",  col3: "Status",        col4: "Date Responded"  },
];

// ── SECTION BUILDERS ───────────────────────────────────────────────────────────

// ── 1. Cover page ─────────────────────────────────────────────────────────────
function buildCover(data: MasterWeeklyReport, companyLogo?: string): any[] {
  const projectCount   = data.reports.length;
  const weightedPct    = (data.aggregated.progress?.weighted ?? 0).toFixed(1) + "%";
  const grandTotal     = data.aggregated.manpower?.grandTotal ?? 0;
  const folderName     = s(data.folder?.name);
  const weekNum        = s(data.weekNumber);

  return [
    {
      table: {
        widths: [10, 6, "*"],
        body: [
          [
            {
              text: "",
              fillColor: "#16365C",
              border: [false, false, false, false],
              rowSpan: 3,
            },
            {
              text: "",
              fillColor: "#FFFFFF",
              border: [false, false, false, false],
              rowSpan: 3,
            },
            {
              stack: [
                {
                  columns: [
                    { width: 120, stack: companyLogo ? [{ image: companyLogo, width: 90 }] : [] },
                    { width: "*", text: "" },
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
                      margin: [0, 0, 0, 0],
                    }]],
                  },
                  layout: { defaultBorder: false },
                  margin: [0, 60, 0, 12],
                },
                { text: `Week - ${weekNum}`, style: "coverWeek" },
                {
                  table: {
                    widths: [120, 12, "*"],
                    body: [
                      [{ text: "Folder",            style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: folderName,                       style: "partyValue" }],
                      [{ text: "Week",              style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: weekNum,                          style: "partyValue" }],
                      [{ text: "Projects",          style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: String(projectCount),             style: "partyValue" }],
                      [{ text: "Weighted Progress", style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: weightedPct,                      style: "partyValue" }],
                      [{ text: "Grand Total MP",    style: "partyLabel" }, { text: ":", style: "partyLabel" }, { text: String(grandTotal) + " persons",  style: "partyValue" }],
                    ],
                  },
                  layout: { defaultBorder: false },
                  margin: [0, 40, 0, 0],
                },
              ],
              margin: [14, 14, 14, 14],
            },
          ],
          [{}, {}, {
            stack: data.reports.map(r => ({
              text: `• ${s(r.projectName)}   [${(r.progress ?? 0).toFixed(1)}%]`,
              style: "bodyText",
              margin: [14, 1, 14, 1],
            })),
            margin: [14, 10, 14, 10],
          }],
          [{}, {}, { text: "", margin: [0, 20, 0, 0] }],
        ],
      },
      layout: { defaultBorder: false },
    },
  ];
}

// ── 2. Project Summaries ───────────────────────────────────────────────────────
function buildProjectSummaries(data: MasterWeeklyReport): any[] {
  const items: any[] = [secBanner("1.  PROJECT SUMMARIES")];

  const rows = data.reports.map((r, i) => [
    { text: String(i + 1),              align: "center" as const },
    { text: s(r.projectName),           align: "left"   as const },
    { text: s(r.status),                align: "center" as const },
    { text: (r.progress ?? 0).toFixed(1) + "%", align: "center" as const },
    { text: String(r.activityCount ?? 0), align: "center" as const },
    { text: String(r.issueCount ?? 0),    align: "center" as const },
  ]);

  items.push(mkTable(
    [
      { text: "No.",          w: 30  },
      { text: "Project Name", w: "*" },
      { text: "Status",       w: 70  },
      { text: "Progress %",   w: 60  },
      { text: "Activities",   w: 55  },
      { text: "Issues",       w: 45  },
    ],
    rows.length ? rows : [[
      { text: "No project data.", colSpan: 6, align: "center" as const },
      null, null, null, null, null,
    ]],
    { hFill: SEC_FILL, altRows: true },
  ));

  // Weighted average callout
  const weighted = (data.aggregated.progress?.weighted ?? 0).toFixed(1);
  items.push({
    table: {
      widths: ["*"],
      body: [[{
        text: [
          { text: "Weighted Average Progress: ", bold: true, fontSize: 11 },
          { text: weighted + "%", bold: true, fontSize: 14, color: "#002060" },
        ],
        fillColor: TOTAL_FILL,
        alignment: "center",
        margin: [0, 8, 0, 8],
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

  return items;
}

// ── 3. Activities / Next Week Plan ────────────────────────────────────────────
function buildActivities(data: MasterWeeklyReport): any[] {
  const items: any[] = [secBanner("2.  ACTIVITIES OF WORK DONE / NEXT WEEK PLAN")];

  const weeklyActs  = data.aggregated.activities?.weeklyActivities ?? [];
  const nextWeekActs = data.aggregated.activities?.nextWeekPlan ?? [];
  const fSize = 9;

  // Build side-by-side NWDP style table grouped by project
  const headerRow: any[] = [
    { text: "Activities of Work Done", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 2 },
    {},
    { text: "Next Week Plan", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 2 },
    {},
  ];

  // Group activities by project
  const projectNames = Array.from(new Set([
    ...weeklyActs.map(a => a.projectSource),
    ...nextWeekActs.map(a => a.projectSource),
  ]));

  const dataRows: any[][] = [];

  if (projectNames.length === 0) {
    dataRows.push([
      { text: "No activity data available.", colSpan: 4, alignment: "center" as const, style: "tblCell", fontSize: fSize },
      {}, {}, {},
    ]);
  } else {
    projectNames.forEach(proj => {
      // Project group header row
      dataRows.push([
        {
          text: proj,
          bold: true,
          fontSize: fSize,
          fillColor: GRP_FILL,
          colSpan: 4,
          alignment: "left",
          margin: [4, 3, 4, 3],
        },
        {}, {}, {},
      ]);

      const projWeekly   = weeklyActs.filter(a => a.projectSource === proj);
      const projNextWeek = nextWeekActs.filter(a => a.projectSource === proj);
      const maxLen = Math.max(projWeekly.length, projNextWeek.length, 1);

      for (let i = 0; i < maxLen; i++) {
        const wa = projWeekly[i];
        const nw = projNextWeek[i];
        const waPct = wa ? (wa.percent ?? (wa.percentage ? parseFloat(wa.percentage) : 0)) : 0;
        const nwPct = nw ? (nw.percent ?? (nw.percentage ? parseFloat(nw.percentage) : 0)) : 0;

        dataRows.push([
          {
            text: wa ? s(wa.description) : "",
            style: "tblCell",
            fontSize: fSize,
            alignment: "left",
            margin: [4, 2, 2, 2],
          },
          {
            text: wa ? waPct.toFixed(1) + "%" : "",
            style: "tblCell",
            fontSize: fSize,
            alignment: "center",
          },
          {
            text: nw ? s(nw.description) : "",
            style: "tblCell",
            fontSize: fSize,
            alignment: "left",
            margin: [4, 2, 2, 2],
          },
          {
            text: nw ? nwPct.toFixed(1) + "%" : "",
            style: "tblCell",
            fontSize: fSize,
            alignment: "center",
          },
        ]);
      }
    });
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

// ── 4. Construction Issues ─────────────────────────────────────────────────────
function buildIssues(data: MasterWeeklyReport, issuePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("3.  CONSTRUCTION ISSUES")];

  const resolveImage = (img: string | undefined): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith("data:")) return img;
    return issuePhotos.get(img) || img;
  };

  // Inner banner
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

  // Issues summary table
  const issues = data.aggregated.issues ?? [];
  const issueRows = issues.map((iss, i) => [
    { text: s(iss.no ?? i + 1),      align: "center" as const },
    { text: s(iss.projectSource),    align: "left"   as const },
    { text: s(iss.location),         align: "left"   as const },
    { text: s(iss.problem),          align: "left"   as const },
    { text: s(iss.actionBy),         align: "left"   as const },
  ]);

  items.push(mkTable(
    [
      { text: "No.",       w: 30  },
      { text: "Project",   w: 100 },
      { text: "Location",  w: 80  },
      { text: "Problem",   w: "*" },
      { text: "Action By", w: 80  },
    ],
    issueRows.length ? issueRows : [[
      { text: "No construction issues.", colSpan: 5, align: "center" as const },
      null, null, null, null,
    ]],
    { hFill: SEC_FILL, altRows: true },
  ));

  // Issue boxes (like weekly report) for issues with photos
  const issuesToRender = issues.slice(0, 4);
  const emptySlotsNeeded = Math.max(0, 4 - issuesToRender.length);
  const allIssueSlots: any[] = [
    ...issuesToRender,
    ...Array(emptySlotsNeeded).fill(null).map((_, i) => ({ no: issuesToRender.length + i + 1 })),
  ];

  const tableBody: any[][] = [];

  allIssueSlots.forEach((issue, i) => {
    const issueNum = issue?.no ?? (i + 1);

    tableBody.push([
      {
        text: String(issueNum),
        bold: true,
        fontSize: 11,
        decoration: "underline",
        alignment: "left",
        margin: [4, 4, 4, 4],
        colSpan: 2,
      },
      null,
    ]);

    tableBody.push([
      {
        text: [
          { text: "Project: ", bold: true },
          { text: s(issue?.projectSource) },
          { text: "   Site Location: ", bold: true },
          { text: s(issue?.location) },
        ],
        fontSize: 10,
        alignment: "left",
        margin: [4, 4, 4, 4],
      },
      { text: "Photo Reference", fontSize: 10, alignment: "center", margin: [4, 4, 4, 4] },
    ]);

    const resolvedPhoto = resolveImage(issue?.photo);
    const photoCell = resolvedPhoto
      ? { image: resolvedPhoto, fit: [240, 200], alignment: "center" as const }
      : { text: "", alignment: "center" as const, margin: [0, 100, 0, 100] };

    tableBody.push([
      {
        stack: [
          { text: "Problems / Descriptions:", fontSize: 10, margin: [0, 0, 0, 6] },
          { text: s(issue?.problem ?? ""), fontSize: 10, alignment: "left" },
        ],
        margin: [4, 4, 4, 4],
      },
      {
        stack: [photoCell],
        margin: [4, 4, 4, 4],
        alignment: "center",
      },
    ]);

    tableBody.push([
      { text: `Action by: ${s(issue?.actionBy ?? "")}`, fontSize: 10, alignment: "left", margin: [4, 4, 4, 4] },
      { text: "", margin: [4, 4, 4, 4] },
    ]);
  });

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
    margin: [0, 8, 0, 0],
  });

  return items;
}

// ── 5. QA/QC Status ───────────────────────────────────────────────────────────
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
        { text: s(it.code),                               align: "center" as const },
        { text: s(it.description ?? (it as any).comment), align: "left"   as const },
        { text: col3Val,                                  align: "center" as const },
        { text: col4Val,                                  align: "center" as const },
      ];
    });

    const emptyRowsNeeded = Math.max(0, 5 - qRows.length);
    const emptyRows = Array(emptyRowsNeeded).fill(null).map(() => [
      { text: "", align: "center" as const },
      { text: "", align: "left"   as const },
      { text: "", align: "center" as const },
      { text: "", align: "center" as const },
    ]);

    const table = mkTable(
      [
        { text: "Code",        w: 125 },
        { text: "Description", w: 200 },
        { text: def.col3,      w: 75  },
        { text: def.col4,      w: 75  },
      ],
      [...qRows, ...emptyRows],
      { hFill: SEC_FILL, altRows: false },
    );

    const comments = sec?.comments ?? "";
    const commentsRow = {
      table: {
        widths: ["*"],
        body: [[{
          text: [
            { text: "Comments: ", bold: true, decoration: "underline" },
            { text: comments },
          ],
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

    items.push({
      stack: [subTitle, table, commentsRow],
      pageBreak: "avoid",
      margin: [0, 0, 0, 10],
    });
  });

  return items;
}

// ── 6. HSES ───────────────────────────────────────────────────────────────────
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
    { text: s(r.typeOfTraining)                },
    { text: s(r.date),    align: "center" as const },
    { text: s(r.venue)                         },
    { text: s(r.trainer)                       },
    { text: s(r.attendee), align: "center" as const },
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

  // 5.2 Inspection
  items.push(subHdr("5.2  HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool Checklist"));
  const inspectionRows = (hses?.inspection ?? []).map((r: MasterHsesInspection) => [
    { text: s(r.typeOfInspection)              },
    { text: s(r.date),    align: "center" as const },
    { text: s(r.inspector)                     },
    { text: s(r.remarks)                       },
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

  // 5.3 Permits
  items.push(subHdr("5.3  Permit to Work"));
  const permitRows = (hses?.permit ?? []).map((r: MasterHsesPermit) => [
    { text: s(r.typeOfPermit)                   },
    { text: s(r.startDate), align: "center" as const },
    { text: s(r.endDate),   align: "center" as const },
    { text: s(r.inspector)                      },
    { text: s(r.approver)                       },
    { text: s(r.remarks)                        },
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

  // 5.4 First Aid
  items.push(subHdr("5.4  First Aid / Accident / Incident / Near Miss / Fatalities (if Any)"));
  const firstAid = s(hses?.firstAidAccident ?? "");
  items.push({
    stack: [
      { text: firstAid || "", style: "bodyText" },
      {
        canvas: [{
          type: "line", x1: 0, y1: 0, x2: 515, y2: 0,
          lineColor: "#000000", lineWidth: 0.5, lineDash: [1, 1],
        }],
        margin: [0, 4, 0, 0],
      },
    ],
    margin: [0, 0, 0, 8],
  });

  // 5.5 Other Activities
  items.push(subHdr("5.5  Other HSES Activities Concerns"));
  const otherActs = s(hses?.otherActivities ?? "");
  items.push({
    stack: [
      { text: otherActs || "", style: "bodyText" },
      {
        canvas: [{
          type: "line", x1: 0, y1: 0, x2: 515, y2: 0,
          lineColor: "#000000", lineWidth: 0.5, lineDash: [1, 1],
        }],
        margin: [0, 4, 0, 0],
      },
    ],
    margin: [0, 0, 0, 8],
  });

  // 5.6 HSE Photo Reference
  const tb = hses?.hsePhotoReferences?.hseToolboxMeeting ?? [];
  const ap = hses?.hsePhotoReferences?.hseActivityPhotos ?? [];

  if (tb.length || ap.length) {
    items.push(subHdr("5.6  HSES Photo Reference"));

    const createPhotoBox = (img: string | undefined, desc: string): any => {
      const resolvedImg = resolveImage(img);
      const photoCell = resolvedImg
        ? {
            stack: [{ image: resolvedImg, fit: [230, 150], alignment: "center" as const }],
            margin: [2, 2, 2, 2],
            alignment: "center" as const,
            minHeight: 100,
          }
        : { text: "", margin: [0, 50, 0, 50] };

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
      margin: [0, 8, 0, 0],
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
      items.push(createPhotoHeader(headerText));
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
    };

    renderPhotoGroup("HSE Toolbox Meeting", tb);
    renderPhotoGroup("HSE Activity Photo", ap);
  }

  return items;
}

// ── 7. Manpower Summary ───────────────────────────────────────────────────────
function buildManpower(data: MasterWeeklyReport): any[] {
  const items: any[] = [secBanner("6.  MANPOWER SUMMARY")];
  const mp = data.aggregated.manpower;

  const DAY_LABELS = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
  const DAY_KEYS   = ["fri", "sat", "sun", "mon", "tue", "wed", "thu"] as const;
  const fSize = 9;

  // Build header
  const headerRow1: any[] = [
    { text: "Team",          bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
    { text: "Daily Counts",  bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center", colSpan: 7 },
    "", "", "", "", "",
    { text: "Total",         bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
  ];
  const headerRow2: any[] = [
    { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
    ...DAY_LABELS.map(d => ({ text: d, bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" })),
    { text: "", bold: true, fontSize: fSize, fillColor: SEC_FILL, alignment: "center" },
  ];

  const getDay = (dates: any, key: string): string => {
    if (!dates) return "";
    const v = dates[key];
    return v === 0 ? "0" : v ? String(v) : "";
  };

  const teamRows: any[][] = [
    [
      { text: "Management",        bold: true, fontSize: fSize, fillColor: GRP_FILL },
      ...DAY_KEYS.map(k => ({ text: getDay(mp?.managementDates, k), fontSize: fSize, alignment: "center" as const })),
      { text: String(mp?.managementTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: GRP_FILL },
    ],
    [
      { text: "Working (Interior)", bold: true, fontSize: fSize, fillColor: GRP_FILL },
      ...DAY_KEYS.map(k => ({ text: getDay(mp?.workingInteriorDates, k), fontSize: fSize, alignment: "center" as const })),
      { text: String(mp?.workingInteriorTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: GRP_FILL },
    ],
    [
      { text: "Working (MEP)",      bold: true, fontSize: fSize, fillColor: GRP_FILL },
      ...DAY_KEYS.map(k => ({ text: getDay(mp?.workingMEPDates, k), fontSize: fSize, alignment: "center" as const })),
      { text: String(mp?.workingMEPTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: GRP_FILL },
    ],
    [
      { text: "Grand Total",        bold: true, fontSize: fSize, fillColor: TOTAL_FILL },
      ...DAY_KEYS.map(() => ({ text: "", fontSize: fSize, alignment: "center" as const, fillColor: TOTAL_FILL })),
      { text: String(mp?.grandTotal ?? 0), bold: true, fontSize: fSize, alignment: "center" as const, fillColor: TOTAL_FILL },
    ],
  ];

  items.push({
    table: {
      widths: ["*", 30, 30, 30, 30, 30, 30, 30, 50],
      body: [headerRow1, headerRow2, ...teamRows],
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

// ── 8. Site Photos ─────────────────────────────────────────────────────────────
function buildSitePhotos(data: MasterWeeklyReport, sitePhotos: Map<string, string | undefined>): any[] {
  const items: any[] = [secBanner("7.  SITE PHOTOS")];

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
      : { text: "", margin: [0, 50, 0, 50] };

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

  const createProjectBanner = (title: string): any => ({
    table: {
      widths: ["*"],
      body: [[{
        text: title,
        bold: true,
        fontSize: 12,
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
    margin: [0, 8, 0, 0],
  });

  const createLocationBanner = (title: string): any => ({
    table: {
      widths: ["*"],
      body: [[{
        text: title,
        bold: true,
        fontSize: 11,
        fillColor: LOC_FILL,
        alignment: "center" as const,
        margin: [0, 4, 0, 4],
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

  const photosRecord = data.aggregated.photos ?? {};
  const projectNames = Object.keys(photosRecord);

  if (projectNames.length === 0) {
    items.push({ text: "No site photos available.", style: "bodyText" });
    return items;
  }

  projectNames.forEach(projName => {
    items.push(createProjectBanner(projName));
    const locations = photosRecord[projName] ?? [];

    locations.forEach(loc => {
      const locTitle = loc.location ?? loc.title ?? "Photos";
      items.push(createLocationBanner(locTitle));

      const flat: { img?: string; desc: string }[] = [];
      (loc.entries ?? []).forEach(entry => {
        (entry.slots ?? []).forEach(slot => {
          flat.push({ img: slot.image, desc: slot.caption ?? "" });
        });
      });

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
  });

  return items;
}

// ── Load all images ────────────────────────────────────────────────────────────
async function loadAllImages(data: MasterWeeklyReport): Promise<{
  companyLogo?: string;
  sitePhotos: Map<string, string | undefined>;
  issuePhotos: Map<string, string | undefined>;
  hsePhotos: Map<string, string | undefined>;
}> {
  const companyLogo = await loadImg("/cacpm_logo.png");

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
  const allHseSections = [
    ...(hsePhotoRefs?.hseToolboxMeeting ?? []),
    ...(hsePhotoRefs?.hseActivityPhotos ?? []),
  ];
  allHseSections.forEach(section => {
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

  return { companyLogo, sitePhotos, issuePhotos, hsePhotos };
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function exportMasterToPdf(data: MasterWeeklyReport, filename = "MasterWeeklyReport.pdf"): Promise<void> {
  const { companyLogo, sitePhotos, issuePhotos, hsePhotos } = await loadAllImages(data);

  const content: any[] = [
    ...buildCover(data, companyLogo),
    pb(),
    ...buildProjectSummaries(data),
    pb(),
    ...buildActivities(data),
    pb(),
    ...buildIssues(data, issuePhotos),
    ...buildQAQC(data),
    pb(),
    ...buildHSES(data, hsePhotos),
    pb(),
    ...buildManpower(data),
    pb(),
    ...buildSitePhotos(data, sitePhotos),
  ];

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
      // Tables
      tblHdr:       { fontSize: 9, bold: true, color: "#000000", margin: [2, 3, 2, 3] },
      tblCell:      { fontSize: 9, margin: [2, 2, 2, 2] },
      qaqcSubTitle: { fontSize: 10, margin: [4, 4, 4, 4] },
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
