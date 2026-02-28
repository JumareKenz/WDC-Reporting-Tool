import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

/**
 * Accessible Form Field Wrapper
 * 
 * Features:
 * - Automatic ID generation for aria-describedby
 * - Error state styling and announcements
 * - Success state indicator
 * - Required field indicator
 * - Help text support
 */

const FormField = ({ 
  children,
  name,
  label,
  error,
  helpText,
  required = false,
  showSuccess = false,
  className = '' 
}) => {
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
        )}
        {required && (
          <span className="sr-only"> (required)</span>
        )}
      </label>

      <div className="relative">
        {children && React.cloneElement(children, {
          id: name,
          name,
          'aria-invalid': !!error,
          'aria-describedby': describedBy,
          'aria-required': required,
          className: `
            w-full px-3 py-2 rounded-lg border text-sm
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-100 disabled:text-gray-500
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30' 
              : showSuccess
                ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                : 'border-gray-300 focus:border-green-500 focus:ring-green-200'}
            ${children.props.className || ''}
          `
        })}

        {/* Success indicator */}
        {showSuccess && !error && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" aria-hidden="true" />
        )}
      </div>

      {/* Help text */}
      {helpText && (
        <p id={helpId} className="text-xs text-gray-500">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p 
          id={errorId}
          role="alert"
          className="text-sm text-red-600 flex items-center gap-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

// Form section for grouping related fields
export const FormSection = ({ title, description, children, className = '' }) => (
  <fieldset className={`border-0 p-0 m-0 ${className}`}>
    {(title || description) && (
      <legend className="w-full mb-4">
        {title && (
          <h3 className="text-base font-semibold text-gray-900">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">
            {description}
          </p>
        )}
      </legend>
    )}
    <div className="space-y-4">
      {children}
    </div>
  </fieldset>
);

export default FormField;
