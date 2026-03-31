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
import { ProgressRow } from "@/types/progress.types";
import { createHSESections } from "@/utils/hseSectionUtils";
import { mergeConstructionIntoOverallRows } from "@/utils/constructionProgressToOverall";

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
  reportId,
  weeklyActivities: externalWeeklyActivities,
  setWeeklyActivities: externalSetWeeklyActivities,
  nextWeekPlan: externalNextWeekPlan,
  setNextWeekPlan: externalSetNextWeekPlan,
  qaqcData,
  setQaqcData,
  hsesData,
  setHsesData,
  onQaqcDataChange,
  onClearQaqcData,
  onClearHsesData,
  constructionProgressItems
}) => {
  const [internalShowIntroduction, setInternalShowIntroduction] =
    useState(false);

  // Initialize activities state at parent level
  const [weeklyActivities, setWeeklyActivities] = useState<ActivityRow[]>([]);
  const [nextWeekPlan, setNextWeekPlan] = useState<ActivityRow[]>([]);
  const [overallRows, setOverallRows] = useState<ProgressRow[]>([]);

  // Re-merge whenever construction progress changes, preserving user edits
  useEffect(() => {
    if (!constructionProgressItems?.length) return;
    setOverallRows(prev => {
      const merged = mergeConstructionIntoOverallRows(constructionProgressItems, prev);
      return merged;
    });
  }, [constructionProgressItems]);

  // Sync overallRows to overallProgressData when provided (stable reference)
  const setRowsRef = overallProgressData?.setRows;
  useEffect(() => {
    if (setRowsRef && overallRows.length > 0) {
      setRowsRef(overallRows);
    }
  }, [overallRows, setRowsRef]);

  // Use external props if provided, otherwise use internal state
  const currentWeeklyActivities = externalWeeklyActivities || weeklyActivities;
  const currentSetWeeklyActivities = externalSetWeeklyActivities || setWeeklyActivities;
  const currentNextWeekPlan = externalNextWeekPlan || nextWeekPlan;
  const currentSetNextWeekPlan = externalSetNextWeekPlan || setNextWeekPlan;

  // Initialize all hooks at parent level
  const constructionIssueHook = useConstructionIssue({});
  const hsesDataHook = useHsesData(undefined, false);
  const introductionTextHook = useIntroductionText(projectLogo);
  
  // Use local hook with state management (like other sections)
  const qaqcTableHook = useQaqcTable(QAQC_SECTIONS);
    
  const resourceTableHook = useResourceTable(sharedData, true);

  // Use passed overallProgress data or create a simple fallback
  const overallProgressHook = overallProgressData || {
    rows: overallRows,
    setRows: setOverallRows,
    updateRows: setOverallRows,
    addTitleRow: () => {},   // disabled — rows come from construction progress
    addDetailRow: () => {},
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
      "4.12": "tr",
      "4.13": "mir"
    };
    
    // Example data for each section
    const examples: Record<string, any[]> = {
      ncr: [
        { code: "NCR-001", description: "Concrete strength below specified grade", status: "Pending", dateResponse: "2024-01-15", comment: "Waiting for re-testing results" },
        { code: "NCR-002", description: "Reinforcement spacing deviation", status: "Approved", dateResponse: "2024-01-10", comment: "Corrected and approved" }
      ],
      car: [
        { code: "CAR-001", description: "Improper curing procedures", status: "Respond", dateResponse: "2024-01-12", comment: "Corrective action plan submitted" }
      ],
      scar: [
        { code: "SCAR-001", description: "Site access road damage", status: "Approved", dateResponse: "2024-01-08", comment: "Repaired and inspected" }
      ],
      pmsi: [
        { code: "PMSI-001", description: "Material delivery delay", status: "Pending", dateResponse: "2024-01-20", comment: "Supplier notified" }
      ],
      csi: [
        { code: "CSI-001", description: "Safety barrier installation incomplete", status: "Pending", dateResponse: "2024-01-18", comment: "Scheduled for completion" }
      ],
      ir: [
        { code: "IR-001", description: "Monthly inspection report", status: "Approved", dateResponse: "2024-01-05", comment: "All items compliant" }
      ],
      mfa: [
        { code: "MFA-001", description: "Equipment maintenance required", status: "Pending", dateResponse: "2024-01-22", comment: "Maintenance team notified" }
      ],
      rfi: [
        { code: "RFI-001", description: "Clarification on foundation design", status: "Approved", dateResponse: "2024-01-03", comment: "Design clarification received" }
      ],
      rfa: [
        { code: "RFA-001", description: "Request for field change", status: "Submit", dateResponse: "2024-01-25", comment: "Under review" }
      ],
      fcr: [
        { code: "FCR-001", description: "Field change approved", status: "Approved", dateResponse: "2024-01-07", comment: "Change implemented" }
      ],
      vo: [
        { code: "VO-001", description: "Additional scope request", status: "Pending", dateResponse: "2024-01-28", comment: "Cost estimate pending" }
      ],
      tr: [
        { code: "TR-001", description: "Technical specification review", status: "Approved", dateResponse: "2024-01-11", comment: "Approved with comments" }
      ],
      mir: [
        { code: "MIR-001", description: "Steel material inspection and approval", status: "Pending", dateResponse: "2024-01-30", comment: "Pending laboratory results" },
        { code: "MIR-002", description: "Cement quality inspection", status: "Approved", dateResponse: "2024-01-25", comment: "All tests passed - material approved for use" },
        { code: "MIR-003", description: "Reinforcement bar inspection", status: "Respond", dateResponse: "2024-01-28", comment: "Awaiting final approval from quality team" }
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
    
    // Set parent state directly
    setQaqcData(exampleData);
    qaqcTableHook.setTableData(frontendExampleData);
  };

  // Load example data for HSES sections
  const loadHsesExampleData = () => {
    const exampleData: any = {
      training: [
        { typeOfTraining: "Safety Orientation", date: "2024-01-15", venue: "Site Office", trainer: "John Smith", attendee: "25 workers", remarks: "Completed successfully" },
        { typeOfTraining: "PPE Usage", date: "2024-01-16", venue: "Main Site", trainer: "Jane Doe", attendee: "30 workers", remarks: "All passed assessment" },
        { typeOfTraining: "Emergency Response", date: "2024-01-18", venue: "Training Room", trainer: "Mike Johnson", attendee: "20 workers", remarks: "Drill completed" }
      ],
      inspection: [
        { typeOfInspection: "Daily Safety Walk", date: "2024-01-15", inspector: "Safety Officer A", remarks: "No issues found" },
        { typeOfInspection: "Equipment Check", date: "2024-01-17", inspector: "Engineer B", remarks: "All equipment operational" },
        { typeOfInspection: "Scaffolding Inspection", date: "2024-01-19", inspector: "Inspector C", remarks: "Minor repairs needed on section 3" }
      ],
      permit: [
        { typeOfPermit: "Hot Work", startDate: "2024-01-15", endDate: "2024-01-15", inspector: "Supervisor A", approver: "Manager X", remarks: "Welding activity approved" },
        { typeOfPermit: "Excavation", startDate: "2024-01-16", endDate: "2024-01-20", inspector: "Engineer B", approver: "Manager X", remarks: "Deep excavation permit" },
        { typeOfPermit: "Confined Space", startDate: "2024-01-18", endDate: "2024-01-18", inspector: "Safety Officer C", approver: "Manager Y", remarks: "Tank cleaning operation" }
      ],
      firstAidAccident: "Minor cut injury on 2024-01-17 - treated on site. Near miss reported on 2024-01-18 - loose cable tripped worker, no injury.",
      otherActivities: "Environmental monitoring conducted on 2024-01-16. Waste segregation audit completed with satisfactory results."
    };

    // Preserve existing hsePhotoReferences or initialize with proper structure
    const currentPhotoReferences = currentHsesData?.hsePhotoReferences;
    exampleData.hsePhotoReferences = currentPhotoReferences && currentPhotoReferences.length > 0 ? currentPhotoReferences : createHSESections();

    // Set parent state directly
    setHsesData(exampleData);
  };

  // Sync QAQC data changes to parent state (like other sections)
  // REMOVED: This creates circular dependency with the useEffect below
  // useEffect(() => {
  //   if (setQaqcData && qaqcTableHook.tableData) {
  //     
  //     // Transform frontend data to backend format
  //     const backendData: any = {};
  //     
  //     // Map frontend section IDs to backend keys
  //     const sectionIdMap: Record<string, string> = {
  //       "4.1": "ncr",
  //       "4.2": "car", 
  //       "4.3": "scar",
  //       "4.4": "pmsi",
  //       "4.5": "csi",
  //       "4.6": "ir",
  //       "4.7": "mfa",
  //       "4.8": "rfi",
  //       "4.9": "rfa",
  //       "4.10": "fcr",
  //       "4.11": "vo",
  //       "4.12": "tr"
  //     };
  //     
  //     Object.entries(qaqcTableHook.tableData).forEach(([sectionId, rows]) => {
  //       const backendKey = sectionIdMap[sectionId];
  //       if (backendKey) {
  //         // Filter out empty rows (only save rows with actual data)
  //         const nonEmptyRows = rows.filter(row => 
  //           row.code.trim() || 
  //           row.description.trim() || 
  //           row.status.trim() || 
  //           row.dateResponse.trim() ||
  //           row.comment.trim()
  //         );
  //         
  //         backendData[backendKey] = {
  //           items: nonEmptyRows.map(row => ({
  //             code: row.code,
  //             description: row.description,
  //             status: row.status,
  //             dateResponded: row.dateResponse
  //           })),
  //           comments: nonEmptyRows.map(row => row.comment).filter(comment => comment.trim()).join('\n\n---\n\n') || ""
  //         };
  //       }
  //     });
  //     
  //     setQaqcData(backendData);
  //   }
  // }, [qaqcTableHook.tableData, setQaqcData]);

  // Load QAQC data from parent into local hook (like other sections)
  useEffect(() => {
    if (qaqcData && qaqcTableHook.setTableData) {
      // Transform backend data to frontend format
      const frontendData: any = {};
      const sectionIdMap: Record<string, string> = {
        "4.1": "ncr", "4.2": "car", "4.3": "scar", "4.4": "pmsi",
        "4.5": "csi", "4.6": "ir", "4.7": "mfa", "4.8": "rfi",
        "4.9": "rfa", "4.10": "fcr", "4.11": "vo", "4.12": "tr", "4.13": "mir"
      };
      
      // Reverse mapping for frontend to backend
      const reverseSectionMap: Record<string, string> = {};
      Object.entries(sectionIdMap).forEach(([frontendId, backendKey]) => {
        reverseSectionMap[backendKey] = frontendId;
      });
      
      Object.entries(qaqcData).forEach(([backendKey, sectionData]) => {
        const frontendId = reverseSectionMap[backendKey];
        const typedSectionData = sectionData as any;
        if (frontendId && typedSectionData.items) {
          frontendData[frontendId] = typedSectionData.items.map((item: any, index: number) => ({
            id: `${frontendId}-item-${index}`,
            code: item.code || "",
            description: item.description || "",
            status: item.status || "",
            dateResponse: item.dateResponded || "",
            comment: typedSectionData.comments || ""
          }));
          
          // Add default rows if less than 5
          while (frontendData[frontendId].length < 5) {
            frontendData[frontendId].push({
              id: `${frontendId}-default-${frontendData[frontendId].length}`,
              code: "",
              description: "",
              status: "",
              dateResponse: "",
              comment: ""
            });
          }
        }
      });
      
      qaqcTableHook.setTableData(frontendData);
    }
  }, [qaqcData]); // Add qaqcData dependency to sync when parent changes

  // Load HSES data from parent into local hook (like other sections)
  useEffect(() => {
    if (hsesData && hsesDataHook.setHsesData) {
      hsesDataHook.setHsesData(hsesData);
    }
  }, [hsesData]); // Add hsesData dependency to sync when parent changes

  // Ensure hook data is always available for the Hses component
  const currentHsesData = (hsesData?.hsePhotoReferences && hsesData.hsePhotoReferences.length > 0) ? hsesData : hsesDataHook.hsesData;
  
  // Expose clearQaqcData function to parent for successful submit cleanup
  useEffect(() => {
    if (onClearQaqcData && qaqcTableHook.clearQaqcData) {
      onClearQaqcData(qaqcTableHook.clearQaqcData);
    }
  }, [onClearQaqcData, qaqcTableHook.clearQaqcData]);

  // Expose clearHsesData function to parent for successful submit cleanup
  useEffect(() => {
    if (onClearHsesData && hsesDataHook.clearHsesData) {
      onClearHsesData(hsesDataHook.clearHsesData);
    }
  }, [onClearHsesData, hsesDataHook.clearHsesData]);

  const handleIntroductionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowIntroduction(true);
    if (setActiveTab) setActiveTab("table-of-content");
    if (setShowSecondNav) setShowSecondNav(true);
  };

  if (showIntroduction) {
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

  // Render all tabs but hide inactive ones with display:none to prevent remounting
  return (
    <div className="space-y-0">
      {/* Activities Tab */}
      <div style={{ display: activeTab === "activities" ? "block" : "none" }} className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          3. ACTIVITIES OF WORK DONE / NEXT WEEK PLAN
        </h2>
        <Activities 
          weeklyActivities={currentWeeklyActivities}
          setWeeklyActivities={currentSetWeeklyActivities}
          nextWeekPlan={currentNextWeekPlan}
          setNextWeekPlan={currentSetNextWeekPlan}
          reportId={reportId}
          constructionProgressItems={constructionProgressItems}
        />
      </div>

      {/* QAQC Tab */}
      <div style={{ display: activeTab === "qaqc-status" ? "block" : "none" }} className="bg-card p-3">
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
          setTableData={(data) => {
            qaqcTableHook.setTableData(data);
            // Also sync to parent state for persistence
            if (setQaqcData) {
              const backendData: any = {};
              const sectionIdMap: Record<string, string> = {
                "4.1": "ncr", "4.2": "car", "4.3": "scar", "4.4": "pmsi",
                "4.5": "csi", "4.6": "ir", "4.7": "mfa", "4.8": "rfi",
                "4.9": "rfa", "4.10": "fcr", "4.11": "vo", "4.12": "tr", "4.13": "mir"
              };
              
              Object.entries(data).forEach(([sectionId, rows]) => {
                const backendKey = sectionIdMap[sectionId];
                if (backendKey) {
                  const nonEmptyRows = rows.filter(row => 
                    row.code.trim() || row.description.trim() || row.status.trim() || 
                    row.dateResponse.trim() || row.comment.trim()
                  );
                  
                  backendData[backendKey] = {
                    items: nonEmptyRows.map(row => ({
                      code: row.code, description: row.description, status: row.status,
                      dateResponded: row.dateResponse
                    })),
                    comments: nonEmptyRows.map(row => row.comment).filter(comment => comment.trim()).join('\n\n---\n\n') || ""
                  };
                }
              });
              
              setQaqcData(backendData);
            }
          }}
          weeklyReportId={reportId}
        />
      </div>

      {/* HSES Tab */}
      <div style={{ display: activeTab === "hses" ? "block" : "none" }} className="bg-card p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-0 text-foreground">
            5. HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
          </h2>
          <button
            onClick={loadHsesExampleData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium mr-6"
          >
            📝 Load Example Data
          </button>
        </div>
        <Hses 
          isEditing={true}
          data={currentHsesData}
          onChange={setHsesData}
        />
      </div>

      {/* Resource Tab */}
      <div style={{ display: activeTab === "resource" ? "block" : "none" }} className="bg-card p-3">
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
          reportId={reportId}
        />
      </div>

      {/* Photos Tab */}
      <div style={{ display: activeTab === "photos" ? "block" : "none" }} className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          7. SITE ACTIVITY PHOTOS
        </h2>
        <div className="text-center py-12 text-muted-foreground">
          Site activity photos content will be displayed here.
        </div>
      </div>

      {/* Issues Tab */}
      <div style={{ display: activeTab === "issues" ? "block" : "none" }} className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          8. CONSTRUCTION ISSUE
        </h2>
        <div className="text-center py-12 text-muted-foreground">
          Construction issues will be displayed here.
        </div>
      </div>

      {/* Schedule Tab */}
      <div style={{ display: activeTab === "schedule" ? "block" : "none" }} className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          9. MASTER SCHEDULE
        </h2>
        <div className="text-center py-12 text-muted-foreground">
          Master schedule content will be displayed here.
        </div>
      </div>

      {/* Overall Progress Tab */}
      <div style={{ display: activeTab === "overall-progress" ? "block" : "none" }} className="bg-card p-3">
        <h2 className="text-lg font-semibold px-6 py-3 bg-muted dark:bg-muted border-b rounded-t-lg mb-3 text-foreground">
          2. OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK
        </h2>
        {(!overallRows || overallRows.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading construction progress data...
          </div>
        ) : (
          <OverallProgress 
            rows={overallRows}
            setRows={setOverallRows}
            updateRows={setOverallRows}
            addTitleRow={() => {}}
            addDetailRow={() => {}}
            descriptionsReadOnly={true}
          />
        )}
      </div>

      {/* Table of Content Tab */}
      {activeTab === "table-of-content" && (
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
              <a href="#introduction" className="text-primary dark:text-primary hover:underline" onClick={handleIntroductionClick}>
                INTRODUCTION
              </a>
            </li>
            <li className="text-blue-600 dark:text-blue-400">
              <a href="#overall-progress" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("overall-progress"); if (setShowSecondNav) setShowSecondNav(true); }}>
                OVERALL PROGRESS OF THIS WEEK AND NEXT WEEK
              </a>
            </li>
            <li className="text-blue-600 dark:text-blue-400">
              <a href="#activities" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("activities"); if (setShowSecondNav) setShowSecondNav(true); }}>
                ACTIVITIES OF WORK DONE / NEXT WEEK PLAN
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a href="#qaqc-status" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); }}>
                QA/QC STATUS
              </a>
              <ol className="list-decimal list-outside ml-6 mt-2 space-y-1">
                <li className="text-primary dark:text-primary"><a href="#ncr" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.1")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Non-Conformity Report (NCR)</a></li>
                <li className="text-primary dark:text-primary"><a href="#car" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.2")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Corrective Action Request (CAR)</a></li>
                <li className="text-primary dark:text-primary"><a href="#scar" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.3")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Safety Corrective Action Request (SCAR)</a></li>
                <li className="text-primary dark:text-primary"><a href="#pmsi" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.4")?.scrollIntoView({ behavior: "smooth" }), 100); }}>PM Site Instruction (SI)</a></li>
                <li className="text-primary dark:text-primary"><a href="#csi" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.5")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Client Site Instruction (SI)</a></li>
                <li className="text-primary dark:text-primary"><a href="#ir" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.6")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Inspection Request (IR)</a></li>
                <li className="text-primary dark:text-primary"><a href="#mfa" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.7")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Material for Approval (MFA)</a></li>
                <li className="text-primary dark:text-primary"><a href="#rfi" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.8")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Request for Information (RFI)</a></li>
                <li className="text-primary dark:text-primary"><a href="#rfa" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.9")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Request for Approval (RFA)</a></li>
                <li className="text-primary dark:text-primary"><a href="#fcr" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.10")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Field Change Request (FCR)</a></li>
                <li className="text-primary dark:text-primary"><a href="#vo" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.11")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Variation Order (VO)</a></li>
                <li className="text-primary dark:text-primary"><a href="#tr" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.12")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Transmittal (TR)</a></li>
                <li className="text-primary dark:text-primary"><a href="#mir" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("qaqc-status"); if (setShowSecondNav) setShowSecondNav(true); setTimeout(() => document.getElementById("section-4.13")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Material Inspection Approval (MIR)</a></li>
              </ol>
            </li>
            <li className="text-primary dark:text-primary">
              <a href="#hses" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("hses"); if (setShowSecondNav) setShowSecondNav(true); }}>
                HEALTH, SAFETY, ENVIRONMENTAL & SECURITY (HSES)
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a href="#resource" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("resource"); if (setShowSecondNav) setShowSecondNav(true); }}>
                RESOURCES STATUS
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a href="#photos" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("photos"); if (setShowSecondNav) setShowSecondNav(true); }}>
                SITE ACTIVITY PHOTOS
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a href="#issues" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("issues"); if (setShowSecondNav) setShowSecondNav(true); }}>
                CONSTRUCTION ISSUE
              </a>
            </li>
            <li className="text-primary dark:text-primary">
              <a href="#schedule" className="text-primary dark:text-primary hover:underline" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab("schedule"); if (setShowSecondNav) setShowSecondNav(true); }}>
                MASTER SCHEDULE
              </a>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default WeeklyReportContent;
