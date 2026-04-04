// File: src/components/material_master/services/materialService.ts
// API service for Material management

import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from '@/lib/apiFetch';
import {
  MaterialItem,
  CreateMaterialDTO,
  UpdateMaterialDTO,
  MaterialFilter,
  MaterialPaginationResponse
} from '@/components/material_master/types/material';

const MATERIALS_ENDPOINT = '/materials';

export class MaterialService {
  /**
   * Get all materials with optional pagination and filtering
   */
  static async getAllMaterials(
    page: number = 1,
    limit: number = 10,
    filters?: MaterialFilter
  ): Promise<MaterialPaginationResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.search) params.append('search', filters.search);
    if (filters?.brand) params.append('brand', filters.brand);
    if (filters?.unit) params.append('unit', filters.unit);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());

    const response = await apiGet(`${MATERIALS_ENDPOINT}?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch materials: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get single material by ID
   */
  static async getMaterialById(id: string): Promise<MaterialItem> {
    const response = await apiGet(`${MATERIALS_ENDPOINT}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch material: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create new material
   */
  static async createMaterial(data: CreateMaterialDTO): Promise<MaterialItem> {
    const response = await apiPost(MATERIALS_ENDPOINT, data);

    console.log("Im hitting this b")

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create material');
    }

    return response.json();
  }

  /**
   * Update existing material
   */
  static async updateMaterial(
    id: string,
    data: UpdateMaterialDTO
  ): Promise<MaterialItem> {
    const response = await apiPut(`${MATERIALS_ENDPOINT}/${id}`, data);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update material');
    }

    return response.json();
  }

  /**
   * Delete single material
   */
  static async deleteMaterial(id: string): Promise<{ success: boolean }> {
    const response = await apiDelete(`${MATERIALS_ENDPOINT}/${id}`);

    if (!response.ok) {
      throw new Error('Failed to delete material');
    }

    return response.json();
  }

  /**
   * Bulk delete materials
   */
  static async bulkDeleteMaterials(ids: string[]): Promise<{ deleted: number }> {
    const response = await apiFetch(`${MATERIALS_ENDPOINT}/bulk/delete`, {
      method: 'DELETE',
      body: { ids }
    });

    if (!response.ok) {
      throw new Error('Failed to bulk delete materials');
    }

    return response.json();
  }

  /**
   * Import materials from file (CSV/Excel)
   */
  static async importMaterials(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiFetch(`${MATERIALS_ENDPOINT}/import`, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });

    if (!response.ok) {
      throw new Error('Failed to import materials');
    }

    return response.json();
  }

  /**
   * Export materials to CSV
   */
  static async exportMaterialsToCSV(filters?: MaterialFilter): Promise<Blob> {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.brand) params.append('brand', filters.brand);
    if (filters?.unit) params.append('unit', filters.unit);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiGet(`${MATERIALS_ENDPOINT}/export?${params}`);

    if (!response.ok) {
      throw new Error('Failed to export materials');
    }

    return response.blob();
  }

  /**
   * Upload reference file for a material
   */
  static async uploadReference(materialId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiFetch(`${MATERIALS_ENDPOINT}/${materialId}/reference`, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });

    if (!response.ok) {
      throw new Error('Failed to upload reference file');
    }

    return response.json();
  }

  /**
   * Validate material code uniqueness
   */
  static async validateMaterialCode(code: string, excludeId?: string): Promise<{ valid: boolean }> {
    const params = new URLSearchParams({ code });
    if (excludeId) params.append('excludeId', excludeId);

    const response = await apiGet(`${MATERIALS_ENDPOINT}/validate/code?${params}`);

    if (!response.ok) {
      throw new Error('Failed to validate material code');
    }

    return response.json();
  }
}

export default MaterialService;