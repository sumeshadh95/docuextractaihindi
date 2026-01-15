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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <h3 className="font-semibold text-earth">Extracted Narrative</h3>
          <p className="text-xs text-earth-muted">Headings, paragraphs, instructions</p>
        </div>
        <button
          onClick={handleCopy}
          className="btn-glass flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5 farmer-icon" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Text'}</span>
        </button>
      </div>
      <div className="flex-1 p-2 relative">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="glass-input w-full h-full min-h-[400px] p-6 resize-none leading-relaxed font-mono text-sm"
          placeholder="No narrative text extracted..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};