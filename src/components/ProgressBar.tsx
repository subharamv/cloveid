import React from 'react';

interface ProgressBarProps {
    isVisible: boolean;
    progress: number; // 0 to 100
    message?: string;
    position?: 'top' | 'bottom-right';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    isVisible,
    progress,
    message,
    position = 'top'
}) => {
    if (!isVisible) return null;

    // Top full-width bar
    if (position === 'top') {
        return (
            <div className="fixed top-0 left-0 right-0 z-50">
                <div className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                    <div className="flex flex-col">
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-white to-white/80 transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {message && (
                            <div className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg
                                        className="animate-spin w-5 h-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <span className="text-sm font-medium text-white">{message}</span>
                                </div>
                                <span className="text-sm font-semibold text-white">{Math.round(progress)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Bottom-right toast-style compact bar
    return (
        <div className="fixed bottom-10 right-4 z-50 max-w-sm">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                    <svg
                        className="animate-spin w-4 h-4 text-white flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                        {message && (
                            <span className="text-xs font-medium text-white truncate">{message}</span>
                        )}
                        <span className="text-xs font-semibold text-white flex-shrink-0">{Math.round(progress)}%</span>
                    </div>
                </div>
                <div className="h-0.5 bg-white/20 overflow-hidden">
                    <div
                        className="h-full bg-white transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
