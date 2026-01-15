import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ExtractedTextView } from './components/ExtractedTextView';
import { ExtractedTableView } from './components/ExtractedTableView';
import { PdfUploadView } from './components/PdfUploadView';
import { extractDataFromImage } from './services/geminiService';
import { ExtractionResult, DynamicRow, ProcessingStatus } from './types';
import { Sparkles, Layout, Database, AlertCircle, Image, FileText, Sun, Moon, Wheat } from 'lucide-react';

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
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
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
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Farmer Icon */}
            <div className="p-2 bg-white/20 rounded-xl">
              <Wheat className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Farmer OCR</h1>
              <p className="text-xs text-white/70">Data Extraction Tool</p>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="dark-mode-toggle flex items-center space-x-2"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Key Warning */}
        {!import.meta.env.VITE_API_KEY && (
          <div className="glass-card-sm mb-6 p-4 flex items-start space-x-3 border-l-4 border-amber-500">
            <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600" />
            <div className="text-sm text-earth">
              <strong>Missing API Key:</strong> Set <code className="bg-black/10 px-1.5 py-0.5 rounded">VITE_API_KEY</code> in <code className="bg-black/10 px-1.5 py-0.5 rounded">.env.local</code>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">

            {/* Mode Selector */}
            <div className="glass-card-sm p-1.5 flex">
              <button
                onClick={() => { setInputMode('image'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-medium transition-all ${inputMode === 'image'
                  ? 'btn-farmer'
                  : 'text-earth-muted hover:text-earth hover:bg-black/5'
                  }`}
              >
                <Image className="w-4 h-4" />
                <span>From Image</span>
              </button>
              <button
                onClick={() => { setInputMode('pdf'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-medium transition-all ${inputMode === 'pdf'
                  ? 'btn-farmer'
                  : 'text-earth-muted hover:text-earth hover:bg-black/5'
                  }`}
              >
                <FileText className="w-4 h-4" />
                <span>From PDF</span>
              </button>
            </div>

            {/* Input Area */}
            <div className="glass-card p-6">
              {inputMode === 'image' ? (
                <>
                  <h2 className="text-lg font-semibold mb-1 text-earth">Upload Document Image</h2>
                  <p className="text-xs mb-4 text-earth-muted">
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
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-earth-muted">Preview</p>
                      <div className="relative rounded-xl overflow-hidden border border-black/10 aspect-[3/4] bg-black/5">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold mb-1 text-earth">Convert PDF to Image</h2>
                  <p className="text-xs mb-4 text-earth-muted">
                    Upload PDF, select a page, then extract data
                  </p>
                  <PdfUploadView
                    onPageSelect={handlePdfPageSelect}
                    onClear={handleClearFile}
                    disabled={status === ProcessingStatus.PROCESSING}
                  />

                  {imagePreview && pdfPageNumber && (
                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-earth-muted">
                        Selected: Page {pdfPageNumber}
                      </p>
                      <div className="relative rounded-xl overflow-hidden border border-black/10 aspect-[3/4] bg-black/5">
                        <img src={imagePreview} alt={`Page ${pdfPageNumber}`} className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Progress Bar */}
              {status === ProcessingStatus.PROCESSING && (
                <div className="mt-4">
                  <div className="progress-bar-bg h-2">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs mt-2 text-center text-earth-muted">
                    {progress < 30 ? 'Preparing...' : progress < 90 ? 'AI is analyzing...' : 'Finishing up...'}
                  </p>
                </div>
              )}

              {/* Extract Button */}
              <button
                onClick={processImage}
                disabled={!canProcess || status === ProcessingStatus.PROCESSING}
                className={`
                  mt-6 w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-full font-semibold transition-all
                  ${!canProcess || status === ProcessingStatus.PROCESSING
                    ? 'bg-black/10 text-earth-muted cursor-not-allowed'
                    : 'btn-farmer'
                  }
                `}
              >
                {status === ProcessingStatus.PROCESSING ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <div className="mt-4 p-3 text-sm rounded-xl flex items-start space-x-2 bg-red-500/10 text-red-700 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result?.warnings && result.warnings.length > 0 && (
              <div className="glass-card-sm p-4 border-l-4 border-amber-500">
                <h3 className="text-sm font-semibold mb-2 flex items-center text-amber-700">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  AI Warnings
                </h3>
                <ul className="list-disc list-inside text-xs space-y-1 text-amber-600">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            {!result ? (
              <div className="glass-card h-full min-h-[500px] flex flex-col items-center justify-center p-8">
                <div className="p-6 rounded-full mb-4 bg-black/5">
                  <Layout className="w-12 h-12 text-earth-muted" />
                </div>
                <h3 className="text-lg font-medium text-earth">No Data Extracted Yet</h3>
                <p className="text-sm max-w-xs text-center mt-2 text-earth-muted">
                  {inputMode === 'image'
                    ? 'Upload a document image and click "Extract Data"'
                    : 'Upload a PDF, select a page, and click "Extract Data"'
                  }
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-[800px]">
                {/* Tabs */}
                <div className="glass-card-sm flex space-x-1 p-1.5 mb-4 w-fit">
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'table'
                      ? 'bg-black/10 text-earth'
                      : 'text-earth-muted hover:text-earth hover:bg-black/5'
                      }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Data Table ({result.extracted_table.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'text'
                      ? 'bg-black/10 text-earth'
                      : 'text-earth-muted hover:text-earth hover:bg-black/5'
                      }`}
                  >
                    <Layout className="w-4 h-4" />
                    <span>Narrative Text</span>
                  </button>
                </div>

                {/* Content */}
                <div className="glass-card flex-1 min-h-0 overflow-hidden">
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

                <div className="mt-4 flex justify-between items-center text-xs text-earth-muted">
                  <p>Farmer OCR • Data Extraction</p>
                  <p>Document Type: {result.document_type_guess || 'Unknown'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass-header py-3">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-white/70">
            © 2024 Farmer OCR • Agricultural Data Collection Tool
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
