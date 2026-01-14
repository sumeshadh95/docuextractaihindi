import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, ScanText } from 'lucide-react';

interface PasswordGateProps {
    children: React.ReactNode;
}

// Generate today's password: date in M/DD/YYYY format, reversed
const generateDailyPassword = (): string => {
    const now = new Date();
    const month = now.getMonth() + 1; // 0-indexed
    const day = now.getDate();
    const year = now.getFullYear();

    // Format: M/DD/YYYY (e.g., 1/15/2026)
    const paddedDay = day.toString().padStart(2, '0');
    const dateString = `${month}${paddedDay}${year}`; // e.g., "1152026"

    // Reverse it: "6202511"
    return dateString.split('').reverse().join('');
};

export const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    // Check if already authenticated today
    useEffect(() => {
        const savedAuth = localStorage.getItem('docuextract_auth');
        if (savedAuth) {
            const { date, authenticated } = JSON.parse(savedAuth);
            const today = new Date().toDateString();
            if (date === today && authenticated) {
                setIsAuthenticated(true);
            }
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const todayPassword = generateDailyPassword();

        if (password === todayPassword) {
            setIsAuthenticated(true);
            setError('');
            // Save authentication for today
            localStorage.setItem('docuextract_auth', JSON.stringify({
                date: new Date().toDateString(),
                authenticated: true
            }));
        } else {
            setAttempts(prev => prev + 1);
            setError(`Incorrect access code. Please try again. (Attempt ${attempts + 1})`);
            setPassword('');
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
                        <ScanText className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">DocuExtract AI</h1>
                    <p className="text-blue-200/70">Hindi Document Data Extraction</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-3 bg-amber-500/20 rounded-full">
                            <Lock className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>

                    <h2 className="text-xl font-semibold text-white text-center mb-2">
                        Protected Access
                    </h2>
                    <p className="text-blue-200/60 text-center text-sm mb-6">
                        Enter your daily access code to continue
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter access code"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-lg tracking-widest"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
                        >
                            Access Application
                        </button>
                    </form>

                    <p className="text-blue-200/40 text-xs text-center mt-6">
                        Access code changes daily. Contact your administrator if you need assistance.
                    </p>
                </div>

                {/* Footer */}
                <p className="text-blue-200/30 text-xs text-center mt-6">
                    © 2026 DocuExtract AI • For authorized NGO partners only
                </p>
            </div>
        </div>
    );
};
