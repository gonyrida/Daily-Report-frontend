import React from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { IdType, ConstructionProgressItem } from '../../types/constructionProgress';
import { ID_TYPE_CONFIG } from '../../data/defaultConstructionData';
import { computeNextId } from '../../utils/idEngine';

interface AddRowsModalProps {
  show: boolean;
  onClose: () => void;
  insertMode: 'after' | 'before';
  addRowsType: IdType;
  setAddRowsType: (type: IdType) => void;
  addRowsCount: number;
  setAddRowsCount: (count: number) => void;
  addRowsAfter: number;
  setAddRowsAfter: (index: number) => void;
  items: ConstructionProgressItem[];
  onConfirm: () => void;
}

export const AddRowsModal: React.FC<AddRowsModalProps> = ({
  show,
  onClose,
  insertMode,
  addRowsType,
  setAddRowsType,
  addRowsCount,
  setAddRowsCount,
  addRowsAfter,
  setAddRowsAfter,
  items,
  onConfirm
}) => {
  // Preview IDs — simulate one-by-one insertions into a temp list
  const previewIds = React.useMemo(() => {
    const insertAfterIndex = addRowsAfter === -1 ? items.length - 1 : addRowsAfter;
    const ep = { qty: 0, amount: 0, percentage: 0 };
    const blank = (id: string): ConstructionProgressItem => ({
      id, scopeOfWorks: '', detailDescription: '', unit: '',
      boQ: { qty: 0, materialRate: 0, laborRate: 0, unitRate: 0, amount: 0 }, remark: '',
      previousWeek: { ...ep }, thisWeek: { ...ep }, upToThisWeek: { ...ep },
      remaining: { ...ep }, nextWeekPlan: { ...ep }, upToNextWeekPlan: { ...ep },
      isBold: false
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

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800">
            {insertMode === 'before' ? 'Insert Row Above' : insertMode === 'after' && addRowsAfter !== items.length - 1 && addRowsAfter !== -1 ? 'Insert Row Below' : 'Add Rows'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: Row Type */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Step 1 — Row Type</p>
            <div className="grid grid-cols-3 gap-2">
              {ID_TYPE_CONFIG.map(cfg => (
                <button
                  key={cfg.type}
                  onClick={() => setAddRowsType(cfg.type)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-lg border-2 transition-all text-left ${addRowsType === cfg.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <span className={`text-sm font-bold px-1.5 py-0.5 rounded mb-1 ${cfg.color} text-slate-700`}>
                    {cfg.label}
                  </span>
                  <span className="text-sm text-slate-500 font-mono">{cfg.example}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Insert Position */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Step 2 — Insert Position</p>
            {(insertMode === 'before' || insertMode === 'after') && addRowsAfter !== -1 && addRowsAfter !== items.length - 1 && (
              <p className="text-sm text-blue-500 mb-2">
                ✦ Pre-filled from row click — change if needed.
              </p>
            )}
            <div className="relative">
              <select
                value={addRowsAfter}
                onChange={(e) => setAddRowsAfter(Number(e.target.value))}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-8"
              >
                <option value={-1}>— At the end —</option>
                {items.map((item, i) => (
                  <option key={i} value={i}>
                    Row {i + 1}{item.id ? ` [${item.id}]` : ''}{item.scopeOfWorks ? ` — ${item.scopeOfWorks.slice(0, 40)}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Step 3: Count */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Step 3 — Number of Rows</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAddRowsCount(Math.max(1, addRowsCount - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center font-bold text-lg"
              >−</button>
              <input
                type="number" min={1} max={50}
                value={addRowsCount}
                onChange={(e) => setAddRowsCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => setAddRowsCount(Math.min(50, addRowsCount + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center font-bold text-lg"
              >+</button>
            </div>
          </div>

          {/* Preview */}
          {addRowsType !== 'empty' && previewIds.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview — IDs that will be created</p>
              <div className="flex flex-wrap gap-1.5 bg-slate-50 rounded-lg p-3 border border-slate-100">
                {previewIds.map((id, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded font-mono text-xs font-semibold shadow-sm">
                    {id || '(blank)'}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-400 mt-1.5">
                ✦ Rows below will be auto-renumbered, including children.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus size={15} /> Insert {addRowsCount} Row{addRowsCount > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
