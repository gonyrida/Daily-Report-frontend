import React from "react";
import { Input } from "@/components/ui/input";
import { Image, Trash2, Plus } from "lucide-react";
import { useSlotLogic } from "@/hooks/useSlotLogic";

interface Props {
  slot: any;
  entryId: string;
  slotIndex: number;
  onUpdateSlot: (s: any) => void;
  onDeleteSlot: (slotId: string) => void;
  onBulkUpload?: (files: FileList | File[], entryId?: string, slotId?: string) => void;
  showCaption?: boolean;
}

export default function Slot({ slot, entryId, slotIndex, onUpdateSlot, onDeleteSlot, onBulkUpload, showCaption = true }: Props) {
  const handlePaste = (e: React.ClipboardEvent) => {
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
      // Use existing bulk upload logic
      onBulkUpload?.(files, entryId, slot.id);
    }
  };

  const logic = useSlotLogic(slot, entryId, onUpdateSlot, onBulkUpload);

  return (
    <div className="flex flex-col relative">
      <div
        onDragEnter={logic.handleDrag}
        onDragLeave={logic.handleDrag}
        onDragOver={logic.handleDrag}
        onDrop={logic.handleDrop}
        onPaste={handlePaste}
        className={`relative group w-full aspect-[4/3] overflow-hidden rounded-2xl border-2 ${logic.imageUrl ? "border-blue-300 dark:border-blue-600 p-0" : "border-dashed border-blue-300 dark:border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6"} flex items-center justify-center transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10`}
        role="button"
        tabIndex={0}
        aria-label={`Upload photo ${slotIndex + 1}`}
      >
        {logic.imageUrl ? (
          <div className="relative w-full h-full group">
            <img src={logic.imageUrl} alt={`Preview`} className="w-full h-full object-cover rounded-2xl" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Remove button clicked for slot:', slot.id);
                logic.removeImage(e);
              }}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 z-30"
              title="Remove Image"
              aria-label={`Remove image ${slotIndex + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <div className="mb-3 group-hover:scale-110 transition-transform duration-150">
              <Image className="lucide lucide-image w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Upload Image</p>
            <p className="text-xs text-muted-foreground mt-1">Click, drag, or paste files</p>
          </div>
        )}

        <input id={`slot-file-${entryId}-${slot.id}`} ref={logic.fileInputRef} type="file" accept="image/*" multiple onChange={(e) => logic.handleImageChange(e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" aria-label={`Upload image ${slotIndex + 1}`} />
      </div>

      {showCaption && (
        <div className="mt-3">
          <input id={`caption-${entryId}-${slot.id}`} type="text" placeholder="Enter caption..." value={slot.caption || ""} onChange={logic.handleCaptionChange} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" aria-label={`Caption for image ${slotIndex + 1}`} />
        </div>
      )}
    </div>
  );
}
