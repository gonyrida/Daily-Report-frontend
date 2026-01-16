import React from "react";
import { Image } from "lucide-react";

interface Props {
  onFiles: (files: File[] | FileList) => void;
}

export default function CarBulkDropZone({ onFiles }: Props) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
    e.currentTarget.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    // Get files from clipboard
    const items = Array.from(e.clipboardData?.items || []);
    const files: File[] = [];
    
    items.forEach((item) => {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    });
    
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className="w-full border-2 border-dashed border-border rounded-lg py-10 flex flex-col items-center justify-center bg-card text-center"
      role="region"
      aria-label="CAR bulk upload"
    >
      <div className="mb-4">
        <div className="bg-gray-100 rounded-full p-4 inline-block">
          <Image className="text-4xl text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="font-medium">Drop or Paste images here to create groups</p>
        <p className="text-sm text-muted-foreground">They will be chunked into pairs (2 per group)</p>
        <div className="mt-4">
          <label className="px-4 py-2 bg-primary text-white rounded-md cursor-pointer inline-block hover:bg-primary/90">
            <input type="file" accept="image/*" multiple onChange={handleChange} className="hidden" />
            Upload files
          </label>
        </div>
      </div>
    </div>
  );
}
