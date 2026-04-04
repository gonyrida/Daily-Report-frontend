import { MaterialItem } from '@/components/material_master/types/material';
import { formatPrice, formatDate, getUnitLabel } from '@/components/material_master/helpers/materialHelper';
import { Checkbox } from '@/components/ui/checkbox';

interface MaterialsTableProps {
	materials: MaterialItem[];
	selectedMaterials: string[];
	onSelectionChange: (selected: string[]) => void;
}

export default function MaterialsTable({
	materials,
	selectedMaterials,
	onSelectionChange,
}: MaterialsTableProps) {
	const toggleSelect = (id: string) => {
		if (selectedMaterials.includes(id)) {
			onSelectionChange(selectedMaterials.filter(s => s !== id));
		} else {
			onSelectionChange([...selectedMaterials, id]);
		}
	};

	const toggleSelectAll = () => {
		if (selectedMaterials.length === materials.length && materials.length > 0) {
			onSelectionChange([]);
		} else {
			onSelectionChange(materials.map(m => m._id));
		}
	};

	if (materials.length === 0) {
		return (
			<div className="flex items-center justify-center py-12 px-4">
				<p className="text-center text-gray-500 text-sm">
					No materials found. Try adjusting your search or filters.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full overflow-x-auto rounded-lg border border-gray-200">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-gray-200 bg-gray-50">
						<th className="w-12 px-4 py-3 text-left">
							<Checkbox
								checked={selectedMaterials.length === materials.length && materials.length > 0}

								onCheckedChange={toggleSelectAll}
							/>
						</th>
						<th className="px-4 py-3 text-left font-medium text-gray-700">Reference</th>
						<th className="px-4 py-3 text-left font-medium text-gray-700">Code</th>
						<th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
						<th className="px-4 py-3 text-left font-medium text-gray-700">Unit</th>
						<th className="px-4 py-3 text-right font-medium text-gray-700">Unit Price</th>
						<th className="px-4 py-3 text-left font-medium text-gray-700">Brand</th>
						<th className="px-4 py-3 text-left font-medium text-gray-700">Last Modified</th>
					</tr>
				</thead>
				<tbody>
					{materials.map((material, index) => (
						<tr
							key={material._id}
							className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
								index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
							}`}
						>
							<td className="px-4 py-3">
								<Checkbox
									checked={selectedMaterials.includes(material._id)}
									onCheckedChange={() => toggleSelect(material._id)}
								/>
							</td>
							<td className="px-4 py-3">
								<div className="flex items-center gap-2">
									<div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
										{material.reference === '#file:placeholder.png' ? '📄' : '📷'}
									</div>
									<span className="text-xs text-gray-500 truncate max-w-[100px]">
										{material.reference}
									</span>
								</div>
							</td>
							<td className="px-4 py-3">
								<span className="font-semibold text-gray-900 bg-blue-50 px-2 py-1 rounded">
									{material.code}
								</span>
							</td>
							<td className="px-4 py-3 max-w-xs">
								<span className="text-gray-700 line-clamp-2">
									{material.description}
								</span>
							</td>
							<td className="px-4 py-3">
								<span className="inline-block bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium">
									{getUnitLabel(material.unit)}
								</span>
							</td>
							<td className="px-4 py-3 text-right font-semibold text-gray-900">
								{formatPrice(material.unitPrice)}
							</td>
							<td className="px-4 py-3">
								<span className="text-gray-700">{material.brand}</span>
							</td>
							<td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
								{formatDate(material.updatedAt)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
