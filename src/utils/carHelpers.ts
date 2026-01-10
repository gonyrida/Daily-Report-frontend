export function createCarGroup() {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    images: ["", ""],
    footers: ["", ""],
    collapsed: false,
  };
}

export function createEmptyCarSheet() {
  return {
    description: "",
    photo_groups: [createCarGroup()],
  };
}

export const validateCarSheet = (car: any) => {
  if (!car) return false;
  if (typeof car.description !== "string") return false;
  if (!Array.isArray(car.photo_groups)) return false;
  return car.photo_groups.some((g: any) => g.images && g.images.some(Boolean));
};
