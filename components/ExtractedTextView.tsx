import React from 'react';
import { Copy, Check } from 'lucide-react';

interface ExtractedTextViewProps {
  text: string;
  onTextChange: (text: string) => void;
}

export const ExtractedTextView: React.FC<ExtractedTextViewProps> = ({ text, onTextChange }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
            <h3 className="font-semibold text-slate-800">Extracted Narrative</h3>
            <p className="text-xs text-slate-500">Headings, paragraphs, instructions</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Text'}</span>
        </button>
      </div>
      <div className="flex-1 p-0 relative bg-white">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full h-full min-h-[400px] p-6 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20 text-slate-800 bg-white leading-relaxed font-mono text-sm placeholder:text-slate-400"
          placeholder="No narrative text extracted..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};