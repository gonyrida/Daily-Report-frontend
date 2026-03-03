import React, { useState, useEffect } from "react";
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
import { useQaqcApi } from "@/hooks/useQaqcApi";
import { useResourceTable } from "@/hooks/useResourceTable";
import { ActivityRow } from "@/types/activity.types";

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
  setOverallProgressData,
  reportId, // NEW: Accept reportId prop
  // NEW: Accept activities props from parent
  weeklyActivities: externalWeeklyActivities,
  setWeeklyActivities: externalSetWeeklyActivities,
  nextWeekPlan: externalNextWeekPlan,
  setNextWeekPlan: externalSetNextWeekPlan,
  qaqcData, // NEW: Accept QAQC data from parent
  setQaqcData, // NEW: Accept QAQC data setter from parent
  hsesData, // NEW: Accept HSES data from parent
  setHsesData, // NEW: Accept HSES data setter from parent
  onQaqcDataChange // NEW: Callback to notify parent of QAQC data changes
}) => {
  const [internalShowIntroduction, setInternalShowIntroduction] =
    useState(false);

  // Initialize activities state at parent level
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>([]);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>([]);

  // Use external props if provided, otherwise use internal state
  const currentWeeklyActivities = externalWeeklyActivities || weeklyActivities;
  const currentSetWeeklyActivities = externalSetWeeklyActivities || setWeeklyActivities;
  const currentNextWeekPlan = externalNextWeekPlan || nextWeekPlan;
  const currentSetNextWeekPlan = externalSetNextWeekPlan || setNextWeekPlan;

  // Initialize all hooks at parent level
  const constructionIssueHook = useConstructionIssue({});
  const hsesDataHook = useHsesData();
  const introductionTextHook = useIntroductionText(projectLogo);
  
  // Use local hook with state management (like other sections)
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

  
  // Load example data for QAQC sections
  const loadQaqcExampleData = () => {
    const exampleData: any = {};
    const frontendExampleData: any = {};
    
    // Map frontend section IDs to backend keys
    const sectionIdMap: Record<string, string> = {
      "4.1": "ncr",
      "4.2": "car", 
      "4.3": "scar",
      "4.4": "pmsi",
      "4.5": "csi",
      "4.6": "ir",
      "4.7": "mfa",
      "4.8": "rfi",
      "4.9": "rfa",
      "4.10": "fcr",
      "4.11": "vo",
      "4.12": "tr"
    };
    
    // Example data for each section
    const examples: Record<string, any[]> = {
      ncr: [
        { code: "NCR-001", description: "Concrete strength below specified grade", status: "Open", dateResponse: "2024-01-15", comment: "Waiting for re-testing results" },
        { code: "NCR-002", description: "Reinforcement spacing deviation", status: "Closed", dateResponse: "2024-01-10", comment: "Corrected and approved" }
      ],
      car: [
        { code: "CAR-001", description: "Improper curing procedures", status: "Open", dateResponse: "2024-01-12", comment: "Corrective action plan submitted" }
      ],
      scar: [
        { code: "SCAR-001", description: "Site access road damage", status: "Closed", dateResponse: "2024-01-08", comment: "Repaired and inspected" }
      ],
      pmsi: [
        { code: "PMSI-001", description: "Material delivery delay", status: "Open", dateResponse: "2024-01-20", comment: "Supplier notified" }
      ],
      csi: [
        { code: "CSI-001", description: "Safety barrier installation incomplete", status: "Open", dateResponse: "2024-01-18", comment: "Scheduled for completion" }
      ],
      ir: [
        { code: "IR-001", description: "Monthly inspection report", status: "Closed", dateResponse: "2024-01-05", comment: "All items compliant" }
      ],
      mfa: [
        { code: "MFA-001", description: "Equipment maintenance required", status: "Open", dateResponse: "2024-01-22", comment: "Maintenance team notified" }
      ],
      rfi: [
        { code: "RFI-001", description: "Clarification on foundation design", status: "Closed", dateResponse: "2024-01-03", comment: "Design clarification received" }
      ],
      rfa: [
        { code: "RFA-001", description: "Request for field change", status: "Open", dateResponse: "2024-01-25", comment: "Under review" }
      ],
      fcr: [
        { code: "FCR-001", description: "Field change approved", status: "Closed", dateResponse: "2024-01-07", comment: "Change implemented" }
      ],
      vo: [
        { code: "VO-001", description: "Additional scope request", status: "Open", dateResponse: "2024-01-28", comment: "Cost estimate pending" }
      ],
      tr: [
        { code: "TR-001", description: "Technical specification review", status: "Closed", dateResponse: "2024-01-11", comment: "Approved with comments" }
      ]
    };
    
    // Transform to both backend and frontend formats
    Object.entries(sectionIdMap).forEach(([frontendId, backendKey]) => {
      const exampleItems = examples[backendKey] || [];
      
      // Backend format
      exampleData[backendKey] = {
        items: exampleItems.map(item => ({
          code: item.code,
          description: item.description,
          status: item.status,
          dateResponded: item.dateResponse
        })),
        comments: exampleItems.map(item => item.comment).filter(comment => comment.trim()).join('\n\n---\n\n') || ""
      };
      
      // Frontend format (for immediate UI update)
      frontendExampleData[frontendId] = exampleItems.map((item, index) => ({
        id: `${frontendId}-example-${index}`,
        code: item.code,
        description: item.description,
        status: item.status,
        dateResponse: item.dateResponse,
        comment: item.comment
      }));
    });
    
    // Set both parent state and hook state for immediate UI update
    console.log("🔧 DEBUG: Setting parent state with:", exampleData);
    console.log("🔧 DEBUG: Setting hook state with:", frontendExampleData);
    
    setQaqcData(exampleData);
    qaqcTableHook.setTableData(frontendExampleData);
    
    // Also need to update local state since QAQC component uses local state when weeklyReportId is undefined
    // We'll trigger this by forcing the component to re-render with the new hook data
    console.log("🔧 DEBUG: QAQC example data loaded to both states");
  };

  // Sync QAQC data changes to parent state (like other sections)
  useEffect(() => {
    if (setQaqcData && qaqcTableHook.tableData) {
      
      // Transform frontend data to backend format
      const backendData: any = {};
      
      // Map frontend section IDs to backend keys
      const sectionIdMap: Record<string, string> = {
        "4.1": "ncr",
        "4.2": "car", 
        "4.3": "scar",
        "4.4": "pmsi",
        "4.5": "csi",
        "4.6": "ir",
        "4.7": "mfa",
        "4.8": "rfi",
        "4.9": "rfa",
        "4.10": "fcr",
        "4.11": "vo",
        "4.12": "tr"
      };
      
      Object.entries(qaqcTableHook.tableData).forEach(([sectionId, rows]) => {
        const backendKey = sectionIdMap[sectionId];
        if (backendKey) {
          // Filter out empty rows (only save rows with actual data)
          const nonEmptyRows = rows.filter(row => 
            row.code.trim() || 
            row.description.trim() || 
            row.status.trim() || 
            row.dateResponse.trim() ||
            row.comment.trim()
          );
          
          backendData[backendKey] = {
            items: nonEmptyRows.map(row => ({
              code: row.code,
              description: row.description,
              status: row.status,
              dateResponded: row.dateResponse
            })),
            comments: nonEmptyRows.map(row => row.comment).filter(comment => comment.trim()).join('\n\n---\n\n') || ""
          };
        }
      });
      
      setQaqcData(backendData);
    }
  }, [qaqcTableHook.tableData, setQaqcData]);

  // Load HSES data from parent into local hook (like other sections)
  useEffect(() => {
    if (hsesData && hsesDataHook.setHsesData) {
      hsesDataHook.setHsesData(hsesData);
    }
  }, [hsesData]); // Add hsesData dependency to sync when parent changes

  // Sync HSES data changes to parent state (like other sections)
  useEffect(() => {
    if (setHsesData && hsesDataHook.hsesData) {
      console.log("🔧 DEBUG: HSES data syncing to parent:", hsesDataHook.hsesData);
      console.log("🔧 DEBUG: HSES photo references in hook:", hsesDataHook.hsesData.hsePhotoReferences);
      setHsesData(hsesDataHook.hsesData);
    }
  }, [hsesDataHook.hsesData, setHsesData]);

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
          weeklyActivities={currentWeeklyActivities}
          setWeeklyActivities={currentSetWeeklyActivities}
          nextWeekPlan={currentNextWeekPlan}
          setNextWeekPlan={currentSetNextWeekPlan}
          reportId={reportId} // NEW: Pass reportId to Activities component
        />
      </div>
    );
  }

  // Handle qaqc-status tab
  if (activeTab === "qaqc-status") {
    console.log("WeeklyReportContent: Showing QAQC Status, activeTab:", activeTab);
    return (
      <div className="bg-card p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-0 text-foreground">
            4. QA/QC STATUS
          </h2>
          <button
            onClick={loadQaqcExampleData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium mr-6"
          >
            📝 Load Example Data
          </button>
        </div>
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
          weeklyReportId={undefined} // No API integration - use local state only
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
