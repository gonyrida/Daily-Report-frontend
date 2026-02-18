import React, { useState } from "react";
import Introduction from "./content/Intoduction";
import OverallProgress from "./content/OverallProgress";
import Activities from "./content/Activities";
import QaqcStatusNew from "./content/QaqcStatusNew";
import Hses from "./content/Hses";

interface Section {
  id: string;
  title: string;
}

const SECTIONS: Section[] = [
  { id: "4.1", title: "Non-Conformity Report (NCR)" },
  { id: "4.2", title: "Corrective Action Request (CAR)" },
  { id: "4.3", title: "Safety Corrective Action Request (SCAR)" },
  { id: "4.4", title: "PM Site Instruction (SI)" },
  { id: "4.5", title: "Client Site Instruction (SI)" },
  { id: "4.6", title: "Inspection Request (IR)" },
  { id: "4.7", title: "Material for Approval (MFA)" },
  { id: "4.8", title: "Request for Information (RFI)" },
  { id: "4.9", title: "Request for Approval (RFA)" },
  { id: "4.10", title: "Field Change Request (FCR)" },
  { id: "4.11", title: "Variation Order (VO)" },
  { id: "4.12", title: "Transmittal (TR)" },
];

type TabType = "cover" | "letter" | "table-of-content" | "overall-progress" | "activities" | "qaqc-status" | "hses";
interface WeeklyReportContentProps {
  showIntroduction?: boolean;
  setShowIntroduction?: React.Dispatch<React.SetStateAction<boolean>>;
  projectLogo?: string;
  setActiveTab?: (tab: TabType) => void;
  setShowSecondNav?: (show: boolean) => void;
  activeTab?: TabType;
}

const WeeklyReportContent: React.FC<WeeklyReportContentProps> = ({
  showIntroduction: externalShowIntroduction,
  setShowIntroduction: externalSetShowIntroduction,
  projectLogo,
  setActiveTab,
  setShowSecondNav,
  activeTab,
}) => {
  const [internalShowIntroduction, setInternalShowIntroduction] =
    useState(false);

  // State for activities
  const [weeklyActivities, setWeeklyActivities] = useState([]);
  const [nextWeekPlan, setNextWeekPlan] = useState([]);

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
        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">
          1. INTRODUCTION
        </h2>
        <Introduction projectLogo={projectLogo} />
      </div>
    );
  }

  // Handle activities tab
  if (activeTab === "activities") {
    console.log("WeeklyReportContent: Showing Activities, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">
          3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN
        </h2>
        <Activities 
          weeklyActivities={weeklyActivities}
          setWeeklyActivities={setWeeklyActivities}
          nextWeekPlan={nextWeekPlan}
          setNextWeekPlan={setNextWeekPlan}
        />
      </div>
    );
  }

  // Handle qaqc-status tab
  if (activeTab === "qaqc-status") {
    console.log("WeeklyReportContent: Showing QAQC Status, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">
          4. QA/QC STATUS
        </h2>
        <QaqcStatusNew sections={SECTIONS} />
      </div>
    );
  }

  // Handle hses tab
  if (activeTab === "hses") {
    console.log("WeeklyReportContent: Showing HSES, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">
          5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
        </h2>
        <Hses isEditing={true} />
      </div>
    );
  }

  // Handle overall-progress tab
  if (activeTab === "overall-progress") {
    console.log("WeeklyReportContent: Showing OverallProgress, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">
          2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK
        </h2>
        <OverallProgress />
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
        <li className="text-blue-600">
          <a
            href="#introduction"
            className="text-blue-600 hover:underline"
            onClick={handleIntroductionClick}
          >
            INTRODUCTION
          </a>
        </li>
        <li className="text-blue-600">
          <a
            href="#overall-progress-of-this-week-and-next-week"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("overall-progress");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK
          </a>
        </li>
        <li className="text-blue-600">
          <a
            href="#activities-of-work-done--next-week-plan"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("activities");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            ACTIVITIES OF WORK DONE / NEXT WEEK PLAN
          </a>
        </li>
        <li className="text-blue-600">
          <a
            href="#qaqc-status"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("qaqc-status");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            QA/QC STATUS
          </a>
          <ol className="list-decimal list-outside ml-6 mt-2 space-y-1">
            <li className="text-blue-600">
              <a
                href="#non-conformity-report-ncr"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#corrective-action-request-car"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#safety-corrective-action-request-scar"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#pm-site-instruction-si"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#client-site-instruction-si"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#inspection-request-ir"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#material-for-approval-mfa"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#request-for-information-rfi"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#request-for-approval-rfa"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#field-change-request-fcr"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#variation-order-vo"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#transmittal-tr"
                className="text-blue-600 hover:underline"
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
        <li className="text-blue-600">
          <a
            href="#health-safety-environmental--security-hses"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab("hses");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
          </a>
          <ol className="list-decimal list-outside ml-6 mt-2 space-y-1">
            <li className="text-blue-600">
              <a
                href="#hses-training--introduction--toolbox-meeting"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                HSES Training / Introduction / Toolbox Meeting
              </a>
            </li>
            <li className="text-blue-600">
              <a
                href="#hses-inspection--audit--heavy-equipment--handpower-tool-checklist"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#permit-to-work"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                Permit to Work
              </a>
            </li>
            <li className="text-blue-600">
              <a
                href="#first-aid--accident--incident--near-miss--fatalities-if-any"
                className="text-blue-600 hover:underline"
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
            <li className="text-blue-600">
              <a
                href="#other-hses-actities-concerns"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  if (setActiveTab) setActiveTab("hses");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                Other HSES Actities Concerns
              </a>
            </li>
            <li className="text-blue-600">
              <a
                href="#hses-photo-reference"
                className="text-blue-600 hover:underline"
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
        <li className="text-blue-600">
          <a
            href="#resources-status"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              if (setActiveTab) setActiveTab("table-of-content");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            RESOURCES STATUS
          </a>
          <ol className="list-decimal list-outside ml-6 mt-2 space-y-1">
            <li className="text-blue-600">
              <a
                href="#manpower-status"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  if (setActiveTab) setActiveTab("table-of-content");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                Manpower Status
              </a>
            </li>
            <li className="text-blue-600">
              <a
                href="#material-delivery-status"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  if (setActiveTab) setActiveTab("table-of-content");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                Material Delivery Status
              </a>
            </li>
            <li className="text-blue-600">
              <a
                href="#machinery--equipment-status"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  if (setActiveTab) setActiveTab("table-of-content");
                  if (setShowSecondNav) setShowSecondNav(true);
                }}
              >
                Machinery / Equipment Status
              </a>
            </li>
          </ol>
        </li>
        <li className="text-blue-600">
          <a
            href="#site-activity-photos"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              if (setActiveTab) setActiveTab("table-of-content");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            SITE ACTIVITY PHOTOS
          </a>
        </li>
        <li className="text-blue-600">
          <a
            href="#construction-issue"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              if (setActiveTab) setActiveTab("table-of-content");
              if (setShowSecondNav) setShowSecondNav(true);
            }}
          >
            CONSTRUCTION ISSUE
          </a>
        </li>
        <li className="text-blue-600">
          <a
            href="#master-schedule"
            className="text-blue-600 hover:underline"
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
