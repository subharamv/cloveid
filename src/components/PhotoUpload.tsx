import React, { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import PhotoGuideModal from '@/components/PhotoGuideModal';
import LiveCameraCapture from '@/components/LiveCameraCapture';

interface EditorState {
    img: HTMLImageElement | null;
    scale: number;
    rotation: number;
    tx: number;
    ty: number;
}

interface PhotoUploadProps {
    onPhotoSelect: (file: File) => void;
    currentPhoto?: File | null;
    showUploadNote?: boolean;
    onHideUploadNote?: () => void;
    onShowModal?: (type: 'error' | 'success', title: string, message: string) => void;
    editor?: EditorState;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onRotateLeft?: () => void;
    onRotateRight?: () => void;
    onReset?: () => void;
    isLoadingImage?: boolean;
    enableCamera?: boolean;
    hasPhoto?: boolean;
}

const MAX_FILE_SIZE = 104857600;
const MAX_FILE_SIZE_MB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
    onPhotoSelect,
    currentPhoto,
    showUploadNote,
    onHideUploadNote,
    onShowModal,
    editor,
    onZoomIn,
    onZoomOut,
    onRotateLeft,
    onRotateRight,
    onReset,
    isLoadingImage = false,
    enableCamera = false,
    hasPhoto,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const photoPresent = hasPhoto ?? !!editor?.img;

    const validateFile = (file: File): string | null => {
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            return 'Only JPEG and PNG images are allowed.';
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max ${MAX_FILE_SIZE_MB} MB. Large files will be automatically optimized.`;
        }
        return null;
    };

    const handleFile = async (file: File) => {
        const error = validateFile(file);
        if (error) {
            onShowModal?.('error', 'Invalid file', error);
            return;
        }

        setIsProcessing(true);
        try {
            await onPhotoSelect(file);
            onHideUploadNote?.();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (!errorMsg.includes('Upload') && !errorMsg.includes('Cloudinary')) {
                onShowModal?.('error', 'Load error', 'Could not process the selected image.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFile(files[0]);
        } else {
            onShowModal?.('error', 'No file', 'No file was dropped.');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setShowCamera(false);
            handleFile(file);
        }
        e.target.value = '';
    };

    const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    handleFile(file);
                    break;
                }
            }
        }
    };

    React.useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, []);

    const busy = isProcessing || isLoadingImage;

    const tileBase =
        'relative flex flex-col items-center justify-center gap-1 min-h-[96px] md:min-h-[104px] rounded-xl border-2 px-3 py-3 text-center transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee photo</span>
                <button
                    type="button"
                    onClick={() => setShowGuide(true)}
                    className="flex items-center gap-1 h-8 px-2 -mr-2 rounded-lg text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                    title="Photo guidelines"
                >
                    <Info size={14} />
                    <span>Guidelines</span>
                </button>
            </div>

            {photoPresent && !busy && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/15 border border-green-100 dark:border-green-900/30">
                    <span className="material-symbols-outlined text-lg text-green-500">check_circle</span>
                    <span className="text-sm text-green-700 dark:text-green-400">Photo added. Drag it on the card to position.</span>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileInput}
                disabled={busy}
                className="hidden"
            />

            {busy ? (
                <div className="flex items-center justify-center gap-2.5 min-h-[96px] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="animate-spin">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                    <span className="text-sm text-muted-foreground">Processing photo...</span>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative grid gap-2.5 ${enableCamera ? 'grid-cols-2' : 'grid-cols-1'}`}
                >
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`${tileBase} border-dashed ${
                            isDragging
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                        }`}
                    >
                        <span className="material-symbols-outlined text-3xl text-orange-500">
                            {isDragging ? 'download' : 'upload'}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {isDragging ? 'Drop photo here' : photoPresent ? 'Upload new' : 'Upload photo'}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            JPEG / PNG<span className="hidden lg:inline"> · or drag &amp; drop</span>
                        </span>
                    </button>

                    {enableCamera && (
                        <button
                            type="button"
                            onClick={() => setShowCamera((v) => !v)}
                            className={`${tileBase} ${
                                showCamera
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                            }`}
                        >
                            <span className="material-symbols-outlined text-3xl text-orange-500">photo_camera</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {photoPresent ? 'Retake photo' : 'Take photo'}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                {showCamera ? 'Camera is open below' : 'Front or back camera'}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {enableCamera && (
                <LiveCameraCapture
                    isOpen={showCamera && !busy}
                    onClose={() => setShowCamera(false)}
                    onCapture={handleFile}
                />
            )}

            {editor?.img && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photo Controls</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex gap-1">
                            <button
                                onClick={onZoomIn}
                                disabled={!editor.img}
                                title="Zoom In"
                                className="flex-1 px-2 py-2 text-xs font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                            >
                                🔍+
                            </button>
                            <button
                                onClick={onZoomOut}
                                disabled={!editor.img}
                                title="Zoom Out"
                                className="flex-1 px-2 py-2 text-xs font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                            >
                                🔍−
                            </button>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={onRotateLeft}
                                disabled={!editor.img}
                                title="Rotate Left (15°)"
                                className="flex-1 px-2 py-2 text-xs font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                            >
                                ↶
                            </button>
                            <button
                                onClick={onRotateRight}
                                disabled={!editor.img}
                                title="Rotate Right (15°)"
                                className="flex-1 px-2 py-2 text-xs font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                            >
                                ↷
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onReset}
                        disabled={!editor.img}
                        title="Reset to Default"
                        className="w-full mt-2 px-2 py-2 text-xs font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 dark:text-gray-200 rounded transition-colors"
                    >
                        Reset Position
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Scale: {editor.scale.toFixed(2)}x | Rotation: {Math.round((editor.rotation * 180) / Math.PI)}°
                    </p>
                </div>
            )}
            <PhotoGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
        </div>
    );
};
