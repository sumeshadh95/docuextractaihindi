import React from 'react';
import { Camera, AlertTriangle } from 'lucide-react';

interface RateLimitIndicatorProps {
    usedToday: number;
    dailyLimit: number;
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
    usedToday,
    dailyLimit
}) => {
    const remaining = Math.max(0, dailyLimit - usedToday);
    const percentage = (remaining / dailyLimit) * 100;

    const getColor = () => {
        if (percentage > 50) return 'text-green-500';
        if (percentage > 20) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getBgColor = () => {
        if (percentage > 50) return 'bg-green-500/10';
        if (percentage > 20) return 'bg-yellow-500/10';
        return 'bg-red-500/10';
    };

    return (
        <div className={`glass-card-sm px-3 py-2 flex items-center space-x-2 ${getBgColor()}`}>
            {percentage <= 20 ? (
                <AlertTriangle className={`w-4 h-4 ${getColor()}`} />
            ) : (
                <Camera className={`w-4 h-4 ${getColor()}`} />
            )}
            <div className="flex flex-col">
                <span className={`text-xs font-medium ${getColor()}`}>
                    {remaining} images remaining today
                </span>
                {percentage <= 20 && (
                    <span className="text-[10px] text-earth-muted">
                        Resets at midnight
                    </span>
                )}
            </div>
        </div>
    );
};

// Helper to get/set usage from localStorage
export const getUsageToday = (): number => {
    const data = localStorage.getItem('apiUsage');
    if (!data) return 0;

    try {
        const { count, date } = JSON.parse(data);
        const today = new Date().toDateString();
        if (date === today) return count;
        return 0; // Reset if different day
    } catch {
        return 0;
    }
};

export const incrementUsage = (): number => {
    const today = new Date().toDateString();
    const current = getUsageToday();
    const newCount = current + 1;

    localStorage.setItem('apiUsage', JSON.stringify({
        count: newCount,
        date: today
    }));

    return newCount;
};

export const DAILY_LIMIT = 1500; // Gemini free tier limit
