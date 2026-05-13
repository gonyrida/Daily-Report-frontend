// src/components/weekly/MasterReportCoverSelector.tsx
import React, { useState } from "react";
import { ImageIcon, Check, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { isValidCoverImage } from "@/utils/imageUtils";

export interface AvailableCoverImage {
  projectId: string;
  projectName: string;
  coverImage: string;
  status: string;
  submittedAt?: string;
}

interface MasterReportCoverSelectorProps {
  availableImages: AvailableCoverImage[];
  selectedImage: string;
  onSelectImage: (coverImage: string, reportId?: string) => void;
  onClose: () => void;
  onConfirm?: () => void;
}

const MasterReportCoverSelector: React.FC<MasterReportCoverSelectorProps> = ({
  availableImages,
  selectedImage,
  onSelectImage,
  onClose,
  onConfirm,
}) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  // Debug: Log what images we received
  // console.log('MasterReportCoverSelector received images:', availableImages);
  
  // Simple validation: just check for non-empty string (backend already validated)
  const validImages = availableImages.filter((img) => {
    const hasImage = !!img.coverImage && img.coverImage.trim() !== '' && img.coverImage !== '/placeholder-construction.jpg';
    return hasImage;
  });

  // Use index for selection to handle duplicate coverImage URLs
  const [selectedIndex, setSelectedIndex] = useState<number>(
    validImages.findIndex(img => img.coverImage === selectedImage)
  );
  
  // Track selected report ID
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // Get currently selected image
  const localSelection = selectedIndex >= 0 ? validImages[selectedIndex]?.coverImage : '';

  if (validImages.length === 0) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? "bg-black/70" : "bg-black/50"}`} onClick={onClose}>
        <div className={`relative max-w-md w-full rounded-2xl p-6 ${isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X className="w-5 h-5" />
          </button>
          <div className="text-center py-8">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
              <ImageIcon className={`w-8 h-8 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>No Valid Cover Images</h3>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Received {availableImages.length} images but none passed validation.
              <br />
              Check console for details.
            </p>
          </div>
          <button onClick={onClose} className={`w-full py-3 px-4 rounded-xl font-medium ${isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? "bg-black/70" : "bg-black/50"}`} onClick={onClose}>
      <div className={`relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-2xl ${isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Select Cover Image</h2>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Choose from {validImages.length} available images</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {validImages.map((image, index) => (
              <div key={`${image.projectId}-${index}`} onClick={() => {
                setSelectedIndex(index);
                setSelectedReportId(image.reportId);
                onSelectImage(image.coverImage, image.reportId);
              }} className={`relative cursor-pointer group rounded-xl overflow-hidden border-2 transition-all ${selectedIndex === index ? (isDark ? "border-blue-500 ring-2 ring-blue-500/30" : "border-blue-500 ring-2 ring-blue-500/20") : (isDark ? "border-slate-700 hover:border-slate-600" : "border-slate-200 hover:border-slate-300")}`}>
                <div className="aspect-video relative">
                  <img src={image.coverImage} alt={`Cover from ${image.projectName}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-construction.jpg"; }} />
                  {selectedIndex === index && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-blue-600" : "bg-blue-500"}`}>
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className={`p-3 ${isDark ? "bg-slate-800" : "bg-slate-50"}`}>
                  <p className={`font-medium text-sm truncate ${isDark ? "text-white" : "text-slate-800"}`}>{image.projectName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${image.status === "submitted" ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700") : (isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700")}`}>{image.status}</span>
                </div>
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-slate-900/80 text-white" : "bg-white/80 text-slate-800"}`}>{index + 1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={`flex items-center justify-end gap-3 p-6 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl font-medium ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancel</button>
          <button onClick={() => { 
            if (onConfirm) {
              onConfirm();
            } else {
              if (selectedIndex >= 0) {
                onSelectImage(validImages[selectedIndex].coverImage, validImages[selectedIndex].reportId);
              }
              onClose();
            }
          }} disabled={selectedIndex < 0} className={`px-6 py-2 rounded-xl font-medium ${selectedIndex >= 0 ? (isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white") : (isDark ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed")}`}>Use Selected Image</button>
        </div>
      </div>
    </div>
  );
};

export default MasterReportCoverSelector;
