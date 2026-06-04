import React, { useLayoutEffect, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface StepConfig {
  label: string;
  icon: string;
}

interface StepWizardProps {
  steps: StepConfig[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  children: React.ReactNode;
}

const StepWizard: React.FC<StepWizardProps> = ({ steps, currentStep, onStepClick, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(currentStep);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Entrance animation on mount
  useEffect(() => {
    if (wrapperRef.current) {
      gsap.fromTo(
        wrapperRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      );
    }
  }, []);

  // Animate progress bar fill
  useEffect(() => {
    if (progressBarRef.current && steps.length > 1) {
      const pct = (currentStep / (steps.length - 1)) * 100;
      gsap.to(progressBarRef.current, { width: `${pct}%`, duration: 0.5, ease: 'power2.inOut' });
    }
  }, [currentStep, steps.length]);

  // Animate content slide on step change
  useLayoutEffect(() => {
    const dir = currentStep >= prevStepRef.current ? 1 : -1;
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { x: dir * 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
      );
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  const childArray = React.Children.toArray(children);

  return (
    <div ref={wrapperRef}>
      {/* Step indicator */}
      <div className="px-5 pt-5 pb-4">
        <div className="relative flex justify-between items-start">
          {/* Background track */}
          <div className="absolute left-3.5 right-3.5 top-3.5 h-0.5 bg-gray-200 dark:bg-gray-700" />
          {/* Animated progress fill */}
          <div
            ref={progressBarRef}
            className="absolute left-3.5 top-3.5 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600"
            style={{ width: '0%' }}
          />
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={() => done && onStepClick?.(i)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    done
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/30 cursor-pointer hover:bg-orange-600'
                      : active
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/30 ring-[3px] ring-orange-100 dark:ring-orange-900/40 cursor-default'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                  }`}
                >
                  {done ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                  ) : (
                    i + 1
                  )}
                </button>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    active
                      ? 'text-orange-500'
                      : done
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800" />

      {/* Animated content area */}
      <div ref={contentRef} className="p-4">
        {childArray[currentStep]}
      </div>
    </div>
  );
};

export default StepWizard;
