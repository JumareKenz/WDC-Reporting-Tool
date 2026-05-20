/**
 * FormWizard — KoboCollect-Style Multi-Step Form
 *
 * Features:
 * - One-question-per-screen or grouped field-list style
 * - Bottom-fixed navigation bar with large touch targets
 * - Progress indicator with step count
 * - Per-step validation with inline errors
 * - Auto-save draft every 30 seconds + on step change
 * - Review & Submit final step
 * - Smooth slide animations between steps
 * - Required/optional field indicators
 * - Accessibility support (ARIA, keyboard navigation)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Save, AlertCircle, Eye } from 'lucide-react';
import Button from '../Button';
import { ErrorSummary, FieldError, useErrors } from '../ErrorSystem';
import { useFormActivity } from '../../../hooks/useFormActivity';
import './FormWizard.css';

const FormWizard = ({
  steps,
  initialData = {},
  onSubmit,
  onSaveDraft,
  validateStep,
  validateAll,
  allowSkip = false,
  showProgress = true,
  autoSaveInterval = 30000, // 30 seconds
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData);
  const [visited, setVisited] = useState(new Set([0]));
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [direction, setDirection] = useState('next');
  const [showReview, setShowReview] = useState(false);
  
  const autoSaveTimerRef = useRef(null);
  const containerRef = useRef(null);
  
  const { addError, clearFieldError, clearAll: clearAllErrors } = useErrors();

  // Notify session manager that user is editing
  useFormActivity(true);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Filter visible steps based on conditions
  const visibleSteps = steps.filter((step) => !step.condition || step.condition(formData));
  const currentVisibleIndex = visibleSteps.findIndex((s) => s.id === currentStepData?.id);
  const totalVisibleSteps = visibleSteps.length;

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    if (!onSaveDraft || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSaveDraft(formData);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSaveDraft, isSaving]);

  // Setup auto-save timer
  useEffect(() => {
    if (autoSaveInterval > 0) {
      autoSaveTimerRef.current = setInterval(saveDraft, autoSaveInterval);
      return () => clearInterval(autoSaveTimerRef.current);
    }
  }, [saveDraft, autoSaveInterval]);

  // Save on step change
  useEffect(() => {
    saveDraft();
  }, [currentStep, saveDraft]);

  // Validate current step
  const validateCurrentStep = useCallback(() => {
    clearAllErrors();
    
    if (!validateStep) return true;
    
    const stepErrors = validateStep(currentStep, formData);
    if (stepErrors && stepErrors.length > 0) {
      setErrors(stepErrors);
      stepErrors.forEach((err) => {
        if (err.field) {
          addError({ ...err, type: 'validation' });
        }
      });
      return false;
    }
    
    setErrors([]);
    return true;
  }, [currentStep, formData, validateStep, clearAllErrors, addError]);

  // Handle next step
  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) {
      // Scroll to first error
      const firstError = document.querySelector('[aria-invalid="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (isLastStep) {
      // Show review modal before final submit
      setShowReview(true);
      return;
    }

    setDirection('next');
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, steps.length - 1);
      setVisited((v) => new Set([...v, next]));
      return next;
    });
  }, [isLastStep, validateCurrentStep, steps.length]);

  // Handle previous step
  const handleBack = useCallback(() => {
    if (isFirstStep) return;
    
    setDirection('back');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, [isFirstStep]);

  // Handle final submit
  const handleSubmit = async () => {
    // Validate all steps
    if (validateAll) {
      const allErrors = validateAll(formData);
      if (allErrors && allErrors.length > 0) {
        setErrors(allErrors);
        setShowReview(false);
        // Go to first step with errors
        const firstErrorStep = allErrors.find((e) => e.step !== undefined)?.step || 0;
        setCurrentStep(firstErrorStep);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors([{ message: error.message }]);
    } finally {
      setIsSubmitting(false);
      setShowReview(false);
    }
  };

  // Update form data
  const updateFormData = useCallback((updater) => {
    setFormData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...next };
    });
    // Clear errors for updated fields
    if (typeof updater === 'object') {
      Object.keys(updater).forEach((key) => clearFieldError(key));
    }
  }, [clearFieldError]);

  // Go to specific step
  const goToStep = (index) => {
    if (index === currentStep) return;
    if (!visited.has(index) && !allowSkip) return;
    
    if (index > currentStep && !validateCurrentStep()) {
      return;
    }
    
    setDirection(index > currentStep ? 'next' : 'back');
    setCurrentStep(index);
    setVisited((v) => new Set([...v, index]));
  };

  // Handle field change with error clearing
  const handleFieldChange = useCallback((fieldName, value) => {
    updateFormData({ [fieldName]: value });
    clearFieldError(fieldName);
  }, [updateFormData, clearFieldError]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && e.metaKey) {
        // Cmd/Ctrl + Enter to proceed
        handleNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext]);

  if (showReview) {
    return (
      <ReviewModal
        formData={formData}
        steps={steps}
        errors={errors}
        onConfirm={handleSubmit}
        onCancel={() => setShowReview(false)}
        onEdit={(stepIndex) => {
          setShowReview(false);
          goToStep(stepIndex);
        }}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <div className={`form-wizard ${className}`} ref={containerRef}>
      {/* Progress Header */}
      {showProgress && (
        <div className="form-wizard-progress">
          <div className="form-wizard-progress-header">
            <span className="form-wizard-step-count">
              Step {currentVisibleIndex + 1} of {totalVisibleSteps}
            </span>
            <span className="form-wizard-progress-percent">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="form-wizard-progress-bar">
            <div 
              className="form-wizard-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="form-wizard-content">
        <div 
          className={`form-wizard-step form-wizard-step-${direction}`}
          key={currentStep}
        >
          {/* Step Header */}
          <div className="form-wizard-step-header">
            <h2 className="form-wizard-step-title">{currentStepData?.title}</h2>
            {currentStepData?.description && (
              <p className="form-wizard-step-description">
                {currentStepData.description}
              </p>
            )}
          </div>

          {/* Error Summary */}
          {errors.length > 0 && (
            <ErrorSummary 
              errors={errors}
              onFieldClick={(field) => {
                document.querySelector(`[name="${field}"]`)?.focus();
              }}
            />
          )}

          {/* Step Component */}
          <div className="form-wizard-step-fields">
            {currentStepData?.component({
              formData,
              updateFormData: handleFieldChange,
              errors,
              isActive: true,
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="form-wizard-navigation">
        <div className="form-wizard-nav-content">
          {/* Back Button */}
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className={`form-wizard-nav-btn form-wizard-nav-back ${isFirstStep ? 'disabled' : ''}`}
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
            <span>Back</span>
          </button>

          {/* Save Status */}
          {onSaveDraft && (
            <div className="form-wizard-save-status">
              <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
              <span>
                {isSaving ? 'Saving...' : lastSaved ? `Saved ${formatTime(lastSaved)}` : 'Draft'}
              </span>
            </div>
          )}

          {/* Next/Submit Button */}
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="form-wizard-nav-btn form-wizard-nav-next"
            aria-label={isLastStep ? 'Review and submit' : 'Continue'}
          >
            <span>{isLastStep ? 'Review' : 'Next'}</span>
            {isLastStep ? (
              <Eye className="w-6 h-6" />
            ) : (
              <ChevronRight className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Review Modal — Final review before submission
 */
const ReviewModal = ({ formData, steps, errors, onConfirm, onCancel, onEdit, isSubmitting }) => {
  return (
    <div className="form-wizard-review-modal">
      <div className="form-wizard-review-overlay" onClick={onCancel} />
      <div className="form-wizard-review-content">
        <div className="form-wizard-review-header">
          <h2 className="form-wizard-review-title">Review Your Submission</h2>
          <p className="form-wizard-review-subtitle">
            Please review your answers before submitting. Click any section to edit.
          </p>
        </div>

        <div className="form-wizard-review-body">
          {steps.map((step, index) => {
            const stepData = formData[step.id] || {};
            const hasErrors = errors.some((e) => e.step === index);
            
            return (
              <div 
                key={step.id}
                className={`form-wizard-review-section ${hasErrors ? 'has-errors' : ''}`}
              >
                <button 
                  className="form-wizard-review-section-header"
                  onClick={() => onEdit(index)}
                >
                  <div className="form-wizard-review-section-title">
                    <span className="form-wizard-review-step-number">{index + 1}</span>
                    <span>{step.title}</span>
                    {hasErrors && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                
                <div className="form-wizard-review-section-summary">
                  {step.reviewComponent ? (
                    step.reviewComponent(stepData)
                  ) : (
                    <p className="text-gray-500 text-sm">
                      {Object.keys(stepData).length} fields completed
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {errors.length > 0 && (
          <div className="form-wizard-review-errors">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>Please fix {errors.length} error(s) before submitting</span>
          </div>
        )}

        <div className="form-wizard-review-actions">
          <Button variant="ghost" onClick={onCancel}>
            Continue Editing
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isSubmitting}
            disabled={errors.length > 0}
            icon={Check}
          >
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  );
};

// Utility: Format time ago
const formatTime = (date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

// Field wrapper with label and error
export const WizardField = ({ 
  label, 
  required, 
  helpText, 
  children, 
  error,
  className = '' 
}) => (
  <div className={`wizard-field ${className}`}>
    <label className="wizard-field-label">
      {label}
      {required && <span className="wizard-field-required" aria-label="required"> *</span>}
    </label>
    {helpText && <p className="wizard-field-help">{helpText}</p>}
    <div className="wizard-field-input">
      {children}
    </div>
    {error && <FieldError field={error} />}
  </div>
);

export default FormWizard;
