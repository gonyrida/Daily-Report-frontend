export function createReferenceSection() {
  return {
    id: crypto.randomUUID(),
    title: "New Section",
    entries: [
      {
        id: crypto.randomUUID(),
        slots: [
          { id: crypto.randomUUID(), image: null, caption: "" },
          { id: crypto.randomUUID(), image: null, caption: "" },
        ],
      },
    ],
  };
}

export const validateReferenceSections = (sections: any[]) => {
  return sections.some(
    (section) =>
      section.title.trim() &&
      section.entries.some((entry: any) => entry.slots && entry.slots.some((slot: any) => slot.image || (slot.caption && slot.caption.trim())))
  );
};