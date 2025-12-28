import React, { useState } from 'react';
import { NotionRow } from '../types';
import { Download, Plus, Trash2, Database, X, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExtractedTableViewProps {
  rows: NotionRow[];
  onRowsChange: (rows: NotionRow[]) => void;
}

export const ExtractedTableView: React.FC<ExtractedTableViewProps> = ({ rows, onRowsChange }) => {
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  const handleCellChange = (index: number, field: keyof NotionRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    onRowsChange(newRows);
  };

  const handleDeleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    onRowsChange(newRows);
  };

  const handleAddRow = () => {
    onRowsChange([...rows, { Name: '', Address: '', Phone: '', Email: '', Organization: '', Notes: 'add notes later' }]);
  };

  const handleExportXLSX = () => {
    // 1. Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // 2. Convert rows to worksheet
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["Name", "Address", "Phone", "Email", "Organization", "Notes"]
    });

    // 3. Set column widths for better readability
    const wscols = [
      { wch: 20 }, // Name
      { wch: 30 }, // Address
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 20 }, // Organization
      { wch: 30 }, // Notes
    ];
    ws['!cols'] = wscols;

    // 4. Append sheet and download
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "extracted_contacts.xlsx");
  };

  const handleNotionUpload = async () => {
    if (!notionToken || !databaseId) {
        setErrorMessage("Please provide both Integration Token and Database ID.");
        return;
    }

    setUploadStatus('uploading');
    setUploadProgress({ current: 0, total: rows.length });
    setErrorMessage('');

    const NOTION_API_URL = 'https://api.notion.com/v1/pages';

    // Helper to extract clean UUID from URL or input
    const getCleanDatabaseId = (idInput: string) => {
        // Notion IDs are 32 hex characters. 
        // If user pastes URL like https://notion.so/My-DB-2d76a419267245...
        // We strip dashes and look for the 32 char pattern.
        const match = idInput.replace(/-/g, '').match(/([a-f0-9]{32})/);
        return match ? match[1] : idInput;
    };

    const finalDatabaseId = getCleanDatabaseId(databaseId);

    let successCount = 0;
    let failCount = 0;
    let currentError = "";

    // Helper to perform the fetch with retry logic for CORS
    const performUpload = async (body: any) => {
        const headers = {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
        };

        const doFetch = (url: string) => fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        try {
            // Attempt 1: Direct upload
            return await doFetch(NOTION_API_URL);
        } catch (error: any) {
            // Check for CORS/Network error
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                console.warn("Direct upload failed (likely CORS). Retrying with public proxy...");
                // Attempt 2: Fallback to public CORS proxy
                // We use corsproxy.io as a transparent fallback
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(NOTION_API_URL)}`;
                return await doFetch(proxyUrl);
            }
            throw error;
        }
    };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            // Updated properties to match the specific Notion column types shown in your screenshot
            // Name -> Title
            // Address -> Rich Text
            // Phone -> Phone Number (Notion specific type)
            // Email -> Email (Notion specific type)
            // Organization -> Rich Text
            // Notes -> Rich Text
            const body = {
                parent: { database_id: finalDatabaseId },
                properties: {
                    "Name": { title: [{ text: { content: row.Name || "Untitled" } }] },
                    "Address": { rich_text: [{ text: { content: row.Address || "" } }] },
                    // Use phone_number type. Convert empty string to null to avoid API errors.
                    "Phone": { phone_number: row.Phone || null },
                    // Use email type. Convert empty string to null.
                    "Email": { email: row.Email || null },
                    "Organization": { rich_text: [{ text: { content: row.Organization || "" } }] },
                    "Notes": { rich_text: [{ text: { content: row.Notes || "" } }] },
                }
            };

            const response = await performUpload(body);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || response.statusText);
            }

            successCount++;
        } catch (error: any) {
            console.error("Row upload failed", error);
            failCount++;
            currentError = error.message;
        }
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));
    }

    if (failCount === 0) {
        setUploadStatus('success');
    } else {
        setUploadStatus('error');
        setErrorMessage(`Completed with errors. Success: ${successCount}, Failed: ${failCount}. Last error: ${currentError}`);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
              <h3 className="font-semibold text-slate-800">Extracted Contacts</h3>
              <p className="text-xs text-slate-500">Structured data for Notion</p>
          </div>
          <div className="flex space-x-2">
              <button
                  onClick={handleAddRow}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-green-600 transition-colors"
              >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
              </button>
              
              <div className="h-6 w-px bg-slate-300 mx-1 self-center hidden sm:block"></div>

              <button
                  onClick={handleExportXLSX}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-emerald-100 border border-emerald-200 rounded-md hover:bg-emerald-200 hover:text-emerald-800 transition-colors"
              >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
              </button>

              <button
                  onClick={() => setShowNotionModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-md hover:bg-slate-900 transition-colors shadow-sm"
              >
                  <Database className="w-3.5 h-3.5" />
                  <span>Upload to Notion</span>
              </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {["Name", "Address", "Phone", "Email", "Org", "Notes", ""].map((header, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50 group">
                  <td className="p-2 border-r border-slate-50 relative">
                    <input 
                      type="text" 
                      value={row.Name} 
                      onChange={(e) => handleCellChange(index, 'Name', e.target.value)}
                      className="w-full bg-transparent p-1 focus:ring-1 focus:ring-blue-500 rounded text-sm font-medium text-slate-900"
                      placeholder="Name"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-50 relative">
                    <input 
                      type="text" 
                      value={row.Address} 
                      onChange={(e) => handleCellChange(index, 'Address', e.target.value)}
                      className="w-full bg-transparent p-1 focus:ring-1 focus:ring-blue-500 rounded text-sm text-slate-600"
                      placeholder="Address"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-50 relative">
                    <input 
                      type="text" 
                      value={row.Phone} 
                      onChange={(e) => handleCellChange(index, 'Phone', e.target.value)}
                      className="w-full bg-transparent p-1 focus:ring-1 focus:ring-blue-500 rounded text-sm text-slate-600"
                      placeholder="Phone"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-50 relative">
                    <input 
                      type="text" 
                      value={row.Email} 
                      onChange={(e) => handleCellChange(index, 'Email', e.target.value)}
                      className="w-full bg-transparent p-1 focus:ring-1 focus:ring-blue-500 rounded text-sm text-slate-600"
                      placeholder="Email"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-50 relative">
                    <input 
                      type="text" 
                      value={row.Organization} 
                      onChange={(e) => handleCellChange(index, 'Organization', e.target.value)}
                      className="w-full bg-transparent p-1 focus:ring-1 focus:ring-blue-500 rounded text-sm text-slate-600"
                      placeholder="Org"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-50 relative">
                    <input 
                      type="text" 
                      value={row.Notes} 
                      onChange={(e) => handleCellChange(index, 'Notes', e.target.value)}
                      className="w-full bg-transparent p-1 focus:ring-1 focus:ring-blue-500 rounded text-sm text-slate-600"
                      placeholder="Notes"
                    />
                  </td>
                  <td className="p-2 text-center w-10">
                    <button 
                      onClick={() => handleDeleteRow(index)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                  <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                          No contact rows extracted. Add one manually or try another image.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notion Upload Modal */}
      {showNotionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-600" />
                Upload to Notion
              </h3>
              <button 
                onClick={() => setShowNotionModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {uploadStatus === 'success' ? (
                <div className="text-center py-6">
                   <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileSpreadsheet className="w-6 h-6" />
                   </div>
                   <h4 className="text-lg font-medium text-green-800">Upload Complete!</h4>
                   <p className="text-sm text-slate-600 mt-1">Successfully added {rows.length} rows to your Notion database.</p>
                   <button 
                      onClick={() => {
                          setUploadStatus('idle');
                          setShowNotionModal(false);
                      }}
                      className="mt-6 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
                   >
                      Close
                   </button>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800">
                    <strong>Prerequisites:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>A Notion Database with columns: Name (Title), Address, Phone (Phone), Email (Email), Organization, Notes (Rich Text).</li>
                        <li>An Internal Integration Token added to that database.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Internal Integration Token</label>
                        <input 
                            type="password" 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            placeholder="secret_..."
                            value={notionToken}
                            onChange={(e) => setNotionToken(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Database ID</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            placeholder="32 chars (e.g., a1b2...) or full URL"
                            value={databaseId}
                            onChange={(e) => setDatabaseId(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">You can paste the full URL; we'll extract the ID automatically.</p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>{errorMessage}</div>
                    </div>
                  )}

                  {uploadStatus === 'uploading' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-slate-600">
                            <span>Uploading...</span>
                            <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                                className="bg-slate-800 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-xs text-slate-400">Processing row {uploadProgress.current} of {uploadProgress.total}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {uploadStatus !== 'success' && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                    onClick={() => setShowNotionModal(false)}
                    disabled={uploadStatus === 'uploading'}
                    className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleNotionUpload}
                    disabled={uploadStatus === 'uploading' || !notionToken || !databaseId}
                    className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                    {uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Start Upload'}
                </button>
                </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};