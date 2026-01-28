import React, { useEffect, useRef } from "react";
import Slot from "./Slot";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function Entry({ entry, onUpdate, onDelete, entryNumber, onBulkUpload }: any) {
  // Normalize slots if missing (migration from older shape)
  const normalizedSlots = entry.slots && Array.isArray(entry.slots)
    ? entry.slots
    : [
        { id: crypto.randomUUID(), image: entry.images?.image1 ?? null, caption: entry.footers?.[0] ?? "" },
        { id: crypto.randomUUID(), image: entry.images?.image2 ?? null, caption: entry.footers?.[1] ?? "" },
      ];

  const migratedRef = useRef(false);
  useEffect(() => {
    if (!entry.slots && !migratedRef.current) {
      migratedRef.current = true;
      onUpdate({ ...entry, slots: normalizedSlots });
    }
  }, [entry, onUpdate, normalizedSlots]);

  // While migration is pending, render nothing to avoid setState in render
  if (!entry.slots) return null;

  const updateSlot = (updatedSlot: any) => {
    onUpdate({ ...entry, slots: entry.slots.map((s: any) => (s.id === updatedSlot.id ? updatedSlot : s)) });
  };

  const deleteSlot = (slotId: string) => {
    // Don't allow deletion - we always maintain exactly 2 slots
    // Instead, clear the slot content
    const slots = entry.slots.map((s: any) => 
      s.id === slotId ? { ...s, image: null, caption: "" } : s
    );
    onUpdate({ ...entry, slots });
  };

  // Ensure entries always have exactly 2 slots
  useEffect(() => {
    if (entry.slots && entry.slots.length !== 2) {
      const currentSlots = entry.slots || [];
      let newSlots = [...currentSlots];
      
      // If we have less than 2 slots, add empty slots
      while (newSlots.length < 2) {
        newSlots.push({ id: crypto.randomUUID(), image: null, caption: "" });
      }
      
      // If we have more than 2 slots, truncate to 2
      if (newSlots.length > 2) {
        newSlots = newSlots.slice(0, 2);
      }
      
      onUpdate({ ...entry, slots: newSlots });
    }
  }, [entry.slots?.length, entry.id, onUpdate]);

  return (
    <div className="relative mb-12 last:mb-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Entry {entryNumber}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => onDelete(entry.id)} className="text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entry.slots.map((slot: any, idx: number) => (
          <Slot key={slot.id} slot={slot} entryId={entry.id} slotIndex={idx} onUpdateSlot={updateSlot} onDeleteSlot={deleteSlot} onBulkUpload={onBulkUpload} />
        ))}
      </div>
    </div>
  );
}