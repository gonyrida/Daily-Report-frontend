import React from "react";
import { Input } from "@/components/ui/input";
import { Image, Trash2 } from "lucide-react";

interface Props {
  label: string;
  imageKey: string;
  footerIndex: number;
  entry: any;
  imageUrl: string | null;
  isDragActive: boolean;
  fileInputRefs: Record<string, React.RefObject<HTMLInputElement>>;
  handleDrag: (e: React.DragEvent, key: string) => void;
  handleDrop: (e: React.DragEvent, key: string) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>, key: string) => void;
  removeImage: (key: string, e: React.MouseEvent) => void;
  handleFooterChange: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
}

export default function ImageUploadArea({
  label,
  imageKey,
  footerIndex,
  entry,
  imageUrl,
  isDragActive,
  fileInputRefs,
  handleDrag,
  handleDrop,
  handleImageChange,
  removeImage,
  handleFooterChange,
}: Props) {
  return (
    <div className="flex flex-col group">
      <div
        onDragEnter={(e) => handleDrag(e, imageKey)}
        onDragLeave={(e) => handleDrag(e, imageKey)}
        onDragOver={(e) => handleDrag(e, imageKey)}
        onDrop={(e) => handleDrop(e, imageKey)}
        className={`relative w-full aspect-[4/3] overflow-hidden rounded-lg border border-border bg-card transition-all duration-150 ${isDragActive ? "scale-[1.02] shadow-md" : "shadow-sm"} cursor-pointer`}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label.toLowerCase()}`}
      >
        {imageUrl ? (
          <div className="relative w-full h-full group/image">
            <img src={imageUrl} alt={`Preview of ${label.toLowerCase()}`} className="w-full h-full object-cover rounded-lg" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button type="button" onClick={(e) => removeImage(imageKey, e)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors" title="Remove Image" aria-label={`Remove ${label.toLowerCase()}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <div className="bg-gray-100 rounded-full p-4 mb-3 group-hover:scale-110 transition-transform duration-150">
              <Image className={`text-4xl transition-colors ${isDragActive ? "text-indigo-600" : "text-gray-400"}`} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Upload Image</p>
            <p className="text-xs text-muted-foreground mt-1">Click or drag file</p>
          </div>
        )}
        <input id={`image-${imageKey}-${entry.id}`} ref={fileInputRefs[imageKey]} type="file" accept="image/*" multiple onChange={(e) => handleImageChange(e, imageKey)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" aria-label={`Upload ${label.toLowerCase()}`} />
      </div>
      <div className="mt-3">
        <label htmlFor={`footer-${footerIndex}-${entry.id}`} className="sr-only">Caption for {label.toLowerCase()}</label>
        <Input id={`footer-${footerIndex}-${entry.id}`} type="text" placeholder="Enter caption..." value={entry.footers[footerIndex]} onChange={(e) => handleFooterChange(e, footerIndex)} className="text-center" aria-label={`Caption for ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}