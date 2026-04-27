// File: src/types/material.ts
// Material Item types and interfaces

export type UnitType = 'pcs' | 'kg' | 'meter' | 'liter' | 'box' | 'pack';
export type MaterialStatus = 'active' | 'inactive';

export interface MaterialItem {
  _id: string;
  code: string;
  description: string;
  reference: string;
  unit: UnitType;
  unitPrice: number;
  brand: string;
  status?: MaterialStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  data?: any; // For any additional data returned by the server
}

export interface CreateMaterialDTO {
  code: string;
  description: string;
  reference?: string;
  unit: UnitType;
  unitPrice: number;
  brand: string;
  status?: MaterialStatus;
}

export interface UpdateMaterialDTO extends Partial<CreateMaterialDTO> {
  lastModifiedBy?: string;
}

export interface MaterialFilter {
  search?: string;
  brand?: string;
  unit?: UnitType;
  status?: MaterialStatus;
  minPrice?: number;
  maxPrice?: number;
}

export interface MaterialPaginationResponse {
  items: MaterialItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
