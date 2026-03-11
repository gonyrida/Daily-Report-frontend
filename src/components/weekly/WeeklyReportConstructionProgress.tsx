import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Data interfaces for the construction progress tracker
export interface BoQData {
  qty: number;
  unitRate: number;
  amount: number;
}

export interface ProgressData {
  qty: number;
  amount: number;
  percentage: number;
}

export interface ConstructionProgressItem {
  id: string;
  scopeOfWorks: string;
  detailDescription: string;
  unit: string;
  boQ: BoQData;
  remark: string;
  previousWeek: ProgressData;
  thisWeek: ProgressData;
  upToThisWeek: ProgressData;
  remaining: ProgressData;
  nextWeekPlan: ProgressData;
  upToNextWeekPlan: ProgressData;
}

export interface ProjectInfo {
  project: string;
  subtitle: string;
  date: string;
  revision: string;
}

export interface ConstructionProgressData {
  projectInfo: ProjectInfo;
  items: ConstructionProgressItem[];
}

// Database payload schema
export interface ConstructionProgressPayload {
  reportId: string;
  projectInfo: {
    project: string;
    subtitle: string;
    date: string;
    revision: string;
  };
  progressItems: {
    id: string;
    scopeOfWorks: string;
    detailDescription: string;
    unit: string;
    boQ: {
      qty: number;
      unitRate: number;
      amount: number;
    };
    remark: string;
    previousWeek: {
      qty: number;
      amount: number;
      percentage: number;
    };
    thisWeek: {
      qty: number;
      amount: number;
      percentage: number;
    };
    upToThisWeek: {
      qty: number;
      amount: number;
      percentage: number;
    };
    remaining: {
      qty: number;
      amount: number;
      percentage: number;
    };
    nextWeekPlan: {
      qty: number;
      amount: number;
      percentage: number;
    };
    upToNextWeekPlan: {
      qty: number;
      amount: number;
      percentage: number;
    };
  }[];
  createdAt: string;
  updatedAt: string;
}

interface WeeklyReportConstructionProgressProps {
  data?: ConstructionProgressData;
  onDataChange?: (data: ConstructionProgressData) => void;
  reportId?: string;
}

interface EditableCell {
  rowIndex: number;
  field: string;
  subField?: string;
}

const WeeklyReportConstructionProgress: React.FC<WeeklyReportConstructionProgressProps> = ({
  data,
  onDataChange,
  reportId
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [items, setItems] = useState<ConstructionProgressItem[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  
  // Default sample data
  const defaultData: ConstructionProgressData = {
    projectInfo: {
      project: "Renovation Works of The Project for Building Capacity and Establishing Enabling Environment in ICT Majors of TVET in Cambodia",
      subtitle: "Detailed Bill of Quantities of 40 Classrooms",
      date: "4-Mar-26",
      revision: "Rev.01"
    },
    items: [
      {
        id: "I",
        scopeOfWorks: "Excavation Works",
        detailDescription: "",
        unit: "m3",
        boQ: { qty: 150.00, unitRate: 12.50, amount: 1875.00 },
        remark: "On schedule",
        previousWeek: { qty: 120.00, amount: 1500.00, percentage: 80 },
        thisWeek: { qty: 15.00, amount: 187.50, percentage: 10 },
        upToThisWeek: { qty: 135.00, amount: 1687.50, percentage: 90 },
        remaining: { qty: 15.00, amount: 187.50, percentage: 10 },
        nextWeekPlan: { qty: 15.00, amount: 187.50, percentage: 10 },
        upToNextWeekPlan: { qty: 150.00, amount: 1875.00, percentage: 100 }
      },
      {
        id: "1",
        scopeOfWorks: "Lean Concrete",
        detailDescription: "5cm thick lean concrete lean 1:3:6 for all footing and ground beam",
        unit: "m2",
        boQ: { qty: 85.00, unitRate: 8.00, amount: 680.00 },
        remark: "-",
        previousWeek: { qty: 42.50, amount: 340.00, percentage: 50 },
        thisWeek: { qty: 17.00, amount: 136.00, percentage: 20 },
        upToThisWeek: { qty: 59.50, amount: 476.00, percentage: 70 },
        remaining: { qty: 25.50, amount: 204.00, percentage: 30 },
        nextWeekPlan: { qty: 12.75, amount: 102.00, percentage: 15 },
        upToNextWeekPlan: { qty: 72.25, amount: 578.00, percentage: 85 }
      },
      {
        id: "1.1",
        scopeOfWorks: "Footing Reinforced Concrete",
        detailDescription: "Reinforced concrete grade 25/30 for foundation work",
        unit: "m3",
        boQ: { qty: 45.00, unitRate: 110.00, amount: 4950.00 },
        remark: "Delayed by rain",
        previousWeek: { qty: 9.00, amount: 990.00, percentage: 20 },
        thisWeek: { qty: 4.50, amount: 495.00, percentage: 10 },
        upToThisWeek: { qty: 13.50, amount: 1485.00, percentage: 30 },
        remaining: { qty: 31.50, amount: 3465.00, percentage: 70 },
        nextWeekPlan: { qty: 9.00, amount: 990.00, percentage: 20 },
        upToNextWeekPlan: { qty: 22.50, amount: 2475.00, percentage: 50 }
      }
    ]
  };

  const currentData = data || defaultData;
  
  // Initialize items state
  useEffect(() => {
    setItems(currentData.items);
  }, [currentData.items]);

  // Local state for editable project info
  const [localProjectInfo, setLocalProjectInfo] = useState(
    currentData?.projectInfo || {
      project: "",
      subtitle: "",
      date: "",
      revision: ""
    }
  );

  // Update localProjectInfo when data prop changes
  useEffect(() => {
    if (data?.projectInfo) {
      setLocalProjectInfo(data.projectInfo);
    }
  }, [data?.projectInfo]);

  // Handle project info changes and propagate to parent
  const handleProjectInfoChange = (field: keyof typeof localProjectInfo, value: string) => {
    const updatedProjectInfo = { ...localProjectInfo, [field]: value };
    setLocalProjectInfo(updatedProjectInfo);
    
    // Update the full data and notify parent
    const updatedData = {
      ...currentData,
      projectInfo: updatedProjectInfo
    };
    
    if (onDataChange) {
      onDataChange(updatedData);
    }
  };

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    const itemsToFilter = items.length > 0 ? items : currentData.items;
    if (!searchTerm) return itemsToFilter;
    
    return itemsToFilter.filter(item => 
      item.scopeOfWorks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detailDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, currentData.items, searchTerm]);

  // Generate database payload
  const generateDatabasePayload = (): ConstructionProgressPayload => {
    return {
      reportId: reportId || '',
      projectInfo: {
        project: currentData.projectInfo.project,
        subtitle: currentData.projectInfo.subtitle,
        date: currentData.projectInfo.date,
        revision: currentData.projectInfo.revision
      },
      progressItems: currentData.items.map(item => ({
        id: item.id,
        scopeOfWorks: item.scopeOfWorks,
        detailDescription: item.detailDescription,
        unit: item.unit,
        boQ: {
          qty: item.boQ.qty,
          unitRate: item.boQ.unitRate,
          amount: item.boQ.amount
        },
        remark: item.remark,
        previousWeek: {
          qty: item.previousWeek.qty,
          amount: item.previousWeek.amount,
          percentage: item.previousWeek.percentage
        },
        thisWeek: {
          qty: item.thisWeek.qty,
          amount: item.thisWeek.amount,
          percentage: item.thisWeek.percentage
        },
        upToThisWeek: {
          qty: item.upToThisWeek.qty,
          amount: item.upToThisWeek.amount,
          percentage: item.upToThisWeek.percentage
        },
        remaining: {
          qty: item.remaining.qty,
          amount: item.remaining.amount,
          percentage: item.remaining.percentage
        },
        nextWeekPlan: {
          qty: item.nextWeekPlan.qty,
          amount: item.nextWeekPlan.amount,
          percentage: item.nextWeekPlan.percentage
        },
        upToNextWeekPlan: {
          qty: item.upToNextWeekPlan.qty,
          amount: item.upToNextWeekPlan.amount,
          percentage: item.upToNextWeekPlan.percentage
        }
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get row background color based on ID pattern
  const getRowBackground = (id: string): string => {
    // Empty or null ID - white background
    if (!id || id.trim() === '') {
      return 'bg-white';
    }
    
    // Roman numerals (I, II, III, IV, V, etc.)
    if (/^[IVXLCDM]+$/.test(id)) {
      return 'bg-[#D0CECE]';
    }
    
    // Natural numbers (1, 2, 3, etc.)
    if (/^\d+$/.test(id)) {
      return 'bg-[#ACB9CA]';
    }
    
    // Outline numbering Level 3 (1.1.1, 1.1.2, 2.1.1, etc.)
    if (/^\d+\.\d+\.\d+$/.test(id)) {
      return 'bg-[#E7E6E6]';
    }
    
    // Outline numbering Level 2 (1.1, 1.2, 2.1, etc.)
    if (/^\d+\.\d+$/.test(id)) {
      return 'bg-[#DDEBF7]';
    }
    
    // Default background (for other text/invalid formats)
    return 'bg-white';
  };

  // Get all visible columns in order
  const getAllColumns = () => {
    return [
      'id', // ID column (read-only)
      'scopeOfWorks',
      'detailDescription', 
      'unit',
      'boQ.qty',
      'boQ.unitRate',
      'boQ.amount', // Amount column (read-only)
      'remark',
      'previousWeek.qty',
      'previousWeek.amount', // Amount column (read-only)
      'previousWeek.percentage',
      'thisWeek.qty',
      'thisWeek.amount', // Amount column (read-only)
      'thisWeek.percentage',
      'upToThisWeek.qty',
      'upToThisWeek.amount', // Amount column (read-only)
      'upToThisWeek.percentage',
      'remaining.qty',
      'remaining.amount', // Amount column (read-only)
      'remaining.percentage',
      'nextWeekPlan.qty',
      'nextWeekPlan.amount', // Amount column (read-only)
      'nextWeekPlan.percentage',
      'upToNextWeekPlan.qty',
      'upToNextWeekPlan.amount', // Amount column (read-only)
      'upToNextWeekPlan.percentage'
    ];
  };

  // Get all editable fields
  const getEditableFields = () => {
    return [
      'id', 'scopeOfWorks', 'detailDescription', 'unit', 'remark',
      'boQ.qty', 'boQ.unitRate', 'boQ.amount',
      'previousWeek.qty', 'previousWeek.amount', 'previousWeek.percentage',
      'thisWeek.qty', 'thisWeek.amount', 'thisWeek.percentage',
      'upToThisWeek.qty', 'upToThisWeek.amount', 'upToThisWeek.percentage',
      'remaining.qty', 'remaining.amount', 'remaining.percentage',
      'nextWeekPlan.qty', 'nextWeekPlan.amount', 'nextWeekPlan.percentage',
      'upToNextWeekPlan.qty', 'upToNextWeekPlan.amount', 'upToNextWeekPlan.percentage'
    ];
  };

  // Parse field path
  const parseFieldPath = (field: string) => {
    const parts = field.split('.');
    return {
      mainField: parts[0] as keyof ConstructionProgressItem,
      subField: parts[1] as string
    };
  };

  // Get value from item by field path
  const getItemValue = (item: ConstructionProgressItem, field: string) => {
    if (!item) return '';
    
    const { mainField, subField } = parseFieldPath(field);
    const value = item[mainField];
    
    if (typeof value === 'object' && subField && value !== null) {
      return (value as any)[subField] || '';
    }
    
    return value || '';
  };

  // Set value in item by field path
  const setItemValue = (item: ConstructionProgressItem, field: string, value: any) => {
    if (!item) return item;
    
    const { mainField, subField } = parseFieldPath(field);
    const itemCopy = { ...item };
    
    if (subField) {
      const currentValue = itemCopy[mainField] as any;
      (itemCopy[mainField] as any) = {
        ...(currentValue && typeof currentValue === 'object' ? currentValue : {}),
        [subField]: value
      };
    } else {
      (itemCopy[mainField] as any) = value;
    }
    
    return itemCopy;
  };

  // Start editing a cell
  const startEditing = (rowIndex: number, field: string) => {
    if (rowIndex < 0 || rowIndex >= filteredItems.length) return;
    
    const item = filteredItems[rowIndex];
    if (!item) return;
    
    const value = getItemValue(item, field);
    setEditingCell({ rowIndex, field });
    setEditValue(String(value));
    
    // Focus input after state update
    setTimeout(() => {
      const inputKey = `${rowIndex}-${field}`;
      const input = inputRefs.current.get(inputKey);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  };

  // Save edited value
  const saveEdit = () => {
    if (!editingCell) return;
    
    const { rowIndex, field } = editingCell;
    const item = filteredItems[rowIndex];
    
    // Parse value based on field type
    let parsedValue: any = editValue;
    if (field.includes('qty') || field.includes('unitRate') || field.includes('percentage')) {
      parsedValue = parseFloat(editValue) || 0;
    } else if (field.includes('amount')) {
      parsedValue = parseFloat(editValue) || 0;
    }
    
    const updatedItem = setItemValue(item, field, parsedValue);
    const updatedItems = [...items];
    const originalIndex = items.findIndex(i => i.id === item.id);
    updatedItems[originalIndex] = updatedItem;
    
    setItems(updatedItems);
    
    // Notify parent of data change
    const updatedData = {
      ...currentData,
      items: updatedItems
    };
    
    if (onDataChange) {
      onDataChange(updatedData);
    }
    
    setEditingCell(null);
    setEditValue("");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // Navigate to next cell
  const navigateToNextCell = (direction: 'right' | 'left' | 'up' | 'down' | 'next-row') => {
    if (!editingCell) return;
    
    const { rowIndex, field } = editingCell;
    const allColumns = getAllColumns();
    const editableFields = getEditableFields();
    const currentColumnIndex = allColumns.indexOf(field);
    
    let newColumnIndex = currentColumnIndex;
    let newRowIndex = rowIndex;
    
    switch (direction) {
      case 'right':
        newColumnIndex = Math.min(currentColumnIndex + 1, allColumns.length - 1);
        break;
      case 'left':
        newColumnIndex = Math.max(currentColumnIndex - 1, 0);
        break;
      case 'down':
        newRowIndex = Math.min(rowIndex + 1, filteredItems.length - 1);
        break;
      case 'up':
        newRowIndex = Math.max(rowIndex - 1, 0);
        break;
      case 'next-row':
        if (currentColumnIndex === allColumns.length - 1) {
          // At last column, move to first column of next row
          newColumnIndex = 0;
          newRowIndex = Math.min(rowIndex + 1, filteredItems.length - 1);
        } else {
          // Move to next column
          newColumnIndex = currentColumnIndex + 1;
        }
        break;
    }
    
    // Find the next editable column
    let targetField = allColumns[newColumnIndex];
    while (!editableFields.includes(targetField) && newColumnIndex < allColumns.length - 1 && direction !== 'up' && direction !== 'down') {
      newColumnIndex++;
      targetField = allColumns[newColumnIndex];
    }
    
    // If we're moving vertically, find the nearest editable column in the same row
    if ((direction === 'up' || direction === 'down') && !editableFields.includes(targetField)) {
      // Find the closest editable column to the current position
      let closestEditableIndex = -1;
      let minDistance = Infinity;
      
      for (let i = 0; i < editableFields.length; i++) {
        const editableColumnIndex = allColumns.indexOf(editableFields[i]);
        const distance = Math.abs(editableColumnIndex - currentColumnIndex);
        if (distance < minDistance) {
          minDistance = distance;
          closestEditableIndex = i;
        }
      }
      
      if (closestEditableIndex !== -1) {
        targetField = editableFields[closestEditableIndex];
      }
    }
    
    // Special case for next-row at end of table
    if (direction === 'next-row' && 
        rowIndex === filteredItems.length - 1 && 
        currentColumnIndex === allColumns.length - 1) {
      // Add new row
      addNewRow();
      return;
    }
    
    if ((newRowIndex !== rowIndex || targetField !== field) && editableFields.includes(targetField)) {
      saveEdit();
      setTimeout(() => {
        startEditing(newRowIndex, targetField);
      }, 0);
    }
  };

  // Add new row
  const addNewRow = () => {
    const newItem: ConstructionProgressItem = {
      id: String(filteredItems.length + 1),
      scopeOfWorks: "",
      detailDescription: "",
      unit: "",
      boQ: { qty: 0, unitRate: 0, amount: 0 },
      remark: "",
      previousWeek: { qty: 0, amount: 0, percentage: 0 },
      thisWeek: { qty: 0, amount: 0, percentage: 0 },
      upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
      remaining: { qty: 0, amount: 0, percentage: 0 },
      nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
      upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
    };
    
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    
    const updatedData = {
      ...currentData,
      items: updatedItems
    };
    
    if (onDataChange) {
      onDataChange(updatedData);
    }
    
    // Start editing first field of new row
    setTimeout(() => {
      startEditing(filteredItems.length, 'scopeOfWorks');
    }, 0);
  };

  // Add multiple rows
  const addMultipleRows = () => {
    const rowCount = prompt('How many rows would you like to add?', '1');
    
    if (!rowCount || rowCount === null || rowCount === '') return;
    
    const count = parseInt(rowCount);
    if (isNaN(count) || count <= 0) {
      // Create a custom popup message
      const popup = document.createElement('div');
      popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fef2f2;
        border: 1px solid #ef4444;
        color: #991b1b;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        max-width: 300px;
      `;
      
      popup.innerHTML = `
        <div style="margin-bottom: 12px; font-weight: 600; color: #dc2626;">
          ⚠️ Invalid Input
        </div>
        <div style="margin-bottom: 16px; color: #7f1d1d;">
          Please enter a valid number greater than 0.
        </div>
        <button onclick="this.parentElement.remove()" style="
          background: #dc2626;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">OK</button>
      `;
      
      document.body.appendChild(popup);
      
      // Auto-remove after 3 seconds or on click
      const removePopup = () => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      };
      
      setTimeout(removePopup, 3000);
      
      return;
    }
    
    const newItems: ConstructionProgressItem[] = [];
    const startIndex = filteredItems.length + 1;
    
    for (let i = 0; i < count; i++) {
      const newItem: ConstructionProgressItem = {
        id: String(startIndex + i),
        scopeOfWorks: "",
        detailDescription: "",
        unit: "",
        boQ: { qty: 0, unitRate: 0, amount: 0 },
        remark: "",
        previousWeek: { qty: 0, amount: 0, percentage: 0 },
        thisWeek: { qty: 0, amount: 0, percentage: 0 },
        upToThisWeek: { qty: 0, amount: 0, percentage: 0 },
        remaining: { qty: 0, amount: 0, percentage: 0 },
        nextWeekPlan: { qty: 0, amount: 0, percentage: 0 },
        upToNextWeekPlan: { qty: 0, amount: 0, percentage: 0 }
      };
      newItems.push(newItem);
    }
    
    const updatedItems = [...items, ...newItems];
    setItems(updatedItems);
    
    const updatedData = {
      ...currentData,
      items: updatedItems
    };
    
    if (onDataChange) {
      onDataChange(updatedData);
    }
    
    // Show success message
    const successPopup = document.createElement('div');
    successPopup.style.cssText = `
      position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      `;
    
    successPopup.innerHTML = `✅ Added ${count} row${count > 1 ? 's' : ''} successfully`;
    
    document.body.appendChild(successPopup);
    
    setTimeout(() => {
      if (successPopup.parentNode) {
        successPopup.parentNode.removeChild(successPopup);
      }
    }, 2000);
    
    // Start editing first field of first new row
    if (count > 0) {
      setTimeout(() => {
        startEditing(filteredItems.length, 'scopeOfWorks');
      }, 0);
    }
  };

  // Handle table-wide click to start editing
  const handleTableClick = (e: React.MouseEvent<HTMLTableElement>) => {
    // Don't interfere with cell clicks or button clicks
    if (e.target !== e.currentTarget) return;
    
    // Find the first editable cell
    const editableFields = getEditableFields();
    if (editableFields.length > 0 && filteredItems.length > 0) {
      // Start editing the first field of the first row
      startEditing(0, editableFields[0]);
    }
  };
  const deleteRow = (rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= filteredItems.length) return;
    
    const updatedItems = items.filter((_, index) => index !== rowIndex);
    setItems(updatedItems);
    
    const updatedData = {
      ...currentData,
      items: updatedItems
    };
    
    if (onDataChange) {
      onDataChange(updatedData);
    }
    
    // Clear editing if deleted row was being edited
    if (editingCell?.rowIndex === rowIndex) {
      setEditingCell(null);
      setEditValue('');
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    if (!editingCell) return;
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        navigateToNextCell('next-row');
        break;
      case 'Tab':
        e.preventDefault();
        navigateToNextCell(e.shiftKey ? 'left' : 'right');
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateToNextCell('right');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateToNextCell('left');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateToNextCell('down');
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateToNextCell('up');
        break;
      case 'Escape':
        e.preventDefault();
        cancelEdit();
        break;
    }
  };

  // Render cell content
  const renderCell = (item: ConstructionProgressItem, rowIndex: number, field: string) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === field;
    const value = getItemValue(item, field);
    const inputKey = `${rowIndex}-${field}`;
    
    if (isEditing) {
      // Check if this is a text column that should fill the cell
      const isTextColumn = ['scopeOfWorks', 'detailDescription', 'remark'].includes(field);
      
      return (
        <Input
          ref={(el) => {
            if (el) inputRefs.current.set(inputKey, el);
          }}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, field)}
          className={`${
            isTextColumn ? 'w-full text-left' : 'w-auto text-center min-w-[40px]'
          }`}
          inputSize="sm"
          showIndicator={false}
          style={{
            width: isTextColumn ? '100%' : `${Math.max(40, editValue.length * 8 + 16)}px`,
            minWidth: isTextColumn ? 'auto' : '40px'
          }}
        />
      );
    }
    
    // Format display value
    let displayValue = value;
    if (field.includes('qty') || field.includes('unitRate')) {
      displayValue = typeof value === 'number' ? value.toFixed(2) : value;
    } else if (field.includes('amount')) {
      displayValue = formatCurrency(typeof value === 'number' ? value : 0);
    } else if (field.includes('percentage')) {
      displayValue = `${value}%`;
    }
    
    // Check if this is a text column that should wrap
    const isTextColumn = ['scopeOfWorks', 'detailDescription', 'remark'].includes(field);
    
    return (
      <div
        onClick={() => startEditing(rowIndex, field)}
        className={`px-1 py-0.5 cursor-pointer hover:bg-blue-50 rounded text-[10px] ${
          isTextColumn ? 'text-left whitespace-normal break-words' : 'text-center whitespace-nowrap'
        }`}
        style={{ 
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {displayValue}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8] font-sans text-slate-900">
      <div className="p-6 lg:px-12">
        {/* Title Section */}
        {/* <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-[#1e3a8a] uppercase tracking-widest">Construction Progress</h1>
        </div> */}

        {/* Project Info Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project</p>
              <input
                type="text"
                className="w-full text-slate-800 font-semibold leading-relaxed bg-transparent border-slate-300 focus:border-primary focus:outline-none transition-colors"
                value={localProjectInfo.project}
                onChange={(e) => handleProjectInfoChange('project', e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtitle</p>
              <input
                type="text"
                className="w-full text-slate-600 bg-transparent border-slate-300 focus:border-primary focus:outline-none transition-colors"
                value={localProjectInfo.subtitle}
                onChange={(e) => handleProjectInfoChange('subtitle', e.target.value)}
                placeholder="Enter subtitle"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</p>
              <input
                type="date"
                className="text-slate-800 font-normal bg-transparent transition-colors cursor-pointer"
                value={localProjectInfo.date}
                onChange={(e) => handleProjectInfoChange('date', e.target.value)}
              />
            </div>

            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revision</p>
              <input
                type="text"
                className="text-center text-xs font-medium bg-primary/10 text-primary rounded px-2.5 py-0.5 border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={localProjectInfo.revision}
                onChange={(e) => handleProjectInfoChange('revision', e.target.value)}
                placeholder="Rev.00"
              />
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <input
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all"
              placeholder="Search scope of works or description..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <p className="font-semibold text-blue-800 mb-1">Keyboard Shortcuts:</p>
              <div className="space-y-1">
                <div><kbd className="bg-white px-1 py-0.5 rounded border">Enter</kbd> → Next field/row</div>
                <div><kbd className="bg-white px-1 py-0.5 rounded border">Tab</kbd> → Navigate right/left</div>
                <div><kbd className="bg-white px-1 py-0.5 rounded border">↑↓←→</kbd> → Move cells</div>
                <div><kbd className="bg-white px-1 py-0.5 rounded border">Esc</kbd> → Cancel edit</div>
              </div>
            </div>
            <button
              onClick={addMultipleRows}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none transition-colors font-medium text-sm"
            >
              + Add Rows
            </button>
          </div>
        </div>

        {/* Spreadsheet Table Container */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <style>{`
              .table-container::-webkit-scrollbar {
                height: 8px;
                width: 8px;
              }
              .table-container::-webkit-scrollbar-track {
                background: #f1f1f1;
              }
              .table-container::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .table-container::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
              .sticky-col {
                position: sticky;
                left: 0;
                z-index: 20;
                background-color: inherit;
              }
            `}</style>
            
            <table className="w-full text-[10px] text-left border-collapse" onClick={handleTableClick}>
              <thead>
                {/* Header Row 1 */}
                <tr className="bg-[#34495e] text-white">
                  <th className=" px-4 py-3 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>
                    ID
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 min-w-[100px] font-bold whitespace-nowrap" rowSpan={2}>
                    Scope of Works
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>
                    Detail Description
                  </th>
                  <th className="px-3 py-2 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>
                    Unit
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold" colSpan={3}>
                    BoQ
                  </th>
                  <th className="px-2 py-2 border-r text-center border-slate-600 min-w-[100px] font-bold" rowSpan={2}>
                    Remark
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold" colSpan={3}>
                    % Up to Previous Week
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold" colSpan={3}>
                    % This Week
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold" colSpan={3}>
                    % Up to This Week
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold" colSpan={3}>
                    % Remaining
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold" colSpan={3}>
                    % Next Week Plan
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold" colSpan={3}>
                    % Up to Next Week Plan
                  </th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>
                    Actions
                  </th>
                </tr>
                
                {/* Header Row 2 (Sub-headers) */}
                <tr className="bg-[#34495e]/90 text-white/90">
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">QTY</th>
                  <th className="px-2 py-2 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>
                    Unit Rate
                  </th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">Amount</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">QTY</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">Amount</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">%</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">QTY</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">Amount</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">%</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">QTY</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">Amount</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">%</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">QTY</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">Amount</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">%</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">QTY</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">Amount</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">%</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">QTY</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">Amount</th>
                  <th className="px-1 py-1 border-r border-slate-600 text-center text-[9px]">%</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item, index) => (
                  <tr key={index} className={`${getRowBackground(item.id)} transition-colors group`}>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'id')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200" style={{ width: '280px' }}>{renderCell(item, index, 'scopeOfWorks')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200" style={{ width: '310px' }}>{renderCell(item, index, 'detailDescription')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'unit')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'boQ.qty')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'boQ.unitRate')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'boQ.amount')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 text-blue-600" style={{ width: '208px' }}>{renderCell(item, index, 'remark')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'previousWeek.qty')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'previousWeek.amount')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'previousWeek.percentage')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'thisWeek.qty')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'thisWeek.amount')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'thisWeek.percentage')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'upToThisWeek.qty')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'upToThisWeek.amount')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'upToThisWeek.percentage')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'remaining.qty')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'remaining.amount')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'remaining.percentage')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'nextWeekPlan.qty')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'nextWeekPlan.amount')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'nextWeekPlan.percentage')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'upToNextWeekPlan.qty')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'upToNextWeekPlan.amount')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200 w-auto">{renderCell(item, index, 'upToNextWeekPlan.percentage')}</td>
                    <td className="px-1.5 py-2 text-center border-r border-slate-200">
                      <button
                        onClick={() => deleteRow(index)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debug: Show database payload */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-bold mb-2">Database Payload (for debugging):</h3>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(generateDatabasePayload(), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyReportConstructionProgress;
