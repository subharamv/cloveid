import React, { useRef, useState } from 'react';

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
    showUploadNote: boolean;
    onHideUploadNote: () => void;
    onShowModal?: (type: 'error' | 'success', title: string, message: string) => void;
    editor?: EditorState;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onRotateLeft?: () => void;
    onRotateRight?: () => void;
    onReset?: () => void;
}

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
    onReset
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): string | null => {
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            return 'Only JPEG and PNG images are allowed.';
        }
        if (file.size > 5120 * 5120) {
            return `File too large (${Math.round(file.size / 5120)} KB). Max 1 MB.`;
        }
        return null;
    };

    const handleFile = async (file: File) => {
        const error = validateFile(file);
        if (error) {
            onShowModal?.('error', 'Invalid file', error);
            return;
        }

        try {
            await onPhotoSelect(file);
            onHideUploadNote();
            onShowModal?.('success', 'Image accepted', 'Uploaded image is valid and ready to use.');
        } catch (err) {
            onShowModal?.('error', 'Load error', 'Could not read the selected image.');
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
            handleFile(file);
        }
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

    return (
        <div className="space-y-3">
            <label className="block text-muted-foreground text-sm mb-2">
                Photo (upload)
            </label>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileInput}
                className="w-full p-2.5 border border-input-border rounded-lg bg-white text-foreground text-sm"
            />

            {showUploadNote && (
                <div className={`upload-note ${!showUploadNote ? 'fade-out' : ''}`}>
                    Supported: JPEG / PNG. Max file size: 1 MB. Drag & drop or paste supported.
                </div>
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
        </div>
    );
};