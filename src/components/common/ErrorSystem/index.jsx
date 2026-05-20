/**
 * Error System - Comprehensive Error Handling
 *
 * Provides:
 * - Global error state management via ErrorContext
 * - Multiple error display modes (banner, toast, inline, summary)
 * - Field-level error association
 * - Accessibility support (ARIA, screen readers)
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

// ============================================================================
// Error Context
// ============================================================================

const ErrorContext = createContext(null);

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const addError = useCallback((error) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newError = {
      id,
      type: error.type || 'general',
      message: error.message,
      field: error.field || null,
      persistent: error.persistent || false,
      dismissible: error.dismissible !== false,
      action: error.action || null,
      details: error.details || null,
      timestamp: Date.now(),
    };

    setErrors((prev) => [...prev, newError]);

    if (error.field) {
      setFieldErrors((prev) => ({
        ...prev,
        [error.field]: newError,
      }));
    }

    return id;
  }, []);

  const removeError = useCallback((id) => {
    setErrors((prev) => {
      const error = prev.find((e) => e.id === id);
      if (error?.field) {
        setFieldErrors((prevFields) => {
          const { [error.field]: _, ...rest } = prevFields;
          return rest;
        });
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const clearFieldError = useCallback((field) => {
    setFieldErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }, []);

  const clearAll = useCallback(() => {
    setErrors([]);
    setFieldErrors({});
  }, []);

  return (
    <ErrorContext.Provider
      value={{
        errors,
        fieldErrors,
        addError,
        removeError,
        clearFieldError,
        clearAll,
      }}
    >
      {children}
      <ErrorDisplay errors={errors} onDismiss={removeError} />
    </ErrorContext.Provider>
  );
};

export const useErrors = () => {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useErrors must be used within ErrorProvider');
  return ctx;
};

// ============================================================================
// Error Display Components
// ============================================================================

const ErrorDisplay = ({ errors, onDismiss }) => {
  const persistent = errors.filter((e) => e.persistent);
  const toast = errors.filter((e) => !e.persistent);

  return (
    <>
      {/* Persistent banner for critical errors */}
      {persistent.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[10001]" role="alert" aria-live="assertive">
          {persistent.map((error) => (
            <PersistentBanner key={error.id} error={error} onDismiss={() => onDismiss(error.id)} />
          ))}
        </div>
      )}

      {/* Toast notifications */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-md px-4 space-y-2"
        aria-label="Notifications"
      >
        {toast.map((error) => (
          <ErrorToast key={error.id} error={error} onDismiss={() => onDismiss(error.id)} />
        ))}
      </div>
    </>
  );
};

const PersistentBanner = ({ error, onDismiss }) => (
  <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{error.message}</p>
      </div>
      <div className="flex items-center gap-3">
        {error.action && (
          <button onClick={error.action.onClick} className="text-sm font-medium underline hover:no-underline">
            {error.action.label}
          </button>
        )}
        {error.dismissible && (
          <button onClick={onDismiss} className="opacity-75 hover:opacity-100" aria-label="Dismiss error">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  </div>
);

const ErrorToast = ({ error, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss with visual countdown
  useEffect(() => {
    const duration = 8000; // 8 seconds
    const interval = 100;
    const steps = duration / interval;
    let current = steps;

    const timer = setInterval(() => {
      current--;
      setProgress((current / steps) * 100);
      if (current <= 0) {
        clearInterval(timer);
        onDismiss();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onDismiss]);

  return (
    <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-xl overflow-hidden" role="alert">
      <div className="p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{error.message}</p>
          {error.details && expanded && <p className="text-sm text-gray-600 mt-1">{error.details}</p>}
        </div>
        <div className="flex items-center gap-2">
          {error.details && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600"
              aria-label={expanded ? 'Show less' : 'Show more'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-red-500 transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

// ============================================================================
// Inline Field Error
// ============================================================================

export const FieldError = ({ field, className = '' }) => {
  const { fieldErrors, clearFieldError } = useErrors();
  const error = fieldErrors[field];

  if (!error) return null;

  return (
    <div className={`mt-1 flex items-center gap-1 text-sm text-red-600 ${className}`} role="alert" id={`${field}-error`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{error.message}</span>
    </div>
  );
};

// ============================================================================
// Error Summary Component
// ============================================================================

export const ErrorSummary = ({ errors, onFieldClick }) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div
      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
      role="alert"
      aria-live="polite"
      tabIndex={-1}
    >
      <h3 className="text-red-800 font-medium mb-2 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        There {errors.length === 1 ? 'is' : 'are'} {errors.length} error{errors.length === 1 ? '' : 's'} to fix
      </h3>
      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
        {errors.map((error, idx) => (
          <li key={idx}>
            {onFieldClick && error.field ? (
              <button onClick={() => onFieldClick(error.field)} className="underline hover:no-underline text-left">
                {error.message}
              </button>
            ) : (
              error.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ErrorProvider;
