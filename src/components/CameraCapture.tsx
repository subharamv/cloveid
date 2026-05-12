import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, Info } from 'lucide-react';
import photoGuide from '../assets/photo-guide.png';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = s;
      setError('');
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative aspect-[3/4] bg-black">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
              <Camera size={48} className="mb-4 opacity-50" />
              <p className="text-center text-sm">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/20" />

                <svg className="w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <mask id="guideMask">
                      <rect width="300" height="400" fill="white" />
                      <ellipse cx="150" cy="140" rx="75" ry="90" fill="black" />
                    </mask>
                  </defs>

                  <rect width="300" height="400" fill="rgba(0,0,0,0.35)" mask="url(#guideMask)" />

                  <ellipse
                    cx="150" cy="140" rx="75" ry="90"
                    fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"
                    strokeDasharray="6 4"
                  />

                  <line x1="75" y1="140" x2="55" y2="140" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                  <line x1="225" y1="140" x2="245" y2="140" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                  <line x1="150" y1="50" x2="150" y2="35" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                  <line x1="150" y1="230" x2="150" y2="245" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

                  <rect x="30" y="290" rx="12" ry="12" width="240" height="70" fill="rgba(0,0,0,0.5)" />
                  <text x="150" y="315" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
                    Position your face within the guide
                  </text>
                  <text x="150" y="335" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">
                    Ensure good lighting and look straight ahead
                  </text>
                </svg>
              </div>

              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 pointer-events-auto z-10">
                <button
                  onClick={() => setShowGuide(true)}
                  className="w-11 h-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-all"
                  title="Photo guidelines"
                >
                  <Info size={18} />
                </button>
                <button
                  onClick={capture}
                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                  title="Take photo"
                >
                  <div className="w-14 h-14 rounded-full border-[3px] border-gray-800" />
                </button>
                <button
                  onClick={toggleCamera}
                  className="w-11 h-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-all"
                  title="Flip camera"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-all pointer-events-auto z-10"
                title="Close"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {showGuide && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="relative max-w-lg w-full bg-gray-900 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Photo Guidelines</h3>
              <button
                onClick={() => setShowGuide(false)}
                className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600"
              >
                <X size={14} />
              </button>
            </div>
            <img
              src={photoGuide}
              alt="Photo guidelines showing correct face positioning"
              className="w-full"
            />
            <div className="p-4 space-y-2 text-sm text-gray-300">
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> Face the camera directly with a neutral expression</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> Ensure your face is centred and fully within the oval guide</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> Use good, even lighting — avoid shadows on your face</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> No sunglasses, hats, or objects covering your face</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> Plain background preferred</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
