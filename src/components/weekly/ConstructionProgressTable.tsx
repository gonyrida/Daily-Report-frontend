import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { ConstructionProgressItem, EditableCell } from '../../types/constructionProgress';
import { isAutoCalculated } from '../../utils/calculationEngine';
import { detectIdType, isRomanId } from '../../utils/idEngine';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConstructionProgressTableProps {
  filteredItems: ConstructionProgressItem[];
  editingCell: EditableCell | null;
  editValue: string;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>;
  rowBackgrounds: Record<number, string>;
  startEditing: (rowIndex: number, field: string) => void;
  setEditValue: (value: string) => void;
  saveEdit: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleDropdownToggle: (rowIndex: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  getItemValue: (item: ConstructionProgressItem, field: string) => any;
  getRowBg: (item: ConstructionProgressItem, rowIndex: number) => string;
  updateUnitDirectly: (rowIndex: number, unitValue: string) => void;
}

export const ConstructionProgressTable: React.FC<ConstructionProgressTableProps> = ({
  filteredItems,
  editingCell,
  editValue,
  inputRefs,
  rowBackgrounds,
  startEditing,
  setEditValue,
  saveEdit,
  handleKeyDown,
  handleDropdownToggle,
  getItemValue,
  getRowBg,
  updateUnitDirectly
}) => {
  const ALL_COLUMNS = [
    'id', 'scopeOfWorks', 'detailDescription', 'unit',
    'boQ.qty', 'boQ.materialRate', 'boQ.laborRate', 'boQ.unitRate', 'boQ.amount', 'remark',
    'previousWeek.qty', 'previousWeek.amount', 'previousWeek.percentage',
    'thisWeek.qty', 'thisWeek.amount', 'thisWeek.percentage',
    'upToThisWeek.qty', 'upToThisWeek.amount', 'upToThisWeek.percentage',
    'remaining.qty', 'remaining.amount', 'remaining.percentage',
    'nextWeekPlan.qty', 'nextWeekPlan.amount', 'nextWeekPlan.percentage',
    'upToNextWeekPlan.qty', 'upToNextWeekPlan.amount', 'upToNextWeekPlan.percentage'
  ];

  // Round to 2dp then format with comma thousands separator
  const formatNum = (v: number): string => {
    const rounded = Math.round(v * 100) / 100;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  };
  const formatCurrency = formatNum;

  const UNIT_OPTIONS = ['LS', 'Lot', 'Set', 'Pcs', 'm', 'm2', 'm3', 'Sq.m', 'Nos', 'Kg', 'Custom'];

  const [customUnitValues, setCustomUnitValues] = useState<Record<string, string>>({});
  const [customUnitInputValues, setCustomUnitInputValues] = useState<Record<string, string>>({});
  const [justEnteredCustomMode, setJustEnteredCustomMode] = useState<Record<string, boolean>>({});

  const renderCell = (item: ConstructionProgressItem, rowIndex: number, field: string) => {
    const isUnitField = field === 'unit';
    const stableId = item.id || `${item.scopeOfWorks}-${rowIndex}`;
    const isEditing = editingCell?.itemId === stableId && editingCell?.field === field;
    const value = getItemValue(item, field);
    const key = `${rowIndex}-${field}`;
    const isText = ['scopeOfWorks', 'detailDescription', 'remark'].includes(field);

    const isBoQAmount = field === 'boQ.amount';
    const isUnitRate = field === 'boQ.unitRate';
    const isPreviousWeek = field.startsWith('previousWeek.');
    const isRemaining = field.startsWith('remaining.');
    const isNextWeekPlanPercentage = field === 'nextWeekPlan.percentage';
    const isUpToNextWeekPlan = field.startsWith('upToNextWeekPlan.');
    const isUpToThisWeekPercentage = field === 'upToThisWeek.percentage';
    const isThisWeekPercentage = field === 'thisWeek.percentage';
    const isProgressAmount = field.includes('.amount') && !field.startsWith('boQ.');
    const isReadOnly = isBoQAmount || isUnitRate || isPreviousWeek || isRemaining || isNextWeekPlanPercentage || isUpToNextWeekPlan || isUpToThisWeekPercentage || isThisWeekPercentage || ((isProgressAmount) && isAutoCalculated(filteredItems, item));

    // For unit field, always show dropdown (no click required)
    if (isUnitField && !isReadOnly) {
      const rawValue = String(value ?? '');
      const unitValue = rawValue.trim();

      const uniqueKey = item.id || item.scopeOfWorks || `row-${rowIndex}`;
      const customKey = `${uniqueKey}-unit`;

      // A value is custom ONLY if:
      // 1. It is non-empty
      // 2. It is NOT in the predefined list (excluding the sentinel 'Custom' entry)
      // 3. The user has explicitly activated custom mode via the dropdown
      const PREDEFINED = UNIT_OPTIONS.slice(0, -1); // ['LS','Lot','Set','Pcs','m','m2','m3','Sq.m','Nos','Kg']
      const isExplicitlyCustomMode = customUnitValues[customKey] === 'true';

      // Never auto-enter custom mode on render — only enter if user clicked 'Custom'
      const showCustomInput = isExplicitlyCustomMode;

      if (showCustomInput) {
        return (
          <div className="relative group">
            <div className="flex items-center gap-1">
              <Input
                value={customUnitInputValues[customKey] ?? unitValue}
                onChange={(e) => {
                  setCustomUnitInputValues(prev => ({ ...prev, [customKey]: e.target.value }));
                }}
                onBlur={() => {
                  // Don't process blur if we just entered custom mode
                  if (justEnteredCustomMode[customKey]) {
                    // Clear the flag after a short delay
                    setTimeout(() => {
                      setJustEnteredCustomMode(prev => ({ ...prev, [customKey]: false }));
                    }, 200);
                    return;
                  }
                  
                  const finalValue = (customUnitInputValues[customKey] ?? unitValue).trim();
                  if (finalValue) {
                    updateUnitDirectly(rowIndex, finalValue);
                  }
                  // Exit custom mode
                  setCustomUnitValues(prev => ({ ...prev, [customKey]: '' }));
                  setCustomUnitInputValues(prev => {
                    const next = { ...prev };
                    delete next[customKey];
                    return next;
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const finalValue = (customUnitInputValues[customKey] ?? unitValue).trim();
                    if (finalValue) {
                      updateUnitDirectly(rowIndex, finalValue);
                    }
                    setCustomUnitValues(prev => ({ ...prev, [customKey]: '' }));
                    setCustomUnitInputValues(prev => {
                      const next = { ...prev };
                      delete next[customKey];
                      return next;
                    });
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setCustomUnitValues(prev => ({ ...prev, [customKey]: '' }));
                    setCustomUnitInputValues(prev => {
                      const next = { ...prev };
                      delete next[customKey];
                      return next;
                    });
                  }
                }}
                placeholder="Enter custom unit"
                className="border border-gray-300 bg-white focus-visible:ring-1 w-[70px] text-center h-8 px-2"
                showIndicator={false}
                inputSize="sm"
                autoFocus
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomUnitValues(prev => ({ ...prev, [customKey]: '' }));
                  setCustomUnitInputValues(prev => {
                    const next = { ...prev };
                    delete next[customKey];
                    return next;
                  });
                }}
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                title="Back to dropdown"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      }

      // Normal dropdown — show current value if it's predefined, else show placeholder
      const isCurrentlyCustomValue = unitValue !== '' && !PREDEFINED.includes(unitValue);
      const selectValue = isCurrentlyCustomValue ? unitValue : (unitValue || 'empty');
      

      return (
        <div className="relative group">
          <Select
            value={selectValue}
            onValueChange={(selectedValue) => {
              if (selectedValue === 'Custom') {
                // Set flag to prevent immediate blur
                setJustEnteredCustomMode(prev => ({ ...prev, [customKey]: true }));
                // Enter custom mode — initialise input with current value
                setCustomUnitValues(prev => ({ ...prev, [customKey]: 'true' }));
                setCustomUnitInputValues(prev => ({ ...prev, [customKey]: unitValue }));
              } else if (selectedValue === 'empty') {
                updateUnitDirectly(rowIndex, '');
              } else {
                // Predefined value — save directly, never touch customUnitValues
                updateUnitDirectly(rowIndex, selectedValue);
              }
            }}
          >
            <SelectTrigger className="border border-gray-300 bg-white focus-visible:ring-1 w-[70px] h-8 text-center hover:border-gray-400">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empty">-</SelectItem>
              {isCurrentlyCustomValue && (
                <SelectItem value={unitValue}>{unitValue}</SelectItem>
              )}
              {UNIT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (isEditing && !isReadOnly) {
      return (
        <input
          ref={(el) => { if (el) inputRefs.current.set(key, el); }}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className={isText ? 'w-full text-left' : 'w-auto text-center min-w-[40px]'}
          style={{ width: isText ? '100%' : `${Math.max(40, editValue.length * 8 + 16)}px` }}
        />
      );
    }

    let display: any = value;
    if (field.includes('materialRate') || field.includes('laborRate') || field.includes('qty') || field.includes('unitRate')) {
      display = (typeof value === 'number' && value > 0) ? formatNum(value) : '-';
    } else if (field.includes('amount')) {
      display = (typeof value === 'number' && value > 0) ? formatCurrency(value) : '-';
    } else if (field.includes('percentage')) {
      display = (typeof value === 'number' && value > 0) ? `${value}%` : '-';

      // For percentage fields, add background color based on value
      const percentageValue = typeof value === 'number' ? value : 0;
      const bgColorClass = percentageValue === 100
        ? 'bg-green-200 dark:bg-green-400/70'
        : 'bg-yellow-200 dark:bg-yellow-400/70';
      const textColorClass = percentageValue === 100
        ? 'text-green-800 dark:text-green-300 font-semibold'
        : 'text-yellow-800 dark:text-yellow-300';

      if (isEditing) {
        return (
          <div className="relative w-full">
            <div
              className={`absolute inset-0 rounded transition-all duration-300 ${bgColorClass}`}
              style={{ width: `${Math.min(percentageValue, 100)}%` }}
            />
            <input
              ref={(el) => { if (el) inputRefs.current.set(key, el); }}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              className={`relative bg-transparent z-10 dark:text-foreground text-center w-full px-1 py-0.5 text-sm ${textColorClass}`}
              style={{ border: 'none', outline: 'none' }}
            />
          </div>
        );
      }

      if (isReadOnly) {
        return (
          <div className="relative w-full">
            <div
              className={`absolute inset-0 rounded transition-all duration-300 ${bgColorClass}`}
              style={{ width: `${Math.min(percentageValue, 100)}%` }}
            />
            <div
              className={`relative bg-transparent z-10 px-1 py-0.5 rounded text-sm text-center whitespace-nowrap select-none cursor-not-allowed ${textColorClass}`}
              title="Auto-calculated from children"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {(() => {
                const b = item.boQ;
                const hr = (b.materialRate || 0) > 0 || (b.laborRate || 0) > 0 || (b.unitRate || 0) > 0;
                const isBoldEmptyRow = item.isBold && (detectIdType(item.id) === 'empty' || item.id.trim() === '');
                if (hr) return <span className="mr-0.5 text-blue-300 text-xs" title="qty × unit rate"></span>;
                if (isBoldEmptyRow) return <span className="mr-0.5 text-slate-600 font-bold" title="Bold-empty sum"></span>;
                return <span className="mr-0.5 text-slate-400" title="Auto-sum from children"></span>;
              })()}
              {display}
            </div>
          </div>
        );
      }

      return (
        <div className="relative w-full">
          <div
            className={`absolute inset-0 rounded transition-all duration-300 ${bgColorClass}`}
            style={{ width: `${Math.min(percentageValue, 100)}%` }}
          />
          <div
            onClick={() => startEditing(rowIndex, field)}
            className={`relative bg-transparent z-10 cursor-pointer hover:bg-blue-50/50 rounded text-sm text-center whitespace-nowrap px-1 py-0.5 ${textColorClass}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {display}
          </div>
        </div>
      );
    }

    if (isReadOnly) {
      return (
        <div
          className="px-1 py-0.5 rounded text-sm text-center whitespace-nowrap select-none bg-slate-100 text-slate-500 cursor-not-allowed"
          title="Auto-calculated from children"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {(() => {
            const b = item.boQ;
            const hr = (b.materialRate || 0) > 0 || (b.laborRate || 0) > 0 || (b.unitRate || 0) > 0;
            const isBoldEmptyRow = item.isBold && (detectIdType(item.id) === 'empty' || item.id.trim() === '');
            if (hr) return <span className="mr-0.5 text-blue-300 text-xs" title="qty × unit rate"></span>;
            if (isBoldEmptyRow) return <span className="mr-0.5 text-slate-600 font-bold" title="Bold-empty sum"></span>;
            return <span className="mr-0.5 text-slate-400" title="Auto-sum from children"></span>;
          })()}
          {display}
        </div>
      );
    }

    return (
      <div
        onClick={() => startEditing(rowIndex, field)}
        className={`px-1 py-0.5 cursor-pointer hover:bg-blue-50 rounded text-sm ${isText ? 'text-left whitespace-normal break-words' : 'text-center whitespace-nowrap'}`}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        {display}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200">
      <div className="overflow-auto max-h-[600px] relative">
        <style>{`
          .sticky-col { 
            position: sticky; 
            z-index: 15; 
            background-color: white; 
            border-right: 1px solid rgb(226 232 240);
          }
          .sticky-col:nth-child(1) { left: 0px; }
          .sticky-col:nth-child(2) { left: 95px; }
          .sticky-col:nth-child(3) { left: 345px; }
          .sticky-col:nth-child(4) { left: 596px; }
          .sticky-col:nth-child(5) { left: 698px; }
          .sticky-col:nth-child(6) { left: 775px; }
          .sticky-col:nth-child(7) { left: 852px; }

          /* First header row sticks at top */
          thead tr:nth-child(1) th {
            position: sticky;
            top: 0;
            z-index: 20;
            background-color: rgb(52 73 94);
          }

          /* Second header row sticks BELOW the first row (first row is ~38px tall) */
          thead tr:nth-child(2) th {
            position: sticky;
            top: 38px;
            z-index: 20;
            background-color: rgb(52 73 94);
          }

          /* Header corner cells that are also horizontally sticky */
          thead tr:nth-child(1) th:nth-child(1) {
            left: 0px;
            z-index: 40;
          }
          thead tr:nth-child(1) th:nth-child(2) {
            left: 95px;
            z-index: 40;
          }
          thead tr:nth-child(1) th:nth-child(3) {
            left: 345px;
            z-index: 40;
          }
          thead tr:nth-child(1) th:nth-child(4) {
            left: 596px;
            z-index: 40;
          }
          thead tr:nth-child(1) th:nth-child(5) {
            left: 698px;
            z-index: 40;
          }
          thead tr:nth-child(1) th:nth-child(6) {
            left: 775px;
            z-index: 40;
          }
          thead tr:nth-child(1) th:nth-child(7) {
            left: 852px;
            z-index: 40;
          }
            thead tr:nth-child(2) th:nth-child(1) {
            position: sticky;
            left: 698px;
            z-index: 40;
          }
            /* Second header row sticks BELOW the first row */
        thead tr:nth-child(2) th {
          position: sticky;
          top: 38px;
          z-index: 20;
          background-color: rgb(52 73 94);
        }

        /* BoQ QTY sub-header also sticky horizontally */
        thead tr:nth-child(2) th:nth-child(1) {
          position: sticky;
          top: 38px;
          left: 698px;
          z-index: 40;
          background-color: rgb(52 73 94);
        }
        thead tr:nth-child(2) th:nth-child(2) {
          position: sticky;
          top: 38px;
          left: 775px;
          z-index: 40;
          background-color: rgb(52 73 94);
        }
        thead tr:nth-child(2) th:nth-child(3) {
          position: sticky;
          top: 38px;
          left: 852px;
          z-index: 40;
          background-color: rgb(52 73 94);
        }
        `}</style>
        <table className="text-sm text-left border-collapse" style={{ tableLayout: 'fixed', minWidth: 'max-content' }}>
          <colgroup>
            <col style={{ width: '95px' }} /><col style={{ width: '250px' }} /><col style={{ width: '301px' }} />
            <col style={{ width: '52px' }} /><col style={{ width: '57px' }} /><col style={{ width: '77px' }} />
            <col style={{ width: '77px' }} /><col style={{ width: '77px' }} /><col style={{ width: '112px' }} />
            <col style={{ width: '203px' }} /><col style={{ width: '57px' }} />
            <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
            <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
            <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
            <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
            <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '57px' }} />
            <col style={{ width: '112px' }} /><col style={{ width: '77px' }} /><col style={{ width: '60px' }} />
          </colgroup>
          <thead className="sticky top-0 z-20 bg-[#34495e] shadow-md">
            <tr className="bg-[#34495e] text-white">
              <th className="px-4 py-4 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>ID</th>
              <th className="px-2 py-4 border-r border-slate-600 font-bold" rowSpan={2}>Scope of Works</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" rowSpan={2}>Detail Description</th>
              <th className="px-3 py-4 border-r border-slate-600 text-center font-bold" rowSpan={2}>Unit</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={5}>BoQ</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" rowSpan={2}>Remark</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Up to Previous Week</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% This Week</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Up to This Week</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Remaining</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Next Week Plan</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold" colSpan={3}>% Up to Next Week Plan</th>
              <th className="px-2 py-4 border-r border-slate-600 text-center font-bold whitespace-nowrap" rowSpan={2}>Actions</th>
            </tr>
            <tr className="bg-[#34495e]/90 text-white/90 py-4">
              {['QTY', 'Mat. Rate', 'Labor Rate', 'Unit Rate', 'Amount', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%', 'QTY', 'Amount', '%'].map((h, i) => (
                <th key={i} className="px-1 py-1 border-r border-slate-600 text-center text-sm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredItems.map((item, index) => (
              <tr key={`${item.id || 'empty'}-${index}-${item.scopeOfWorks.slice(0, 10)}-${item.unit}`} className={`${getRowBg(item, index)} transition-colors group${item.isBold ? ' font-bold' : ''}`}>
                {ALL_COLUMNS.map(field => (
                  <td key={field} className={`px-1.5 py-2 border-r border-slate-200 ${field === 'remark' ? 'text-blue-600' : ''} ${['id', 'scopeOfWorks', 'detailDescription', 'unit', 'boQ.qty', 'boQ.materialRate', 'boQ.laborRate'].includes(field) ? 'sticky-col' : ''}`}>
                    {renderCell(item, index, field)}
                  </td>
                ))}
                <td className="px-1.5 py-2 text-center border-r border-slate-200">
                  <button
                    onClick={(e) => handleDropdownToggle(index, e)}
                    className="dropdown-button p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
