import React, { useState } from "react";
import ReportHeader from "@/components/ReportHeader";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import WeeklyReportCover from "@/components/weekly/WeeklyReportCover";
import WeeklyReportLetter from "@/components/weekly/WeeklyReportLetter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const WeeklyReport = () => {
  const [projectLogo, setProjectLogo] = useState<string>("/koica_logo.png");

  // Active tab state for section filtering
  const [activeTab, setActiveTab] = useState<
    "cover" | "letter" | "table-of-content"
  >("cover");

  // Shared data state between tabs
  const [sharedData, setSharedData] = useState({
    weekNumber: "",
    refNoPrefix: "ICT-CPM-LETTER",
    dateRange: "",
    projectName: "Renovation Works of The Project for Building Capacity and Establishing Enabling Environment in ICT Majors of TVET in Cambodia",
    employer: "Client Name",
  });

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
                    onClick={() => setActiveTab("cover")}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Cover
                  </Button>
                  <Button
                    variant={activeTab === "letter" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("letter")}
                    className="rounded-full relative z-10 transition-all duration-200 hover:scale-105"
                  >
                    Letter
                  </Button>
                  <Button
                    variant={
                      activeTab === "table-of-content" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setActiveTab("table-of-content")}
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

            {/* Main Content */}
            <main className="w-full px-4 sm:px-6 pt-4 pb-6 space-y-6 overflow-x-hidden">
              {/* Tab-based content rendering */}
              {activeTab === "cover" && (
                <>
                  <WeeklyReportCover 
                    data={sharedData}
                    onDataChange={(data) => setSharedData(prev => ({ ...prev, ...data }))}
                  />
                </>
              )}

              {activeTab === "letter" && (
                <>
                  <WeeklyReportLetter 
                    data={sharedData}
                    onDataChange={(data) => setSharedData(prev => ({ ...prev, ...data }))}
                  />
                </>
              )}

              {activeTab === "table-of-content" && (
                <>
                  <div className="bg-card rounded-lg border p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      Table of Content
                    </h2>
                    <p className="text-muted-foreground">
                      This is where the table of content will be displayed.
                    </p>
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
