import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface Step {
  key: string;
  label: string;
  range: [number, number]; // progress % range this step covers
}

const STEPS: Step[] = [
  { key: 'zip',      label: 'Generating ZIP',    range: [0,  45] },
  { key: 'upload',   label: 'Uploading',          range: [45, 80] },
  { key: 'database', label: 'Saving',             range: [80, 100] },
];

function getActiveStep(progress: number): string {
  for (const step of [...STEPS].reverse()) {
    if (progress >= step.range[0]) return step.key;
  }
  return STEPS[0].key;
}

interface Props {
  isVisible: boolean;
  progress: number;   // 0–100
  message: string;
}

const CardSaveProgress: React.FC<Props> = ({ isVisible, progress, message }) => {
  if (!isVisible) return null;

  const activeKey = getActiveStep(progress);
  const done = progress >= 100;

  return (
    <div className="hidden lg:block w-full mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          {done
            ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            : <Loader2 size={16} className="animate-spin text-orange-500 shrink-0" />
          }
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {done ? 'Saved!' : 'Saving…'}
          </span>
          <span className="ml-auto text-xs font-mono text-gray-400 dark:text-gray-500">
            {progress}%
          </span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-3">
          {STEPS.map((step, i) => {
            const isComplete = progress >= step.range[1];
            const isActive = !isComplete && activeKey === step.key;
            const isPending = !isComplete && !isActive;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-orange-500 text-white ring-2 ring-orange-200 dark:ring-orange-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {isComplete
                      ? <CheckCircle2 size={12} />
                      : isActive
                        ? <Loader2 size={11} className="animate-spin" />
                        : <span>{i + 1}</span>
                    }
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap transition-colors duration-300 ${
                    isComplete
                      ? 'text-green-600 dark:text-green-400'
                      : isActive
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-[2px] flex-1 mb-4 transition-all duration-500 ${
                    progress >= STEPS[i + 1].range[0]
                      ? 'bg-green-400 dark:bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${done ? 'bg-green-500' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current message */}
        {message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">{message}</p>
        )}
      </div>
    </div>
  );
};

export default CardSaveProgress;
