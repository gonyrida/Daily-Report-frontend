import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MaterialItem } from '@/components/material_master/types/material';
import MaterialsTable from '../material_master/MaterialsTable';
import MaterialDialog from '../material_master/MaterialDialog';
import useMaterials from '@/components/material_master/hooks/useMaterial';

interface MasterMaterialsProps {
	onRefresh?: () => void;
}

const MasterMaterials = ({ onRefresh }: MasterMaterialsProps) => {
	const {
		materials,
		loading,
		error,
		pagination,
		setPage,
		setLimit,
		addMaterial,
		updateMaterial,
		deleteBulk,
		refetch,
	} = useMaterials();

	const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterBrand, setFilterBrand] = useState('');

	// Filter materials based on search and brand
	const filteredMaterials = materials.filter(material => {
		const matchesSearch = searchTerm === '' || 
			material.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
			material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
			material.brand.toLowerCase().includes(searchTerm.toLowerCase());
		
		const matchesBrand = filterBrand === '' || material.brand === filterBrand;
		
		return matchesSearch && matchesBrand;
	});

	// Get unique brands for filter dropdown
	const uniqueBrands = Array.from(new Set(materials.map(m => m.brand))).sort();

	const handleCreateNew = () => {
		setEditingMaterial(null);
		setIsDialogOpen(true);
	};

	const handleEdit = () => {
		if (selectedMaterials.length === 1) {
			const material = materials.find(m => m._id === selectedMaterials[0]);
			if (material) {
				setEditingMaterial(material);
				setIsDialogOpen(true);
			}
		}
	};

	const handleDelete = async () => {
		if (selectedMaterials.length > 0) {
			await deleteBulk(selectedMaterials);
			setSelectedMaterials([]);
		}
	};

	const handleSaveMaterial = async (material: MaterialItem) => {
		if (editingMaterial) {
			await updateMaterial(material._id, material);
		} else {
			await addMaterial(material);
		}
		setIsDialogOpen(false);
		setEditingMaterial(null);
		setSelectedMaterials([]);
	};

	const handleRefresh = async () => {
		await refetch();
		setSelectedMaterials([]);
		setSearchTerm('');
		setFilterBrand('');
		onRefresh?.();
	};

	return (
		<div className="space-y-6">
			{loading && (
				<div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">
					Loading materials...
				</div>
			)}
			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">
					Error: {error}
				</div>
			)}

			{/* Filters Card */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-xl font-semibold">Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Search Input */}
						<div className="flex flex-col gap-2">
							<label className="text-sm font-medium">Search</label>
							<input
								type="text"
								placeholder="Search by code, description, or brand..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="bg-background px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{/* Brand Filter */}
						<div className="flex flex-col gap-2">
							<label className="text-sm font-medium">Brand</label>
							<select
								value={filterBrand}
								onChange={(e) => setFilterBrand(e.target.value)}
								className="bg-background px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">All Brands</option>
								{uniqueBrands.map(brand => (
									<option key={brand} value={brand}>{brand}</option>
								))}
							</select>
						</div>

						{/* Results Count */}
						<div className="flex flex-col gap-2 justify-end">
							<span className="text-sm font-medium">Results: {filteredMaterials.length} / {materials.length}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Main Materials Card */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-4">
					<CardTitle className="text-xl font-semibold">Material Items</CardTitle>

					<div className="flex gap-2">
						<Button
							variant="default"
							size="sm"
							onClick={handleCreateNew}
						>
							New Item
						</Button>
						<Button
							variant="default"
							size="sm"
							onClick={handleEdit}
							disabled={selectedMaterials.length !== 1}
						>
							Edit Item
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleDelete}
							disabled={selectedMaterials.length === 0}
						>
							Delete Selected ({selectedMaterials.length})
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleRefresh}
						>
							Refresh
						</Button>
					</div>
				</CardHeader>

				<CardContent>
					<MaterialsTable
						materials={filteredMaterials}
						selectedMaterials={selectedMaterials}
						onSelectionChange={setSelectedMaterials}
					/>
				</CardContent>

				<div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
					<span>
						Page {pagination.page} of {pagination.totalPages} — {pagination.total} item{pagination.total === 1 ? '' : 's'}
					</span>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, pagination.page - 1))} disabled={pagination.page === 1}>
							Prev
						</Button>
						<Button variant="outline" size="sm" onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))} disabled={pagination.page === pagination.totalPages}>
							Next
						</Button>
						<select value={pagination.limit} onChange={(e) => setLimit(Number(e.target.value))} className="bg-background rounded border border-gray-300 px-2 py-1 text-sm">
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={20}>20</option>
							<option value={50}>50</option>
						</select>
					</div>
				</div>
			</Card>

			{/* Material Dialog */}
			<MaterialDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				material={editingMaterial}
				onSave={handleSaveMaterial}
			/>
		</div>
	)
}

export default MasterMaterials;