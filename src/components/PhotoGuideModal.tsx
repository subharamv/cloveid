import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import photoGuide from '@/assets/photo-guide.png';

interface PhotoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tips = [
  'Stand straight and face the camera directly',
  'Keep a neutral or natural professional expression',
  'Wear formal / professional attire (dark colours preferred)',
  'Use a plain white or light-coloured background',
  'Ensure good lighting — no harsh shadows on your face',
  'Keep head and shoulders clearly visible in the frame',
  'Remove sunglasses, hats, or heavy accessories',
  'Look straight into the camera lens',
];

const PhotoGuideModal: React.FC<PhotoGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Photo Guidelines</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Follow the example below for best results</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-5 p-5">
          {/* Sample Image */}
          <div className="flex-shrink-0">
            <div className="w-28 rounded-xl overflow-hidden border-2 border-orange-200 dark:border-orange-800 shadow-md">
              <img
                src={photoGuide}
                alt="Photo pose example"
                className="w-full object-cover"
              />
            </div>
            <p className="text-center text-[10px] text-orange-500 font-semibold mt-1.5 tracking-wide uppercase">
              Sample Pose
            </p>
          </div>

          {/* Tips */}
          <ul className="flex-1 space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 size={13} className="flex-shrink-0 text-orange-500 mt-0.5" />
                <span className="text-xs text-gray-700 dark:text-gray-300 leading-snug">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shadow-orange-200 dark:shadow-orange-900/30"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PhotoGuideModal;
