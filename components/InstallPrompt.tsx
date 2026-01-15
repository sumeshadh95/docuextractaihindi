import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface InstallPromptProps {
    onDismiss?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ onDismiss }) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check if already installed or dismissed
        const dismissed = localStorage.getItem('installPromptDismissed');
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;

        if (dismissed || isStandalone) {
            return;
        }

        // Detect iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(iOS);

        if (iOS) {
            // Show iOS prompt after 2 seconds
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
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
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
            <div className="glass-card p-4 flex items-center space-x-3">
                {/* App Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
                    <Download className="w-6 h-6 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-earth">Install Farmer OCR</p>
                    <p className="text-xs text-earth-muted truncate">
                        {isIOS
                            ? 'Tap Share then "Add to Home Screen"'
                            : 'Install for quick access offline'
                        }
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                    {isIOS ? (
                        <div className="p-2 glass-card-sm rounded-full">
                            <Share className="w-5 h-5 farmer-icon" />
                        </div>
                    ) : (
                        <button
                            onClick={handleInstall}
                            className="btn-farmer px-4 py-2 text-xs"
                        >
                            Install
                        </button>
                    )}
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-earth-muted hover:text-earth"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
