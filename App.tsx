import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ExtractedTextView } from './components/ExtractedTextView';
import { ExtractedTableView } from './components/ExtractedTableView';
import { PdfUploadView } from './components/PdfUploadView';
import { extractDataFromImage } from './services/geminiService';
import { ExtractionResult, DynamicRow, ProcessingStatus } from './types';
import { Sparkles, Layout, Database, AlertCircle, Image, FileText, Download } from 'lucide-react';

const App: React.FC = () => {
  // Input mode
  const [inputMode, setInputMode] = useState<'image' | 'pdf'>('image');

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
      {/* Glass Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src="/groundswell-logo.png"
              alt="Groundswell International"
              className="h-10 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-white">DocuExtract AI</h1>
              <p className="text-xs text-white/60">Data Extraction Tool</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white/60 hidden md:block">
              Powered by Google Gemini
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Key Warning */}
        {!import.meta.env.VITE_API_KEY && (
          <div className="glass-card-sm mb-6 p-4 flex items-start space-x-3 border-l-4 border-amber-400">
            <AlertCircle className="w-5 h-5 mt-0.5 text-amber-300" />
            <div className="text-sm text-white">
              <strong>Missing API Key:</strong> Set <code className="bg-white/10 px-1.5 py-0.5 rounded">VITE_API_KEY</code> (Google Gemini) in <code className="bg-white/10 px-1.5 py-0.5 rounded">.env.local</code>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">

            {/* Mode Selector - Glass Style */}
            <div className="glass-card-sm p-1.5 flex">
              <button
                onClick={() => { setInputMode('image'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-medium transition-all ${inputMode === 'image'
                  ? 'btn-groundswell'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Image className="w-4 h-4" />
                <span>From Image</span>
              </button>
              <button
                onClick={() => { setInputMode('pdf'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-medium transition-all ${inputMode === 'pdf'
                  ? 'btn-groundswell'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                <FileText className="w-4 h-4" />
                <span>From PDF</span>
              </button>
            </div>

            {/* Input Area - Glass Card */}
            <div className="glass-card p-6">
              {inputMode === 'image' ? (
                <>
                  <h2 className="text-lg font-semibold mb-1 text-white">Upload Document Image</h2>
                  <p className="text-xs mb-4 text-white/60">
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
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-white/60">Preview</p>
                      <div className="relative rounded-xl overflow-hidden border border-white/20 aspect-[3/4] bg-black/20">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold mb-1 text-white">Convert PDF to Image</h2>
                  <p className="text-xs mb-4 text-white/60">
                    Upload PDF, select a page, then extract data
                  </p>
                  <PdfUploadView
                    onPageSelect={handlePdfPageSelect}
                    onClear={handleClearFile}
                    disabled={status === ProcessingStatus.PROCESSING}
                  />

                  {imagePreview && pdfPageNumber && (
                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-white/60">
                        Selected: Page {pdfPageNumber}
                      </p>
                      <div className="relative rounded-xl overflow-hidden border border-white/20 aspect-[3/4] bg-black/20">
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
                  <p className="text-xs mt-2 text-center text-white/60">
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
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'btn-groundswell'
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
                <div className="mt-4 p-3 text-sm rounded-xl flex items-start space-x-2 bg-red-500/20 text-red-200 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result?.warnings && result.warnings.length > 0 && (
              <div className="glass-card-sm p-4 border-l-4 border-amber-400">
                <h3 className="text-sm font-semibold mb-2 flex items-center text-amber-300">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  AI Warnings
                </h3>
                <ul className="list-disc list-inside text-xs space-y-1 text-amber-200/80">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            {!result ? (
              <div className="glass-card h-full min-h-[500px] flex flex-col items-center justify-center p-8">
                <div className="p-6 rounded-full mb-4 bg-white/10">
                  <Layout className="w-12 h-12 text-white/40" />
                </div>
                <h3 className="text-lg font-medium text-white">No Data Extracted Yet</h3>
                <p className="text-sm max-w-xs text-center mt-2 text-white/60">
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
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Data Table ({result.extracted_table.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'text'
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
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

                <div className="mt-4 flex justify-between items-center text-xs text-white/50">
                  <p>AI Model: Google Gemini 2.0 Flash</p>
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
          <p className="text-xs text-white/50">
            © 2024 Groundswell International • DocuExtract AI - Farmer Data Collection Tool
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
