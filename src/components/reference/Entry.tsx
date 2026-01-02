import React, { useEffect, useRef } from "react";
import Slot from "./Slot";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

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
    const slots = entry.slots.filter((s: any) => s.id !== slotId);
    onUpdate({ ...entry, slots });
  };

  const addSlot = () => {
    if (entry.slots.length >= 2) return;
    const slots = [...entry.slots, { id: crypto.randomUUID(), image: null, caption: "" }];
    onUpdate({ ...entry, slots });
  };

  return (
    <div className="relative mb-12 last:mb-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Entry {entryNumber}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => onDelete(entry.id)} className="text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
          {entry.slots.length < 2 ? (
            <Button variant="outline" onClick={addSlot} className="text-sm">
              <Plus className="w-4 h-4 mr-2" />Add Slot
            </Button>
          ) : null}
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