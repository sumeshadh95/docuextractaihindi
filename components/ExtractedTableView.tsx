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
      const columnsToConvert = textColumns.length > 0 ? textColumns : headers.slice(0, 5);
      const result = await transliterateToHindi(rows, columnsToConvert);
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
    e.target.value = '';
  };


  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-black/10 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-earth">Extracted Data</h3>
          <p className="text-xs text-earth-muted">
            {isHindiMode ? '🇮🇳 Hindi Mode' : 'Structured data'}
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
            className="btn-glass flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <div className="h-6 w-px bg-black/20 mx-1 self-center hidden sm:block"></div>

          {isHindiMode && originalRows ? (
            <button
              onClick={handleRevertToEnglish}
              className="btn-glass flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>English</span>
            </button>
          ) : (
            <button
              onClick={handleConvertToHindi}
              disabled={isTransliterating || rows.length === 0}
              className={`btn-glass flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium ${isTransliterating || rows.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isTransliterating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <Languages className="w-3.5 h-3.5" />
                  <span>हिंदी</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleExportXLSX}
            className="btn-farmer flex items-center space-x-1.5 px-4 py-1.5 text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {transliterationError && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 text-xs">
          {transliterationError}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto p-2">
        <table className="glass-table">
          <thead>
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="whitespace-nowrap">{header}</th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                {headers.map((header, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`} className="min-w-[150px]">
                    <input
                      type="text"
                      value={row[header] || ''}
                      onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                      className="glass-input w-full text-sm py-1 px-2"
                      placeholder={header}
                    />
                  </td>
                ))}
                <td className="text-center w-10">
                  <button
                    onClick={() => handleDeleteRow(rowIndex)}
                    className="p-1 text-earth-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length + 1} className="text-center py-10 text-earth-muted text-sm">
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