import { MaterialItem } from '@/components/material_master/types/material';

// Utility functions
export const getUnitLabel = (unit: string): string => {
  const unitLabels: Record<string, string> = {
    'pcs': 'Pieces',
    'kg': 'Kilograms',
    'meter': 'Meters',
    'liter': 'Liters',
    'box': 'Boxes',
    'pack': 'Packs'
  };
  return unitLabels[unit] || unit;
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

export const searchMaterials = (
  items: MaterialItem[],
  searchTerm: string
): MaterialItem[] => {
  const term = searchTerm.toLowerCase();
  return items.filter(item =>
    item.code.toLowerCase().includes(term) ||
    item.description.toLowerCase().includes(term) ||
    item.brand.toLowerCase().includes(term)
  );
};

export const filterByBrand = (
  items: MaterialItem[],
  brand: string
): MaterialItem[] => {
  return items.filter(item => item.brand === brand);
};

export const filterByStatus = (
  items: MaterialItem[],
  status: 'active' | 'inactive'
): MaterialItem[] => {
  return items.filter(item => item.status === status);
};

export const filterByUnit = (
  items: MaterialItem[],
  unit: string
): MaterialItem[] => {
  return items.filter(item => item.unit === unit);
};

export const getAllBrands = (items: MaterialItem[]): string[] => {
  return [...new Set(items.map(item => item.brand))].sort();
};