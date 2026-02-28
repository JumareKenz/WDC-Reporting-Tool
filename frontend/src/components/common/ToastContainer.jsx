import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

/**
 * Individual Toast Item
 */
const Toast = ({ id, variant, message, title, actions, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  const isError = variant === 'error';

  const styles = {
    success: {
      border: 'border-l-green-500',
      icon: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
      title: 'text-gray-900',
      message: 'text-gray-700',
      dismiss: 'text-gray-400 hover:text-gray-600',
    },
    error: {
      border: 'border-l-red-500',
      icon: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
      title: 'text-gray-900',
      message: 'text-gray-700',
      dismiss: 'text-red-400 hover:text-red-600',
    },
    warning: {
      border: 'border-l-amber-500',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      title: 'text-gray-900',
      message: 'text-gray-700',
      dismiss: 'text-gray-400 hover:text-gray-600',
    },
    info: {
      border: 'border-l-blue-500',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
      title: 'text-gray-900',
      message: 'text-gray-700',
      dismiss: 'text-gray-400 hover:text-gray-600',
    },
  };

  const s = styles[variant] || styles.info;

  return (
    <div
      role="alert"
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`
        group flex items-start gap-3 p-4 bg-white border border-gray-200 border-l-4
        ${s.border} rounded-r-lg shadow-lg
        min-w-[320px] max-w-[420px]
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
        max-sm:min-w-0 max-sm:max-w-none max-sm:w-full
      `}
    >
      {s.icon}
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold mb-0.5 ${s.title}`}>{title}</p>}
        <p className={`text-sm ${s.message} break-words`}>{message}</p>
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  action.onClick?.();
                  handleDismiss();
                }}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className={`
          flex-shrink-0 transition-colors p-0.5 rounded
          ${s.dismiss}
          ${isError ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400
        `}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Toast Container
 * Fixed to top-right on desktop, full-width top on mobile.
 * Renders up to 5 toasts at a time.
 */
const ToastContainer = () => {
  const { toasts, remove } = useToast();

  const visible = toasts.slice(-5);

  return (
    <div
      className="fixed top-4 right-4 z-[10000] flex flex-col gap-3 pointer-events-none max-sm:left-4 max-sm:right-4"
      aria-label="Notifications"
    >
      {visible.map((t) => (
        <div key={t.id} className="pointer-events-auto max-sm:w-full">
          <Toast
            id={t.id}
            variant={t.variant}
            message={t.message}
            title={t.title}
            actions={t.actions}
            onDismiss={remove}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
