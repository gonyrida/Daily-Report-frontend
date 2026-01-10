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
}

function imagePreviewSrc(img: any) {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (img instanceof File) return URL.createObjectURL(img);
  return "";
}

export default function CarGroupCard({ group, index, total, onUpdate, onRemove, moveUp, moveDown, isTopLinked = false, isBottomLinked = false }: Props) {
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    const images = [...group.images];
    images[slotIndex] = file || "";
    onUpdate({ ...group, images });
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
          <div className="p-2 bg-muted rounded-md cursor-grab" title="Drag handle" aria-hidden>
            <GripVertical className="w-4 h-4" />
          </div>
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
                <div className={`relative w-full aspect-[4/3] overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center ${src ? "p-0" : "p-6"}`}>
                  {src ? (
                    <img src={src} alt={`CAR image ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">Click or drop image</div>
                  )}
                  <input ref={fileInputRefs[i]} type="file" accept="image/*" onChange={(e) => handleImageChange(e, i)} className="absolute inset-0 opacity-0 cursor-pointer" />
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
