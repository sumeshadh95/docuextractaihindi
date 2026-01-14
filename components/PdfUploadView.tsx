import React, { useState, useRef } from 'react';
import { FileUp, Loader2, X, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

interface PdfUploadViewProps {
    onPageSelect: (imageDataUrl: string, pageNumber: number) => void;
    onClear: () => void;
    disabled?: boolean;
}

interface PageThumbnail {
    pageNumber: number;
    dataUrl: string;
}

export const PdfUploadView: React.FC<PdfUploadViewProps> = ({
    onPageSelect,
    onClear,
    disabled
}) => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageThumbnail[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedPage, setSelectedPage] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            setError('Please select a valid PDF file');
            return;
        }

        setPdfFile(file);
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Loading PDF...');
        setPages([]);
        setSelectedPage(null);

        try {
            const arrayBuffer = await file.arrayBuffer();

            setLoadingMessage('Parsing PDF...');
            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,
                useSystemFonts: true,
            }).promise;

            setTotalPages(pdf.numPages);
            setLoadingMessage(`Rendering ${pdf.numPages} pages...`);

            // Render all pages as thumbnails
            const thumbnails: PageThumbnail[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                setLoadingMessage(`Rendering page ${i} of ${pdf.numPages}...`);
                const page = await pdf.getPage(i);
                const scale = 0.4; // Thumbnail scale
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;

                thumbnails.push({
                    pageNumber: i,
                    dataUrl: canvas.toDataURL('image/png'),
                });
            }

            setPages(thumbnails);
            setLoadingMessage('');
        } catch (err: any) {
            console.error('PDF loading error:', err);
            setError(`Failed to load PDF: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageClick = async (pageNumber: number) => {
        if (!pdfFile || disabled) return;

        setSelectedPage(pageNumber);
        setIsLoading(true);
        setLoadingMessage('Rendering high-resolution page...');

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,
                useSystemFonts: true,
            }).promise;
            const page = await pdf.getPage(pageNumber);

            // Render at higher resolution for extraction
            const scale = 2.0;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            const highResDataUrl = canvas.toDataURL('image/png');
            onPageSelect(highResDataUrl, pageNumber);
        } catch (err: any) {
            console.error('Page render error:', err);
            setError(`Failed to render page: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleClear = () => {
        setPdfFile(null);
        setPages([]);
        setTotalPages(0);
        setSelectedPage(null);
        setError(null);
        setLoadingMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClear();
    };

    return (
        <div className="space-y-4">
            {/* File Input */}
            {!pdfFile ? (
                <div
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${disabled
                            ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                            : 'border-red-300 bg-red-50/50 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                        }
          `}
                >
                    <FileUp className="w-10 h-10 mx-auto mb-3 text-red-500 dark:text-red-400" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Click to upload PDF
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Each page will be converted to an image
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* PDF Info */}
                    <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-red-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                                    {pdfFile.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {totalPages} page{totalPages !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClear}
                            disabled={disabled || isLoading}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Page Thumbnails */}
                    {pages.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Select a page to extract
                            </p>
                            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
                                {pages.map((page) => (
                                    <button
                                        key={page.pageNumber}
                                        onClick={() => handlePageClick(page.pageNumber)}
                                        disabled={disabled || isLoading}
                                        className={`
                      relative rounded-lg overflow-hidden border-2 transition-all
                      ${selectedPage === page.pageNumber
                                                ? 'border-blue-500 ring-2 ring-blue-500/30'
                                                : 'border-slate-200 dark:border-slate-600 hover:border-blue-400'
                                            }
                      ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                                    >
                                        <img
                                            src={page.dataUrl}
                                            alt={`Page ${page.pageNumber}`}
                                            className="w-full h-auto"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                                            Page {page.pageNumber}
                                        </div>
                                        {selectedPage === page.pageNumber && (
                                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                                    Selected
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
            />

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-4 text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">{loadingMessage || 'Processing...'}</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
};
