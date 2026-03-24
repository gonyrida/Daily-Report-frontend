import React, { useState, useMemo, useEffect, useRef } from "react";
import { Trash2, Plus, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';

// Import extracted modules
import {
  ConstructionProgressItem,
  ProjectInfo,
  ConstructionProgressData,
  WeeklyReportConstructionProgressProps,
  EditableCell,
  IdType
} from '../../types/constructionProgress';
import {
  detectIdType,
  isRomanId,
  computeNextId,
  renumberBelow,
  renumberFromIndex
} from '../../utils/idEngine';
import {
  computeAllAmounts
} from '../../utils/calculationEngine';
import { ConstructionProgressTable } from './ConstructionProgressTable';
import { AddRowsModal } from './AddRowsModal';

// ─── Main Component ───────────────────────────────────────────────────────────

const WeeklyReportConstructionProgress: React.FC<WeeklyReportConstructionProgressProps> = ({
  data, onDataChange, reportId
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [items, setItems] = useState<ConstructionProgressItem[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [rowBackgrounds, setRowBackgrounds] = useState<Record<number, string>>({});


  // ── Add Rows Popup State ──
  const [showAddRows, setShowAddRows] = useState(false);
  // 'after' = insert after the row, 'before' = insert above the row
  const [insertMode, setInsertMode] = useState<'after' | 'before'>('after');
  const [addRowsType, setAddRowsType] = useState<IdType>('level1');
  const [addRowsCount, setAddRowsCount] = useState(1);
  // -1 means "at end"; otherwise index to insert after
  const [addRowsAfter, setAddRowsAfter] = useState<number>(-1);

  const currentData = data;


  useEffect(() => {
    if (currentData?.items?.length) {
      const computed = computeAllAmounts(currentData.items);
      setItems(computed);

      // Auto-clear backgrounds for Alpha rows to ensure they always have white background
      const alphaIndices: number[] = [];
      computed.forEach((item, index) => {
        if (detectIdType(item.id) === 'alpha') {
          alphaIndices.push(index);
        }
      });

      if (alphaIndices.length > 0) {
        setRowBackgrounds(prev => {
          const updated = { ...prev };
          alphaIndices.forEach(idx => delete updated[idx]);
          return updated;
        });
      }
    } else {
      setItems([]);
    }
  }, [currentData?.items]);

  const [localProjectInfo, setLocalProjectInfo] = useState(currentData?.projectInfo || { project: '', subtitle: '', date: '', revision: '' });
  useEffect(() => { if (data?.projectInfo) setLocalProjectInfo(data.projectInfo); }, [data?.projectInfo]);

  // Close row-action dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.dropdown-button') && !t.closest('.fixed-dropdown')) {
        setActiveDropdown(null); setDropdownPosition(null);
      }
    };
    if (activeDropdown !== null) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const handleProjectInfoChange = (field: keyof typeof localProjectInfo, value: string) => {
    const updated = { ...localProjectInfo, [field]: value };
    setLocalProjectInfo(updated);
    if (onDataChange) onDataChange({ ...currentData, projectInfo: updated, items: currentData?.items || [] });
  };

  const filteredItems = useMemo(() => {
    const src = items.length > 0 ? items : currentData?.items || [];
    if (!searchTerm) return src;
    return src.filter(i =>
      i.scopeOfWorks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.detailDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, currentData?.items, searchTerm]);

  // Round to 2dp then format with comma thousands separator
  const formatNum = (v: number): string => {
    const rounded = Math.round(v * 100) / 100;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  };
  const formatCurrency = formatNum;

  const getDefaultRowBg = (id: string) => {
    if (!id || id.trim() === '') return 'bg-white';
    if (/^[IVXLCDM]+$/.test(id)) return 'bg-[#D0CECE]';
    if (/^\d+$/.test(id)) return 'bg-[#ACB9CA]';
    if (/^\d+\.\d+\.\d+$/.test(id)) return 'bg-[#E7E6E6]';
    if (/^\d+\.\d+$/.test(id)) return 'bg-[#DDEBF7]';
    return 'bg-white';
  };

  const getRowBg = (item: ConstructionProgressItem, rowIndex: number) => {
    // Check if any percentage exceeds 100%
    const hasOver100Percentage =
      item.previousWeek.percentage > 100 ||
      item.thisWeek.percentage > 100 ||
      item.upToThisWeek.percentage > 100 ||
      item.remaining.percentage > 100 ||
      item.nextWeekPlan.percentage > 100 ||
      item.upToNextWeekPlan.percentage > 100;

    // If any percentage is over 100%, return red background
    if (hasOver100Percentage) {
      return 'bg-red-100';
    }

    return rowBackgrounds[rowIndex] ?? getDefaultRowBg(item.id);
  };

  // ── Cell Editing ──
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

  const getItemValue = (item: ConstructionProgressItem, field: string) => {
    const [main, sub] = field.split('.');
    const val = item[main as keyof ConstructionProgressItem];
    return sub && typeof val === 'object' && val !== null ? (val as any)[sub] ?? '' : val ?? '';
  };

  const setItemValue = (item: ConstructionProgressItem, field: string, value: any) => {
    const [main, sub] = field.split('.');
    const copy = { ...item };
    if (sub) {
      (copy[main as keyof ConstructionProgressItem] as any) = {
        ...(copy[main as keyof ConstructionProgressItem] as any),
        [sub]: value
      };
    } else {
      (copy[main as keyof ConstructionProgressItem] as any) = value;
    }
    return copy;
  };

  const startEditing = (rowIndex: number, field: string) => {
    if (rowIndex < 0 || rowIndex >= filteredItems.length) return;
    const value = getItemValue(filteredItems[rowIndex], field);
    setEditingCell({ rowIndex, field });
    setEditValue(String(value));
    setTimeout(() => {
      const input = inputRefs.current.get(`${rowIndex}-${field}`);
      if (input) { input.focus(); input.select(); }
    }, 0);
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const { rowIndex, field } = editingCell;
    const item = filteredItems[rowIndex];
    let val: any = editValue;
    if (field.includes('qty') || field.includes('Rate') || field.includes('amount') || field.includes('percentage')) {
      val = parseFloat(editValue.replace(/,/g, '')) || 0;
    }
    const updated = setItemValue(item, field, val);
    // If mat or labor rate changed → sync unitRate = mat+lab (unless user overrode it)
    // If unitRate edited directly → keep as override (computeAllAmounts will preserve it)
    let finalItem = updated;
    if (field === 'boQ.materialRate' || field === 'boQ.laborRate') {
      const mat = field === 'boQ.materialRate' ? val : updated.boQ.materialRate;
      const lab = field === 'boQ.laborRate' ? val : updated.boQ.laborRate;
      finalItem = { ...updated, boQ: { ...updated.boQ, unitRate: (mat || 0) + (lab || 0) } };
    }
    const newItems = [...items];
    newItems[items.findIndex(i => i.id === item.id && i.scopeOfWorks === item.scopeOfWorks)] = finalItem;
    const computed = computeAllAmounts(newItems);
    setItems(computed);
    
    const updatedData = { ...currentData, items: computed, projectInfo: currentData?.projectInfo || { project: '', subtitle: '', date: '', revision: '' } };
    if (onDataChange) onDataChange(updatedData);
    setEditingCell(null); setEditValue('');
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };

  const navigate = (dir: 'right' | 'left' | 'up' | 'down' | 'next-row') => {
    if (!editingCell) return;
    const { rowIndex, field } = editingCell;
    const ci = ALL_COLUMNS.indexOf(field);
    let nc = ci, nr = rowIndex;
    if (dir === 'right') nc = Math.min(ci + 1, ALL_COLUMNS.length - 1);
    else if (dir === 'left') nc = Math.max(ci - 1, 0);
    else if (dir === 'down') nr = Math.min(rowIndex + 1, filteredItems.length - 1);
    else if (dir === 'up') nr = Math.max(rowIndex - 1, 0);
    else if (dir === 'next-row') {
      if (ci === ALL_COLUMNS.length - 1) { nc = 0; nr = Math.min(rowIndex + 1, filteredItems.length - 1); }
      else nc = ci + 1;
    }
    saveEdit();
    setTimeout(() => startEditing(nr, ALL_COLUMNS[nc]), 0);
  };

  const toggleBold = (rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= filteredItems.length) return;
    const item = filteredItems[rowIndex];
    const newItems = [...items];
    const idx = items.findIndex(i => i === item);
    if (idx === -1) return;
    newItems[idx] = { ...item, isBold: !item.isBold };
    const computed = computeAllAmounts(newItems);
    setItems(computed);
    if (onDataChange) onDataChange({ ...currentData, items: computed, projectInfo: currentData?.projectInfo || { project: '', subtitle: '', date: '', revision: '' } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, () => void> = {
      'Enter': () => { e.preventDefault(); navigate('next-row'); },
      'Tab': () => { e.preventDefault(); navigate(e.shiftKey ? 'left' : 'right'); },
      'ArrowRight': () => { e.preventDefault(); navigate('right'); },
      'ArrowLeft': () => { e.preventDefault(); navigate('left'); },
      'ArrowDown': () => { e.preventDefault(); navigate('down'); },
      'ArrowUp': () => { e.preventDefault(); navigate('up'); },
      'Escape': () => { e.preventDefault(); cancelEdit(); },
      'b': () => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); if (editingCell) toggleBold(editingCell.rowIndex); } },
    };
    map[e.key]?.();
  };

  // ── Smart Add Rows ──

  // Preview IDs — simulate one-by-one insertions into a temp list
  const previewIds = useMemo(() => {
    const insertAfterIndex = addRowsAfter === -1 ? items.length - 1 : addRowsAfter;
    const ep = { qty: 0, amount: 0, percentage: 0 };
    const blank = (id: string): ConstructionProgressItem => ({
      id, scopeOfWorks: '', detailDescription: '', unit: '',
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: '',
      previousWeek: { ...ep }, thisWeek: { ...ep }, upToThisWeek: { ...ep },
      remaining: { ...ep }, nextWeekPlan: { ...ep }, upToNextWeekPlan: { ...ep },
      isBold: detectIdType(id) === 'alpha' || detectIdType(id) === 'level1' || detectIdType(id) === 'level2' || detectIdType(id) === 'level3' || isRomanId(id)
    });
    const ids: string[] = [];
    const tempItems = [...items];
    let cursor = insertAfterIndex;
    for (let i = 0; i < Math.min(addRowsCount, 50); i++) {
      const id = computeNextId(tempItems, cursor, addRowsType);
      ids.push(id);
      tempItems.splice(cursor + 1, 0, blank(id));
      cursor++;
    }
    return ids;
  }, [addRowsType, addRowsCount, addRowsAfter, items]);

  // Open modal pre-filled to insert relative to a specific row
  const openInsertModal = (rowIndex: number, mode: 'after' | 'before') => {
    setInsertMode(mode);
    setAddRowsAfter(mode === 'after' ? rowIndex : rowIndex - 1);
    setAddRowsCount(1);
    // Auto-detect type from the clicked row to pre-select the likely type
    const clickedItem = items[rowIndex];
    if (clickedItem) {
      const t = detectIdType(clickedItem.id);
      const resolvedType: IdType = isRomanId(clickedItem.id) ? 'roman' : (t === 'empty' ? 'level1' : t);
      setAddRowsType(resolvedType);
    }
    setDropdownPosition(null);
    setShowAddRows(true);
  };

  const confirmAddRows = () => {
    const insertAfterIndex = addRowsAfter === -1 ? items.length - 1 : addRowsAfter;
    const emptyProgress = { qty: 0, amount: 0, percentage: 0 };
    const newRows: ConstructionProgressItem[] = previewIds.map((id) => ({
      id,
      scopeOfWorks: '',
      detailDescription: '',
      unit: '',
      boQ: {
        qty: 0,
        materialRate: 0,
        laborRate: 0,
        unitRate: 0,
        amount: 0,
      },
      remark: '',
      previousWeek: { ...emptyProgress },
      thisWeek: { ...emptyProgress },
      upToThisWeek: { ...emptyProgress },
      remaining: { ...emptyProgress },
      nextWeekPlan: { ...emptyProgress },
      upToNextWeekPlan: { ...emptyProgress },
      isBold: detectIdType(id) === 'alpha' || detectIdType(id) === 'level1' || detectIdType(id) === 'level2' || detectIdType(id) === 'level3' || isRomanId(id)
    }));

    let newItems = [...items];
    newItems.splice(insertAfterIndex + 1, 0, ...newRows);

    // Cascade renumber below
    newItems = renumberBelow(newItems, insertAfterIndex + 1, addRowsCount, addRowsType);

    const computedItems = computeAllAmounts(newItems);
    setItems(computedItems);
    if (onDataChange) onDataChange({ ...currentData, items: computedItems, projectInfo: currentData?.projectInfo || { project: '', subtitle: '', date: '', revision: '' } });
    setShowAddRows(false);
    setTimeout(() => startEditing(insertAfterIndex + 1, 'scopeOfWorks'), 0);

    // Clear backgrounds for any new Alpha rows
    const newAlphaIndices: number[] = [];
    for (let i = insertAfterIndex + 1; i <= insertAfterIndex + addRowsCount; i++) {
      const itemType = detectIdType(computedItems[i].id);
      if (itemType === 'alpha') {
        newAlphaIndices.push(i);
      }
    }

    if (newAlphaIndices.length > 0) {
      setRowBackgrounds(prev => {
        const updated = { ...prev };
        newAlphaIndices.forEach(idx => delete updated[idx]);
        return updated;
      });
    }
  };

  // ── Row Actions ──
  const backgroundColorOptions = [
    { name: 'White', value: 'bg-white', class: 'bg-white border border-gray-300' },
    { name: 'Gray', value: 'bg-gray-100', class: 'bg-gray-100' },
    { name: 'Blue', value: 'bg-blue-50', class: 'bg-blue-50' },
    { name: 'Green', value: 'bg-green-50', class: 'bg-green-50' },
    { name: 'Yellow', value: 'bg-yellow-50', class: 'bg-yellow-50' },
    { name: 'Red', value: 'bg-red-50', class: 'bg-red-50' },
    { name: 'Purple', value: 'bg-purple-50', class: 'bg-purple-50' },
    { name: 'Orange', value: 'bg-orange-50', class: 'bg-orange-50' }
  ];

  const handleDropdownToggle = (rowIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (activeDropdown === rowIndex) { setActiveDropdown(null); setDropdownPosition(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 2, left: rect.right - 160 + 2 });
    setActiveDropdown(rowIndex);
  };

  const deleteRow = (rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= items.length) return;

    // Detect the type of the row being deleted so we can renumber its siblings
    const deletedItem = items[rowIndex];
    const deletedType: IdType = isRomanId(deletedItem.id)
      ? 'roman'
      : detectIdType(deletedItem.id);

    // Remove the row first
    const filtered = items.filter((_, i) => i !== rowIndex);

    // Renumber siblings below the deletion point (insertedAt = rowIndex, count = 0 means
    // we pass rowIndex as the first affected position with count=0 sentinel —
    // renumberBelow expects insertedAt+count as start, so pass rowIndex-1, count=0... 
    // easier: just re-run renumberBelow with insertedAt=rowIndex, count=0 by
    // treating the deletion point as if 0 new rows were inserted there)
    let renumbered = filtered;
    if (deletedType !== 'empty') {
      // renumberBelow scans from insertedAt+count onward.
      // After deletion, the row that was at rowIndex+1 is now at rowIndex.
      // So pass insertedAt = rowIndex-1, count = 0 → start = rowIndex-1+0 = rowIndex-1
      // But renumberBelow skips inserted rows (count=0 means none inserted).
      // Simplest: pass insertedAt = rowIndex - 1, count = 0.
      // renumberBelow iterates from insertedAt+count = rowIndex-1+0... 
      // Actually renumberBelow starts at insertedAt+count so we need:
      // insertedAt + count = rowIndex  →  insertedAt = rowIndex, count = 0
      // but it loops from insertedAt+count meaning it starts AT rowIndex.
      // Let's just call it with insertedAt=rowIndex-1, count=1 on the filtered array
      // but with 0 "new" rows — i.e. a no-op insert — to trigger renumbering from rowIndex.
      // The cleanest: call renumberBelow(filtered, rowIndex - 1, 0, type) where
      // the loop starts at rowIndex - 1 + 0 = rowIndex - 1... not right either.
      // 
      // Real fix: export a renumberFrom(items, startIndex, type) that renumbers
      // all same-type siblings from startIndex onward.
      renumbered = renumberFromIndex(filtered, rowIndex, deletedType);
    }

    const computed = computeAllAmounts(renumbered);
    setItems(computed);
    if (onDataChange) onDataChange({ ...currentData, items: computed, projectInfo: currentData?.projectInfo || { project: '', subtitle: '', date: '', revision: '' } });
    if (editingCell?.rowIndex === rowIndex) { setEditingCell(null); setEditValue(''); }
    setRowBackgrounds(prev => { const n = { ...prev }; delete n[rowIndex]; return n; });
    setActiveDropdown(null); setDropdownPosition(null);
  };

  // ── Render ──
  return (
    <div className="flex flex-col bg-blue-50 font-sans text-slate-900">
      <div className="p-6 lg:px-12 flex flex-col">

        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex-shrink-0">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project</p>
              <input type="text" className="w-full text-slate-800 font-semibold bg-transparent border-slate-300 focus:border-primary focus:outline-none"
                value={localProjectInfo.project} onChange={(e) => handleProjectInfoChange('project', e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtitle</p>
              <input type="text" className="w-full text-slate-600 bg-transparent border-slate-300 focus:border-primary focus:outline-none"
                value={localProjectInfo.subtitle} onChange={(e) => handleProjectInfoChange('subtitle', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-between items-center mt-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</p>
              <input type="date" className="text-slate-800 bg-transparent cursor-pointer"
                value={localProjectInfo.date} onChange={(e) => handleProjectInfoChange('date', e.target.value)} />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revision</p>
              <input type="text" className="text-center text-xs font-medium bg-primary/10 text-primary rounded px-2.5 py-0.5 border border-primary/20 focus:outline-none"
                value={localProjectInfo.revision} onChange={(e) => handleProjectInfoChange('revision', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 flex-shrink-0">
          <input
            className="flex-1 pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
            placeholder="Search scope of works or description..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={() => { setInsertMode('after'); setAddRowsAfter(-1); setAddRowsCount(1); setShowAddRows(true); }}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Rows
          </button>
        </div>

        {/* Table */}
        <ConstructionProgressTable
          filteredItems={filteredItems}
          editingCell={editingCell}
          editValue={editValue}
          inputRefs={inputRefs}
          rowBackgrounds={rowBackgrounds}
          startEditing={startEditing}
          setEditValue={setEditValue}
          saveEdit={saveEdit}
          handleKeyDown={handleKeyDown}
          handleDropdownToggle={handleDropdownToggle}
          getItemValue={getItemValue}
          getRowBg={getRowBg}
        />

        {/* Row Action Dropdown */}
        {activeDropdown !== null && dropdownPosition && (
          <div
            className="fixed-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[160px]"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-2">Background Color</p>
              <div className="grid grid-cols-4 gap-1">
                {backgroundColorOptions.map(c => (
                  <button key={c.value} onClick={() => { setRowBackgrounds(p => ({ ...p, [activeDropdown]: c.value })); setActiveDropdown(null); }}
                    className={`w-6 h-6 rounded border-2 ${c.class} hover:scale-110 transition-transform`} title={c.name} />
                ))}
              </div>
            </div>
            <div className="border-b border-gray-100">
              <button
                onClick={() => activeDropdown !== null && openInsertModal(activeDropdown, 'before')}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowUpToLine size={14} className="text-slate-400" /> Insert row above
              </button>
              <button
                onClick={() => activeDropdown !== null && openInsertModal(activeDropdown, 'after')}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowDownToLine size={14} className="text-slate-400" /> Insert row below
              </button>
            </div>
            <div className="border-b border-gray-100">
              <button
                onClick={() => {
                  if (activeDropdown === null) return;
                  const item = filteredItems[activeDropdown];
                  const newItems = [...items];
                  const idx = items.findIndex(i => i === item);
                  if (idx === -1) return;
                  newItems[idx] = { ...item, isBold: !item.isBold };
                  const computed = computeAllAmounts(newItems);
                  setItems(computed);
                  if (onDataChange) onDataChange({ ...currentData, items: computed, projectInfo: currentData?.projectInfo || { project: '', subtitle: '', date: '', revision: '' } });
                  setActiveDropdown(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <span className="font-bold text-slate-500 text-xs w-3.5">B</span>
                {activeDropdown !== null && filteredItems[activeDropdown]?.isBold ? 'Remove bold' : 'Bold row'} <span className="ml-auto text-sm text-slate-400">Ctrl+B</span>
              </button>
            </div>
            <button
              onClick={() => deleteRow(activeDropdown)}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} /> Delete Row
            </button>
          </div>
        )}
      </div>

      {/* Add Rows Modal */}
      <AddRowsModal
        show={showAddRows}
        onClose={() => setShowAddRows(false)}
        insertMode={insertMode}
        addRowsType={addRowsType}
        setAddRowsType={setAddRowsType}
        addRowsCount={addRowsCount}
        setAddRowsCount={setAddRowsCount}
        addRowsAfter={addRowsAfter}
        setAddRowsAfter={setAddRowsAfter}
        items={items}
        onConfirm={confirmAddRows}
      />
    </div>
  );
};

export default WeeklyReportConstructionProgress;
