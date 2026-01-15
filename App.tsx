import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ExtractedTextView } from './components/ExtractedTextView';
import { ExtractedTableView } from './components/ExtractedTableView';
import { PdfUploadView } from './components/PdfUploadView';
import { extractDataFromImage } from './services/geminiService';
import { ExtractionResult, DynamicRow, ProcessingStatus } from './types';
import { Sparkles, Layout, Database, AlertCircle, ScanText, Moon, Sun, Image, FileText } from 'lucide-react';

const App: React.FC = () => {
  // Input mode
  const [inputMode, setInputMode] = useState<'image' | 'pdf'>('image');

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Image extraction state
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);

  // Common state
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'text'>('table');

  // Headers
  const [headers, setHeaders] = useState<string[]>([
    "क्र संख्या",
    "भी.आर.पी नाम",
    "Code",
    "किसान नाम",
    "पति/पिता का नाम",
    "गाँव",
    "फसल",
    "क्षेत्रफल (कट्ठा)",
    "रोपाई/बुआई तिथि",
    "कुल तोड़ाई (Kg)",
    "कुल आमदनी (रु०)"
  ]);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
    setProgress(0);
    setPdfPageNumber(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handlePdfPageSelect = (dataUrl: string, pageNumber: number) => {
    setImagePreview(dataUrl);
    setPdfPageNumber(pageNumber);
    setErrorMsg(null);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
    setProgress(0);
  };

  const handleClearFile = () => {
    setFile(null);
    setImagePreview(null);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
    setProgress(0);
    setPdfPageNumber(null);
  };

  const processImage = async () => {
    if (!imagePreview) return;

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);
    setProgress(10);

    try {
      const base64Data = imagePreview.split(',')[1];
      const mimeType = 'image/png';

      setProgress(30);
      const extractionResult = await extractDataFromImage(base64Data, mimeType, headers);
      setProgress(90);

      setResult(extractionResult);
      setStatus(ProcessingStatus.SUCCESS);
      setProgress(100);

      if (extractionResult.extracted_table.length > 0) {
        setActiveTab('table');
      } else {
        setActiveTab('text');
      }

    } catch (err: any) {
      console.error(err);
      setStatus(ProcessingStatus.ERROR);
      setErrorMsg(err.message || "Failed to process image.");
      setProgress(0);
    }
  };

  const handleUpdateText = (newText: string) => {
    if (result) setResult({ ...result, extracted_text: newText });
  };

  const handleUpdateRows = (newRows: DynamicRow[]) => {
    if (result) setResult({ ...result, extracted_table: newRows });
  };

  const canProcess = imagePreview && import.meta.env.VITE_API_KEY;

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ScanText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              DocuExtract AI
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`text-sm hidden sm:block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Powered by Groq Llama 4 Scout
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Key Warning */}
        {!import.meta.env.VITE_API_KEY && (
          <div className={`mb-6 rounded-lg p-4 flex items-start space-x-3 ${darkMode ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="text-sm">
              <strong>Missing API Key:</strong> Set <code>VITE_API_KEY</code> (Google Gemini) in <code>.env.local</code>.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">

            {/* Mode Selector */}
            <div className={`p-1 rounded-lg flex ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button
                onClick={() => { setInputMode('image'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-md text-sm font-medium transition-all ${inputMode === 'image'
                  ? 'bg-blue-600 text-white shadow-md'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
                  }`}
              >
                <Image className="w-4 h-4" />
                <span>From Image</span>
              </button>
              <button
                onClick={() => { setInputMode('pdf'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-md text-sm font-medium transition-all ${inputMode === 'pdf'
                  ? 'bg-red-600 text-white shadow-md'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
                  }`}
              >
                <FileText className="w-4 h-4" />
                <span>From PDF</span>
              </button>
            </div>

            {/* Input Area */}
            <div className={`rounded-xl shadow-sm border p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              {inputMode === 'image' ? (
                <>
                  <h2 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Upload Document Image</h2>
                  <p className={`text-xs mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Upload a photo or scan of your document
                  </p>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    selectedFile={file}
                    onClear={handleClearFile}
                    disabled={status === ProcessingStatus.PROCESSING}
                  />

                  {imagePreview && (
                    <div className="mt-6">
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Preview</p>
                      <div className={`relative rounded-lg overflow-hidden border aspect-[3/4] ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Convert PDF to Image</h2>
                  <p className={`text-xs mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Upload PDF, select a page, then extract data
                  </p>
                  <PdfUploadView
                    onPageSelect={handlePdfPageSelect}
                    onClear={handleClearFile}
                    disabled={status === ProcessingStatus.PROCESSING}
                  />

                  {imagePreview && pdfPageNumber && (
                    <div className="mt-6">
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Selected: Page {pdfPageNumber}
                      </p>
                      <div className={`relative rounded-lg overflow-hidden border aspect-[3/4] ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
                        <img src={imagePreview} alt={`Page ${pdfPageNumber}`} className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Progress Bar */}
              {status === ProcessingStatus.PROCESSING && (
                <div className="mt-4">
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div
                      className="h-full bg-blue-600 transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {progress < 30 ? 'Preparing...' : progress < 90 ? 'AI is analyzing...' : 'Finishing up...'}
                  </p>
                </div>
              )}

              {/* Extract Button */}
              <button
                onClick={processImage}
                disabled={!canProcess || status === ProcessingStatus.PROCESSING}
                className={`
                  mt-6 w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all
                  ${!canProcess || status === ProcessingStatus.PROCESSING
                    ? darkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }
                `}
              >
                {status === ProcessingStatus.PROCESSING ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Extract Data</span>
                  </>
                )}
              </button>

              {errorMsg && (
                <div className={`mt-4 p-3 text-sm rounded-lg flex items-start space-x-2 ${darkMode ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result?.warnings && result.warnings.length > 0 && (
              <div className={`rounded-xl p-4 ${darkMode ? 'bg-amber-900/30 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                <h3 className={`text-sm font-semibold mb-2 flex items-center ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  AI Warnings
                </h3>
                <ul className={`list-disc list-inside text-xs space-y-1 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            {!result ? (
              <div className={`h-full min-h-[500px] flex flex-col items-center justify-center rounded-xl border border-dashed ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
                <div className={`p-6 rounded-full mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <Layout className={`w-12 h-12 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                </div>
                <h3 className={`text-lg font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No Data Extracted Yet</h3>
                <p className={`text-sm max-w-xs text-center mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {inputMode === 'image'
                    ? 'Upload a document image and click "Extract Data"'
                    : 'Upload a PDF, select a page, and click "Extract Data"'
                  }
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-[800px]">
                {/* Tabs */}
                <div className={`flex space-x-1 p-1 rounded-lg mb-4 w-fit ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'table'
                      ? darkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'
                      : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Data Table ({result.extracted_table.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'text'
                      ? darkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'
                      : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
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
                      headers={headers}
                      onRowsChange={handleUpdateRows}
                      onHeadersChange={setHeaders}
                    />
                  ) : (
                    <ExtractedTextView
                      text={result.extracted_text}
                      onTextChange={handleUpdateText}
                    />
                  )}
                </div>

                <div className={`mt-4 flex justify-between items-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <p>AI Model: Groq Llama 4 Scout</p>
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
