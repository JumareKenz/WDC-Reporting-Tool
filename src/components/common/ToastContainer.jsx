import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

/**
 * Individual Toast Item
 */
const Toast = ({ id, variant, message, title, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay to allow CSS transition on mount
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  const styles = {
    success: {
      container: 'border-green-200 bg-green-50',
      icon: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
      title: 'text-green-900',
      message: 'text-green-800',
      dismiss: 'text-green-500 hover:text-green-700',
    },
    error: {
      container: 'border-red-200 bg-red-50',
      icon: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
      title: 'text-red-900',
      message: 'text-red-800',
      dismiss: 'text-red-500 hover:text-red-700',
    },
    warning: {
      container: 'border-amber-200 bg-amber-50',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      title: 'text-amber-900',
      message: 'text-amber-800',
      dismiss: 'text-amber-500 hover:text-amber-700',
    },
    info: {
      container: 'border-blue-200 bg-blue-50',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
      title: 'text-blue-900',
      message: 'text-blue-800',
      dismiss: 'text-blue-500 hover:text-blue-700',
    },
  };

  const s = styles[variant] || styles.info;

  return (
    <div
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg w-full
        transition-all duration-300 ease-out
        ${s.container}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {s.icon}
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold mb-0.5 ${s.title}`}>{title}</p>}
        <p className={`text-sm ${s.message} break-words`}>{message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 transition-colors ${s.dismiss}`}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Toast Container
 * Fixed to top-right on desktop, top-center on mobile.
 * Renders up to 5 toasts at a time.
 */
const ToastContainer = () => {
  const { toasts, remove } = useToast();

  // Show at most 5 toasts at once (oldest first)
  const visible = toasts.slice(-5);

  return (
    <div
      className="fixed top-4 right-4 z-[10000] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
      aria-label="Notifications"
    >
      {visible.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast
            id={t.id}
            variant={t.variant}
            message={t.message}
            title={t.title}
            onDismiss={remove}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
