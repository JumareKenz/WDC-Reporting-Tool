/**
 * useFormActivity - Track form editing activity for smart session management
 *
 * Notifies the session manager when users are actively editing forms,
 * which extends the session timeout to prevent premature logouts.
 *
 * @param {boolean} isActive - Whether the form is currently being edited
 */

import React, { useEffect, useCallback } from 'react';

export const useFormActivity = (isActive) => {
  const notifyActivity = useCallback((active) => {
    window.dispatchEvent(
      new CustomEvent('wdc:form-activity', {
        detail: { isEditing: active },
      })
    );
  }, []);

  useEffect(() => {
    notifyActivity(isActive);

    return () => {
      if (isActive) {
        notifyActivity(false);
      }
    };
  }, [isActive, notifyActivity]);

  // Also notify on visibility change (user switching tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        notifyActivity(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, notifyActivity]);

  return { notifyActivity };
};

/**
 * HOC to add form activity tracking to any component
 */
export const withFormActivity = (Component) => {
  return (props) => {
    useFormActivity(true);
    return <Component {...props} />;
  };
};

export default useFormActivity;
