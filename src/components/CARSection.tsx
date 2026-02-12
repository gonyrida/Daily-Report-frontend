import React, { useEffect, useRef, useState } from "react";
import CarGroupCard from "./car/CarGroupCard";
import { createCarGroup, createEmptyCarSheet } from "@/utils/carHelpers";
import { motion, AnimatePresence } from "framer-motion";
import { generateCarExcel } from "@/integrations/reportsApi";
import { Upload, Eye, EyeOff, CheckCircle } from "lucide-react";


interface Props {
  car: any;
  setCar: (v: any) => void;
}

export default function CARSection({ car, setCar }: Props) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Helper function to check if a group is complete (has both before and after images)
  const isGroupComplete = (group: any) => {
    return group.images?.[0] && group.images?.[1];
  };

  // Filter groups based on completion status and visibility setting
  const visibleGroups = car.photo_groups?.filter((group: any) => {
    const isComplete = isGroupComplete(group);
    // Show group if: it's not complete, OR it's complete but not hidden, OR we're showing all completed
    return !isComplete || !group.hiddenAfterSubmission || showCompleted;
  }) || [];

  // Count completed and hidden groups for stats
  const completedCount = car.photo_groups?.filter(isGroupComplete).length || 0;
  const hiddenCount = car.photo_groups?.filter((g: any) => isGroupComplete(g) && g.hiddenAfterSubmission).length || 0;

  useEffect(() => {
    // Ensure at least one default group exists
    if (!car || !Array.isArray(car.photo_groups) || car.photo_groups.length === 0) {
      setCar(prev => ({
        ...prev,
        photo_groups: [createCarGroup()]
      }));
    }
  }, [car, setCar]);

  const handleBeforeImageUpload = (files: File[]) => {
    if (files.length === 0) return;
    
    const updatedGroups = [...car.photo_groups];
    let fileIndex = 0;
    
    // First, try to fill empty before slots in existing groups (including default)
    for (let i = 0; i < updatedGroups.length && fileIndex < files.length; i++) {
      if (!updatedGroups[i].images?.[0]) {
        updatedGroups[i] = {
          ...updatedGroups[i],
          images: [files[fileIndex], updatedGroups[i].images?.[1] || null]
        };
        fileIndex++;
      }
    }
    
    // Create new groups for remaining files
    const newGroups: any[] = [];
    for (let i = fileIndex; i < files.length; i++) {
      newGroups.push({ 
        id: crypto.randomUUID(), 
        date: new Date().toISOString().split("T")[0], 
        images: [files[i], null], // Before slot only
        footers: ["", ""], 
        collapsed: false 
      });
    }
    
    setCar({ ...car, photo_groups: [...updatedGroups, ...newGroups] });
  };

  const handleAfterImageUpload = (files: File[]) => {
    if (files.length === 0) return;
    
    const updatedGroups = [...car.photo_groups];
    let fileIndex = 0;
    
    // First, try to fill empty after slots in existing groups
    for (let i = 0; i < updatedGroups.length && fileIndex < files.length; i++) {
      if (!updatedGroups[i].images?.[1]) {
        updatedGroups[i] = {
          ...updatedGroups[i],
          images: [updatedGroups[i].images?.[0] || null, files[fileIndex]]
        };
        fileIndex++;
      }
    }
    
    // Create new groups for remaining files (starting from current fileIndex)
    const newGroups: any[] = [];
    for (let i = fileIndex; i < files.length; i++) {
      newGroups.push({ 
        id: crypto.randomUUID(), 
        date: new Date().toISOString().split("T")[0], 
        images: [null, files[i]], // After slot only
        footers: ["", ""], 
        collapsed: false 
      });
    }
    
    setCar({ ...car, photo_groups: [...updatedGroups, ...newGroups] });
  };

  const updateGroup = (updated: any) => {
    const groups = car.photo_groups.map((g: any) => (g.id === updated.id ? updated : g));
    // Sort by date immediately
    groups.sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    setCar({ ...car, photo_groups: groups });

    // Scroll into view of updated group after reflow
    setTimeout(() => {
      const el = refs.current[updated.id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
  };

  const removeGroup = (id: string) => {
    setCar({ ...car, photo_groups: car.photo_groups.filter((g: any) => g.id !== id) });
  };

  const moveUp = (id: string) => {
    const groups = [...car.photo_groups];
    const idx = groups.findIndex((g: any) => g.id === id);
    if (idx <= 0) return;
    // only swap if same date
    if (groups[idx - 1].date !== groups[idx].date) return;
    [groups[idx - 1], groups[idx]] = [groups[idx], groups[idx - 1]];
    setCar({ ...car, photo_groups: groups });
  };

  const moveDown = (id: string) => {
    const groups = [...car.photo_groups];
    const idx = groups.findIndex((g: any) => g.id === id);
    if (idx === -1 || idx >= groups.length - 1) return;
    if (groups[idx + 1].date !== groups[idx].date) return;
    [groups[idx], groups[idx + 1]] = [groups[idx + 1], groups[idx]];
    setCar({ ...car, photo_groups: groups });
  };

  return (
    <div className="space-y-4">
      {/* Completed Rows Toggle Section */}
      {completedCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-100 dark:from-amber-900/20 dark:via-slate-800 dark:to-amber-900/20 border border-amber-200/60 dark:border-amber-700/60">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 opacity-80"></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Completed Actions
                    </h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {hiddenCount} of {completedCount} completed rows hidden
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-200"
              >
                {showCompleted ? (
                  <>
                    <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Hide Completed
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Show Completed ({hiddenCount})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern upload buttons with enhanced UX */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 ">
        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-80"></div>
        
        <div className="p-8">
          {/* Instruction text */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Upload Images</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full px-4">
            {/* Before Upload Button */}
            <div className="group relative">
              <button
                type="button"
                onClick={() => beforeFileInputRef.current?.click()}
                className="relative flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 transform hover:-translate-y-1 transition-all duration-300 w-full"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative bg-blue-500 p-3 rounded-full">
                    <Upload className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">BEFORE</span>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Initial state</p>
                </div>
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </button>
              {/* Tooltip hint */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Click to upload</span>
              </div>
            </div>

            {/* After Upload Button */}
            <div className="group relative">
              <button
                type="button"
                onClick={() => afterFileInputRef.current?.click()}
                className="relative flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-500 transform hover:-translate-y-1 transition-all duration-300 w-full"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative bg-emerald-500 p-3 rounded-full ">
                    <Upload className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">AFTER</span>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Final result</p>
                </div>
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
              </button>
              {/* Tooltip hint */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Click to upload</span>
              </div>
            </div>
          </div>

          {/* Help text */}
          <div className="text-center mt-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              💡 <span className="font-medium">Tip:</span> Upload multiple images at once to create multiple CAR groups automatically
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {visibleGroups.map((g: any, idx: number) => {
            // Find the original index for proper linking logic
            const originalIdx = car.photo_groups.findIndex((group: any) => group.id === g.id);
            const prev = car.photo_groups[originalIdx - 1];
            const next = car.photo_groups[originalIdx + 1];
            const isTopLinked = !!prev && prev.date === g.date;
            const isBottomLinked = !!next && next.date === g.date;
            
            return (
              <motion.div key={g.id} layout ref={(el) => (refs.current[g.id] = el)}>
                <CarGroupCard
                  group={g}
                  index={idx}
                  total={visibleGroups.length}
                  onUpdate={updateGroup}
                  onRemove={removeGroup}
                  moveUp={moveUp}
                  moveDown={moveDown}
                  isTopLinked={isTopLinked}
                  isBottomLinked={isBottomLinked}
                  car={car}
                  setCar={setCar}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={beforeFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleBeforeImageUpload(Array.from(e.target.files || []))}
        className="hidden"
      />
      <input
        ref={afterFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleAfterImageUpload(Array.from(e.target.files || []))}
        className="hidden"
      />
    </div>
  );
}
