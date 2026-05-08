import React from 'react';

interface ImageAdjustmentsProps {
    brightness: number;
    contrast: number;
    saturation: number;
    shadow: number;
    onBrightnessChange: (val: number) => void;
    onContrastChange: (val: number) => void;
    onSaturationChange: (val: number) => void;
    onShadowChange: (val: number) => void;
    onAutoEnhance: () => void;
    onResetFilters: () => void;
    hasImage: boolean;
}

export const ImageAdjustments: React.FC<ImageAdjustmentsProps> = ({
    brightness,
    contrast,
    saturation,
    shadow,
    onBrightnessChange,
    onContrastChange,
    onSaturationChange,
    onShadowChange,
    onAutoEnhance,
    onResetFilters,
    hasImage
}) => {
    return (
        <div className="space-y-4">
            {!hasImage && (
                <p className="text-sm text-muted-foreground text-center py-6">
                    Upload a photo first to enable image adjustments
                </p>
            )}

            <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Brightness</span>
                    <span className="font-medium tabular-nums">{Math.round(brightness * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={brightness}
                    onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
                    disabled={!hasImage}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                />
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contrast</span>
                    <span className="font-medium tabular-nums">{Math.round(contrast * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={contrast}
                    onChange={(e) => onContrastChange(parseFloat(e.target.value))}
                    disabled={!hasImage}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                />
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saturation</span>
                    <span className="font-medium tabular-nums">{Math.round(saturation * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={saturation}
                    onChange={(e) => onSaturationChange(parseFloat(e.target.value))}
                    disabled={!hasImage}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                />
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shadow</span>
                    <span className="font-medium tabular-nums">{Math.round(shadow * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={shadow}
                    onChange={(e) => onShadowChange(parseFloat(e.target.value))}
                    disabled={!hasImage}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                />
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={onAutoEnhance}
                    disabled={!hasImage}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Auto Enhance
                </button>
                <button
                    onClick={onResetFilters}
                    disabled={!hasImage}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="material-symbols-outlined text-base">restart_alt</span>
                    Reset
                </button>
            </div>

            {hasImage && (brightness !== 1 || contrast !== 1 || saturation !== 1 || shadow !== 0) && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                    Adjustments are previewed live and applied to export
                </p>
            )}
        </div>
    );
};
