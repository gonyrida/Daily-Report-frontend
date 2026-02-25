import React, { useState } from "react";
import Introduction from "./content/Intoduction";
import OverallProgress from "./content/OverallProgress";
import Activities from "./content/Activities";
import QaqcStatusNew from "./content/QaqcStatusNew";
import Hses from "./content/Hses";
import Resource from "./content/Resource";
import { Section, TabType, WeeklyReportContentProps } from "@/types/weeklyReportContent.types";
import { QAQC_SECTIONS } from "@/constants/qaqcSections";
import { useActivities } from "@/hooks/useActivities";
import { useConstructionIssue } from "@/hooks/useConstructionIssue";
import { useHsesData } from "@/hooks/useHsesData";
import { useIntroductionText } from "@/hooks/useIntroductionText";
import { useOverallProgress } from "@/hooks/useOverallProgress";
import { useQaqcTable } from "@/hooks/useQaqcTable";
import { useResourceTable } from "@/hooks/useResourceTable";

const WeeklyReportContent: React.FC<WeeklyReportContentProps> = ({
  showIntroduction: externalShowIntroduction,
  setShowIntroduction: externalSetShowIntroduction,
  projectLogo,
  setActiveTab,
  setShowSecondNav,
  activeTab,
  sharedData,
  setSharedData,
  overallProgressData,
  setOverallProgressData
}) => {
  const [internalShowIntroduction, setInternalShowIntroduction] =
    useState(false);

  // Initialize all hooks at parent level
  const activitiesHook = { weeklyActivities: [], setWeeklyActivities: () => {}, nextWeekPlan: [], setNextWeekPlan: () => {} };
  const constructionIssueHook = useConstructionIssue({});
  const hsesDataHook = useHsesData();
  const introductionTextHook = useIntroductionText(projectLogo);
  const qaqcTableHook = useQaqcTable(QAQC_SECTIONS);
  const resourceTableHook = useResourceTable(sharedData, true);

  // Use passed overallProgress data or create a simple fallback
  const overallProgressHook = overallProgressData || { 
    rows: [], 
    setRows: () => {} 
  };

  const showIntroduction = externalShowIntroduction ?? internalShowIntroduction;
  const setShowIntroduction =
    externalSetShowIntroduction ?? setInternalShowIntroduction;

  const handleIntroductionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowIntroduction(true);
    if (setActiveTab) setActiveTab("table-of-content");
    if (setShowSecondNav) setShowSecondNav(true);
  };

  if (showIntroduction) {
    console.log("WeeklyReportContent: Showing Introduction");
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          1. INTRODUCTION
        </h2>
        <Introduction 
          projectLogo={projectLogo}
          projectOverview={sharedData.projectOverview || ""}
          setProjectOverview={(value) => setSharedData(prev => ({ ...prev, projectOverview: value }))}
          designConstruction={sharedData.designNConstruction || ""}
          setDesignConstruction={(value) => setSharedData(prev => ({ ...prev, designNConstruction: value }))}
          handleTextChange={(e, setter) => {
            const target = e.target as HTMLTextAreaElement;
            setter(target.value);
          }}
          handleTabKey={(e) => {
            // Basic tab handling - can be expanded later
            if (e.key === 'Tab') {
              e.preventDefault();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              target.value = target.value.substring(0, start) + '  ' + target.value.substring(end);
              target.selectionStart = target.selectionEnd = start + 2;
            }
          }}
          handleBold={(e) => {
            // Basic bold handling - can be expanded later
            if (e.altKey && e.key === 'b') {
              e.preventDefault();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const selectedText = target.value.substring(start, end);
              target.value = target.value.substring(0, start) + `**${selectedText}**` + target.value.substring(end);
            }
          }}
        />
      </div>
    );
  }

  // Handle activities tab
  if (activeTab === "activities") {
    console.log("WeeklyReportContent: Showing Activities, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN
        </h2>
        <Activities 
          weeklyActivities={activitiesHook.weeklyActivities}
          setWeeklyActivities={activitiesHook.setWeeklyActivities}
          nextWeekPlan={activitiesHook.nextWeekPlan}
          setNextWeekPlan={activitiesHook.setNextWeekPlan}
        />
      </div>
    );
  }

  // Handle qaqc-status tab
  if (activeTab === "qaqc-status") {
    console.log("WeeklyReportContent: Showing QAQC Status, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          4. QA/QC STATUS
        </h2>
        <QaqcStatusNew 
          sections={qaqcTableHook.filteredSections}
          tableData={qaqcTableHook.tableData}
          setTableData={qaqcTableHook.setTableData}
          search={qaqcTableHook.search}
          setSearch={qaqcTableHook.setSearch}
          handleAddRow={qaqcTableHook.handleAddRow}
          handleDeleteRow={qaqcTableHook.handleDeleteRow}
          handleCellChange={qaqcTableHook.handleCellChange}
          totalRows={qaqcTableHook.totalRows}
          openRows={qaqcTableHook.openRows}
          filteredSections={qaqcTableHook.filteredSections}
        />
      </div>
    );
  }

  // Handle hses tab
  if (activeTab === "hses") {
    console.log("WeeklyReportContent: Showing HSES, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
        </h2>
        <Hses 
          isEditing={true}
          data={hsesDataHook.hsesData}
          onChange={hsesDataHook.setHsesData}
        />
      </div>
    );
  }

  // Handle resource tab
  if (activeTab === "resource") {
    console.log("WeeklyReportContent: Showing Resource, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          6. RESOURCES STATUS
        </h2>
        <Resource 
          sharedData={sharedData}
          sections={resourceTableHook.sections}
          setSections={resourceTableHook.setSections}
          handleInputChange={resourceTableHook.handleInputChange}
          removeSubRow={resourceTableHook.removeSubRow}
          monthYearDisplay={resourceTableHook.monthYearDisplay}
          dates={resourceTableHook.dates}
        />
      </div>
    );
  }

  // Handle overall-progress tab
  if (activeTab === "overall-progress") {
    console.log("WeeklyReportContent: Showing OverallProgress, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK
        </h2>
        <OverallProgress 
          rows={overallProgressHook.rows}
          setRows={overallProgressHook.setRows}
          updateRows={overallProgressHook.updateRows}
          addTitleRow={overallProgressHook.addTitleRow}
          addDetailRow={overallProgressHook.addDetailRow}
        />
      </div>
    );
  }

  // Only show table of content if activeTab is table-of-content and not showing introduction
  if (activeTab !== "table-of-content") {
    console.log("WeeklyReportContent: Not rendering, activeTab:", activeTab);
    return null;
  }

  return (
    <div className="max-w-none space-y-4">
      <style>{`
  ol.hierarchical {
    counter-reset: section;
    list-style: none;
    padding-left: 0;
  }

  ol.hierarchical > li {
    counter-increment: section;
    margin: 6px 0;
  }

  ol.hierarchical > li::before {
    content: counter(section) ". ";
    font-weight: 600;
    margin-right: 4px;
  }

  ol.hierarchical ol {
    counter-reset: subsection;
    list-style: none;
    margin-top: 6px;
    padding-left: 24px;
  }

  ol.hierarchical ol > li {
    counter-increment: subsection;
  }

  ol.hierarchical ol > li::before {
    content: counter(section) "." counter(subsection) " ";
    font-weight: 500;
    margin-right: 4px;
  }
`}</style>

      <ol className="hierarchical list-none ml-6 space-y-2">
        <li className="text-blue-600 dark:text-blue-400">
          <a
            href="#introduction"
            className="text-primary dark:text-primary hover:underline"
            onClick={handleIntroductionClick}
          >
            INTRODUCTION
          </a>
        </li>
        <li className="text-blue-600 dark:text-blue-400">
          <a
            href="#overall-progress-of-this-week-and-next-week"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("overall-progress");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK
          </a>
        </li>
        <li className="text-blue-600 dark:text-blue-400">
          <a
            href="#activities-of-work-done--next-week-plan"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("activities");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            ACTIVITIES OF WORK DONE / NEXT WEEK PLAN
          </a>
        </li>
        <li className="text-primary dark:text-primary">
          <a
            href="#qaqc-status"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("qaqc-status");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            QA/QC STATUS
          </a>
          <ol className="list-decimal list-outside ml-6 mt-2 space-y-1">
            <li className="text-primary dark:text-primary">
              <a
                href="#non-conformity-report-ncr"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  // Scroll to section after a short delay to allow component to render
                  setTimeout(() => {
                    document.getElementById("section-4.1")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Non-Conformity Report (NCR)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#corrective-action-request-car"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.2")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Corrective Action Request (CAR)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#safety-corrective-action-request-scar"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.3")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Safety Corrective Action Request (SCAR)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#pm-site-instruction-si"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.4")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                PM Site Instruction (SI)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#client-site-instruction-si"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.5")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Client Site Instruction (SI)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#inspection-request-ir"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.6")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Inspection Request (IR)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#material-for-approval-mfa"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.7")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Material for Approval (MFA)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#request-for-information-rfi"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.8")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Request for Information (RFI)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#request-for-approval-rfa"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.9")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Request for Approval (RFA)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#field-change-request-fcr"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.10")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Field Change Request (FCR)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#variation-order-vo"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.11")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Variation Order (VO)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#transmittal-tr"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("qaqc-status");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-4.12")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Transmittal (TR)
              </a>
            </li>
          </ol>
        </li>
        <li className="text-primary dark:text-primary">
          <a
            href="#health-safety-environmental--security-hses"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("hses");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
          </a>
          <ol className="list-decimal list-outside ml-6 mt-2 space-y-1">
            <li className="text-primary dark:text-primary">
              <a
                href="#hses-training--introduction--toolbox-meeting"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                HSES Training / Introduction / Toolbox Meeting
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#hses-inspection--audit--heavy-equipment--handpower-tool-checklist"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                HSES Inspection / Audit / Heavy Equipment / Hand&Power Tool
                Checklist
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#permit-to-work"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                Permit to Work
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#first-aid--accident--incident--near-miss--fatalities-if-any"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                First Aid / Accident / Incident / Near Miss / Fatalities (if
                Any)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#other-hses-actities-concerns"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                Other HSES Actities Concerns
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#hses-photo-reference"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                HSES Photo Reference
              </a>
            </li>
          </ol>
        </li>
        <li className="text-primary dark:text-primary">
          <a
            href="#resources-status"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("resource");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            RESOURCES STATUS
          </a>
          <ol className="list-decimal list-outside ml-6 mt-2 space-y-1">
            <li className="text-primary dark:text-primary">
              <a
                href="#manpower-status"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("resource");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-6.1")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Manpower Status
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#material-delivery-status"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("resource");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-6.2")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Material Delivery Status
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a
                href="#machinery--equipment-status"
                className="text-primary dark:text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("resource");
                  if (setShowSecondNav) setShowSecondNav(true);
                  setTimeout(() => {
                    document.getElementById("section-6.3")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
              >
                Machinery / Equipment Status
              </a>
            </li>
          </ol>
        </li>
        <li className="text-primary dark:text-primary">
          <a
            href="#site-activity-photos"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              if (setActiveTab) setActiveTab("table-of-content");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            SITE ACTIVITY PHOTOS
          </a>
        </li>
        <li className="text-primary dark:text-primary">
          <a
            href="#construction-issue"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              if (setActiveTab) setActiveTab("table-of-content");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            CONSTRUCTION ISSUE
          </a>
        </li>
        <li className="text-primary dark:text-primary">
          <a
            href="#master-schedule"
            className="text-primary dark:text-primary hover:underline"
            onClick={(e) => {
              if (setActiveTab) setActiveTab("table-of-content");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            MASTER SCHEDULE
          </a>
        </li>
      </ol>
    </div>
  );
};

export default WeeklyReportContent;
