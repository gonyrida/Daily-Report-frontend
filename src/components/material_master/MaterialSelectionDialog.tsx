import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MaterialItem } from '@/components/material_master/types/material';
import { apiGet } from '@/lib/apiFetch';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, getUnitLabel } from '@/components/material_master/helpers/materialHelper';
import CreatableCombobox from '@/components/ui/creatable-combobox';

interface MaterialSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMaterialsSelected: (items: any[]) => void;
  customUnits?: { value: string; label: string }[];
  onCreateUnit?: (newUnit: { value: string; label: string }) => void;
}

interface ConfiguredItem {
  materialId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  brand: string;
  reference: string;
  note: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'meter', label: 'Meters' },
  { value: 'liter', label: 'Liters' },
  { value: 'box', label: 'Boxes' },
  { value: 'pack', label: 'Packs' },
];

export default function MaterialSelectionDialog({
  isOpen,
  onOpenChange,
  onMaterialsSelected,
  customUnits,
  onCreateUnit
}: MaterialSelectionDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'select' | 'configure'>('select');
  const allUnitOptions = [...UNIT_OPTIONS, ...(customUnits || [])];
  
  // Tab 1: Selection state
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Tab 2: Configuration state
  const [configuredItems, setConfiguredItems] = useState<ConfiguredItem[]>([]);

  // Fetch materials when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen, pagination.page, pagination.limit, searchTerm]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await apiGet(
        `/materials?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(searchTerm)}&status=active`
      );
      const result = await response.json();
      if (result.success) {
        setMaterials(result.items || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0,
          totalPages: result.totalPages || 1,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
      toast({
        title: 'Error',
        description: 'Failed to load materials',
      });
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedMaterialIds(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMaterialIds.length === materials.length && materials.length > 0) {
      setSelectedMaterialIds([]);
    } else {
      setSelectedMaterialIds(materials.map(m => m._id));
    }
  };

  // Initialize configured items when moving to tab 2
  const handleNext = () => {
    const selectedMaterials = materials.filter(m => selectedMaterialIds.includes(m._id));
    const newConfiguredItems: ConfiguredItem[] = selectedMaterials.map(material => {
      const existing = configuredItems.find(i => i.materialId === material._id);
      return existing || {
        materialId: material._id,
        description: material.description,
        unit: material.unit,
        quantity: 1,
        unitPrice: material.unitPrice,
        brand: material.brand,
        reference: material.reference,
        note: '',
      };
    });
    setConfiguredItems(newConfiguredItems);
    setActiveTab('configure');
  };

  // Update configured item field
  const updateConfiguredItem = (materialId: string, field: keyof ConfiguredItem, value: any) => {
    setConfiguredItems(prev =>
      prev.map(item =>
        item.materialId === materialId ? { ...item, [field]: value } : item
      )
    );
  };

  // Remove item from configuration
  const removeConfiguredItem = (materialId: string) => {
    setConfiguredItems(prev => prev.filter(i => i.materialId !== materialId));
    setSelectedMaterialIds(prev => prev.filter(id => id !== materialId));
  };

  // Submit handler
  const handleSubmit = () => {
    // Validate quantities
    const invalidItems = configuredItems.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'All items must have a quantity greater than 0',
      });
      return;
    }

    onMaterialsSelected(configuredItems);
    resetState();
  };

  // Reset state on close
  const resetState = () => {
    setActiveTab('select');
    setSelectedMaterialIds([]);
    setConfiguredItems([]);
    setSearchTerm('');
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleCreateUnit = (materialId: string, newUnitLabel: string) => {
    const newUnit = { value: newUnitLabel.toLowerCase(), label: newUnitLabel };
    onCreateUnit?.(newUnit);  // Notify parent
    updateConfiguredItem(materialId, 'unit', newUnit.value);  // Update this item
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Materials</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab('select')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'select'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              activeTab === 'select'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </span>
            <span>Select Materials</span>
            {selectedMaterialIds.length > 0 && (
              <span className="text-center text-md px-2">
                {`(${selectedMaterialIds.length})`}
              </span>
            )}
          </button>
          
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          
          <button
            onClick={() => configuredItems.length > 0 && setActiveTab('configure')}
            disabled={configuredItems.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'configure'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : configuredItems.length === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              activeTab === 'configure'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </span>
            <span>Configure Quantities</span>
          </button>
        </div>

        {/* Tab 1: Selection */}
        {activeTab === 'select' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search and Filter */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search by code, description, or brand..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="flex-1"
              />
            </div>

            {/* Materials Table */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No materials found</p>
                  <p className="text-sm">Try adjusting your search</p>
                </div>
              ) : (
                <table className="w-full border-collapse border">
                  <thead className="bg-background sticky top-0">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <Checkbox
                          checked={
                            selectedMaterialIds.length === materials.length &&
                            materials.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Reference</th>
                      <th className="px-4 py-3 text-left font-medium">Code</th>
                      <th className="px-4 py-3 text-left font-medium">Description</th>
                      <th className="px-4 py-3 text-left font-medium">Unit</th>
                      <th className="px-4 py-3 text-left font-medium">Unit Price</th>
                      <th className="px-4 py-3 text-left font-medium">Brand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material) => (
                      <tr
                        key={material._id}
                        className="border-t cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800"
                        onClick={() => toggleSelect(material._id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedMaterialIds.includes(material._id)}
                            onCheckedChange={() => toggleSelect(material._id)}
                          />
                        </td>
                        <td className="px-4 py-1">
                          <div className="flex items-center gap-2">
                            {material.reference && material.reference.startsWith('data:') ? (
                              <img
                                src={material.reference}
                                alt="Reference"
                                className="w-16 h-12 object-contain rounded border"
                              />
                            ) : (
                              <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                            {material.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="line-clamp-2">{material.description}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs font-medium">
                            {getUnitLabel(material.unit)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatPrice(material.unitPrice)}
                        </td>
                        <td className="px-4 py-3">{material.brand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} items
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedMaterialIds.length === 0}
              >
                Next ({selectedMaterialIds.length} selected)
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Configuration */}
        {activeTab === 'configure' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
              {configuredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No materials selected</p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('select')}
                    className="mt-4"
                  >
                    Go back to selection
                  </Button>
                </div>
              ) : (
                <table className="w-full border-collapse border">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Reference</th>
                      <th className="px-4 py-3 text-left font-medium">Description</th>
                      <th className="px-4 py-3 text-left font-medium">Qty *</th>
                      <th className="px-4 py-3 text-left font-medium">Unit</th>
                      <th className="px-4 py-3 text-left font-medium">Unit Price</th>
                      <th className="px-4 py-3 text-left font-medium">Brand</th>
                      <th className="px-4 py-3 text-left font-medium">Note</th>
                      <th className="px-4 py-3 text-center font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configuredItems.map((item) => {
                      const material = materials.find((m) => m._id === item.materialId);
                      return (
                        <tr key={item.materialId} className="border-t">
                          <td className="px-4 py-3">
                            {item.reference && item.reference.startsWith('data:') ? (
                              <img
                                src={item.reference}
                                alt="Reference"
                                className="w-16 h-12 object-contain rounded border"
                              />
                            ) : (
                              <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                                No Image
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Textarea
                              value={item.description}
                              onChange={(e) =>
                                updateConfiguredItem(item.materialId, 'description', e.target.value)
                              }
                              className="min-w-[150px] min-h-[60px]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={item.quantity || ''}
                              onChange={(e) =>
                                updateConfiguredItem(
                                  item.materialId,
                                  'quantity',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-24"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <CreatableCombobox
                              options={allUnitOptions}
                              value={item.unit}
                              onChange={(value) =>
                                updateConfiguredItem(item.materialId, 'unit', value)
                              }
                              onCreate={(newUnit) => handleCreateUnit(item.materialId, newUnit)}
                              placeholder="Select unit..."
                              width="w-[178px]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unitPrice || ''}
                              onChange={(e) =>
                                updateConfiguredItem(
                                  item.materialId,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-28"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="text"
                              value={item.brand}
                              onChange={(e) =>
                                updateConfiguredItem(item.materialId, 'brand', e.target.value)
                              }
                              className="w-28"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Textarea
                              value={item.note}
                              onChange={(e) =>
                                updateConfiguredItem(item.materialId, 'note', e.target.value)
                              }
                              placeholder="Optional note..."
                              className="min-w-[120px] min-h-[60px]"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeConfiguredItem(item.materialId)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setActiveTab('select')}>
                ← Back to Selection
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={configuredItems.length === 0}
                >
                  Add to Request ({configuredItems.length} items)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
