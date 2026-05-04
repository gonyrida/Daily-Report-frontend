// src/components/weekly/MasterReportCover.tsx
// Read-only display of cover information for master report

import React from "react";
import {
  Calendar,
  FileText,
  Building,
  ImageIcon,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { MasterReportCoverData } from "@/types/masterReport.types";

interface MasterReportCoverProps {
  coverData: MasterReportCoverData;
}

const MasterReportCover: React.FC<MasterReportCoverProps> = ({
  coverData,
}) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  
  // Debug logging
  console.log('MasterReportCover received data:', coverData);

  return (
    <div className="w-full">
      {/* Full-width A4-style layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Title */}
        <div className="text-center pt-6 sm:pt-8 pb-3 sm:pb-4">
          <h1
            className={`text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide ${isDark ? "text-white" : "text-blue-900"}`}
          >
            {coverData.reportTitle || "WEEKLY PROGRESS REPORT"}
          </h1>
        </div>

        {/* Project Week Number */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="relative group w-full max-w-sm">
            <div
              className={`absolute -inset-0.5 ${isDark ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20" : "bg-gradient-to-r from-indigo-400/20 to-blue-500/20"} rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500`}
            ></div>
            <div
              className={`relative flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 ${isDark ? "bg-gradient-to-r from-slate-900 to-slate-800 border-slate-600" : "bg-gradient-to-r from-white to-slate-50 border-slate-300"} rounded-2xl transition-all duration-300`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 ${isDark ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gradient-to-r from-indigo-500 to-blue-500"} rounded-lg`}
                >
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <span
                  className={`text-sm sm:text-lg font-bold ${isDark ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400" : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600"}`}
                >
                  Week
                </span>
              </div>
              <div
                className={`w-px h-6 ${isDark ? "bg-gradient-to-b from-slate-600 to-slate-400" : "bg-gradient-to-b from-slate-300 to-slate-400"} hidden sm:block`}
              />
              <div
                className={`text-center font-bold text-base sm:text-lg px-2 min-w-[60px] sm:min-w-[50px] ${isDark ? "text-white" : "text-slate-800"}`}
              >
                {coverData.weekNumber || "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Project Date Range (display-only) */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="relative group w-full max-w-lg">
            <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div
              className={`relative ${isDark ? "bg-slate-900 border-slate-600" : "bg-white border-slate-300"} rounded-2xl p-4 sm:p-6 transition-all duration-300`}
            >
              <div className="flex flex-col items-center gap-3 sm:gap-4">
                <div className="text-center w-full">
                  <div
                    className={`inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl border ${isDark ? "bg-slate-800 border-blue-400/30" : "bg-slate-100 border-blue-300/30"}`}
                  >
                    <div
                      className={`w-2 h-2 ${isDark ? "bg-cyan-400" : "bg-blue-400"} rounded-full animate-pulse`}
                    />
                    <span
                      className={`text-xs sm:text-sm font-bold ${isDark ? "text-blue-300" : "text-blue-700"}`}
                    >
                      Projects
                    </span>
                    <div
                      className={`w-px h-4 ${isDark ? "bg-blue-400/30" : "bg-blue-300/50"}`}
                    />
                    <span
                      className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}
                    >
                      {coverData.dateRange || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cover Image Placeholder */}
        <div className="px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4">
            <div
              className={`relative w-full aspect-[16/9] sm:aspect-[16/9] overflow-hidden rounded-2xl border-2 border-dashed ${isDark ? "border-blue-600 bg-blue-900/20" : "border-blue-300 bg-blue-50"} flex items-center justify-center`}
            >
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20"></div>
                    <div className={`relative p-3 rounded-full ${isDark ? "bg-blue-800" : "bg-blue-100"}`}>
                      <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Master Report Cover
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Aggregated from multiple projects
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Name */}
        <div className="px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
          <div className="w-full">
            <div
              className={`${isDark ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50" : "bg-gradient-to-br from-white to-indigo-50/20 border-indigo-100/50"} rounded-2xl p-4 sm:p-6 border`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-2 h-2 ${isDark ? "bg-indigo-400" : "bg-indigo-500"} rounded-full`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold uppercase tracking-wide ${isDark ? "text-indigo-400" : "text-indigo-700"}`}
                >
                  Project Name
                </span>
              </div>
              <div
                className={`text-center font-semibold text-sm sm:text-base leading-relaxed rounded-xl px-3 sm:px-4 py-2 sm:py-3 ${isDark ? "text-slate-200" : "text-slate-800"}`}
              >
                {coverData.projectName || "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Project Details Section */}
        <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
          <div className="w-full">
            <div
              className={`${isDark ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50" : "bg-gradient-to-br from-white to-blue-50/20 border-blue-100/50"} rounded-2xl p-4 sm:p-6 border`}
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div
                  className={`w-2 h-2 ${isDark ? "bg-blue-400" : "bg-blue-500"} rounded-full`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold uppercase tracking-wide ${isDark ? "text-blue-400" : "text-blue-700"}`}
                >
                  Project Details
                </span>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {/* Employer */}
                <div className="group">
                  <div
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border ${isDark ? "bg-gradient-to-r from-indigo-600/20 to-transparent border-indigo-600/30" : "bg-gradient-to-r from-indigo-50/50 to-transparent border-indigo-200/30"}`}
                  >
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div
                        className={`p-2 rounded-lg ${isDark ? "bg-indigo-500/20" : "bg-indigo-100"}`}
                      >
                        <Building
                          className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                        />
                      </div>
                      <span
                        className={`font-semibold text-sm ${isDark ? "text-indigo-300" : "text-indigo-900"}`}
                      >
                        Client
                      </span>
                    </div>
                    <div className="flex-1 w-full">
                      <div
                        className={`w-full font-medium ${isDark ? "text-indigo-200" : "text-indigo-800"}`}
                      >
                        {coverData.employer || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contractor */}
                <div className="group">
                  <div
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border ${isDark ? "bg-gradient-to-r from-blue-600/20 to-transparent border-blue-600/30" : "bg-gradient-to-r from-blue-50/50 to-transparent border-blue-200/30"}`}
                  >
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div
                        className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}
                      >
                        <FileText
                          className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-blue-600"}`}
                        />
                      </div>
                      <span
                        className={`font-semibold text-sm ${isDark ? "text-blue-300" : "text-blue-900"}`}
                      >
                        Contractor
                      </span>
                    </div>
                    <div className="flex-1 w-full">
                      <div
                        className={`w-full font-medium ${isDark ? "text-blue-200" : "text-blue-800"}`}
                      >
                        {coverData.contractorName || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterReportCover;
