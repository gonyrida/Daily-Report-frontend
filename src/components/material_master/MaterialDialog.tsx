import { useState, useEffect } from 'react';
import { MaterialItem, CreateMaterialDTO, UnitType } from '@/components/material_master/types/material';
import CreatableCombobox from '@/components/ui/creatable-combobox';

interface MaterialDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	material: MaterialItem | null;
	onSave: (material: MaterialItem) => void;
}

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
	{ value: 'pcs', label: 'Pieces (pcs)' },
	{ value: 'kg', label: 'Kilograms (kg)' },
	{ value: 'meter', label: 'Meters (m)' },
	{ value: 'liter', label: 'Liters (L)' },
	{ value: 'box', label: 'Boxes' },
	{ value: 'pack', label: 'Packs' },
];

interface FormData extends CreateMaterialDTO {
	status?: 'active' | 'inactive';
}

export default function MaterialDialog({
	open,
	onOpenChange,
	material,
	onSave,
}: MaterialDialogProps) {
	const [formData, setFormData] = useState<FormData>({
		code: '',
		description: '',
		reference: '#file:placeholder.png',
		unit: 'pcs',
		unitPrice: 0,
		brand: '',
		status: 'active',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Initialize form when material changes or dialog opens
	useEffect(() => {
		if (material) {
			setFormData({
				code: material.code,
				description: material.description,
				reference: material.reference,
				unit: material.unit,
				unitPrice: material.unitPrice,
				brand: material.brand,
				status: material.status,
			});
		} else {
			setFormData({
				code: '',
				description: '',
				reference: '#file:placeholder.png',
				unit: 'pcs',
				unitPrice: 0,
				brand: '',
				status: 'active',
			});
		}
		setErrors({});
	}, [material, open]);

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.code) {
			newErrors.code = 'Code is required';
		} else if (formData.code.length < 3) {
			newErrors.code = 'Code must be at least 3 characters';
		} else if (formData.code.length > 20) {
			newErrors.code = 'Code cannot exceed 20 characters';
		} else if (!/^[A-Z0-9\-_]+$/.test(formData.code)) {
			newErrors.code = 'Code can only contain uppercase letters, numbers, hyphens, and underscores';
		}

		if (!formData.description) {
			newErrors.description = 'Description is required';
		} else if (formData.description.length < 10) {
			newErrors.description = 'Description must be at least 10 characters';
		} else if (formData.description.length > 500) {
			newErrors.description = 'Description cannot exceed 500 characters';
		}

		if (!formData.unit) {
			newErrors.unit = 'Unit is required';
		}

		if (formData.unitPrice === undefined || formData.unitPrice === null) {
			newErrors.unitPrice = 'Unit price is required';
		} else if (formData.unitPrice < 0) {
			newErrors.unitPrice = 'Unit price must be positive';
		}

		if (!formData.brand) {
			newErrors.brand = 'Brand is required';
		} else if (formData.brand.length > 100) {
			newErrors.brand = 'Brand cannot exceed 100 characters';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		setIsSubmitting(true);

		try {
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 300));

			const newMaterial: MaterialItem = {
				_id: material?._id || `material_${Date.now()}`,
				code: formData.code,
				description: formData.description,
				reference: formData.reference,
				unit: formData.unit,
				unitPrice: formData.unitPrice,
				brand: formData.brand,
				status: formData.status || 'active',
				createdAt: material?.createdAt || new Date(),
				updatedAt: new Date(),
				createdBy: material?.createdBy || 'current_user',
				lastModifiedBy: 'current_user',
			};

			onSave(newMaterial);
			onOpenChange(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (field: keyof FormData, value: any) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
		// Clear error for this field
		if (errors[field]) {
			setErrors(prev => ({
				...prev,
				[field]: '',
			}));
		}
	};

	if (!open) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black bg-opacity-50 z-40"
				onClick={() => onOpenChange(false)}
			/>

			{/* Dialog */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
					{/* Header */}
					<div className="sticky top-0 bg-background border-b border-gray-200 px-6 py-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold">
							{material ? 'Edit Material Item' : 'Create New Material Item'}
						</h2>
						<button
							onClick={() => onOpenChange(false)}
							className="text-gray-500 hover:text-gray-700"
						>
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="p-6 space-y-6">
						{/* Code and Brand Row */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="code" className="block text-sm font-medium mb-1">
									Code <span className="text-red-500">*</span>
								</label>
								<input
									id="code"
									type="text"
									value={formData.code}
									onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
									placeholder="e.g., MAT-001"
									className={`bg-background w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
										errors.code
											? 'border-red-300 focus:ring-red-500'
											: 'border-gray-300 focus:ring-blue-500'
									}`}
									maxLength={20}
								/>
								{errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
								<p className="mt-1 text-xs">{formData.code.length}/20 characters</p>
							</div>

							<div>
								<label htmlFor="brand" className="block text-sm font-medium mb-1">
									Brand <span className="text-red-500">*</span>
								</label>
								<input
									id="brand"
									type="text"
									value={formData.brand}
									onChange={(e) => handleChange('brand', e.target.value)}
									placeholder="e.g., ISO Standard"
									className={`bg-background w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
										errors.brand
											? 'border-red-300 focus:ring-red-500'
											: 'border-gray-300 focus:ring-blue-500'
									}`}
									maxLength={100}
								/>
								{errors.brand && <p className="mt-1 text-xs text-red-500">{errors.brand}</p>}
							</div>
						</div>

						{/* Description */}
						<div>
							<label htmlFor="description" className="block text-sm font-medium mb-1">
								Description <span className="text-red-500">*</span>
							</label>
							<textarea
								id="description"
								value={formData.description}
								onChange={(e) => handleChange('description', e.target.value)}
								placeholder="Detailed description of the material item..."
								rows={3}
								className={`bg-background w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 resize-none ${
									errors.description
										? 'border-red-300 focus:ring-red-500'
										: 'border-gray-300 focus:ring-blue-500'
								}`}
								maxLength={500}
							/>
							{errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
							<p className="mt-1 text-xs">{formData.description.length}/500 characters</p>
						</div>

						{/* Unit and Unit Price Row */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label htmlFor="unit" className="block text-sm font-medium mb-1">
									Unit <span className="text-red-500">*</span>
								</label>
								<CreatableCombobox
									options={UNIT_OPTIONS}
									value={formData.unit}
									onChange={(value) =>
										handleChange('unit', value)
									}
									placeholder="Select unit..."
									width="w-full"
								/>
								{errors.unit && <p className="mt-1 text-xs text-red-500">{errors.unit}</p>}
							</div>

							<div>
								<label htmlFor="unitPrice" className="block text-sm font-medium mb-1">
									Unit Price ($) <span className="text-red-500">*</span>
								</label>
								<input
									id="unitPrice"
									type="number"
									step="0.01"
									min="0"
									value={formData.unitPrice}
									onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
									placeholder="0.00"
									className={`bg-background w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
										errors.unitPrice
											? 'border-red-300 focus:ring-red-500'
											: 'border-gray-300 focus:ring-blue-500'
									}`}
								/>
								{errors.unitPrice && <p className="mt-1 text-xs text-red-500">{errors.unitPrice}</p>}
							</div>
						</div>

						{/* Status and Reference Row */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="status" className="block text-sm font-medium mb-1">
									Status
								</label>
								<select
									id="status"
									value={formData.status || 'active'}
									onChange={(e) => handleChange('status', e.target.value as any)}
									className="bg-background w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Reference
								</label>
								{formData.reference && formData.reference.startsWith('data:') ? (
									<div className="relative flex items-center justify-center p-2 w-32">
										<img 
											src={formData.reference} 
											alt="Reference" 
											className="w-20 h-20 object-contain rounded border"
										/>
										<button
											type="button"
											onClick={() => handleChange('reference', '#file:placeholder.png')}
											className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
										>
											<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => document.getElementById('reference-input')?.click()}
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm flex items-center justify-center gap-2"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
										</svg>
										Upload Reference
									</button>
								)}
								<input
									id="reference-input"
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) {
											const reader = new FileReader();
											reader.onloadend = () => {
												handleChange('reference', reader.result as string);
											};
											reader.readAsDataURL(file);
										}
										// Reset input value so same file can be selected again
										e.target.value = '';
									}}
								/>
								<p className="mt-1 text-xs text-gray-500">Click to upload image</p>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-background sticky bottom-0 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 -mx-6 -mb-6">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
								className="px-4 py-2 text-sm font-medium bg-background border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{isSubmitting ? (
									<>
										<svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
										</svg>
										Saving...
									</>
								) : (
									material ? 'Update Material' : 'Create Material'
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	);
}
