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

export function createDefaultSiteActivitiesSections() {
  return [
    createReferenceSection("Site Activity Photos ")
  ];
}

export const validateReferenceSections = (sections: any[]) => {
  return sections.some(
    (section) =>
      section.title.trim() &&
      section.entries.some((entry: any) => entry.slots && entry.slots.some((slot: any) => slot.image || (slot.caption && slot.caption.trim())))
  );
};

export const padLastSection = (sections) => {
  // 1. Calculate the total number of entries across all sections
  const totalEntries = sections.reduce((sum, section) => sum + section.entries.length, 0);

  // 2. Find out how many are missing to make the grand total a multiple of 4
  const remainder = totalEntries % 4;
  if (remainder === 0) return sections; // No padding needed

  const paddingNeeded = 4 - remainder;

  // 3. Create the placeholders
  const placeholders = Array.from({ length: paddingNeeded }, () => ({
    id: crypto.randomUUID(),
    isPlaceholder: true, // Useful for styling
    slots: [
      { id: crypto.randomUUID(), image: null, caption: "" },
      { id: crypto.randomUUID(), image: null, caption: "" },
    ],
  }));

  // 4. Clone the sections and push placeholders into the LAST one
  const updatedSections = [...sections];
  const lastSectionIndex = updatedSections.length - 1;

  updatedSections[lastSectionIndex] = {
    ...updatedSections[lastSectionIndex],
    entries: [...updatedSections[lastSectionIndex].entries, ...placeholders],
  };

  return updatedSections;
};