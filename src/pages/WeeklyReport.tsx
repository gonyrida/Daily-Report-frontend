import React, { useState, useRef } from "react";
import ReportHeader from "@/components/ReportHeader";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import WeeklyReportCover from "@/components/weekly/WeeklyReportCover";
import WeeklyReportLetter from "@/components/weekly/WeeklyReportLetter";
import WeeklyReportContent from "@/components/weekly/WeeklyReportContent";
import ReferenceSection from "@/components/ReferenceSection";
import ConstructionIssue from "@/components/weekly/content/ConstructionIssue";
import { createDefaultSiteActivitiesSections } from "@/utils/referenceHelpers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const WeeklyReport = () => {
  const [projectLogo, setProjectLogo] = useState<string>("/koica_logo.png");
  const [showIntroduction, setShowIntroduction] = useState(false);

  // Active tab state for section filtering
  const [activeTab, setActiveTab] = useState<
    | "cover"
    | "letter"
    | "table-of-content"
    | "overall-progress"
    | "activities"
    | "qaqc-status"
    | "hses"
    | "resource"
    | "photos"
    | "issues"
    | "schedule"
  >("cover");

  // Debug logging for activeTab changes
  const debugSetActiveTab = (tab: any) => {
    console.log("ActiveTab changing from", activeTab, "to", tab);
    setActiveTab(tab);
  };

  // State for second navigation bar visibility
  const [showSecondNav, setShowSecondNav] = useState(false);

  // Table of content sections for second navigation
  const tableOfContentSections = [
    { id: 1, name: "Intro", href: "#introduction" },
    {
      id: 2,
      name: "O.progress",
      href: "#overall-progress-of-this-week-and-next-week",
    },
    {
      id: 3,
      name: "Activities",
      href: "#activities-of-work-done--next-week-plan",
    },
    { id: 4, name: "QAQC", href: "#qaqc-status" },
    {
      id: 5,
      name: "HSES",
      href: "#health-safety-environmental--security-hses",
    },
    { id: 6, name: "Resources", href: "#resources-status" },
    { id: 7, name: "Photos", href: "#site-activity-photos" },
    { id: 8, name: "Issues", href: "#construction-issue" },
    { id: 9, name: "Schedule", href: "#master-schedule" },
  ];

  // Shared data state between tabs
  const [sharedData, setSharedData] = useState({
    weekNumber: "",
    refNoPrefix: "ICT-CPM-LETTER",
    dateRange: "",
    projectName:
      "Renovation Works of The Project for Building Capacity and Establishing Enabling Environment in ICT Majors of TVET in Cambodia",
    employer: "Client Name",
    coverImage: "",
  });

  // Site Activities Photos state
  const [siteActivitiesSections, setSiteActivitiesSections] = useState(
    createDefaultSiteActivitiesSections()
  );
  const [siteActivitiesTitle, setSiteActivitiesTitle] = useState(
    "Site Activities Photos"
  );
  const [isExportingSiteActivities, setIsExportingSiteActivities] = useState(false);

  // Construction Issues state
  const [constructionIssues, setConstructionIssues] = useState([
    { id: crypto.randomUUID(), issueNumber: 1 }
  ]);

  // Schedule sections state
  const [scheduleSections, setScheduleSections] = useState([
    { id: crypto.randomUUID(), title: "Master Schedule", entries: [] }
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);

  // Schedule upload functionality
  const handleScheduleUpload = (files: FileList | null) => {
    if (!files) return;
    const validFiles = Array.from(files).filter((f) => 
      f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (validFiles.length === 0) {
      toast({ description: "No valid image or PDF files selected." });
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const allowed = validFiles.filter((f) => f.size <= MAX_SIZE);
    const rejectedCount = validFiles.length - allowed.length;

    if (allowed.length === 0) {
      toast({ description: "All selected files exceed the 10MB limit and were rejected." });
      return;
    }

    // Create new entries for uploaded files (1 file per entry for full width display)
    const newEntries: any[] = [];
    for (const file of allowed) {
      newEntries.push({
        id: crypto.randomUUID(),
        file: file,
        type: file.type.startsWith("image/") ? "image" : "pdf",
        caption: ""
      });
    }

    // Update the first schedule section with new entries
    const updatedSections = [...scheduleSections];
    updatedSections[0] = {
      ...updatedSections[0],
      entries: [...updatedSections[0].entries, ...newEntries]
    };
    setScheduleSections(updatedSections);

    toast({
      title: `${allowed.length} schedule file(s) uploaded`,
      description: `${newEntries.length} new entr${newEntries.length !== 1 ? "ies" : "y"} created.${rejectedCount ? ` ${rejectedCount} file(s) were too large and skipped.` : ""}`,
    });

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onScheduleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleScheduleUpload(e.target.files);
    e.currentTarget.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    handleScheduleUpload(files);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <HierarchicalSidebar />

        <SidebarInset>
          <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
            {/* Report Header with Company and Client Logos */}
            <ReportHeader
              projectLogo={projectLogo}
              setProjectLogo={setProjectLogo}
              title="WEEKLY REPORT"
            />

            {/* Navigation Bar */}
            <div className="w-full px-4 sm:px-6 py-4 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Navigate back to dashboard
                      window.location.href = "/dashboard";
                    }}
                    className="justify-start whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-arrow-left h-4 w-4"
                    >
                      <path d="m12 19-7-7 7-7"></path>
                      <path d="M19 12H5"></path>
                    </svg>
                    Back to Dashboard
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={activeTab === "cover" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActiveTab("cover");
                      setShowSecondNav(false);
                    }}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Cover
                  </Button>
                  <Button
                    variant={activeTab === "letter" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActiveTab("letter");
                      setShowSecondNav(false);
                    }}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Letter
                  </Button>
                  <Button
                    variant={
                      activeTab === "table-of-content" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      debugSetActiveTab("table-of-content");
                      setShowSecondNav(true);
                      setShowIntroduction(false); // Always reset intro view when switching to TOC tab
                    }}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Table of Content
                  </Button>
                </div>
                <div className="flex items-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            {/* Second Navigation Bar - Only shows when Table of Content is active and toggled, or when showing overall-progress or activities */}
            {(activeTab === "table-of-content" ||
              activeTab === "overall-progress" ||
              activeTab === "activities" ||
              activeTab === "hses" ||
              activeTab === "qaqc-status" ||
              activeTab === "resource" ||
              activeTab === "photos" ||
              activeTab === "issues" ||
              activeTab === "schedule") &&
              showSecondNav && (
                <div className="w-full px-4 sm:px-6 py-3 bg-background/95 backdrop-blur-sm border-b shadow-sm overflow-x-auto">
                  <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                    {tableOfContentSections.map((section) => (
                      <Button
                        key={section.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log(
                            "Second nav button clicked, section.id:",
                            section.id,
                          );
                          if (section.id === 1) {
                            setShowIntroduction(true);
                            debugSetActiveTab("table-of-content");
                          } else if (section.id === 2) {
                            setShowIntroduction(false);
                            debugSetActiveTab("overall-progress");
                            if (setShowSecondNav) setShowSecondNav(true);
                          } else if (section.id === 3) {
                            setShowIntroduction(false);
                            debugSetActiveTab("activities");
                            if (setShowSecondNav) setShowSecondNav(true);
                          } else if (section.id === 4) {
                            setShowIntroduction(false);
                            debugSetActiveTab("qaqc-status");
                            if (setShowSecondNav) setShowSecondNav(true);
                          } else if (section.id === 5) {
                            setShowIntroduction(false);
                            debugSetActiveTab("hses");
                            setShowSecondNav(true);
                          } else if (section.id === 6) {
                            setShowIntroduction(false);
                            debugSetActiveTab("resource");
                            setShowSecondNav(true);
                          } else if (section.id === 7) {
                            setShowIntroduction(false);
                            debugSetActiveTab("photos");
                            setShowSecondNav(true);
                          } else if (section.id === 8) {
                            setShowIntroduction(false);
                            debugSetActiveTab("issues");
                            setShowSecondNav(true);
                          } else if (section.id === 9) {
                            setShowIntroduction(false);
                            debugSetActiveTab("schedule");
                            setShowSecondNav(true);
                          } else {
                            setShowIntroduction(false);
                            debugSetActiveTab("table-of-content");
                            const element = document.querySelector(
                              section.href,
                            );
                            if (element) {
                              element.scrollIntoView({ behavior: "smooth" });
                            }
                          }
                        }}
                        className="rounded-full text-sm transition-all duration-200 hover:scale-105 flex-shrink-0"
                      >
                        {section.id}. {section.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

            {/* Main Content */}
            <main className="w-full px-4 sm:px-6 pt-4 pb-6 space-y-6 overflow-x-hidden">
              {/* Tab-based content rendering */}
              {activeTab === "cover" && (
                <>
                  <WeeklyReportCover
                    data={sharedData}
                    onDataChange={(data) =>
                      setSharedData((prev) => ({ ...prev, ...data }))
                    }
                  />
                </>
              )}

              {activeTab === "letter" && (
                <>
                  <WeeklyReportLetter
                    data={sharedData}
                    onDataChange={(data) =>
                      setSharedData((prev) => ({ ...prev, ...data }))
                    }
                  />
                </>
              )}

              {activeTab === "table-of-content" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
                      setShowSecondNav={setShowSecondNav}
                      activeTab={activeTab}
                      sharedData={sharedData}
                    />
                  </div>
                </>
              )}

              {activeTab === "activities" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
                      setShowSecondNav={setShowSecondNav}
                      activeTab={activeTab}
                      sharedData={sharedData}
                    />
                  </div>
                </>
              )}

              {activeTab === "overall-progress" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
                      setShowSecondNav={setShowSecondNav}
                      activeTab={activeTab}
                      sharedData={sharedData}
                    />
                  </div>
                </>
              )}

              {activeTab === "qaqc-status" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
                      setShowSecondNav={setShowSecondNav}
                      activeTab={activeTab}
                      sharedData={sharedData}
                    />
                  </div>
                </>
              )}

              {activeTab === "hses" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
                      setShowSecondNav={setShowSecondNav}
                      activeTab={activeTab}
                      sharedData={sharedData}
                    />
                  </div>
                </>
              )}

              {activeTab === "resource" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <WeeklyReportContent
                      showIntroduction={showIntroduction}
                      setShowIntroduction={setShowIntroduction}
                      projectLogo={sharedData.coverImage}
                      setActiveTab={debugSetActiveTab}
                      setShowSecondNav={setShowSecondNav}
                      activeTab={activeTab}
                      sharedData={sharedData}
                    />
                  </div>
                </>
              )}

              {activeTab === "photos" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">7. {siteActivitiesTitle}</h2>
                        <Button
                          onClick={() => {
                            const newSection = {
                              id: crypto.randomUUID(),
                              title: `Photo Section ${siteActivitiesSections.length + 1}`,
                              entries: []
                            };
                            setSiteActivitiesSections([...siteActivitiesSections, newSection]);
                          }}
                          className="flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Add Section
                        </Button>
                      </div>
                      <ReferenceSection
                        sections={siteActivitiesSections}
                        setSections={setSiteActivitiesSections}
                        onExportReference={() => {}}
                        isExporting={isExportingSiteActivities}
                        tableTitle={siteActivitiesTitle}
                        setTableTitle={setSiteActivitiesTitle}
                        hideTitle={false}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "issues" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">8. Construction Issues</h2>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              const newIssue = {
                                id: crypto.randomUUID(),
                                issueNumber: constructionIssues.length + 1
                              };
                              setConstructionIssues([...constructionIssues, newIssue]);
                            }}
                            className="flex items-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                            Add Issue
                          </Button>
                        </div>
                      </div>
                      {constructionIssues.map((issue, index) => (
                        <ConstructionIssue 
                          key={issue.id} 
                          issueNumber={index + 1} 
                          onRemove={() => {
                            const updatedIssues = constructionIssues.filter((_, i) => i !== index);
                            setConstructionIssues(updatedIssues);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "schedule" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold px-6 py-3 bg-blue-100 border-b rounded-t-lg mb-3">9. Master Schedule</h2>
                        
                        {/* Upload Section */}
                        <div className="mb-6">
                          <div 
                            className="w-full"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
                            {/* Bulk upload input (hidden) */}
                            <input 
                              ref={fileInputRef} 
                              onChange={onScheduleFileInputChange} 
                              type="file" 
                              accept="image/*,.pdf" 
                              multiple 
                              className="hidden" 
                            />

                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()} 
                              className={`relative flex flex-col items-center gap-3 p-6 border-2 rounded-2xl transition-all duration-300 w-full ${
                                isDragOver 
                                  ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 scale-105" 
                                  : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transform hover:-translate-y-1"
                              }`}
                            >
                              <div className="relative">
                                <div className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-300 ${
                                  isDragOver ? "bg-blue-500 opacity-30" : "bg-blue-500 opacity-0 group-hover:opacity-20"
                                }`}></div>
                                <div className="relative bg-blue-500 p-3 rounded-full shadow-lg">
                                  <UploadCloud className={`w-5 h-5 text-white transition-transform duration-300 ${
                                    isDragOver ? "scale-125 animate-bounce" : "group-hover:scale-110"
                                  }`} />
                                </div>
                              </div>
                              <div className="text-center">
                                <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">
                                  {isDragOver ? "DROP FILES HERE" : "UPLOAD SCHEDULE FILES"}
                                </span>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  {isDragOver ? "Release to upload images and PDFs" : "Bulk upload images and PDFs"}
                                </p>
                              </div>
                              <div className="absolute top-2 right-2">
                                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                  isDragOver ? "bg-green-400 animate-pulse" : "bg-blue-400 animate-pulse"
                                }`}></div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Schedule Content */}
                        <div className="p-6">
                          {scheduleSections[0].entries.length > 0 ? (
                            <div className="space-y-6">
                              {scheduleSections[0].entries.map((entry: any) => (
                                <div key={entry.id} className="border rounded-lg overflow-hidden">
                                  <div className="w-full">
                                    {entry.type === "image" ? (
                                      <div className="relative group">
                                        <img
                                          src={URL.createObjectURL(entry.file)}
                                          alt={`Schedule image`}
                                          className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-900"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-3">
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium truncate">{entry.file.name}</span>
                                            <span className="text-xs opacity-75">Image</span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : entry.type === "pdf" ? (
                                      <div className="relative group bg-gray-100 dark:bg-gray-800">
                                        <div className="w-full" style={{ minHeight: '600px' }}>
                                          <iframe
                                            src={URL.createObjectURL(entry.file)}
                                            className="w-full h-full min-h-96 border-0"
                                            title={`PDF: ${entry.file.name}`}
                                            onLoad={(e) => {
                                              const iframe = e.target as HTMLIFrameElement;
                                              // Try to set iframe height based on content
                                              try {
                                                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                                if (iframeDoc) {
                                                  const height = iframeDoc.body.scrollHeight;
                                                  iframe.style.height = `${Math.max(height, 600)}px`;
                                                }
                                              } catch (error) {
                                                // Fallback to fixed height if cross-origin prevents access
                                                iframe.style.height = '800px';
                                              }
                                            }}
                                          />
                                        </div>
                                        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs">
                                          PDF • {entry.file.name}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-8">No schedule files uploaded yet. Click the upload button above to add schedule images or PDFs.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default WeeklyReport;
