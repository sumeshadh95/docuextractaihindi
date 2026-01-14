import React, { useState } from 'react';
import { DynamicRow } from '../types';
import { Plus, Trash2, FileSpreadsheet, Languages, Loader2, Undo2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { transliterateToHindi } from '../services/transliterationService';

interface ExtractedTableViewProps {
  rows: DynamicRow[];
  headers: string[];
  onRowsChange: (rows: DynamicRow[]) => void;
  onHeadersChange: (headers: string[]) => void;
}

export const ExtractedTableView: React.FC<ExtractedTableViewProps> = ({ rows, headers, onRowsChange, onHeadersChange }) => {
  const [isTransliterating, setIsTransliterating] = useState(false);
  const [transliterationError, setTransliterationError] = useState<string | null>(null);
  const [originalRows, setOriginalRows] = useState<DynamicRow[] | null>(null);
  const [isHindiMode, setIsHindiMode] = useState(false);

  // Columns that typically contain text to transliterate
  const textColumns = headers.filter(h =>
    h.toLowerCase().includes('name') ||
    h.toLowerCase().includes('नाम') ||
    h.toLowerCase().includes('address') ||
    h.toLowerCase().includes('पता') ||
    h.toLowerCase().includes('गाँव') ||
    h.toLowerCase().includes('crop') ||
    h.toLowerCase().includes('फसल') ||
    h.toLowerCase().includes('father') ||
    h.toLowerCase().includes('husband') ||
    h.toLowerCase().includes('पति') ||
    h.toLowerCase().includes('पिता')
  );

  const handleCellChange = (index: number, header: string, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [header]: value };
    onRowsChange(newRows);
  };

  const handleDeleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    onRowsChange(newRows);
  };

  const handleAddRow = () => {
    const newRow: DynamicRow = {};
    headers.forEach(h => newRow[h] = '');
    onRowsChange([...rows, newRow]);
  };

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

    // Auto-width
    const wscols = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "extracted_data.xlsx");
  };

  const handleConvertToHindi = async () => {
    if (rows.length === 0) return;

    setIsTransliterating(true);
    setTransliterationError(null);

    try {
      // Pass all text columns for transliteration
      const columnsToConvert = textColumns.length > 0 ? textColumns : headers.slice(0, 5);
      const result = await transliterateToHindi(rows, columnsToConvert);

      // Store original rows for revert
      setOriginalRows(result.originalRows);
      onRowsChange(result.transliteratedRows);
      setIsHindiMode(true);
    } catch (error: any) {
      console.error("Transliteration failed:", error);
      setTransliterationError(error.message || "Failed to convert to Hindi");
    } finally {
      setIsTransliterating(false);
    }
  };

  const handleRevertToEnglish = () => {
    if (originalRows) {
      onRowsChange(originalRows);
      setOriginalRows(null);
      setIsHindiMode(false);
    }
  };

  const handleHeaderStartUpload = () => {
    document.getElementById('header-upload-input')?.click();
  };

  const handleHeaderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data && data.length > 0) {
        const newHeaders = data[0] as string[];
        onHeadersChange(newHeaders);
      }
    };
    reader.readAsBinaryString(file);
    // Reset
    e.target.value = '';
  };


  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h3 className="font-semibold text-slate-800">Extracted Data</h3>
          <p className="text-xs text-slate-500">
            {isHindiMode ? '🇮🇳 Hindi Mode (Click "English" to revert)' : 'Structured data'}
          </p>
        </div>
        <div className="flex space-x-2 flex-wrap">
          <input
            type="file"
            id="header-upload-input"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleHeaderFileChange}
          />

          <button
            onClick={handleAddRow}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-green-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <div className="h-6 w-px bg-slate-300 mx-1 self-center hidden sm:block"></div>

          {/* Language Toggle Buttons */}
          {isHindiMode && originalRows ? (
            // Show Revert to English button when in Hindi mode
            <button
              onClick={handleRevertToEnglish}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200 hover:text-blue-800 transition-colors"
              title="Revert back to English text"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>English (Revert)</span>
            </button>
          ) : (
            // Show Convert to Hindi button when in English mode
            <button
              onClick={handleConvertToHindi}
              disabled={isTransliterating || rows.length === 0}
              className={`
                flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${isTransliterating || rows.length === 0
                  ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                  : 'text-orange-700 bg-orange-100 border border-orange-200 hover:bg-orange-200 hover:text-orange-800'
                }
              `}
              title="Convert English names to Hindi (Devanagari)"
            >
              {isTransliterating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <Languages className="w-3.5 h-3.5" />
                  <span>हिंदी में बदलें</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleExportXLSX}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-emerald-100 border border-emerald-200 rounded-md hover:bg-emerald-200 hover:text-emerald-800 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {transliterationError && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs">
          {transliterationError}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
                  {header}
                </th>
              ))}
              <th className="px-4 py-3 border-b border-slate-200 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 group">
                {headers.map((header, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`} className="p-2 border-r border-slate-50 relative min-w-[150px]">
                    <input
                      type="text"
                      value={row[header] || ''}
                      onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                      className="w-full bg-transparent p-1 focus:ring-1 focus:ring-blue-500 rounded text-sm text-slate-700"
                      placeholder={header}
                    />
                  </td>
                ))}
                <td className="p-2 text-center w-10">
                  <button
                    onClick={() => handleDeleteRow(rowIndex)}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length + 1} className="text-center py-10 text-slate-400 text-sm">
                  No data extracted. Add a row or upload an image.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};