import { useEffect, useRef, useState } from "react";

export function useSlotLogic(slot: any, entryId: string, onUpdateSlot: (s: any) => void, onBulkUpload?: (files: FileList | File[], entryId?: string, slotId?: string) => void) {
  const [dragActive, setDragActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let url: string | null = null;
    if (slot?.image) {
      if (typeof slot.image === 'string') {
        // Base64 string from database
        url = slot.image;
      } else {
        // File object from new upload
        url = URL.createObjectURL(slot.image);
      }
    }
    setImageUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [slot?.image]);

  const processFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }
    onUpdateSlot({ ...slot, image: file });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 1 && typeof onBulkUpload === "function") {
      onBulkUpload(files, entryId, slot.id);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    processFile(files[0]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) processFile(file);
  };

  const removeImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUpdateSlot({ ...slot, image: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSlot({ ...slot, caption: e.target.value });
  };

  return {
    dragActive,
    imageUrl,
    fileInputRef,
    handleImageChange,
    handleDrag,
    handleDrop,
    removeImage,
    handleCaptionChange,
  };
}
