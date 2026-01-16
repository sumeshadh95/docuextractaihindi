import React, { useState, useEffect, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ExtractedTextView } from './components/ExtractedTextView';
import { ExtractedTableView } from './components/ExtractedTableView';
import { PdfUploadView } from './components/PdfUploadView';
import { HistorySidebar, HistoryEntry } from './components/HistorySidebar';
import { RateLimitIndicator, getUsageToday, incrementUsage, DAILY_LIMIT } from './components/RateLimitIndicator';
import { InstallPrompt } from './components/InstallPrompt';
import { extractDataFromImage } from './services/geminiService';
import { ExtractionResult, DynamicRow, ProcessingStatus } from './types';
import { Language, useTranslation } from './translations';
import { Sparkles, Layout, Database, AlertCircle, Image, FileText, Sun, Moon, Wheat, History, Layers, Globe } from 'lucide-react';

// Simple hash for caching
const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.slice(0, 10000)); // First 10KB for speed
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
};

const App: React.FC = () => {
  // Input mode
  const [inputMode, setInputMode] = useState<'image' | 'pdf' | 'batch'>('image');

  // Language
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('appLanguage');
    return (saved === 'hi' || saved === 'en') ? saved : 'en';
  });
  const { t } = useTranslation(language);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Sidebar
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);

  // Image extraction state
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState<number | null>(null);

  // Common state
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'text'>('table');

  // Batch processing
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('extractionHistory');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Rate limiting
  const [usageToday, setUsageToday] = useState(getUsageToday());

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

  // Save language preference
  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('extractionHistory', JSON.stringify(history.slice(0, 20)));
  }, [history]);

  // Cache helpers
  const getCachedResult = async (imageData: string): Promise<ExtractionResult | null> => {
    try {
      const hash = await hashString(imageData);
      const cached = localStorage.getItem(`cache_${hash}`);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  };

  const setCachedResult = async (imageData: string, result: ExtractionResult) => {
    try {
      const hash = await hashString(imageData);
      localStorage.setItem(`cache_${hash}`, JSON.stringify(result));
    } catch { /* ignore cache errors */ }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setFiles([]);
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

  const handleFilesSelect = (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
    setFile(null);
    setImagePreview(null);
    setErrorMsg(null);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
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
    setFiles([]);
    setImagePreview(null);
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
    setProgress(0);
    setPdfPageNumber(null);
    setBatchProgress(null);
  };

  // Add to history
  const addToHistory = useCallback((extractionResult: ExtractionResult, preview?: string) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      documentType: extractionResult.document_type_guess || 'Unknown',
      rowCount: extractionResult.extracted_table.length,
      result: extractionResult,
      imagePreview: preview?.slice(0, 500) // Truncate for storage
    };
    setHistory(prev => [entry, ...prev].slice(0, 20));
  }, []);

  // Single image processing
  const processImage = async () => {
    if (!imagePreview) return;

    // Check cache first
    const cached = await getCachedResult(imagePreview);
    if (cached) {
      setResult(cached);
      setStatus(ProcessingStatus.SUCCESS);
      setProgress(100);
      addToHistory(cached, imagePreview);
      if (cached.extracted_table.length > 0) setActiveTab('table');
      else setActiveTab('text');
      return;
    }

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);
    setProgress(10);

    try {
      const base64Data = imagePreview.split(',')[1];
      const mimeType = 'image/png';

      setProgress(30);
      const extractionResult = await extractDataFromImage(base64Data, mimeType, headers);
      setProgress(90);

      // Update rate limit
      const newUsage = incrementUsage();
      setUsageToday(newUsage);

      // Cache result
      await setCachedResult(imagePreview, extractionResult);

      setResult(extractionResult);
      setStatus(ProcessingStatus.SUCCESS);
      setProgress(100);

      // Add to history
      addToHistory(extractionResult, imagePreview);

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

  // Batch processing
  const processBatch = async () => {
    if (files.length === 0) return;

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);
    setBatchProgress({ current: 0, total: files.length });

    const allRows: DynamicRow[] = [];
    let allText = '';
    let lastDocType = '';

    for (let i = 0; i < files.length; i++) {
      setBatchProgress({ current: i + 1, total: files.length });
      setProgress(Math.round(((i + 1) / files.length) * 100));

      try {
        // Read file
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(files[i]);
        });

        const base64Data = dataUrl.split(',')[1];
        const extractionResult = await extractDataFromImage(base64Data, 'image/png', headers);

        // Update rate limit
        const newUsage = incrementUsage();
        setUsageToday(newUsage);

        allRows.push(...extractionResult.extracted_table);
        allText += extractionResult.extracted_text + '\n\n---\n\n';
        lastDocType = extractionResult.document_type_guess || lastDocType;

      } catch (err: any) {
        console.error(`Error processing file ${i + 1}:`, err);
      }
    }

    const mergedResult: ExtractionResult = {
      extracted_text: allText.trim(),
      extracted_table: allRows,
      document_type_guess: lastDocType,
      warnings: [`Processed ${files.length} images`]
    };

    setResult(mergedResult);
    setStatus(ProcessingStatus.SUCCESS);
    setBatchProgress(null);
    addToHistory(mergedResult);

    if (allRows.length > 0) setActiveTab('table');
    else setActiveTab('text');
  };

  // History actions
  const handleRestoreHistory = (entry: HistoryEntry) => {
    setResult(entry.result);
    setStatus(ProcessingStatus.SUCCESS);
    setActiveTab(entry.result.extracted_table.length > 0 ? 'table' : 'text');
    setHistorySidebarOpen(false);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('extractionHistory');
  };

  const handleUpdateText = (newText: string) => {
    if (result) setResult({ ...result, extracted_text: newText });
  };

  const handleUpdateRows = (newRows: DynamicRow[]) => {
    if (result) setResult({ ...result, extracted_table: newRows });
  };

  const canProcess = inputMode === 'batch'
    ? files.length > 0 && import.meta.env.VITE_API_KEY
    : imagePreview && import.meta.env.VITE_API_KEY;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-2 glass-card-sm flex items-center justify-center">
              <Wheat className="w-6 h-6 sm:w-7 sm:h-7 farmer-icon" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-earth">{t('appName')}</h1>
              <p className="text-xs text-earth-muted">{t('appSubtitle')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Rate Limit Indicator */}
            <div className="hidden md:block">
              <RateLimitIndicator usedToday={usageToday} dailyLimit={DAILY_LIMIT} />
            </div>

            {/* History Button */}
            <button
              onClick={() => setHistorySidebarOpen(true)}
              className="dark-mode-toggle relative"
              title={t('viewHistory')}
            >
              <History className="w-5 h-5 text-earth-muted" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="dark-mode-toggle flex items-center space-x-1"
              title={language === 'en' ? t('switchToHindi') : t('switchToEnglish')}
            >
              <Globe className="w-5 h-5 text-earth-muted" />
              <span className="text-xs font-medium text-earth-muted hidden sm:inline">
                {language === 'en' ? 'हिं' : 'EN'}
              </span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="dark-mode-toggle"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-earth-muted" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={historySidebarOpen}
        onClose={() => setHistorySidebarOpen(false)}
        history={history}
        onRestore={handleRestoreHistory}
        onDelete={handleDeleteHistory}
        onClearAll={handleClearHistory}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Mobile Rate Limit */}
        <div className="md:hidden mb-4">
          <RateLimitIndicator usedToday={usageToday} dailyLimit={DAILY_LIMIT} />
        </div>

        {/* API Key Warning */}
        {!import.meta.env.VITE_API_KEY && (
          <div className="glass-card-sm mb-6 p-4 flex items-start space-x-3 border-l-4 border-amber-500">
            <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600" />
            <div className="text-sm text-earth">
              <strong>Missing API Key:</strong> Set <code className="glass-card-sm px-1.5 py-0.5 rounded text-xs">VITE_API_KEY</code> in <code className="glass-card-sm px-1.5 py-0.5 rounded text-xs">.env.local</code>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-4 md:space-y-6">

            {/* Mode Selector */}
            <div className="glass-card-sm p-1.5 flex flex-wrap">
              <button
                onClick={() => { setInputMode('image'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all ${inputMode === 'image'
                  ? 'btn-farmer'
                  : 'text-earth-muted hover:text-earth hover:bg-white/5'
                  }`}
              >
                <Image className="w-4 h-4" />
                <span>{t('image')}</span>
              </button>
              <button
                onClick={() => { setInputMode('batch'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all ${inputMode === 'batch'
                  ? 'btn-farmer'
                  : 'text-earth-muted hover:text-earth hover:bg-white/5'
                  }`}
              >
                <Layers className="w-4 h-4" />
                <span>{t('batch')}</span>
              </button>
              <button
                onClick={() => { setInputMode('pdf'); handleClearFile(); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all ${inputMode === 'pdf'
                  ? 'btn-farmer'
                  : 'text-earth-muted hover:text-earth hover:bg-white/5'
                  }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t('pdf')}</span>
              </button>
            </div>

            {/* Input Area */}
            <div className="glass-card p-4 md:p-6">
              {inputMode === 'image' ? (
                <>
                  <h2 className="text-base md:text-lg font-semibold mb-1 text-earth">{t('uploadImage')}</h2>
                  <p className="text-xs mb-4 text-earth-muted">
                    {t('uploadImageDesc')}
                  </p>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    selectedFile={file}
                    onClear={handleClearFile}
                    disabled={status === ProcessingStatus.PROCESSING}
                  />

                  {imagePreview && (
                    <div className="mt-4 md:mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-earth-muted">{t('preview')}</p>
                      <div className="relative rounded-xl overflow-hidden glass-card-sm aspect-[3/4]">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </>
              ) : inputMode === 'batch' ? (
                <>
                  <h2 className="text-base md:text-lg font-semibold mb-1 text-earth">{t('batchProcessing')}</h2>
                  <p className="text-xs mb-4 text-earth-muted">
                    {t('batchProcessingDesc')}
                  </p>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    onFilesSelect={handleFilesSelect}
                    selectedFile={null}
                    selectedFiles={files}
                    onClear={handleClearFile}
                    disabled={status === ProcessingStatus.PROCESSING}
                    batchMode={true}
                  />
                  {files.length > 0 && (
                    <p className="text-xs text-earth-muted mt-3 text-center">
                      {files.length} {t('imagesSelected')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-base md:text-lg font-semibold mb-1 text-earth">{t('pdfToImage')}</h2>
                  <p className="text-xs mb-4 text-earth-muted">
                    {t('pdfToImageDesc')}
                  </p>
                  <PdfUploadView
                    onPageSelect={handlePdfPageSelect}
                    onClear={handleClearFile}
                    disabled={status === ProcessingStatus.PROCESSING}
                  />

                  {imagePreview && pdfPageNumber && (
                    <div className="mt-4 md:mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-earth-muted">
                        {t('page')} {pdfPageNumber}
                      </p>
                      <div className="relative rounded-xl overflow-hidden glass-card-sm aspect-[3/4]">
                        <img src={imagePreview} alt={`Page ${pdfPageNumber}`} className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Progress */}
              {status === ProcessingStatus.PROCESSING && (
                <div className="mt-4">
                  <div className="progress-bar-bg h-2">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-center text-earth-muted">
                    {batchProgress
                      ? `${t('processing')} ${batchProgress.current}/${batchProgress.total}...`
                      : progress < 30 ? t('preparing') : progress < 90 ? t('aiAnalyzing') : t('finishingUp')
                    }
                  </p>
                </div>
              )}

              {/* Extract Button */}
              <button
                onClick={inputMode === 'batch' ? processBatch : processImage}
                disabled={!canProcess || status === ProcessingStatus.PROCESSING}
                className={`
                  mt-4 md:mt-6 w-full flex items-center justify-center space-x-2 py-3 md:py-3.5 px-4 rounded-full font-semibold transition-all text-sm md:text-base
                  ${!canProcess || status === ProcessingStatus.PROCESSING
                    ? 'glass-card-sm text-earth-muted cursor-not-allowed'
                    : 'btn-farmer'
                  }
                `}
              >
                {status === ProcessingStatus.PROCESSING ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{batchProgress ? `${batchProgress.current}/${batchProgress.total}` : t('analyzing')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{inputMode === 'batch' ? t('extractImages', { count: files.length }) : t('extractData')}</span>
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="mt-4 p-3 text-sm rounded-xl flex items-start space-x-2 bg-red-500/10 text-red-500 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result?.warnings && result.warnings.length > 0 && (
              <div className="glass-card-sm p-4 border-l-4 border-amber-500/50">
                <h3 className="text-sm font-semibold mb-2 flex items-center text-amber-500">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t('notes')}
                </h3>
                <ul className="list-disc list-inside text-xs space-y-1 text-earth-muted">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            {!result ? (
              <div className="glass-card h-full min-h-[400px] md:min-h-[500px] flex flex-col items-center justify-center p-6 md:p-8">
                <div className="p-6 glass-card-sm rounded-full mb-4">
                  <Layout className="w-10 md:w-12 h-10 md:h-12 text-earth-muted" />
                </div>
                <h3 className="text-base md:text-lg font-medium text-earth">{t('noDataYet')}</h3>
                <p className="text-xs md:text-sm max-w-xs text-center mt-2 text-earth-muted">
                  {inputMode === 'batch'
                    ? t('noDataBatchDesc')
                    : inputMode === 'image'
                      ? t('noDataYetDesc')
                      : t('noDataPdfDesc')
                  }
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-[600px] md:h-[800px]">
                {/* Tabs */}
                <div className="glass-card-sm flex space-x-1 p-1.5 mb-4 w-fit">
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`flex items-center space-x-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${activeTab === 'table'
                      ? 'glass-card text-earth'
                      : 'text-earth-muted hover:text-earth'
                      }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>{t('table')} ({result.extracted_table.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center space-x-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${activeTab === 'text'
                      ? 'glass-card text-earth'
                      : 'text-earth-muted hover:text-earth'
                      }`}
                  >
                    <Layout className="w-4 h-4" />
                    <span>{t('text')}</span>
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
                  <p>Farmer OCR</p>
                  <p>{result.document_type_guess || 'Unknown'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Install Prompt Banner */}
      <InstallPrompt />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass-footer py-2 md:py-3 z-40">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] md:text-xs text-earth-muted">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
