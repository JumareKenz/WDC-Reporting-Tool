import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Send, Check } from 'lucide-react';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

/**
 * Multi-step wizard form container with animated step transitions.
 *
 * Props:
 *   sections              - Array<{ id, title, icon?, description?, validate?, component }>
 *   formData              - Current form state object
 *   onChange              - (updater) => void   — accepts object-merge or functional updater
 *   onSubmit              - () => void
 *   onSaveDraft           - () => void
 *   draftStatus           - 'idle' | 'saving' | 'saved' | 'error'
 *   initialStep           - number (0-based, default 0)
 *   submitDisabled        - boolean — disables submit button on last step
 *   submitDisabledMessage - string — message shown when submit is disabled
 */
const FormWizard = ({
  sections = [],
  formData,
  onChange,
  onSubmit,
  onSaveDraft,
  draftStatus = 'idle',
  initialStep = 0,
  submitDisabled = false,
  submitDisabledMessage = '',
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0); // -1 = back, 1 = forward
  const [visitedSteps, setVisitedSteps] = useState(() => {
    const s = new Set();
    s.add(initialStep);
    return s;
  });
  const [errors, setErrors] = useState({});
  const [shakeError, setShakeError] = useState(false);

  // Clamp currentStep when sections.length changes (e.g., conditional sections)
  useEffect(() => {
    if (currentStep >= sections.length && sections.length > 0) {
      setCurrentStep(sections.length - 1);
    }
  }, [sections.length, currentStep]);

  const totalSteps = sections.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100;

  // Validate current step and return true if valid
  const validateCurrentStep = useCallback(() => {
    const section = sections[currentStep];
    if (!section?.validate) return true;
    const stepErrors = section.validate(formData);
    if (stepErrors && Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
      return false;
    }
    setErrors({});
    return true;
  }, [currentStep, sections, formData]);

  // Navigate to next step
  const goNext = useCallback(() => {
    if (isLastStep) {
      if (validateCurrentStep()) {
        onSubmit?.();
      }
      return;
    }
    if (!validateCurrentStep()) return;
    setDirection(1);
    setCurrentStep((s) => {
      const next = s + 1;
      setVisitedSteps((prev) => new Set(prev).add(next));
      return next;
    });
    setErrors({});
  }, [isLastStep, validateCurrentStep, onSubmit]);

  // Navigate to previous step
  const goBack = useCallback(() => {
    if (isFirstStep) return;
    setDirection(-1);
    setCurrentStep((s) => s - 1);
    setErrors({});
  }, [isFirstStep]);

  // Jump to a specific step (only visited ones)
  const goToStep = useCallback(
    (idx) => {
      if (idx === currentStep) return;
      if (idx < currentStep || visitedSteps.has(idx)) {
        setDirection(idx > currentStep ? 1 : -1);
        setCurrentStep(idx);
        setErrors({});
      }
    },
    [currentStep, visitedSteps]
  );

  // Keyboard support (desktop)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't hijack when user is typing in an input / textarea / select
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goBack]);

  // Swipe support (mobile)
  const { onTouchStart, onTouchEnd } = useSwipeNavigation({
    onSwipeLeft: goNext,
    onSwipeRight: goBack,
  });

  // Slide animation variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir >= 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      x: dir >= 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const CurrentSection = sections[currentStep]?.component;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* ── Progress Bar ─────────────────────────────────── */}
      <div className="mb-6">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-medium text-gray-500">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-xs font-semibold text-green-600">
            {Math.round(progress)}% complete
          </span>
        </div>
      </div>

      {/* ── Step Indicators ──────────────────────────────── */}
      <div className="mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex items-center justify-between min-w-0 gap-0">
          {sections.map((section, idx) => {
            const isCurrent = idx === currentStep;
            const isVisited = visitedSteps.has(idx) && idx !== currentStep;
            const isUpcoming = !isCurrent && !isVisited;
            const Icon = section.icon;

            return (
              <React.Fragment key={section.id}>
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300 ${
                      visitedSteps.has(idx) ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}

                {/* Step circle + title */}
                <button
                  type="button"
                  onClick={() => goToStep(idx)}
                  className={`flex flex-col items-center gap-1.5 flex-shrink-0 transition-all duration-300 ${
                    isCurrent || isVisited
                      ? 'cursor-pointer'
                      : 'cursor-default opacity-60'
                  }`}
                  disabled={isUpcoming}
                  aria-label={`Step ${idx + 1}: ${section.title}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div className="relative">
                    {/* Pulsing ring for current */}
                    {isCurrent && (
                      <motion.div
                        className="absolute -inset-1.5 rounded-full border-2 border-green-400"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.3, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}

                    <div
                      className={`relative z-10 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm font-bold transition-all duration-300 ${
                        isCurrent
                          ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                          : isVisited
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                      }`}
                    >
                      {isVisited ? (
                        <Check className="w-4 h-4" strokeWidth={3} />
                      ) : Icon ? (
                        <Icon className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  </div>

                  {/* Title — hidden on mobile */}
                  <span
                    className={`hidden sm:block text-[10px] leading-tight text-center max-w-[80px] font-medium transition-colors duration-300 ${
                      isCurrent
                        ? 'text-green-700'
                        : isVisited
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {section.title}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Section Header ───────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          {sections[currentStep]?.title}
        </h2>
        {sections[currentStep]?.description && (
          <p className="text-sm text-gray-500 mt-0.5">
            {sections[currentStep].description}
          </p>
        )}
      </div>

      {/* ── Content Area (animated) ──────────────────────── */}
      <div
        className="relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <motion.div
          className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 ${
            shakeError ? 'animate-shake' : ''
          }`}
          key={currentStep}
          style={{ minHeight: 200 }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {CurrentSection && (
                <CurrentSection
                  formData={formData}
                  onChange={onChange}
                  errors={errors}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Navigation Buttons ───────────────────────────── */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {/* Back */}
        <button
          type="button"
          onClick={goBack}
          disabled={isFirstStep}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[48px] ${
            isFirstStep
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:scale-[0.97]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Save Draft */}
        <button
          type="button"
          onClick={onSaveDraft}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-green-700 hover:bg-green-50 transition-all duration-200 min-h-[48px] active:scale-[0.97]"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">
            {draftStatus === 'saving'
              ? 'Saving...'
              : draftStatus === 'saved'
              ? 'Saved'
              : 'Save Draft'}
          </span>
        </button>

        {/* Next / Submit */}
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={goNext}
            disabled={isLastStep && submitDisabled}
            title={isLastStep && submitDisabled ? submitDisabledMessage : ''}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 min-h-[48px] shadow-lg active:scale-[0.97] ${
              isLastStep && submitDisabled
                ? 'bg-gray-400 cursor-not-allowed shadow-none'
                : isLastStep
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-600/30'
                : 'bg-green-600 hover:bg-green-700 shadow-green-600/25'
            }`}
          >
            {isLastStep ? (
              <>
                <Send className="w-4 h-4" />
                Submit Report
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          {isLastStep && submitDisabled && submitDisabledMessage && (
            <p className="text-xs text-amber-600 max-w-[200px] text-right">
              {submitDisabledMessage}
            </p>
          )}
        </div>
      </div>

      {/* Shake animation keyframe (injected via style tag once) */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
};

export default FormWizard;
