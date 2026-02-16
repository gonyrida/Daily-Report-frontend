import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Calendar,
  FileText,
  Building,
  X,
  ImageIcon,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface WeeklyReportCoverProps {
  data?: {
    weekNumber?: string;
    dateRange?: string;
    projectName?: string;
    employer?: string;
    contractor?: string;
    coverImage?: string;
  };
  onDataChange?: (data: any) => void;
}

const WeeklyReportCover: React.FC<WeeklyReportCoverProps> = ({
  data = {},
  onDataChange,
}) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  // Helper to format date as 'DD-MMM-YY'
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Parse initial start date from data.dateRange if possible
  let initialStartDate: string = "";
  if (data.dateRange) {
    const match = data.dateRange.match(/(\d{1,2}-[A-Za-z]{3}-\d{2})/);
    if (match) initialStartDate = match[1].split("-").reverse().join("-"); // fallback, not robust
  }

  const [coverData, setCoverData] = useState({
    weekNumber: data.weekNumber || "",
    startDate: initialStartDate || "",
    dateRange: data.dateRange || "",
    projectName:
      data.projectName ||
      "Renovation Works of The Project for Building Capacity and Establishing Enabling Environment in ICT Majors of TVET in Cambodia",
    employer: data.employer || "Client Name",
    contractor:
      data.contractor ||
      "Cambodian Advanced Construction Project Management (CACPM) Co., Ltd",
    coverImage: data.coverImage || "/placeholder-construction.jpg",
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImageData = e.target?.result as string;
        const updatedData = { ...coverData, coverImage: newImageData };
        setCoverData(updatedData);
        onDataChange?.(updatedData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    let updatedData = { ...coverData, [field]: value };
    // If startDate changes, auto-calculate dateRange
    if (field === "startDate") {
      if (value) {
        const start = new Date(value);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const formattedRange = `${formatDate(start)} ~ ${formatDate(end)}`;
        updatedData = { ...updatedData, dateRange: formattedRange };
      } else {
        updatedData = { ...updatedData, dateRange: "" };
      }
    }
    setCoverData(updatedData);
    onDataChange?.(updatedData);
  };

  return (
    <div className={`w-full ${isDark ? "bg-slate-950" : "bg-white"}`}>
      {/* Full-width A4-style layout */}
      <div className="max-w-7xl mx-auto">
        {/* Main Title */}
        <div className="text-center pt-8 pb-4">
          <h1
            className={`text-4xl font-bold uppercase tracking-wide ${isDark ? "text-white" : "text-blue-900"}`}
          >
            WEEKLY PROGRESS REPORT
          </h1>
        </div>

        {/* Project Week Number */}
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div
              className={`absolute -inset-0.5 ${isDark ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20" : "bg-gradient-to-r from-indigo-400/20 to-blue-500/20"} rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500`}
            ></div>
            <div
              className={`relative flex items-center gap-3 px-6 py-3 ${isDark ? "bg-gradient-to-r from-slate-900 to-slate-800 border-slate-600" : "bg-gradient-to-r from-white to-slate-50 border-slate-300"} rounded-2xl  transition-all duration-300`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 ${isDark ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gradient-to-r from-indigo-500 to-blue-500"} rounded-lg`}
                >
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <span
                  className={`text-lg font-bold ${isDark ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400" : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600"}`}
                >
                  Week
                </span>
              </div>
              <div
                className={`w-px h-6 ${isDark ? "bg-gradient-to-b from-slate-600 to-slate-400" : "bg-gradient-to-b from-slate-300 to-slate-400"}`}
              />
              <Input
                value={coverData.weekNumber}
                type="text"
                inputMode="numeric"
                onChange={(e) =>
                  handleFieldChange(
                    "weekNumber",
                    e.target.value.replace(/\D/g, ""),
                  )
                }
                showIndicator={false}
                placeholder="No"
                style={{
                  width: `${Math.max(3, coverData.weekNumber.length + 1)}ch`,
                }}
                className={`text-center font-bold text-lg border-0 focus:ring-0 focus:border-0 focus:outline-none bg-transparent px-2 min-w-[50px] ${isDark ? "text-white placeholder:text-slate-400" : "text-slate-800 placeholder:text-slate-500"}`}
              />
            </div>
          </div>
        </div>

        {/* Project Date Range (auto-filled) */}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div
              className={`relative ${isDark ? "bg-slate-900 border-slate-600" : "bg-white border-slate-300"} rounded-2xl p-6  transition-all duration-300`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDark ? "bg-blue-900/30 border-blue-500/50" : "bg-blue-100 border-blue-300/50"}`}
                  >
                    <Calendar
                      className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-blue-600"}`}
                    />
                    <span
                      className={`text-sm font-bold ${isDark ? "text-cyan-300" : "text-blue-700"}`}
                    >
                      Start Date
                    </span>
                  </div>
                  <Input
                    type="date"
                    showIndicator={false}
                    value={coverData.startDate}
                    onChange={(e) =>
                      handleFieldChange("startDate", e.target.value)
                    }
                    className={`text-center font-semibold text-base px-4 py-2 rounded-xl min-w-[160px] transition-all duration-200  ${isDark ? "text-white border-blue-500/50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 bg-slate-800/50" : "text-slate-800 border-blue-300/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/20 bg-white"}`}
                  />
                </div>
                <div className="text-center">
                  <div
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl border ${isDark ? "bg-slate-800 border-blue-400/30" : "bg-slate-100 border-blue-300/30"}`}
                  >
                    <div
                      className={`w-2 h-2 ${isDark ? "bg-cyan-400" : "bg-blue-400"} rounded-full animate-pulse`}
                    />
                    <span
                      className={`text-sm font-bold ${isDark ? "text-blue-300" : "text-blue-700"}`}
                    >
                      From
                    </span>
                    <div
                      className={`w-px h-4 ${isDark ? "bg-blue-400/30" : "bg-blue-300/50"}`}
                    />
                    <span
                      className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}
                    >
                      {coverData.dateRange || "Select date"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="px-6 sm:px-8 lg:px-16 mb-8">
          <div className="flex flex-col space-y-4">
            <div
              className={`relative group w-full aspect-[16/9] overflow-hidden rounded-2xl border-2 ${coverData.coverImage && coverData.coverImage !== "/placeholder-construction.jpg" ? "border-blue-300 dark:border-blue-600 p-0" : "border-dashed border-blue-300 dark:border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6"} flex items-center justify-center transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer`}
              onPaste={(e) => {
                e.preventDefault();
                const items = e.clipboardData?.items;
                if (items) {
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith("image/")) {
                      const file = items[i].getAsFile();
                      if (file)
                        handleImageUpload({ target: { files: [file] } } as any);
                      break;
                    }
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter((f) =>
                  f.type.startsWith("image/"),
                );
                if (files.length > 0)
                  handleImageUpload({ target: { files: [files[0]] } } as any);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() =>
                document.getElementById("cover-image-upload")?.click()
              }
            >
              {(
                coverData.coverImage &&
                coverData.coverImage !== "/placeholder-construction.jpg"
              ) ?
                <div className="relative w-full h-full">
                  <img
                    src={coverData.coverImage}
                    alt="Cover image"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedData = {
                        ...coverData,
                        coverImage: "/placeholder-construction.jpg",
                      };
                      setCoverData(updatedData);
                      onDataChange?.(updatedData);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg">
                    COVER
                  </div>
                </div>
              : <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20"></div>
                      <div className="relative bg-blue-100 dark:bg-blue-800 p-3 rounded-full">
                        <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Drop or paste cover image
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    or click to browse
                  </p>
                </div>
              }
            </div>
          </div>

          <input
            id="cover-image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Project Name */}
        <div className="px-6 sm:px-8 lg:px-16 mb-8">
          <div className="w-full">
            <div
              className={`${isDark ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50" : "bg-gradient-to-br from-white to-indigo-50/20 border-indigo-100/50"} rounded-2xl p-6 border`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-2 h-2 ${isDark ? "bg-indigo-400" : "bg-indigo-500"} rounded-full`}
                />
                <span
                  className={`text-sm font-semibold uppercase tracking-wide ${isDark ? "text-indigo-400" : "text-indigo-700"}`}
                >
                  Project Name
                </span>
              </div>
              <Textarea
                value={coverData.projectName}
                onChange={(e) =>
                  handleFieldChange("projectName", e.target.value)
                }
                className={`text-center font-semibold text-base leading-relaxed resize-none min-h-[80px] rounded-xl px-4 py-3 transition-all duration-200 ${isDark ? " border-indigo-600/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 bg-slate-800 text-white placeholder:text-slate-400" : " border-indigo-200/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/20 bg-white text-slate-800 placeholder:text-slate-500"}`}
                placeholder="Enter project name"
              />
            </div>
          </div>
        </div>

        {/* Project Details Section */}
        <div className="px-6 sm:px-8 lg:px-16 pb-8">
          <div className="w-full">
            <div
              className={`${isDark ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50" : "bg-gradient-to-br from-white to-blue-50/20 border-blue-100/50"} rounded-2xl p-6 border`}
            >
              <div className="flex items-center gap-2 mb-6">
                <div
                  className={`w-2 h-2 ${isDark ? "bg-blue-400" : "bg-blue-500"} rounded-full`}
                />
                <span
                  className={`text-sm font-semibold uppercase tracking-wide ${isDark ? "text-blue-400" : "text-blue-700"}`}
                >
                  Project Details
                </span>
              </div>
              <div className="space-y-4">
                {/* Employer */}
                <div className="group">
                  <div
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${isDark ? "bg-gradient-to-r from-indigo-600/20 to-transparent border-indigo-600/30 hover:border-indigo-500/50" : "bg-gradient-to-r from-indigo-50/50 to-transparent border-indigo-200/30 hover:border-indigo-300/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${isDark ? "bg-indigo-500/20" : "bg-indigo-100"}`}
                      >
                        <Building
                          className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                        />
                      </div>
                      <Label
                        className={`font-semibold text-sm ${isDark ? "text-indigo-300" : "text-indigo-900"}`}
                      >
                        Employer
                      </Label>
                    </div>
                    <div className="flex-1">
                      <Input
                        value={coverData.employer}
                        showIndicator={false}
                        onChange={(e) =>
                          handleFieldChange("employer", e.target.value)
                        }
                        className={`w-full border-0 focus:ring-0 focus:border-0 focus:outline-none bg-transparent font-medium placeholder:opacity-70 ${isDark ? "text-indigo-200 placeholder:text-indigo-500" : "text-indigo-800 placeholder:text-indigo-400"}`}
                        placeholder="Client Name"
                      />
                    </div>
                  </div>
                </div>

                {/* Contractor */}
                <div className="group">
                  <div
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${isDark ? "bg-gradient-to-r from-blue-600/20 to-transparent border-blue-600/30 hover:border-blue-500/50" : "bg-gradient-to-r from-blue-50/50 to-transparent border-blue-200/30 hover:border-blue-300/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}
                      >
                        <FileText
                          className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-blue-600"}`}
                        />
                      </div>
                      <Label
                        className={`font-semibold text-sm ${isDark ? "text-blue-300" : "text-blue-900"}`}
                      >
                        Contractor
                      </Label>
                    </div>
                    <div className="flex-1">
                      <Input
                        disabled
                        value={coverData.contractor}
                        showIndicator={false}
                        onChange={(e) =>
                          handleFieldChange("contractor", e.target.value)
                        }
                        className={`w-full border-0 focus:ring-0 focus:border-0 focus:outline-none bg-transparent font-medium opacity-75 cursor-not-allowed placeholder:opacity-70 ${isDark ? "text-blue-200 placeholder:text-blue-500" : "text-blue-800 placeholder:text-blue-400"}`}
                        placeholder="Contractor Name"
                      />
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

export default WeeklyReportCover;
