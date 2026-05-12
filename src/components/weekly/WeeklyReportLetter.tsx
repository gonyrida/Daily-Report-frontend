import React, { useState, useEffect } from "react";
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
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { WeeklyReportLetterProps } from "@/types/weeklyReportLetter.types";
import { formatDate } from "@/lib/dateUtils";
import { handleSignatureUpload } from "@/lib/fileUploadUtils";
import { handleFieldChange } from "@/lib/fieldUtils";

const WeeklyReportLetter: React.FC<WeeklyReportLetterProps> = ({
  data = {},
  onDataChange,
}) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  // Helper function to format date to yyyy-MM-dd
  const formatDateToYYYYMMDD = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    
    // If already in correct format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse DD-MMM-YY format
    const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (match) {
      const day = match[1].padStart(2, "0");
      const monthMap: { [key: string]: string } = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
      };
      const month = monthMap[match[2]] || "01";
      const year = "20" + match[3];
      return `${year}-${month}-${day}`;
    }
    
    // Fallback to today's date
    return new Date().toISOString().split("T")[0];
  };

  const [letterData, setLetterData] = useState({
    weekNumber: data.weekNumber || "",
    dateRange: data.dateRange || "",
    projectName: data.projectName || "",
    reportDate: data.reportDate ? formatDateToYYYYMMDD(data.reportDate) : new Date().toISOString().split("T")[0],
    recipientCompany: data.recipientCompany || "",
    recipientLocation: data.recipientLocation || "",
    recipientName: data.recipientName || "",
    ccList: data.ccList || [""],
    letterBody: data.letterBody || "",
    signatureImage: data.signatureImage || "",
    signatoryName: data.signatoryName || "",
    signatoryPosition: data.signatoryPosition || "Project Manager",
    constructorName: data.constructorName || "Cambodian Advanced Construction Project Management (CACPM)",
    companyLocation: data.companyLocation || "8th floor, K1 Tower, No.148, Mao Tse Toung Blvd (245),Sangkat Toul Tumpong II, Khan Chamkamom, Phnom Penh, Cambodia",
    companyPhone1: data.companyPhone1 || "T +855 (0) 23 964 417~8",
    companyPhone2: data.companyPhone2 || "",
    companyEmail1: data.companyEmail1 || "",
    companyEmail2: data.companyEmail2 || "www.cambodiacpm.com",
    refNoPrefix: data.refNoPrefix || "ICT-CPM-WRP",
  });

  // Sync with parent data changes (when selected report changes)
  useEffect(() => {
    setLetterData({
      weekNumber: data.weekNumber || "",
      dateRange: data.dateRange || "",
      projectName: data.projectName || "",
      reportDate: data.reportDate ? formatDateToYYYYMMDD(data.reportDate) : new Date().toISOString().split("T")[0],
      recipientCompany: data.recipientCompany || "",
      recipientLocation: data.recipientLocation || "",
      recipientName: data.recipientName || "",
      ccList: data.ccList || [""],
      letterBody: data.letterBody || "",
      signatureImage: data.signatureImage || "",
      signatoryName: data.signatoryName || "",
      signatoryPosition: data.signatoryPosition || "Project Manager",
      constructorName: data.constructorName || "Cambodian Advanced Construction Project Management (CACPM)",
      companyLocation: data.companyLocation || "8th floor, K1 Tower, No.148, Mao Tse Toung Blvd (245),Sangkat Toul Tumpong II, Khan Chamkamom, Phnom Penh, Cambodia",
      companyPhone1: data.companyPhone1 || "T +855 (0) 23 964 417~8",
      companyPhone2: data.companyPhone2 || "",
      companyEmail1: data.companyEmail1 || "",
      companyEmail2: data.companyEmail2 || "www.cambodiacpm.com",
      refNoPrefix: data.refNoPrefix || "ICT-CPM-WRP",
    });
  }, [data]);

  useEffect(() => {
    // Only auto-generate letter body if it's empty and we have the required fields
    if (!letterData.letterBody || letterData.letterBody === '') {
      // Parse date range to get start and end dates
      let dateRangeText = letterData.dateRange;
      if (letterData.dateRange && letterData.dateRange.includes("~")) {
        const dates = letterData.dateRange.split("~");
        if (dates.length === 2) {
          dateRangeText = `from ${dates[0].trim()} to ${dates[1].trim()}`;
        }
      }

      const generatedBody = `Dear Sir,<br>We are pleased to submit Weekly Progress Report No-${letterData.weekNumber} ${dateRangeText} for ${letterData.projectName}.<br><br>Sincerely Yours,`;
      setLetterData((prev) => ({ ...prev, letterBody: generatedBody }));
    }
  }, [letterData.weekNumber, letterData.dateRange, letterData.projectName, letterData.letterBody]);

  const handleCCChange = (index: number, value: string) => {
    const updatedCCList = [...letterData.ccList];
    updatedCCList[index] = value;
    setLetterData((prev) => ({ ...prev, ccList: updatedCCList }));
    onDataChange?.({ ...letterData, ccList: updatedCCList });
  };

  const addCCRow = () => {
    const updatedCCList = [...letterData.ccList, ""];
    setLetterData((prev) => ({ ...prev, ccList: updatedCCList }));
    onDataChange?.({ ...letterData, ccList: updatedCCList });
  };

  const removeCCRow = (index: number) => {
    if (letterData.ccList.length > 1) {
      const updatedCCList = letterData.ccList.filter((_, i) => i !== index);
      setLetterData((prev) => ({ ...prev, ccList: updatedCCList }));
      onDataChange?.({ ...letterData, ccList: updatedCCList });
    }
  };

  // Sync with shared data from parent
  useEffect(() => {
    setLetterData((prev) => {
      const updatedData = {
        ...prev,
        weekNumber: data.weekNumber || prev.weekNumber,
        dateRange: data.dateRange || prev.dateRange,
        projectName: data.projectName || prev.projectName,
        refNoPrefix: data.refNoPrefix || prev.refNoPrefix,
        // Preserve signatory data if it exists in parent data, otherwise keep current values
        signatureImage: data.signatureImage !== undefined ? data.signatureImage : prev.signatureImage,
        signatoryName: data.signatoryName !== undefined ? data.signatoryName : prev.signatoryName,
        companyEmail1: data.companyEmail1 !== undefined ? data.companyEmail1 : prev.companyEmail1,
      };

      // Auto-update recipientCompany with employer data
      if (data.employer && data.employer !== prev.recipientCompany) {
        updatedData.recipientCompany = data.employer;
      }

      return updatedData;
    });
  }, [
    data.weekNumber,
    data.dateRange,
    data.projectName,
    data.refNoPrefix,
    data.employer,
    data.signatureImage,
    data.signatoryName,
    data.companyEmail1,
  ]);

  // Only set default report date if none provided
  useEffect(() => {
    if (!data.reportDate) {
      const today = new Date().toISOString().split("T")[0];
      if (today !== letterData.reportDate) {
        setLetterData((prev) => ({ ...prev, reportDate: today }));
      }
    }
  }, [data.reportDate]);

  return (
    <div
      className={`w-full ${isDark ? "bg-slate-950" : "bg-white"} min-h-screen`}
    >
      <div className="w-full px-3 sm:px-4 lg:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8">
        {/* Letter Header */}
        <div
          className={`mb-6 sm:mb-8 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700/50" : "bg-white border-slate-200"}`}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <h1
                className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isDark ? "text-white" : "text-blue-900"} uppercase tracking-wider`}
              >
                Weekly Progress Report No. {letterData.weekNumber || "____"}
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Field 1: Ref. No. */}
              <div className="space-y-2">
                <Label
                  className={`text-xs sm:text-sm font-semibold flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  <FileText className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Reference Number</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={letterData.refNoPrefix}
                    showIndicator={false}
                    onChange={(e) =>
                      handleFieldChange("refNoPrefix", e.target.value, letterData, setLetterData, onDataChange)
                    }
                    placeholder="Prefix"
                    className={`flex-1 border-2 focus:border-blue-500 focus:outline-none transition-colors text-sm ${isDark ? "bg-slate-800/50 border-slate-600/50 text-white" : "bg-white/80 border-slate-200/60 text-slate-900"}`}
                  />
                  <div
                    className={`flex items-center px-3 sm:px-4 rounded-lg text-sm ${isDark ? "bg-slate-700/50 border-slate-600/50 text-slate-300" : "bg-slate-100/60 border-slate-200/60 text-slate-600"} border-2`}
                  >
                    <span className="font-mono">-</span>
                  </div>
                  <Input
                    value={letterData.weekNumber || "____"}
                    disabled
                    className={`w-16 sm:w-24 border-2 text-sm ${isDark ? "bg-slate-800/30 border-slate-600/30 text-slate-400" : "bg-slate-50/60 border-slate-200/30 text-slate-500"}`}
                  />
                </div>
                <div
                  className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  Full reference: {letterData.refNoPrefix}-
                  {letterData.weekNumber || "____"}
                </div>
              </div>

              {/* Field 2: Date */}
              <div className="space-y-2">
                <Label
                  className={`text-xs sm:text-sm font-semibold flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  <Calendar className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Report Date</span>
                </Label>
                <div className="relative">
                  <Calendar
                    className={`absolute top-2.5 sm:top-3 left-3 w-3 sm:w-4 h-3 sm:h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  />
                  <Input
                    type="date"
                    value={letterData.reportDate}
                    showIndicator={false}
                    onChange={(e) =>
                      handleFieldChange("reportDate", e.target.value, letterData, setLetterData, onDataChange)
                    }
                    className={`pl-8 sm:pl-10 w-full border-2 focus:border-blue-500 focus:outline-none transition-colors text-sm ${isDark ? "bg-slate-800/50 border-slate-600/50 text-white" : "bg-white/80 border-slate-200/60 text-slate-900"}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipient Section */}
        <div
          className={`mb-6 sm:mb-8 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700/50" : "bg-white border-slate-200"}`}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div
                className={`p-2 sm:p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
              >
                <Building className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
              </div>
              <h2
                className={`text-lg sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                Recipient Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label
                  className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}
                >
                  <span className="text-base">To:</span>
                </Label>
                <Input
                  value={letterData.recipientCompany}
                  showIndicator={false}
                  onChange={(e) =>
                    handleFieldChange("recipientCompany", e.target.value, letterData, setLetterData, onDataChange)
                  }
                  placeholder="Client company name"
                  className={`mt-1 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                />
              </div>

              <div>
                <Input
                  value={letterData.recipientLocation}
                  showIndicator={false}
                  onChange={(e) =>
                    handleFieldChange("recipientLocation", e.target.value, letterData, setLetterData, onDataChange)
                  }
                  placeholder="Client location"
                  className={`focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                />
              </div>

              <div>
                <Label
                  className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}
                >
                  <span className="text-base">Att.:</span>
                </Label>
                <Input
                  value={letterData.recipientName}
                  showIndicator={false}
                  onChange={(e) =>
                    handleFieldChange("recipientName", e.target.value, letterData, setLetterData, onDataChange)
                  }
                  placeholder="Recipient name"
                  className={`mt-1 font-bold focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                  <Label
                    className={`text-xs sm:text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}
                  >
                    <span className="text-sm sm:text-base">CC:</span>
                  </Label>
                  <Button
                    onClick={addCCRow}
                    variant="outline"
                    size="sm"
                    className={`text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg border-2 bg-gradient-to-r ${isDark ? "from-blue-600 to-blue-700 border-transparent text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" : "from-blue-500 to-blue-600 border-transparent text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"}`}
                  >
                    <Plus className="w-3 h-3 sm:w-3 sm:h-3 mr-1" />
                    <span className="hidden sm:inline">Add CC</span><span className="sm:hidden">Add</span>
                  </Button>
                </div>

                {letterData.ccList.map((cc, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <Input
                      showIndicator={false}
                      value={cc}
                      onChange={(e) => handleCCChange(index, e.target.value)}
                      placeholder={`CC ${index + 1}`}
                      className={`flex-1 font-semibold text-sm w-full sm:w-96 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                    />
                    {letterData.ccList.length > 1 && (
                      <Button
                        onClick={() => removeCCRow(index)}
                        variant="outline"
                        size="sm"
                        className={`px-2 border-2 hover:bg-red-50 transition-colors flex-shrink-0 ${isDark ? "border-blue-600/30 text-red-400 hover:bg-red-900/20" : "border-blue-200/60 text-red-600"}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Letter Body */}
        <div
          className={`mb-8 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700/50" : "bg-white border-slate-200"}`}
        >
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
              >
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2
                className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                Letter Content
              </h2>
            </div>

            <div className="space-y-2">
              <Label
                className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}
              >
                {/* <span className="text-base">Message Body</span> */}
              </Label>
              <div
                contentEditable
                suppressContentEditableWarning={true}
                onInput={(e) => {
                  handleFieldChange("letterBody", e.currentTarget.innerHTML, letterData, setLetterData, onDataChange);
                }}
                className={`min-h-[150px] border-2 focus:border-blue-500 focus:outline-none transition-colors resize-none p-3 rounded-md ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"} ${!letterData.letterBody || letterData.letterBody === "<br>" ? "before:content-[attr(data-placeholder)] before:text-gray-400 before: pointer-events-none" : ""}`}
                data-placeholder="Enter your letter content here..."
                dangerouslySetInnerHTML={{
                  __html:
                    letterData.letterBody.replace(
                      /Dear Sir/g,
                      '<span style="font-weight: 500;">Dear Sir</span>',
                    ) || "Enter your letter content here...",
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div
          className={`mb-8 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700/50" : "bg-white border-slate-200"}`}
        >
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
              >
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h2
                className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                Signatory & Company Information
              </h2>
            </div>

            <div className="space-y-4">
              {/* Signature Section */}
              <div>
                <Label
                  className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-700"}`}
                >
                  <span className="text-base">Signature</span>
                </Label>
                <div
                  className={`mt-1 relative group w-64 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                    letterData.signatureImage
                      ? isDark
                        ? "border-blue-600 bg-blue-800/30"
                        : "border-blue-400 bg-blue-50/60"
                      : isDark
                        ? "border-blue-600/30 bg-blue-800/20 hover:border-blue-500/60"
                        : "border-blue-300/60 bg-blue-50/40 hover:border-blue-400/80"
                  }`}
                  onClick={() =>
                    document.getElementById("signature-upload")?.click()
                  }
                >
                  {letterData.signatureImage ? (
                    <div className="relative w-full h-full">
                      <img
                        src={letterData.signatureImage}
                        alt="Signature"
                        className="w-full h-full object-contain p-2"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldChange("signatureImage", null, letterData, setLetterData, onDataChange);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ImageIcon
                        className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-blue-400" : "text-blue-500"}`}
                      />
                      <p
                        className={`text-sm ${isDark ? "text-blue-300" : "text-blue-600"}`}
                      >
                        Click to upload signature
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="signature-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleSignatureUpload(e, letterData, setLetterData, onDataChange);
                  }}
                  className="hidden"
                />

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={letterData.signatoryName}
                      showIndicator={false}
                      onChange={(e) =>
                        handleFieldChange("signatoryName", e.target.value, letterData, setLetterData, onDataChange)
                      }
                      placeholder="Signatory name"
                      className={`flex-1 font-semibold focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                    />
                    <span
                      className={`text-sm font-medium ${isDark ? "text-blue-400" : "text-blue-600"}`}
                    >
                      |
                    </span>
                    <Input
                      value={letterData.signatoryPosition}
                      disabled
                      placeholder="Position"
                      className={`flex-1 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-0 focus:border-0 focus:ring-0 bg-transparent font-medium opacity-75 cursor-not-allowed placeholder:opacity-70 ${isDark ? "text-blue-200 placeholder:text-blue-500" : "text-blue-800 placeholder:text-blue-400"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div>
                <div className="space-y-4">
                  <div>
                    <Label
                      className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-700"}`}
                    >
                      <span className="text-base">Constructor Name</span>
                    </Label>
                    <Input
                      value={letterData.constructorName}
                      disabled
                      className={`mt-1 border-0 focus:ring-0 focus:border-0 focus:outline-none bg-transparent font-medium opacity-75 cursor-not-allowed placeholder:opacity-70 ${isDark ? "text-blue-200 placeholder:text-blue-500" : "text-blue-800 placeholder:text-blue-400"}`}
                    />
                  </div>

                  <div>
                    <Label
                      className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-700"} flex items-center gap-2`}
                    >
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="text-base">Location</span>
                    </Label>
                    <Input
                      value={letterData.companyLocation}
                      disabled
                      className={`mt-1 border-0 focus:ring-0 focus:border-0 focus:outline-none bg-transparent font-medium opacity-75 cursor-not-allowed placeholder:opacity-70 ${isDark ? "text-blue-200 placeholder:text-blue-500" : "text-blue-800 placeholder:text-blue-400"}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-700"} flex items-center gap-2`}
                      >
                        <Phone className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-base">Phone 1</span>
                      </Label>
                      <Input
                        value={letterData.companyPhone1}
                        disabled
                        className={`mt-1 border-0 focus:ring-0 focus:border-0 focus:outline-none bg-transparent font-medium opacity-75 cursor-not-allowed placeholder:opacity-70 ${isDark ? "text-blue-200 placeholder:text-blue-500" : "text-blue-800 placeholder:text-blue-400"}`}
                      />
                    </div>

                    <div>
                      <Label
                        className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-700"} flex items-center gap-2`}
                      >
                        <Phone className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-base">Phone 2</span>
                      </Label>
                      <div className="flex items-center mt-1">
                        <span
                          className={`px-3 py-2 border-2 border-r-0 rounded-l-md font-medium h-10 flex items-center ${isDark ? "bg-slate-700/50 border-blue-600/30 text-blue-200" : "bg-slate-100/60 border-blue-200/60 text-blue-700"}`}
                        >
                          +855 (0)
                        </span>
                        <Input
                          value={letterData.companyPhone2}
                          showIndicator={false}
                          onChange={(e) =>
                            handleFieldChange("companyPhone2", e.target.value, letterData, setLetterData, onDataChange)
                          }
                          placeholder="23 123 456"
                          className={`flex-1 rounded-l-none border-2 h-10 ${
                            isDark
                              ? "bg-slate-800/50 text-white border-blue-600/30"
                              : "bg-white/80 text-slate-900 border-blue-200/60"
                          }`}
                          style={{
                            outline: "none",
                            boxShadow: "none",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label
                        className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-700"} flex items-center gap-2`}
                      >
                        <Mail className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-base">Email 1</span>
                      </Label>
                      <Input
                        value={letterData.companyEmail1}
                        showIndicator={false}
                        onChange={(e) =>
                          handleFieldChange("companyEmail1", e.target.value, letterData, setLetterData, onDataChange)
                        }
                        placeholder="Primary email"
                        className={`mt-1 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                      />
                    </div>

                    <div>
                      <Label
                        className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-700"} flex items-center gap-2`}
                      >
                        <Mail className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-base">Email 2</span>
                      </Label>
                      <Input
                        value={letterData.companyEmail2}
                        disabled
                        className={`mt-1 border-0 focus:ring-0 focus:border-0 focus:outline-none bg-transparent font-medium opacity-75 cursor-not-allowed placeholder:opacity-70 ${isDark ? "text-blue-200 placeholder:text-blue-500" : "text-blue-800 placeholder:text-blue-400"}`}
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

export default WeeklyReportLetter;
