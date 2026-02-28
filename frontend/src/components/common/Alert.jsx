import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

/**
 * Alert/Notification Component
 */
const Alert = ({
  type = 'info',
  title = null,
  message,
  onClose = null,
  className = '',
  icon: CustomIcon = null,
}) => {
  // Alert type configurations
  const types = {
    success: {
      container: 'bg-green-50 border-green-200 text-green-900',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-900',
      icon: XCircle,
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: Info,
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
    },
  };

  const config = types[type] || types.info;
  const Icon = CustomIcon || config.icon;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border
        ${config.container} ${className}
      `}
      role="alert"
    >
      {/* Icon */}
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold mb-1 ${config.titleColor}`}>{title}</h4>
        )}
        <p className="text-sm">{message}</p>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * Toast Notification Component (for temporary notifications)
 */
export const Toast = ({
  type = 'info',
  message,
  onClose,
  duration = 5000,
  position = 'top-right',
}) => {
  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      onClose();
    }, duration);
  }

  // Position classes
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`
        fixed z-50 max-w-md w-full
        animate-slide-in
        ${positions[position] || positions['top-right']}
      `}
    >
      <Alert type={type} message={message} onClose={onClose} />
    </div>
  );
};

/**
 * Banner Alert Component (full-width, typically at top of page)
 */
export const Banner = ({
  type = 'info',
  message,
  onClose = null,
  action = null,
}) => {
  const types = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-neutral-900',
    info: 'bg-blue-600 text-white',
  };

  const bgColor = types[type] || types.info;

  return (
    <div className={`${bgColor} px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm font-medium flex-1">{message}</p>
        <div className="flex items-center gap-3">
          {action && <div>{action}</div>}
          {onClose && (
            <button
              onClick={onClose}
              className="opacity-75 hover:opacity-100 transition-opacity"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline Alert Component (compact, for inline messages)
 */
export const InlineAlert = ({ type = 'info', message, className = '' }) => {
  const types = {
    success: 'text-green-700',
    error: 'text-red-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700',
  };

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const textColor = types[type] || types.info;
  const Icon = icons[type];

  return (
    <div className={`flex items-center gap-2 ${textColor} ${className}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

export default Alert;
