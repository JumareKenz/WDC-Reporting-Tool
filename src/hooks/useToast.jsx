import { createContext, useContext, useCallback, useRef, useState } from 'react';

/**
 * Toast Context + Provider
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success('Report submitted!');
 *   toast.error('Upload failed. Please retry.');
 *   toast.warning('Connection lost – saving draft.');
 *   toast.info('Syncing 3 queued submissions…');
 */

const ToastContext = createContext(null);

let _externalToast = null;

/**
 * Emit a toast from outside React (e.g. axios interceptor).
 * Only works after the ToastProvider has mounted.
 */
export const emitToast = (variant, message, opts) => {
  if (_externalToast) _externalToast(variant, message, opts);
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const add = useCallback((variant, message, { duration = 5000, title } = {}) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, variant, message, title }]);

    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, opts) => add('success', msg, opts),
    error: (msg, opts) => add('error', msg, { duration: 8000, ...opts }),
    warning: (msg, opts) => add('warning', msg, opts),
    info: (msg, opts) => add('info', msg, opts),
  };

  // Expose for use outside React tree
  _externalToast = add;

  return (
    <ToastContext.Provider value={{ toast, toasts, remove }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default useToast;
