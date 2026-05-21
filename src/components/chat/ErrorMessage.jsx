/**
 * ErrorMessage Component
 * Displays error messages with retry functionality
 */
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * ErrorMessage Component
 */
const ErrorMessage = ({ 
  error, 
  onRetry = null,
  className = '' 
}) => {
  // Extract error message
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || 'An unexpected error occurred';

  // Friendly error messages for common errors
  const getFriendlyMessage = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    if (lowerMessage.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
      return 'Your session has expired. Please log in again.';
    }
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
      return 'You don\'t have permission to perform this action.';
    }
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return 'The requested data could not be found.';
    }
    
    return message;
  };

  const friendlyMessage = getFriendlyMessage(errorMessage);

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-800">
            Something went wrong
          </h4>
          <p className="text-sm text-red-700 mt-1">
            {friendlyMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
