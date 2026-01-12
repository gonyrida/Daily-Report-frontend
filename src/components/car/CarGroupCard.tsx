import React, { useRef } from "react";
import { Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
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
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const files = Array.from(e.target.files || []); // Handle multiple files
    const images = [...group.images];
    if (files.length > 0) {
      images[slotIndex] = files[0]; // Take first file for this slot
    }
    onUpdate({ ...group, images });
  };

  const handleMultipleImageUpload = (files: File[], slotIndex: number) => {
    const images = [...group.images];
    const allFiles = [...files];
    
    // Fill current slot first
    if (allFiles.length > 0) {
      images[slotIndex] = allFiles.shift()!;
    }
    
    // Fill remaining slots in current group (if any)
    for (let i = 0; i < images.length && allFiles.length > 0; i++) {
      if (images[i] === "" || images[i] === null) {
        images[i] = allFiles.shift()!;
      }
    }
    
    // Create new groups for remaining files
    const newGroups: any[] = [];
    for (let i = 0; i < allFiles.length; i += 2) {
      const a = allFiles[i];
      const b = allFiles[i + 1] || null;
      newGroups.push({ 
        id: crypto.randomUUID(), 
        date: group.date, 
        images: [a, b], 
        footers: ["", ""], 
        collapsed: false 
      });
    }
    
    // Update
    const currentGroupIndex = car.photo_groups.findIndex(g => g.id === group.id);
    const updatedGroups = [...car.photo_groups];
    updatedGroups[currentGroupIndex] = { ...group, images };
    updatedGroups.splice(currentGroupIndex + 1, 0, ...newGroups);
    
    setCar({ ...car, photo_groups: updatedGroups });
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
      handleMultipleImageUpload(files, slotIndex);
    }
  };

  const removeImage = (slotIndex: number) => {
    const images = [...group.images];
    images[slotIndex] = "";
    onUpdate({ ...group, images });
  };

  const handleFooterChange = (e: React.ChangeEvent<HTMLInputElement>, footerIndex: number) => {
    const footers = [...group.footers];
    footers[footerIndex] = e.target.value;
    onUpdate({ ...group, footers });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...group, date: e.target.value });
  };

  return (
    <motion.div ref={containerRef} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border border-border bg-card rounded-lg overflow-hidden ${isTopLinked ? "rounded-t-none border-t-0" : ""} ${isBottomLinked ? "rounded-b-none border-b-0" : ""}`}>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          {/* <div className="p-2 bg-muted rounded-md cursor-grab" title="Drag handle" aria-hidden>
            <GripVertical className="w-4 h-4" />
          </div> */}
          <div className="flex items-center gap-2">
            <input type="date" value={group.date} onChange={handleDateChange} className="px-2 py-1 border rounded-md" aria-label={`Group ${index + 1} date`} />
            <div className="text-sm text-muted-foreground">Group {index + 1}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onUpdate({ ...group, collapsed: !group.collapsed })} className="p-2 rounded-md hover:bg-muted/50" aria-label="Toggle collapse">
            {group.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => moveUp && moveUp(group.id)} disabled={!moveUp} className="p-2 rounded-md hover:bg-muted/50" aria-label="Move up">
            ↑
          </button>
          <button type="button" onClick={() => moveDown && moveDown(group.id)} disabled={!moveDown} className="p-2 rounded-md hover:bg-muted/50" aria-label="Move down">
            ↓
          </button>
          <button type="button" onClick={() => onRemove(group.id)} className="p-2 rounded-md hover:bg-red-600 text-red-600" aria-label="Remove group">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!group.collapsed && (
        <div className="p-3 grid grid-cols-2 gap-4">
          {[0, 1].map((i) => {
            const src = imagePreviewSrc(group.images[i]);
            return (
              <div key={i} className="flex flex-col">
                <div className={`relative w-full aspect-[4/3] overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center ${src ? "p-0" : "p-6"}`} onPaste={(e) => handlePaste(e, i)}>
                  {src ? (
                    <img src={src} alt={`CAR image ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">Click, drop, or paste images</div>
                  )}
                  <input ref={fileInputRefs[i]} type="file" accept="image/*" multiple onChange={(e) => handleMultipleImageUpload(Array.from(e.target.files || []), i)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <input type="text" placeholder="Caption" value={group.footers[i] || ""} onChange={(e) => handleFooterChange(e, i)} className="mt-2 p-2 border rounded-md" aria-label={`Caption ${i + 1}`} />
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
