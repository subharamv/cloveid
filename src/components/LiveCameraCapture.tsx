import React, { useCallback, useEffect, useRef, useState } from 'react';

interface LiveCameraCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

type Facing = 'user' | 'environment';

const BACK_LABEL_RE = /back|rear|environment|world/i;
const FRONT_LABEL_RE = /front|user|face|selfie/i;

const describeError = (err: unknown) => {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
        return 'Camera permission was denied. Allow camera access in your browser settings and try again.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
    if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy in another app. Close it and try again.';
    return 'Unable to access the camera.';
};

// Inline camera panel. Renders in the page flow (not a modal) so it sits right
// below the Upload / Take photo buttons and stays compact on tablets.
export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestIdRef = useRef(0);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [facing, setFacing] = useState<Facing>('user');
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [snapshot, setSnapshot] = useState<{ url: string; blob: Blob } | null>(null);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    const attachStream = useCallback(async (stream: MediaStream, fallbackFacing: Facing) => {
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings?.() ?? {};
        const label = track?.label ?? '';

        // Work out which way the active camera faces so the preview is mirrored
        // only for the front (selfie) camera.
        let actualFacing: Facing = fallbackFacing;
        if (settings.facingMode === 'user' || settings.facingMode === 'environment') {
            actualFacing = settings.facingMode;
        } else if (BACK_LABEL_RE.test(label)) {
            actualFacing = 'environment';
        } else if (FRONT_LABEL_RE.test(label)) {
            actualFacing = 'user';
        }
        setFacing(actualFacing);
        setDeviceId(settings.deviceId ?? null);

        // Device labels are only available after permission is granted.
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            setDevices(all.filter((d) => d.kind === 'videoinput'));
        } catch { /* ignore */ }

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => { /* autoplay may be deferred */ });
        }
    }, []);

    const openCamera = useCallback(async (opts: { facing?: Facing; deviceId?: string }) => {
        const requestId = ++requestIdRef.current;
        // Many tablets can't open two cameras at once: release the current one first.
        stopStream();
        setError(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Camera is not supported in this browser, or the page is not served over HTTPS.');
            return;
        }

        setIsStarting(true);
        const size = { width: { ideal: 1920 }, height: { ideal: 1440 } };
        const attempts: MediaTrackConstraints[] = opts.deviceId
            ? [{ deviceId: { exact: opts.deviceId }, ...size }]
            : [
                { facingMode: { exact: opts.facing ?? 'user' }, ...size },
                { facingMode: opts.facing ?? 'user', ...size },
                { ...size },
            ];

        let lastErr: unknown = null;
        for (const video of attempts) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
                if (requestId !== requestIdRef.current) {
                    stream.getTracks().forEach((t) => t.stop()); // superseded by a newer request
                    return;
                }
                await attachStream(stream, opts.facing ?? 'user');
                setIsStarting(false);
                return;
            } catch (err) {
                lastErr = err;
                const name = err instanceof DOMException ? err.name : '';
                if (name === 'NotAllowedError' || name === 'SecurityError') break; // no point retrying
            }
        }
        if (requestId === requestIdRef.current) {
            setError(describeError(lastErr));
            setIsStarting(false);
        }
    }, [attachStream, stopStream]);

    // open / close
    useEffect(() => {
        if (isOpen) {
            openCamera({ facing: 'user' });
        } else {
            requestIdRef.current++;
            stopStream();
            setSnapshot(null);
            setError(null);
        }
        return () => {
            requestIdRef.current++;
            stopStream();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // revoke preview URL when it changes / on unmount
    useEffect(() => {
        return () => {
            if (snapshot) URL.revokeObjectURL(snapshot.url);
        };
    }, [snapshot]);

    const handleSwitchCamera = async () => {
        const target: Facing = facing === 'user' ? 'environment' : 'user';

        // Prefer a device whose label matches the target side; otherwise cycle
        // to the next camera. Falls back to facingMode when labels are unknown.
        if (devices.length > 1) {
            const re = target === 'environment' ? BACK_LABEL_RE : FRONT_LABEL_RE;
            const byLabel = devices.find((d) => d.deviceId !== deviceId && re.test(d.label));
            const idx = devices.findIndex((d) => d.deviceId === deviceId);
            const next = byLabel ?? devices[(idx + 1) % devices.length];
            if (next?.deviceId) {
                await openCamera({ deviceId: next.deviceId, facing: target });
                return;
            }
        }
        await openCamera({ facing: target });
    };

    const handleClose = () => {
        requestIdRef.current++;
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
        if (facing === 'user') {
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
        setSnapshot(null);
        openCamera(deviceId ? { deviceId, facing } : { facing });
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

    const canSwitch = devices.length !== 1; // unknown (0) or several → allow trying

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <span className="material-symbols-outlined text-base text-orange-500">photo_camera</span>
                    {snapshot ? 'Check the photo' : facing === 'user' ? 'Front camera' : 'Back camera'}
                </span>
                <button
                    type="button"
                    onClick={handleClose}
                    className="flex items-center justify-center w-8 h-8 -mr-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                    title="Close camera"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>
            </div>

            {/* Compact 4:3 viewport, height-capped so it never takes over a tablet screen */}
            <div className="relative bg-black w-full aspect-[4/3] max-h-[38vh] md:max-h-[300px] mx-auto flex items-center justify-center overflow-hidden">
                {error ? (
                    <div className="text-center px-6">
                        <span className="material-symbols-outlined text-3xl text-red-400">videocam_off</span>
                        <p className="text-xs text-gray-200 mt-1.5">{error}</p>
                        <button
                            type="button"
                            onClick={() => openCamera({ facing })}
                            className="mt-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
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
                            style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
                        />
                        {/* face guide */}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-[80%] aspect-[3/4] rounded-[50%] border-2 border-dashed border-white/70" />
                        </div>
                        {isStarting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white/90">
                                Starting camera...
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex items-center gap-2 p-2.5">
                {snapshot ? (
                    <>
                        <button
                            type="button"
                            onClick={handleRetake}
                            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">replay</span>
                            Retake
                        </button>
                        <button
                            type="button"
                            onClick={handleUsePhoto}
                            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-lg">check</span>
                            Use Photo
                        </button>
                    </>
                ) : (
                    <>
                        {canSwitch && (
                            <button
                                type="button"
                                onClick={handleSwitchCamera}
                                disabled={isStarting}
                                title={facing === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
                                className="flex items-center justify-center gap-1 h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">cameraswitch</span>
                                <span className="hidden sm:inline">{facing === 'user' ? 'Rear cam' : 'Front cam'}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCapture}
                            disabled={!!error || isStarting}
                            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-lg">photo_camera</span>
                            Capture
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveCameraCapture;
