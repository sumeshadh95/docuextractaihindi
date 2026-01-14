import React from 'react';
import { FileText, ClipboardPaste } from 'lucide-react';

interface TextInputViewProps {
    rawText: string;
    onTextChange: (text: string) => void;
    onClear: () => void;
    disabled?: boolean;
}

export const TextInputView: React.FC<TextInputViewProps> = ({
    rawText,
    onTextChange,
    onClear,
    disabled
}) => {
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            onTextChange(text);
        } catch (err) {
            console.error("Failed to read clipboard:", err);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Raw Text Input</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Copy and paste text from PDF, Word, or any document
                    </p>
                </div>
                <button
                    onClick={handlePaste}
                    disabled={disabled}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
                >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste from Clipboard</span>
                </button>
            </div>

            <div className="relative">
                <textarea
                    value={rawText}
                    onChange={(e) => onTextChange(e.target.value)}
                    disabled={disabled}
                    placeholder="Paste your document text here...

Example:
S.No. | BRP Name | Code | Farmer Name | Address
1 | Ramesh Karki | BRP-101 | Sita Sharma | Kathmandu
2 | Laxmi Thapa | BRP-102 | Mohan Thapa | Pokhara
..."
                    className={`
            w-full h-64 p-4 text-sm font-mono rounded-lg border resize-none
            bg-white dark:bg-slate-800 
            text-slate-700 dark:text-slate-300
            border-slate-200 dark:border-slate-700
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
                />

                {rawText && (
                    <button
                        onClick={onClear}
                        className="absolute top-2 right-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <FileText className="w-4 h-4" />
                <span>{rawText.length.toLocaleString()} characters</span>
                {rawText.length > 0 && (
                    <span className="text-green-600 dark:text-green-400">• Ready to extract</span>
                )}
            </div>
        </div>
    );
};
