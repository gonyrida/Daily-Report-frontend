import React, { useEffect, useRef } from "react";
import CarBulkDropZone from "./car/CarBulkDropZone";
import CarGroupCard from "./car/CarGroupCard";
import { createCarGroup, createEmptyCarSheet } from "@/utils/carHelpers";
import { motion, AnimatePresence } from "framer-motion";
import { generateCarExcel } from "@/integrations/reportsApi";


interface Props {
  car: any;
  setCar: (v: any) => void;
}

export default function CARSection({ car, setCar }: Props) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // Ensure at least one group exists
    if (!car || !Array.isArray(car.photo_groups) || car.photo_groups.length === 0) {
      setCar(createEmptyCarSheet());
    }
  }, []);

  const addGroup = () => setCar({ ...car, photo_groups: [...car.photo_groups, createCarGroup()] });

  const onFiles = (files: File[] | FileList) => {
    // Type-guard helper: narrow unknowns to File
    const isImageFile = (f: unknown): f is File => f instanceof File && typeof f.type === "string" && f.type.startsWith("image/");

    const items = Array.from(files as any);
    const flat: File[] = items.filter(isImageFile);
    if (flat.length === 0) return;

    // Chunk into pairs and append groups sequentially
    const newGroups: any[] = [];
    for (let i = 0; i < flat.length; i += 2) {
      const a = flat[i];
      const b = flat[i + 1] || "";
      newGroups.push({ id: crypto.randomUUID(), date: new Date().toISOString().split("T")[0], images: [a, b], footers: ["", ""], collapsed: false });
    }

    setCar({ ...car, photo_groups: [...car.photo_groups, ...newGroups] });
  };

  const updateGroup = (updated: any) => {
    const groups = car.photo_groups.map((g: any) => (g.id === updated.id ? updated : g));
    // Sort by date immediately
    groups.sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    setCar({ ...car, photo_groups: groups });

    // Scroll into view of updated group after reflow
    setTimeout(() => {
      const el = refs.current[updated.id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
  };

  const removeGroup = (id: string) => {
    setCar({ ...car, photo_groups: car.photo_groups.filter((g: any) => g.id !== id) });
  };

  const moveUp = (id: string) => {
    const groups = [...car.photo_groups];
    const idx = groups.findIndex((g: any) => g.id === id);
    if (idx <= 0) return;
    // only swap if same date
    if (groups[idx - 1].date !== groups[idx].date) return;
    [groups[idx - 1], groups[idx]] = [groups[idx], groups[idx - 1]];
    setCar({ ...car, photo_groups: groups });
  };

  const moveDown = (id: string) => {
    const groups = [...car.photo_groups];
    const idx = groups.findIndex((g: any) => g.id === id);
    if (idx === -1 || idx >= groups.length - 1) return;
    if (groups[idx + 1].date !== groups[idx].date) return;
    [groups[idx], groups[idx + 1]] = [groups[idx + 1], groups[idx]];
    setCar({ ...car, photo_groups: groups });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">CAR Description</label>
        <textarea value={car.description} onChange={(e) => setCar({ ...car, description: e.target.value })} className="w-full p-3 border rounded-md" rows={4} placeholder="Enter global description for CAR sheet" />
      </div>

      <CarBulkDropZone onFiles={onFiles} />

      <div className="space-y-3">
        <AnimatePresence>
          {car.photo_groups.map((g: any, idx: number) => {
            const prev = car.photo_groups[idx - 1];
            const next = car.photo_groups[idx + 1];
            const isTopLinked = !!prev && prev.date === g.date;
            const isBottomLinked = !!next && next.date === g.date;
            return (
              <motion.div key={g.id} layout ref={(el) => (refs.current[g.id] = el)}>
                <CarGroupCard
                  group={g}
                  index={idx}
                  total={car.photo_groups.length}
                  onUpdate={updateGroup}
                  onRemove={removeGroup}
                  moveUp={moveUp}
                  moveDown={moveDown}
                  isTopLinked={isTopLinked}
                  isBottomLinked={isBottomLinked}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={addGroup} className="px-4 py-2 bg-primary text-white rounded-md">Add Group</button>
        <button onClick={async () => {
          // Prepare payload and call API
          const toBase64DataUrl = async (img: unknown): Promise<string | null> => {
            if (!img) return null;
            if (typeof img === "string") return img || null;

            if (img instanceof File) {
              return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(img);
              });
            }

            return null;
          };

          const processed = await Promise.all((car.photo_groups || []).map(async (g: any) => {
            const imgs = await Promise.all((g.images || []).map(async (img: any) => (await toBase64DataUrl(img)) || ""));
            return { date: g.date || "", images: [imgs[0] || "", imgs[1] || ""], footers: [(g.footers?.[0] || ""), (g.footers?.[1] || "")] };
          }));

          try {
            await generateCarExcel({ description: car.description || "", photo_groups: processed });
            // TODO: show toast on success
          } catch (e) {
            console.error("CAR export failed", e);
          }
        }} className="px-4 py-2 border rounded-md">Export CAR</button>
      </div>
    </div>
  );
}
