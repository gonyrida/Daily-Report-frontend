import React, { useState, useRef } from "react";
import Entry from "./Entry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Check, X, ImagePlus, Image, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Section({ section, onUpdate, onDelete, hideTitle = false, hideShadow = false ,}: any) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Add a new entry (with slots format)
  const addEntry = () => {
    const currentEntries = section.entries || [];
    onUpdate({
      ...section,
      entries: [
        ...currentEntries,
        {
          id: crypto.randomUUID(),
          slots: [
            { id: crypto.randomUUID(), image: null, caption: "" },
            { id: crypto.randomUUID(), image: null, caption: "" }
          ],
        },
      ],
    });
  };

  const updateEntry = (updatedEntry: any) => {
    const currentEntries = section.entries || [];
    onUpdate({ ...section, entries: currentEntries.map((e: any) => (e.id === updatedEntry.id ? updatedEntry : e)) });
  };

  const deleteEntry = (id: string) => {
    const currentEntries = section.entries || [];
    onUpdate({ ...section, entries: currentEntries.filter((e: any) => e.id !== id) });
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(section.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const cancelDelete = () => setShowDeleteConfirm(false);

  // Bulk upload support: create or fill entries (each entry holds up to 2 images)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const handleBulkUploadFiles = (files: FileList | null, targetEntryId?: string, targetSlotId?: string) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({ description: "No image files selected." });
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const allowed = imageFiles.filter((f) => f.size <= MAX_SIZE);
    const rejectedCount = imageFiles.length - allowed.length;

    if (allowed.length === 0) {
      toast({ description: "All selected images exceed the 10MB limit and were rejected." });
      return;
    }

    // Convert to mutable array
    let remaining = [...allowed];

    // Ensure all entries have slots (migrate from images/footers if necessary)
    const currentEntries = section.entries || [];
    const entries = currentEntries.map((e: any) => {
      if (e.slots && Array.isArray(e.slots)) return { ...e, slots: e.slots.map((s: any) => ({ ...s })) };
      // migrate old format
      const s1 = { id: crypto.randomUUID(), image: e.images?.image1 ?? null, caption: e.footers?.[0] ?? "" };
      const s2 = { id: crypto.randomUUID(), image: e.images?.image2 ?? null, caption: e.footers?.[1] ?? "" };
      return { ...e, slots: [s1, s2] };
    });

    let filledCount = 0;

    // Fill the targeted slot first if provided
    if (targetEntryId && targetSlotId) {
      const targetEntry = entries.find((en) => en.id === targetEntryId);
      if (targetEntry) {
        const targetSlot = targetEntry.slots.find((s: any) => s.id === targetSlotId);
        if (targetSlot && targetSlot.image == null && remaining.length > 0) {
          targetSlot.image = remaining.shift() as File;
          filledCount++;
        }
      }
    }

    // Then fill other empty slots in order
    for (let i = 0; i < entries.length && remaining.length > 0; i++) {
      const e = entries[i];
      for (let j = 0; j < e.slots.length && remaining.length > 0; j++) {
        if (e.slots[j].image == null) {
          e.slots[j].image = remaining.shift() as File;
          filledCount++;
        }
      }
    }

    // Group remaining files into pairs to create new entries with up to 2 slots
    const newEntries: any[] = [];
    for (let i = 0; i < remaining.length; i += 2) {
      const first = remaining[i];
      const second = remaining[i + 1] ?? null;
      newEntries.push({ id: crypto.randomUUID(), slots: [ { id: crypto.randomUUID(), image: first, caption: "" }, { id: crypto.randomUUID(), image: second, caption: "" } ] });
    }

    const addedImages = allowed.length;

    onUpdate({ ...section, entries: [...entries, ...newEntries] });

    toast({
      title: `${addedImages} image(s) processed. ${filledCount ? `${filledCount} filled into existing entries.` : ""}`,
      description: `${newEntries.length} new entr${newEntries.length !== 1 ? "ies" : "y"} created.${rejectedCount ? ` ${rejectedCount} file(s) were too large and skipped.` : ""}`,
    });

    // clear input if present
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleBulkUploadFiles(e.target.files);
    // Clear input so same files can be re-selected if needed
    e.currentTarget.value = "";
  };

  return (
    <div className={`rounded-lg ${hideShadow ? '' : 'shadow-sm'} overflow-hidden transition-shadow text-foreground ${hideShadow ? '' : 'section-card'} `}>
      {/* Section Header */}
      <div className="px-6 py-4 text-foreground">
        <div className="flex flex-col gap-4">
          {!hideTitle && (
            <div className="flex-1">
              <label htmlFor={`section-title-${section.id}`} className="sr-only">Section Title</label>
              <Input
                id={`section-title-${section.id}`}
                type="text"
                value={section.title}
                onChange={(e) => onUpdate({ ...section, title: e.target.value })}
                placeholder="Enter section title..."
                className="text-lg font-semibold"
                aria-label="Section title"
              />
            </div>
          )}
          <div className="w-full">
            {/* Bulk upload input (hidden) */}
            <input ref={fileInputRef} onChange={onFileInputChange} type="file" accept="image/*" multiple className="hidden" />

            <button type="button" onClick={() => fileInputRef.current?.click()} className="relative flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transform hover:-translate-y-1 transition-all duration-300 w-full">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative bg-blue-500 p-3 rounded-full shadow-lg">
                  <UploadCloud className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="text-center">
                <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">UPLOAD IMAGES</span>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Bulk upload multiple images</p>
              </div>
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            </button>

            {/* DISABLED: Delete Section button - commented out as requested
            {showDeleteConfirm ? (
              <>
                <Button variant="destructive" onClick={handleDelete} className="text-sm px-3 py-1.5"><Check className="w-4 h-4 mr-2" />Confirm</Button>
                <Button variant="ghost" onClick={cancelDelete}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </>
            ) : (
              <Button variant="destructive" onClick={handleDelete} className="text-sm px-3 py-1.5"><Trash2 className="w-4 h-4 mr-2" />Delete Section</Button>
            )}
            */}
          </div>
        </div>
      </div>

      <div className="p-6">
        {section.entries && section.entries.length > 0 ? (
          <div className="space-y-6">
            {section.entries.map((entry: any, index: number) => (
              <div key={entry.id} className="relative">
                <Entry entry={entry} onUpdate={updateEntry} onDelete={deleteEntry} entryNumber={index + 1} onBulkUpload={handleBulkUploadFiles} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Image className="w-12 h-12 mb-2 opacity-50 text-muted-foreground mx-auto" aria-hidden="true" />
            <p className="text-sm">No entries yet. Add your entry below first.</p>
          </div>
        )}
      </div>
    </div>
  );
}