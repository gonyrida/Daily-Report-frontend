import React, { useState, useRef, useCallback } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { ConstructionProgressItem } from '../../types/constructionProgress';
import {
  parseExcelFile,
  mapToConstructionItems,
  generateTemplateFile,
  ParsedImportRow,
  ImportValidationError
} from '../../utils/excelImporter';
import { computeAllAmounts } from '../../utils/calculationEngine';

interface ExcelImportModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (items: ConstructionProgressItem[]) => void;
  existingItems: ConstructionProgressItem[];
  isCreateNewMode: boolean;
  allowCalculations: boolean;
  setAllowCalculations: (value: boolean) => void;
}

type ImportMode = 'append' | 'replace';

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  show,
  onClose,
  onConfirm,
  existingItems,
  isCreateNewMode,
  allowCalculations,
  setAllowCalculations
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [errors, setErrors] = useState<ImportValidationError[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrors([{ row: 0, column: 'File', message: 'Please upload a valid Excel file (.xlsx or .xls)' }]);
      setParsedRows([]);
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const result = await parseExcelFile(file);
      setParsedRows(result.rows);
      setErrors(result.errors);
    } catch (error) {
      setErrors([{
        row: 0,
        column: 'File',
        message: `Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
      setParsedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await generateTemplateFile();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'construction_progress_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating template:', error);
    }
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter(row => row.isValid);
    if (validRows.length === 0) return;

    // Enable calculations when importing
    if (!isCreateNewMode && !allowCalculations) {
      setAllowCalculations(true);
    }

    const importedItems = mapToConstructionItems(validRows, existingItems);

    // Apply calculations if in create mode or calculations are allowed
    const shouldCalculate = isCreateNewMode || allowCalculations;
    const finalItems = shouldCalculate
      ? computeAllAmounts(importedItems)
      : importedItems;

    onConfirm(finalItems);

    // Reset state
    setParsedRows([]);
    setErrors([]);
    setFileName('');
    onClose();
  };

  const validRows = parsedRows.filter(row => row.isValid);
  const hasValidRows = validRows.length > 0;
  const hasErrors = errors.length > 0;

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Import Excel</h2>
              <p className="text-sm text-slate-500">Import construction progress data from Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* File Upload Area */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-slate-600">Parsing Excel file...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    Drag and drop your Excel file here
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    or click to browse (.xlsx, .xls)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                  >
                    Select File
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Import Mode Selection */}
              <div className="mb-4 flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700">Import mode:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportMode('append')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      importMode === 'append'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Append ({existingItems.length} existing + {validRows.length} new)
                  </button>
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      importMode === 'replace'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Replace all ({validRows.length} rows)
                  </button>
                </div>
              </div>

              {/* File Info */}
              <div className="mb-4 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-slate-700">{fileName}</span>
                <span className="text-sm text-slate-500">
                  ({validRows.length} valid / {parsedRows.length} total rows)
                </span>
                <button
                  onClick={() => {
                    setParsedRows([]);
                    setErrors([]);
                    setFileName('');
                  }}
                  className="ml-auto text-sm text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              </div>

              {/* Validation Summary */}
              {hasErrors && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">
                      Found {errors.length} error{errors.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto text-sm text-red-700 space-y-1">
                    {errors.slice(0, 5).map((error, idx) => (
                      <div key={idx}>
                        Row {error.row}, Column "{error.column}": {error.message}
                      </div>
                    ))}
                    {errors.length > 5 && (
                      <div>... and {errors.length - 5} more errors</div>
                    )}
                  </div>
                </div>
              )}

              {hasValidRows && !hasErrors && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    All {validRows.length} rows are valid and ready to import
                  </span>
                </div>
              )}

              {/* Preview Table — shows ALL valid rows (scrollable) */}
              {validRows.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center">
                    <span className="text-sm font-medium text-slate-700">Preview</span>
                    <span className="text-sm text-slate-500 ml-2">
                      (showing all {validRows.length} valid row{validRows.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 border-b">#</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 border-b">ID</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 border-b">Scope</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 border-b">Detail Description</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 border-b">Unit</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700 border-b">BoQ Qty</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700 border-b">Mat Rate</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700 border-b">Lab Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-3 py-2 text-slate-500 tabular-nums">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono text-slate-900">{row.id || '—'}</td>
                            <td className="px-3 py-2 text-slate-700 truncate max-w-[200px]" title={row.scopeOfWorks}>
                              {row.scopeOfWorks}
                            </td>
                            <td className="px-3 py-2 text-slate-700 truncate max-w-[280px]" title={row.detailDescription}>
                              {row.detailDescription}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{row.unit}</td>
                            <td className="px-3 py-2 text-right text-slate-700 tabular-nums">
                              {row.boQQty.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 tabular-nums">
                              {row.materialRate.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 tabular-nums">
                              {row.laborRate.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-slate-500">
            {parsedRows.length > 0 && (
              <>
                <span className="font-medium">{validRows.length}</span> valid
                {hasErrors && (
                  <>, <span className="font-medium text-red-600">{parsedRows.filter(r => !r.isValid).length}</span> invalid</>
                )}
                {' '}of <span className="font-medium">{parsedRows.length}</span> rows
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!hasValidRows}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                hasValidRows
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <UploadCloud size={16} />
              Import {validRows.length > 0 && `(${validRows.length})`} Row{validRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};