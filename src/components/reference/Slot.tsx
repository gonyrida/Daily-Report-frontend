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
}

export default function Slot({ slot, entryId, slotIndex, onUpdateSlot, onDeleteSlot, onBulkUpload }: Props) {
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
        className={`relative w-full aspect-[4/3] overflow-hidden rounded-lg border border-border bg-card transition-all duration-150 ${logic.dragActive ? "scale-[1.02] shadow-md" : "shadow-sm"} cursor-pointer`}
        role="button"
        tabIndex={0}
        aria-label={`Upload photo ${slotIndex + 1}`}
      >
        {logic.imageUrl ? (
          <div className="relative w-full h-full group/image">
            <img src={logic.imageUrl} alt={`Preview`} className="w-full h-full object-cover rounded-lg" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button type="button" onClick={(e) => logic.removeImage(e)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors" title="Remove Image" aria-label={`Remove image ${slotIndex + 1}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <div className="bg-gray-100 rounded-full p-4 mb-3 group-hover:scale-110 transition-transform duration-150">
              <Image className={`text-4xl transition-colors ${logic.dragActive ? "text-indigo-600" : "text-gray-400"}`} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Upload Image</p>
            <p className="text-xs text-muted-foreground mt-1">Click, drag, or paste files</p>
          </div>
        )}

        <input id={`slot-file-${slot.id}`} ref={logic.fileInputRef} type="file" accept="image/*" multiple onChange={(e) => logic.handleImageChange(e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" aria-label={`Upload image ${slotIndex + 1}`} />
      </div>

      <div className="mt-3">
        <Input id={`caption-${slot.id}`} type="text" placeholder="Enter caption..." value={slot.caption || ""} onChange={logic.handleCaptionChange} className="w-full text-center" aria-label={`Caption for image ${slotIndex + 1}`} />
      </div>
    </div>
  );
}
