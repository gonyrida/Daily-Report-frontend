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
		<div className="w-full overflow-x-auto">
			<table className="w-full border-collapse border">
				<thead className="bg-muted/50">
					<tr>
						<th className="w-12 px-4 py-3 text-left">
							<Checkbox
								checked={selectedMaterials.length === materials.length && materials.length > 0}

								onCheckedChange={toggleSelectAll}
							/>
						</th>
						<th className="px-4 py-3 text-left font-medium">Reference</th>
						<th className="px-4 py-3 text-left font-medium">Code</th>
						<th className="px-4 py-3 text-left font-medium">Description</th>
						<th className="px-4 py-3 text-left font-medium">Unit</th>
						<th className="px-4 py-3 text-left font-medium">Unit Price</th>
						<th className="px-4 py-3 text-left font-medium">Brand</th>
						<th className="px-4 py-3 text-left font-medium">Last Modified</th>
					</tr>
				</thead>
				<tbody>
					{materials.map((material, index) => (
						<tr
							key={material._id}
							className="border-t cursor-pointer"
						>
							<td className="px-4">
								<Checkbox
									checked={selectedMaterials.includes(material._id)}
									onCheckedChange={() => toggleSelect(material._id)}
								/>
							</td>
							<td className="px-4 py-1">
								<div className="flex items-center gap-2">
									<span className="text-xs truncate max-w-[100px]">
										<img src={material.reference} className="w-30 h-10 object-fit" />
									</span>
								</div>
							</td>
							<td className="px-4 py-3">
								<span className="font-semibold text-gray-900 bg-blue-50 px-2 py-1 rounded">
									{material.code}
								</span>
							</td>
							<td className="px-4 py-3 max-w-xs">
								<span className="line-clamp-2">
									{material.description}
								</span>
							</td>
							<td className="px-4 py-3">
								<span className="inline-block bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium">
									{getUnitLabel(material.unit)}
								</span>
							</td>
							<td className="px-4 py-3 font-semibold">
								{formatPrice(material.unitPrice)}
							</td>
							<td className="px-4 py-3">
								<span>{material.brand}</span>
							</td>
							<td className="px-4 py-3 text-sm whitespace-nowrap">
								{formatDate(material.updatedAt)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
