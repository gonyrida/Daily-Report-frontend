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

interface WeeklyReportLetterProps {
  data?: {
    weekNumber?: string;
    dateRange?: string;
    projectName?: string;
    reportDate?: string;
    recipientCompany?: string;
    recipientLocation?: string;
    recipientName?: string;
    ccList?: string[];
    letterBody?: string;
    signatureImage?: string;
    signatoryName?: string;
    signatoryPosition?: string;
    constructorName?: string;
    companyLocation?: string;
    companyPhone1?: string;
    companyPhone2?: string;
    companyEmail1?: string;
    companyEmail2?: string;
    refNoPrefix?: string;
    employer?: string;
  };
  onDataChange?: (data: any) => void;
}

const WeeklyReportLetter: React.FC<WeeklyReportLetterProps> = ({
  data = {},
  onDataChange,
}) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  const [letterData, setLetterData] = useState({
    weekNumber: data.weekNumber || "",
    dateRange: data.dateRange || "",
    projectName: data.projectName || "",
    reportDate: data.reportDate || new Date().toISOString().split("T")[0],
    recipientCompany: data.recipientCompany || "",
    recipientLocation: data.recipientLocation || "",
    recipientName: data.recipientName || "",
    ccList: data.ccList || [""],
    letterBody: data.letterBody || "",
    signatureImage: data.signatureImage || "",
    signatoryName: data.signatoryName || "",
    signatoryPosition: data.signatoryPosition || "Project Manager",
    constructorName:
      "Cambodian Advanced Construction Project Management (CACPM)",
    companyLocation:
      "8th floor, K1 Tower, No.148, Mao Tse Toung Blvd (245),Sangkat Toul Tumpong II, Khan Chamkamom, Phnom Penh, Cambodia",
    companyPhone1: "+855 (0) 23 964 417~8",
    companyPhone2: data.companyPhone2 || "",
    companyEmail1: data.companyEmail1 || "",
    companyEmail2: "info@cacpm.com.kh",
    refNoPrefix: data.refNoPrefix || "ICT-CPM-LETTER",
  });

  // Auto-generate letter body when key fields change
  useEffect(() => {
    const generatedBody = `Dear Sir,\nWe are pleased to submit Weekly Progress Report No. ${letterData.weekNumber} from ${letterData.dateRange} for ${letterData.projectName}.`;
    if (generatedBody !== letterData.letterBody) {
      setLetterData((prev) => ({ ...prev, letterBody: generatedBody }));
    }
  }, [letterData.weekNumber, letterData.dateRange, letterData.projectName]);

  // Sync with shared data from parent
  useEffect(() => {
    setLetterData((prev) => {
      const updatedData = {
        ...prev,
        weekNumber: data.weekNumber || prev.weekNumber,
        dateRange: data.dateRange || prev.dateRange,
        projectName: data.projectName || prev.projectName,
        refNoPrefix: data.refNoPrefix || prev.refNoPrefix,
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
  ]);

  // Auto-set report date based on date range
  useEffect(() => {
    if (letterData.dateRange) {
      // Extract the last day from date range format "DD-MMM-YY ~ DD-MMM-YY"
      const match = letterData.dateRange.match(
        /(\d{1,2}-[A-Za-z]{3}-\d{2})\s*~\s*(\d{1,2}-[A-Za-z]{3}-\d{2})/,
      );
      if (match && match[2]) {
        // Convert "DD-MMM-YY" to "YYYY-MM-DD" format
        const lastDayStr = match[2];
        const parts = lastDayStr.split("-");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const monthMap: { [key: string]: string } = {
            Jan: "01",
            Feb: "02",
            Mar: "03",
            Apr: "04",
            May: "05",
            Jun: "06",
            Jul: "07",
            Aug: "08",
            Sep: "09",
            Oct: "10",
            Nov: "11",
            Dec: "12",
          };
          const month = monthMap[parts[1]] || "01";
          const year = "20" + parts[2]; // Convert YY to YYYY
          const formattedDate = `${year}-${month}-${day}`;

          if (formattedDate !== letterData.reportDate) {
            setLetterData((prev) => ({ ...prev, reportDate: formattedDate }));
            onDataChange?.({ ...letterData, reportDate: formattedDate });
          }
        }
      }
    } else {
      // If no date range, use today's date
      const today = new Date().toISOString().split("T")[0];
      if (today !== letterData.reportDate) {
        setLetterData((prev) => ({ ...prev, reportDate: today }));
        onDataChange?.({ ...letterData, reportDate: today });
      }
    }
  }, [letterData.dateRange]);

  const handleFieldChange = (field: string, value: string) => {
    const updatedData = { ...letterData, [field]: value };
    setLetterData(updatedData);
    onDataChange?.(updatedData);
  };

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

  const handleSignatureUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newSignatureData = e.target?.result as string;
        const updatedData = { ...letterData, signatureImage: newSignatureData };
        setLetterData(updatedData);
        onDataChange?.(updatedData);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      className={`w-full ${isDark ? "bg-slate-950" : "bg-white"} min-h-screen`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8 pb-8">
        {/* Letter Header */}
        <div
          className={`mb-8 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700/50" : "bg-white border-slate-200"}`}
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <h1
                className={`text-3xl font-bold ${isDark ? "text-white" : "text-blue-900"} uppercase tracking-wider`}
              >
                Weekly Progress Report No. {letterData.weekNumber || "____"}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Field 1: Ref. No. */}
              <div className="space-y-2">
                <Label
                  className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base">Reference Number</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={letterData.refNoPrefix}
                    showIndicator={false}
                    onChange={(e) =>
                      handleFieldChange("refNoPrefix", e.target.value)
                    }
                    placeholder="Prefix"
                    className={`flex-1 border-2 focus:border-blue-500 focus:outline-none transition-colors ${isDark ? "bg-slate-800/50 border-slate-600/50 text-white" : "bg-white/80 border-slate-200/60 text-slate-900"}`}
                  />
                  <div
                    className={`flex items-center px-4 rounded-lg ${isDark ? "bg-slate-700/50 border-slate-600/50 text-slate-300" : "bg-slate-100/60 border-slate-200/60 text-slate-600"} border-2`}
                  >
                    <span className="font-mono">-</span>
                  </div>
                  <Input
                    value={letterData.weekNumber || "____"}
                    disabled
                    className={`w-24 border-2 ${isDark ? "bg-slate-800/30 border-slate-600/30 text-slate-400" : "bg-slate-50/60 border-slate-200/30 text-slate-500"}`}
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
                  className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  <Calendar className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base">Report Date</span>
                </Label>
                <div className="relative">
                  <Calendar
                    className={`absolute top-3 left-3 w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  />
                  <Input
                    type="date"
                    value={letterData.reportDate}
                    showIndicator={false}
                    onChange={(e) =>
                      handleFieldChange("reportDate", e.target.value)
                    }
                    className={`pl-10 w-full border-2 focus:border-blue-500 focus:outline-none transition-colors ${isDark ? "bg-slate-800/50 border-slate-600/50 text-white" : "bg-white/80 border-slate-200/60 text-slate-900"}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipient Section */}
        <div
          className={`mb-8 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-700/50" : "bg-white border-slate-200"}`}
        >
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
              >
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <h2
                className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
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
                    handleFieldChange("recipientCompany", e.target.value)
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
                    handleFieldChange("recipientLocation", e.target.value)
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
                    handleFieldChange("recipientName", e.target.value)
                  }
                  placeholder="Recipient name"
                  className={`mt-1 font-bold focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label
                    className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}
                  >
                    <span className="text-base">CC:</span>
                  </Label>
                  <Button
                    onClick={addCCRow}
                    variant="outline"
                    size="sm"
                    className={`text-xs font-medium px-4 py-2 rounded-lg border-2 bg-gradient-to-r ${isDark ? "from-blue-600 to-blue-700 border-transparent text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" : "from-blue-500 to-blue-600 border-transparent text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add CC
                  </Button>
                </div>

                {letterData.ccList.map((cc, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      showIndicator={false}
                      value={cc}
                      onChange={(e) => handleCCChange(index, e.target.value)}
                      placeholder={`CC ${index + 1}`}
                      className={`flex-1 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                    />
                    {letterData.ccList.length > 1 && (
                      <Button
                        onClick={() => removeCCRow(index)}
                        variant="outline"
                        size="sm"
                        className={`px-2 border-2 hover:bg-red-50 transition-colors ${isDark ? "border-blue-600/30 text-red-400 hover:bg-red-900/20" : "border-blue-200/60 text-red-600"}`}
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
                <span className="text-base">Message Body</span>
              </Label>
              <Textarea
                value={letterData.letterBody}
                onChange={(e) =>
                  handleFieldChange("letterBody", e.target.value)
                }
                className={`min-h-[150px] border-2 focus:border-blue-500 focus:outline-none transition-colors resize-none ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                placeholder="Enter your letter content here..."
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
                    letterData.signatureImage ?
                      isDark ? "border-blue-600 bg-blue-800/30"
                      : "border-blue-400 bg-blue-50/60"
                    : isDark ?
                      "border-blue-600/30 bg-blue-800/20 hover:border-blue-500/60"
                    : "border-blue-300/60 bg-blue-50/40 hover:border-blue-400/80"
                  }`}
                  onClick={() =>
                    document.getElementById("signature-upload")?.click()
                  }
                >
                  {letterData.signatureImage ?
                    <div className="relative w-full h-full">
                      <img
                        src={letterData.signatureImage}
                        alt="Signature"
                        className="w-full h-full object-contain p-2"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldChange("signatureImage", "");
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  : <div className="text-center">
                      <ImageIcon
                        className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-blue-400" : "text-blue-500"}`}
                      />
                      <p
                        className={`text-sm ${isDark ? "text-blue-300" : "text-blue-600"}`}
                      >
                        Click to upload signature
                      </p>
                    </div>
                  }
                </div>
                <input
                  id="signature-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={letterData.signatoryName}
                      showIndicator={false}
                      onChange={(e) =>
                        handleFieldChange("signatoryName", e.target.value)
                      }
                      placeholder="Signatory name"
                      className={`flex-1 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
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
                      <Input
                        value={letterData.companyPhone2}
                        showIndicator={false}
                        onChange={(e) =>
                          handleFieldChange("companyPhone2", e.target.value)
                        }
                        placeholder="Additional phone"
                        className={`mt-1 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none border-2 focus:border-blue-500 ${isDark ? "bg-slate-800/50 border-blue-600/30 text-white" : "bg-white/80 border-blue-200/60 text-slate-900"}`}
                      />
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
                          handleFieldChange("companyEmail1", e.target.value)
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
