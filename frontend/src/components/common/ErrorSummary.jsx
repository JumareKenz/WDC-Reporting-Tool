import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

/**
 * Error Summary Banner
 * 
 * Displays a summary of all form errors with clickable links
 * to navigate to each error field.
 */

const FIELD_LABELS = {
  report_date: 'Report Date',
  meeting_type: 'Meeting Type',
  attendance_total: 'Total Attendance',
  attendance_male: 'Male Attendees',
  attendance_female: 'Female Attendees',
  health_opd_total: 'OPD Attendance',
  health_immunization_total: 'Immunization Count',
  health_anc_total: 'ANC Registrations',
  health_deliveries_total: 'Deliveries',
  health_fp_total: 'Family Planning',
  health_hepb_tested: 'HEP B Tested',
  health_hepb_positive: 'HEP B Positive',
  meeting_location: 'Meeting Location',
  agenda_items: 'Agenda Items',
  action_tracker: 'Action Tracker',
  challenges: 'Challenges',
  // Add more as needed
};

const ErrorSummary = ({ errors, onFocusField, onDismiss, className = '' }) => {
  const errorEntries = Object.entries(errors).filter(([_, msg]) => msg);
  
  if (errorEntries.length === 0) return null;

  const scrollToField = (fieldName) => {
    const element = document.getElementById(fieldName);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
      // Add highlight effect
      element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
      }, 2000);
      onFocusField?.(fieldName);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        role="alert"
        aria-live="assertive"
        className={`
          bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 mb-6
          ${className}
        `}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-semibold text-red-800">
                Please fix {errorEntries.length} error{errorEntries.length > 1 ? 's' : ''}
              </h3>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors"
                  aria-label="Dismiss error summary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <ul className="mt-2 space-y-1.5">
              {errorEntries.map(([field, message]) => (
                <li key={field} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToField(field)}
                    className="text-sm text-red-700 hover:text-red-900 underline underline-offset-2 flex items-center gap-1.5 transition-colors"
                  >
                    {FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="text-sm text-red-600">— {message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorSummary;
