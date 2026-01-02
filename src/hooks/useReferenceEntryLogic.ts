import { useEffect, useRef, useState } from "react";

export function useReferenceEntryLogic(entry: any, onUpdate: (u: any) => void, onBulkUpload?: (files: FileList | File[], entryId?: string, key?: string) => void) {
  const [dragActive, setDragActive] = useState({ image1: false, image2: false });
  const [imageUrls, setImageUrls] = useState<{ image1: string | null; image2: string | null }>({ image1: null, image2: null });
  const fileInputRefs: Record<string, React.RefObject<HTMLInputElement>> = {
    image1: useRef<HTMLInputElement>(null),
    image2: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    const urls = { image1: null as string | null, image2: null as string | null };
    if (entry.images?.image1) urls.image1 = URL.createObjectURL(entry.images.image1);
    if (entry.images?.image2) urls.image2 = URL.createObjectURL(entry.images.image2);
    setImageUrls(urls);
    return () => {
      if (urls.image1) URL.revokeObjectURL(urls.image1);
      if (urls.image2) URL.revokeObjectURL(urls.image2);
    };
  }, [entry.images?.image1, entry.images?.image2]);

  const processFile = (file: File | undefined, key: string) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }
    onUpdate({ ...entry, images: { ...entry.images, [key]: file } });
    if (fileInputRefs[key]?.current) fileInputRefs[key].current.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // If multiple files selected at entry, forward to section to handle pairing/filling
    if (files.length > 1 && typeof onBulkUpload === "function") {
      onBulkUpload(files, entry.id, key);
      if (fileInputRefs[key]?.current) fileInputRefs[key].current.value = "";
      return;
    }
    processFile(files[0], key);
  };

  const handleDrag = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [key]: e.type === "dragenter" || e.type === "dragover" }));
  };

  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [key]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) processFile(file, key);
  };

  const removeImage = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ ...entry, images: { ...entry.images, [key]: null } });
    if (fileInputRefs[key]?.current) fileInputRefs[key].current.value = "";
  };

  const handleFooterChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newFooters = [...entry.footers];
    newFooters[index] = e.target.value;
    onUpdate({ ...entry, footers: newFooters });
  };

  return {
    dragActive,
    imageUrls,
    fileInputRefs,
    handleImageChange,
    handleDrag,
    handleDrop,
    removeImage,
    handleFooterChange,
  };
}