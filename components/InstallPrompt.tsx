import React, { useState, useEffect } from 'react';
import { Download, X, Share, ChevronUp, ChevronDown } from 'lucide-react';

interface InstallPromptProps {
    onDismiss?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ onDismiss }) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check if already installed or dismissed
        const dismissed = localStorage.getItem('installPromptDismissed');
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;

        if (dismissed || isStandalone) {
            return;
        }

        // Detect platform
        const userAgent = navigator.userAgent.toLowerCase();
        const iOS = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
        const android = /android/.test(userAgent);

        setIsIOS(iOS);
        setIsAndroid(android);

        if (iOS || android) {
            // Show prompt after 2 seconds
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // Listen for Chrome/Android install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Show anyway after 3 seconds (for browsers that support PWA)
        const timer = setTimeout(() => setShowPrompt(true), 3000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            clearTimeout(timer);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        } else {
            // No deferred prompt - show expanded instructions
            setExpanded(true);
        }
    };

    const handleBannerClick = () => {
        if (isIOS || isAndroid) {
            setExpanded(!expanded);
        } else {
            handleInstall();
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('installPromptDismissed', 'true');
        onDismiss?.();
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-16 left-4 right-4 z-50 animate-slideUp">
            <div className="glass-card overflow-hidden">
                {/* Main banner - clickable */}
                <div
                    className="p-4 flex items-center space-x-3 cursor-pointer active:bg-white/5"
                    onClick={handleBannerClick}
                >
                    {/* App Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
                        <Download className="w-6 h-6 text-white" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-earth">Install Farmer OCR</p>
                        <p className="text-xs text-earth-muted">
                            {isIOS || isAndroid ? 'Tap for instructions' : 'Add to Home Screen'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {(isIOS || isAndroid) && (
                            <div className="p-2 glass-card-sm rounded-full">
                                {expanded ? (
                                    <ChevronDown className="w-5 h-5 farmer-icon" />
                                ) : (
                                    <ChevronUp className="w-5 h-5 farmer-icon" />
                                )}
                            </div>
                        )}
                        {deferredPrompt && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleInstall(); }}
                                className="btn-farmer px-4 py-2 text-xs"
                            >
                                Install
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                            className="p-2 text-earth-muted hover:text-earth"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Expanded Instructions */}
                {expanded && (
                    <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
                        {isIOS ? (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-earth mb-2">To install on iPhone/iPad:</p>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                                    <span>Tap the <Share className="w-4 h-4 inline text-blue-500" /> Share button in Safari toolbar</span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                                    <span>Scroll down and tap <strong className="text-earth">"Add to Home Screen"</strong></span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                                    <span>Tap <strong className="text-earth">"Add"</strong> to confirm</span>
                                </div>
                            </div>
                        ) : isAndroid ? (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-earth mb-2">To install on Android:</p>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                                    <span>Tap the <strong className="text-earth">⋮ Menu</strong> in Chrome (top right)</span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                                    <span>Tap <strong className="text-earth">"Add to Home screen"</strong></span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                                    <span>Tap <strong className="text-earth">"Add"</strong> to confirm</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-earth mb-2">To install on Desktop:</p>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                                    <span>Look for the <strong className="text-earth">⊕ Install</strong> icon in your address bar</span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-earth-muted">
                                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                                    <span>Or go to <strong className="text-earth">Menu → Install Farmer OCR</strong></span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
