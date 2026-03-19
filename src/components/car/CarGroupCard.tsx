import React, { useRef } from "react";
import { Trash2, Calendar, Upload, X, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  group: any;
  index: number;
  total: number;
  onUpdate: (g: any) => void;
  onRemove: (id: string) => void;
  moveUp?: (id: string) => void;
  moveDown?: (id: string) => void;
  isTopLinked?: boolean;
  isBottomLinked?: boolean;
  car: any;
  setCar: (c: any) => void;
}

function imagePreviewSrc(img: any) {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (img instanceof File) return URL.createObjectURL(img);
  return "";
}

export default function CarGroupCard({ group, index, total, onUpdate, onRemove, moveUp, moveDown, isTopLinked = false, isBottomLinked = false, car, setCar }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File, slotIndex: number) => {
    const images = [...(group.images || [null, null])];
    images[slotIndex] = file;
    onUpdate({ ...group, images });
  };

  const handlePaste = (e: React.ClipboardEvent, slotIndex: number) => {
    e.preventDefault();

    const items = Array.from(e.clipboardData?.items || []);
    const files: File[] = [];

    items.forEach((item) => {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    });

    if (files.length > 0) {
      handleImageUpload(files[0], slotIndex);
    }
  };

  const removeImage = (slotIndex: number) => {
    const images = [...(group.images || [null, null])];
    images[slotIndex] = null;
    onUpdate({ ...group, images });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const footers = group.footers || ["", ""];
    footers[type === 'before' ? 0 : 1] = e.target.value;
    onUpdate({ ...group, footers });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...group, date: e.target.value });
  };

  return (
    <motion.div ref={containerRef} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 ${isTopLinked ? "rounded-t-none border-t-0 -mt-px" : ""} ${isBottomLinked ? "rounded-b-none border-b-0" : ""}`}>
      {/* Modern header */}
      <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-200/40 dark:border-slate-700/40">
        {/* Left side: Enhanced date section */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">CAR Group #{index + 1}</span>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 tracking-wider">DateLine:</p>
              <input
                type="date"
                value={group.date}
                onChange={handleDateChange}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                aria-label={`Group ${index + 1} date`}
              />
            </div>
          </div>
        </div>

        {/* Right side: Modern delete button */}
        <button
          type="button"
          onClick={() => onRemove(group.id)}
          className="group relative w-full sm:w-auto px-3 py-3 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center sm:justify-start gap-2 text-sm"
        >
          <Trash2 className="w-4 h-4  md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-200" />
          <span className="hidden md:inline">Delete</span>
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
        </button>
      </div>

      {/* Modern two-column layout */}
      <div className="p-6 grid grid-cols-2 lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-2 gap-6">
        {/* Left Column - Before */}
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Before</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Describe the initial state..."
                value={group.footers?.[0] || ""}
                onChange={(e) => handleDescriptionChange(e, 'before')}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                aria-label="Before description"
              />
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <div
            className={`relative group w-full aspect-[4/3] overflow-hidden rounded-2xl border-2 ${imagePreviewSrc(group.images?.[0]) ? "border-blue-300 dark:border-blue-600 p-0" : "border-dashed border-blue-300 dark:border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6"} flex items-center justify-center transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer`}
            onPaste={(e) => handlePaste(e, 0)}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
              if (files.length > 0) handleImageUpload(files[0], 0);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => beforeFileInputRef.current?.click()}
          >
            {imagePreviewSrc(group.images?.[0]) ? (
              <div className="relative w-full h-full">
                <img src={imagePreviewSrc(group.images?.[0])} alt="Before image" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(0)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg">
                  BEFORE
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20"></div>
                    <div className="relative bg-blue-100 dark:bg-blue-800 p-3 rounded-full">
                      <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Drop or paste BEFORE image</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">or click to browse</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - After */}
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">After</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Describe the final result..."
                value={group.footers?.[1] || ""}
                onChange={(e) => handleDescriptionChange(e, 'after')}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                aria-label="After description"
              />
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <div
            className={`relative group w-full aspect-[4/3] overflow-hidden rounded-2xl border-2 ${imagePreviewSrc(group.images?.[1]) ? "border-emerald-300 dark:border-emerald-600 p-0" : "border-dashed border-emerald-300 dark:border-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-6"} flex items-center justify-center transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer`}
            onPaste={(e) => handlePaste(e, 1)}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
              if (files.length > 0) handleImageUpload(files[0], 1);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => afterFileInputRef.current?.click()}
          >
            {imagePreviewSrc(group.images?.[1]) ? (
              <div className="relative w-full h-full">
                <img src={imagePreviewSrc(group.images?.[1])} alt="After image" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(1)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 "
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-lg">
                  AFTER
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20"></div>
                    <div className="relative bg-emerald-100 dark:bg-emerald-800 p-3 rounded-full">
                      <ImageIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">Drop or paste AFTER image</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">or click to browse</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file inputs for click-to-upload */}
      <input
        ref={beforeFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            handleImageUpload(files[0], 0);
          }
        }}
        className="hidden"
      />
      <input
        ref={afterFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            handleImageUpload(files[0], 1);
          }
        }}
        className="hidden"
      />
    </motion.div>
  );
}
