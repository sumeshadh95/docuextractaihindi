import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ExtractedTextView } from './components/ExtractedTextView';
import { ExtractedTableView } from './components/ExtractedTableView';
import { extractDataFromImage } from './services/geminiService';
import { ExtractionResult, NotionRow, ProcessingStatus } from './types';
import { Sparkles, Layout, Database, AlertCircle, ScanText, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'text'>('table');

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleClearFile = () => {
    setFile(null);
    setImagePreview(null);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
  };

  const processImage = async () => {
    if (!file || !imagePreview) return;

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);

    try {
      // Remove Data URL prefix for API
      const base64Data = imagePreview.split(',')[1];
      const mimeType = file.type;

      const extractionResult = await extractDataFromImage(base64Data, mimeType);
      
      setResult(extractionResult);
      setStatus(ProcessingStatus.SUCCESS);
      
      // Auto-switch tab based on content content guess
      if (extractionResult.document_type_guess === 'list_only' || extractionResult.extracted_table.length > 0) {
        setActiveTab('table');
      } else {
        setActiveTab('text');
      }

    } catch (err: any) {
      console.error(err);
      setStatus(ProcessingStatus.ERROR);
      setErrorMsg(err.message || "Failed to process image. Check your API Key and internet connection.");
    }
  };

  const handleUpdateText = (newText: string) => {
    if (result) {
      setResult({ ...result, extracted_text: newText });
    }
  };

  const handleUpdateRows = (newRows: NotionRow[]) => {
    if (result) {
      setResult({ ...result, extracted_table: newRows });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
                <ScanText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              DocuExtract AI
            </h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Gemini 3 Powered OCR & Extraction
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* API Key Check Warning */}
        {!process.env.API_KEY && (
           <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
             <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
             <div className="text-sm text-red-800">
               <strong>Missing API Key:</strong> The <code>process.env.API_KEY</code> is not set. 
               This application requires a Google GenAI API Key to function.
             </div>
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-slate-800">Upload Document</h2>
              <FileUpload 
                onFileSelect={handleFileSelect} 
                selectedFile={file} 
                onClear={handleClearFile} 
                disabled={status === ProcessingStatus.PROCESSING}
              />

              {imagePreview && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-[3/4] group">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                  </div>
                </div>
              )}

              <button
                onClick={processImage}
                disabled={!file || status === ProcessingStatus.PROCESSING || !process.env.API_KEY}
                className={`
                  mt-6 w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all
                  ${!file || status === ProcessingStatus.PROCESSING 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }
                `}
              >
                {status === ProcessingStatus.PROCESSING ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" />
                    <span>Analyzing Document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Extract Data</span>
                  </>
                )}
              </button>

              {errorMsg && (
                 <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                 </div>
              )}
            </div>
            
            {result?.warnings && result.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        AI Warnings
                    </h3>
                    <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                        {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
             {!result ? (
               <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                 <div className="p-6 bg-slate-50 rounded-full mb-4">
                    <Layout className="w-12 h-12 text-slate-300" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-600">No Data Extracted Yet</h3>
                 <p className="text-sm max-w-xs text-center mt-2 text-slate-500">
                   Upload a document and click "Extract Data" to see structured tables and narrative text here.
                 </p>
               </div>
             ) : (
               <div className="flex flex-col h-[800px]">
                 {/* Tabs */}
                 <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-4 w-fit">
                   <button
                     onClick={() => setActiveTab('table')}
                     className={`
                       flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                       ${activeTab === 'table' 
                         ? 'bg-white text-blue-600 shadow-sm' 
                         : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                       }
                     `}
                   >
                     <Database className="w-4 h-4" />
                     <span>Contacts Table ({result.extracted_table.length})</span>
                   </button>
                   <button
                     onClick={() => setActiveTab('text')}
                     className={`
                       flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                       ${activeTab === 'text' 
                         ? 'bg-white text-blue-600 shadow-sm' 
                         : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                       }
                     `}
                   >
                     <Layout className="w-4 h-4" />
                     <span>Narrative Text</span>
                   </button>
                 </div>

                 {/* Content */}
                 <div className="flex-1 min-h-0">
                    {activeTab === 'table' ? (
                        <ExtractedTableView 
                            rows={result.extracted_table} 
                            onRowsChange={handleUpdateRows} 
                        />
                    ) : (
                        <ExtractedTextView 
                            text={result.extracted_text} 
                            onTextChange={handleUpdateText} 
                        />
                    )}
                 </div>
                 
                 <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
                    <p>AI Model: Gemini 3 (Flash Preview)</p>
                    <p>Document Type: {result.document_type_guess || 'Unknown'}</p>
                 </div>
               </div>
             )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
