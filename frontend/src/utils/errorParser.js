/**
 * Parse API errors into a structured format for display
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
};

const HUMANIZED_MESSAGES = {
  'value_error.missing': 'This field is required',
  'value_error.any_str.min_length': 'Input is too short',
  'value_error.any_str.max_length': 'Input is too long',
  'type_error.integer': 'Please enter a valid number',
  'type_error.float': 'Please enter a valid decimal number',
  'value_error.date': 'Please enter a valid date',
  'value_error.datetime': 'Please enter a valid date and time',
  'value_error.email': 'Please enter a valid email address',
  'value_error.number.not_ge': 'Value must be greater than or equal to {limit}',
  'value_error.number.not_gt': 'Value must be greater than {limit}',
  'value_error.number.not_le': 'Value must be less than or equal to {limit}',
  'value_error.number.not_lt': 'Value must be less than {limit}',
};

/**
 * Humanize a validation message
 */
function humanizeValidationMessage(msg, type, ctx = {}) {
  let message = HUMANIZED_MESSAGES[type] || msg;
  
  // Replace placeholders
  Object.entries(ctx).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, value);
  });
  
  return message;
}

/**
 * Get human-readable field label
 */
export function getFieldLabel(fieldName) {
  return FIELD_LABELS[fieldName] || fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Parse API error response into structured format
 */
export function parseApiError(error) {
  // Network error - no response received
  if (!error.response && error.request) {
    return {
      type: 'network',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      fieldErrors: {},
      isRetryable: true,
      actions: [
        { 
          label: 'Retry', 
          onClick: () => window.location.reload(),
          variant: 'primary'
        }
      ]
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // Pydantic validation errors (422)
  if (status === 422 && Array.isArray(data?.detail)) {
    const fieldErrors = {};
    const errorList = [];

    data.detail.forEach(err => {
      const fieldPath = err.loc?.slice(1).join('.') || 'unknown';
      const ctx = err.ctx || {};
      const humanMessage = humanizeValidationMessage(err.msg, err.type, ctx);
      
      fieldErrors[fieldPath] = humanMessage;
      errorList.push({
        field: fieldPath,
        message: humanMessage,
        raw: err
      });
    });

    return {
      type: 'validation',
      title: 'Validation Error',
      message: `Please correct ${errorList.length} field${errorList.length > 1 ? 's' : ''} before submitting.`,
      fieldErrors,
      errorList,
      isRetryable: false,
      actions: []
    };
  }

  // Conflict errors (409)
  if (status === 409) {
    return {
      type: 'conflict',
      title: 'Conflict',
      message: data?.detail?.message || 'This action conflicts with existing data.',
      fieldErrors: {},
      isRetryable: false,
      actions: data?.detail?.existing_report_id ? [
        { 
          label: 'View Existing', 
          onClick: () => {
            window.location.href = `/reports/${data.detail.existing_report_id}`;
          },
          variant: 'primary'
        }
      ] : []
    };
  }

  // Authentication errors (401)
  if (status === 401) {
    return {
      type: 'auth',
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      fieldErrors: {},
      isRetryable: false,
      actions: [
        { 
          label: 'Log In', 
          onClick: () => {
            localStorage.clear();
            window.location.href = '/login';
          },
          variant: 'primary'
        }
      ]
    };
  }

  // Forbidden (403)
  if (status === 403) {
    return {
      type: 'forbidden',
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      fieldErrors: {},
      isRetryable: false,
      actions: []
    };
  }

  // Not found (404)
  if (status === 404) {
    return {
      type: 'not_found',
      title: 'Not Found',
      message: data?.message || 'The requested resource was not found.',
      fieldErrors: {},
      isRetryable: false,
      actions: []
    };
  }

  // Rate limit (429)
  if (status === 429) {
    return {
      type: 'rate_limit',
      title: 'Too Many Requests',
      message: 'Please wait a moment before trying again.',
      fieldErrors: {},
      isRetryable: true,
      actions: [
        {
          label: 'Retry',
          onClick: () => window.location.reload(),
          variant: 'primary'
        }
      ]
    };
  }

  // Server errors (500+)
  if (status >= 500) {
    return {
      type: 'server',
      title: 'Server Error',
      message: 'An unexpected error occurred. Our team has been notified.',
      fieldErrors: {},
      isRetryable: true,
      actions: [
        { 
          label: 'Try Again', 
          onClick: () => window.location.reload()
        },
        {
          label: 'Contact Support',
          onClick: () => window.open('mailto:support@kadwdc.gov.ng')
        }
      ]
    };
  }

  // Default fallback
  return {
    type: 'unknown',
    title: 'Error',
    message: error.message || 'An unexpected error occurred.',
    fieldErrors: {},
    isRetryable: false,
    actions: []
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error) {
  const parsed = parseApiError(error);
  return parsed.isRetryable;
}

/**
 * Extract field errors from validation error
 */
export function extractFieldErrors(error) {
  const parsed = parseApiError(error);
  return parsed.fieldErrors || {};
}
