export function createReferenceSection(title?: string) {
  return {
    id: crypto.randomUUID(),
    title: title || "New Section",
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

export function createDefaultHSESections() {
  return [
    createReferenceSection("HSE Toolbox Meeting"),
    createReferenceSection("HSE Activity Photos")
  ];
}

export const validateReferenceSections = (sections: any[]) => {
  return sections.some(
    (section) =>
      section.title.trim() &&
      section.entries.some((entry: any) => entry.slots && entry.slots.some((slot: any) => slot.image || (slot.caption && slot.caption.trim())))
  );
};