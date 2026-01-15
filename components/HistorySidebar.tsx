import React from 'react';
import { History, X, Trash2, RotateCcw, Clock } from 'lucide-react';
import { ExtractionResult } from '../types';

export interface HistoryEntry {
    id: string;
    timestamp: number;
    documentType: string;
    rowCount: number;
    result: ExtractionResult;
    imagePreview?: string;
}

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryEntry[];
    onRestore: (entry: HistoryEntry) => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen,
    onClose,
    history,
    onRestore,
    onDelete,
    onClearAll
}) => {
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed top-0 right-0 h-full w-80 glass-card z-50
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col
      `} style={{ borderRadius: '24px 0 0 24px' }}>
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center space-x-2">
                        <History className="w-5 h-5 farmer-icon" />
                        <h2 className="font-semibold text-earth">Extraction History</h2>
                    </div>
                    <button onClick={onClose} className="p-1 btn-glass rounded-full">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {history.length === 0 ? (
                        <div className="text-center py-12 text-earth-muted">
                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No extraction history yet</p>
                            <p className="text-xs mt-1">Your extractions will appear here</p>
                        </div>
                    ) : (
                        history.map(entry => (
                            <div
                                key={entry.id}
                                className="glass-card-sm p-3 cursor-pointer group hover:scale-[1.02] transition-transform"
                                onClick={() => onRestore(entry)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-earth truncate">
                                            {entry.documentType || 'Unknown Document'}
                                        </p>
                                        <p className="text-xs text-earth-muted mt-0.5">
                                            {entry.rowCount} rows • {formatTime(entry.timestamp)}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRestore(entry); }}
                                            className="p-1.5 btn-glass rounded-full"
                                            title="Restore"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                                            className="p-1.5 btn-glass rounded-full hover:text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {history.length > 0 && (
                    <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <button
                            onClick={onClearAll}
                            className="w-full btn-glass text-sm py-2 text-red-500 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4 inline mr-2" />
                            Clear All History
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
