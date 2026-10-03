import React, { useCallback, useEffect, useRef, useState } from 'react';

interface LiveCameraCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [snapshot, setSnapshot] = useState<{ url: string; blob: Blob } | null>(null);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    const startStream = useCallback(async (mode: 'user' | 'environment') => {
        stopStream();
        setError(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Camera is not supported in this browser, or the page is not served over HTTPS.');
            return;
        }

        setIsStarting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => { /* autoplay may be deferred */ });
            }
        } catch (err) {
            const name = err instanceof DOMException ? err.name : '';
            if (name === 'NotAllowedError') {
                setError('Camera permission was denied. Allow camera access in your browser settings and try again.');
            } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
                setError('No camera was found on this device.');
            } else if (name === 'NotReadableError') {
                setError('The camera is already in use by another application.');
            } else {
                setError('Unable to access the camera.');
            }
        } finally {
            setIsStarting(false);
        }
    }, [stopStream]);

    useEffect(() => {
        if (isOpen && !snapshot) {
            startStream(facingMode);
        }
        if (!isOpen) {
            stopStream();
        }
        return () => stopStream();
    }, [isOpen, facingMode, snapshot, startStream, stopStream]);

    // revoke preview URL when it changes / on unmount
    useEffect(() => {
        return () => {
            if (snapshot) URL.revokeObjectURL(snapshot.url);
        };
    }, [snapshot]);

    const handleClose = () => {
        stopStream();
        setSnapshot(null);
        setError(null);
        onClose();
    };

    const handleCapture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // front camera preview is mirrored; mirror the capture too so it matches what the user saw
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) {
                setError('Failed to capture photo. Please try again.');
                return;
            }
            stopStream();
            setSnapshot({ url: URL.createObjectURL(blob), blob });
        }, 'image/jpeg', 0.95);
    };

    const handleRetake = () => {
        setSnapshot(null); // effect restarts the stream
    };

    const handleUsePhoto = () => {
        if (!snapshot) return;
        const file = new File([snapshot.blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopStream();
        setSnapshot(null);
        onCapture(file);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleClose}>
            <div
                className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Capture Photo</h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Close"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="relative bg-black aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center">
                    {error ? (
                        <div className="text-center px-6">
                            <span className="material-symbols-outlined text-4xl text-red-400">videocam_off</span>
                            <p className="text-sm text-gray-200 mt-2">{error}</p>
                            <button
                                type="button"
                                onClick={() => startStream(facingMode)}
                                className="mt-3 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                            >
                                Try again
                            </button>
                        </div>
                    ) : snapshot ? (
                        <img src={snapshot.url} alt="Captured" className="w-full h-full object-contain" />
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
                            />
                            {/* face guide */}
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="w-[55%] aspect-[3/4] rounded-[50%] border-2 border-dashed border-white/70" />
                            </div>
                            {isStarting && (
                                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                                    Starting camera...
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2 px-4 py-3">
                    {snapshot ? (
                        <>
                            <button
                                type="button"
                                onClick={handleRetake}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <span className="material-symbols-outlined text-base">replay</span>
                                Retake
                            </button>
                            <button
                                type="button"
                                onClick={handleUsePhoto}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-base">check</span>
                                Use Photo
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                                disabled={isStarting}
                                title="Switch camera"
                                className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">cameraswitch</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCapture}
                                disabled={!!error || isStarting}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-base">photo_camera</span>
                                Capture
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveCameraCapture;
