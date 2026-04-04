import { useState, useCallback, useEffect } from 'react';
import MaterialService from '@/components/material_master/services/materialService';
import { MaterialItem, MaterialFilter } from '@/components/material_master/types/material';

interface UseMaterialsOptions {
	initialPage?: number;
	initialLimit?: number;
}

interface UseMaterialsReturn {
	materials: MaterialItem[];
	loading: boolean;
	error: string | null;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	setPage: (page: number) => void;
	setLimit: (limit: number) => void;
	// CRUD operations
	addMaterial: (material: MaterialItem) => Promise<void>;
	updateMaterial: (id: string, updates: Partial<MaterialItem>) => Promise<void>;
	deleteMaterial: (id: string) => Promise<void>;
	deleteBulk: (ids: string[]) => Promise<void>;
	// Utilities
	getMaterialById: (id: string) => MaterialItem | undefined;
	refetch: (filters?: MaterialFilter) => Promise<void>;
}

export const useMaterials = (options: UseMaterialsOptions = {}): UseMaterialsReturn => {
	const {
		initialPage = 1,
		initialLimit = 10,
	} = options;

	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(initialPage);
	const [limit, setLimit] = useState(initialLimit);
	const [total, setTotal] = useState(0);

	const totalPages = Math.max(1, Math.ceil(total / limit));

	const refetch = useCallback(async (filters?: MaterialFilter) => {
		setLoading(true);
		setError(null);

		try {
			const response = await MaterialService.getAllMaterials(page, limit, filters);
			setMaterials(response.items);
			setTotal(response.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch materials');
			console.error('Error fetching materials:', err);
		} finally {
			setLoading(false);
		}
	}, [page, limit]);

	useEffect(() => {
		refetch();
	}, [page, limit, refetch]);

	const addMaterial = useCallback(async (material: MaterialItem) => {
		setLoading(true);
		setError(null);
		
		try {
			const created = await MaterialService.createMaterial({
				code: material.code,
				description: material.description,
				reference: material.reference,
				unit: material.unit,
				unitPrice: material.unitPrice,
				brand: material.brand,
				status: material.status || 'active'
			});

			setMaterials(prev => [...prev, created.data]);
			setTotal(prev => prev + 1);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to add material');
			console.error('Error adding material:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	const updateMaterial = useCallback(async (id: string, updates: Partial<MaterialItem>) => {
		setLoading(true);
		setError(null);

		try {
			const dto = { ...updates };
			delete (dto as any)._id;
			delete (dto as any).createdAt;
			delete (dto as any).updatedAt;
			delete (dto as any).createdBy;
			// lastModifiedBy is optionally allowed, server sets it when authorized

			const updated = await MaterialService.updateMaterial(id, dto as any);
			setMaterials(prev => prev.map(m => (m._id === id ? updated.data : m)));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update material');
			console.error('Error updating material:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	const deleteMaterial = useCallback(async (id: string) => {
		setLoading(true);
		setError(null);

		try {
			await MaterialService.deleteMaterial(id);
			setMaterials(prev => prev.filter(m => m._id !== id));
			setTotal(prev => prev - 1);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete material');
			console.error('Error deleting material:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	const deleteBulk = useCallback(async (ids: string[]) => {
		setLoading(true);
		setError(null);

		try {
			await MaterialService.bulkDeleteMaterials(ids);
			setMaterials(prev => prev.filter(m => !ids.includes(m._id)));
			setTotal(prev => prev - ids.length);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to bulk delete materials');
			console.error('Error bulk deleting materials:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	const getMaterialById = useCallback((id: string): MaterialItem | undefined => {
		return materials.find(m => m._id === id);
	}, [materials]);

	return {
		materials,
		loading,
		error,
		pagination: {
			page,
			limit,
			total,
			totalPages,
		},
		setPage,
		setLimit,
		addMaterial,
		updateMaterial,
		deleteMaterial,
		deleteBulk,
		getMaterialById,
		refetch,
	};
};

export default useMaterials;
