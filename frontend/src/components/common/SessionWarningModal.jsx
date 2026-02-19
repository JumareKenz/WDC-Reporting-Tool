import { Clock, LogOut, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * Session Warning Modal
 * Displayed when idle timeout is approaching.
 * Shows countdown and lets the user extend their session or log out.
 */
const SessionWarningModal = ({ isOpen, countdown, onContinue, onLogout }) => {
  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;

  // Colour changes as time runs out
  const urgentColor =
    countdown <= 60
      ? 'text-red-600'
      : countdown <= 120
      ? 'text-amber-600'
      : 'text-primary-600';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      aria-describedby="session-warning-desc"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-600" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h2
          id="session-warning-title"
          className="text-xl font-bold text-neutral-900 text-center mb-2"
        >
          Session Expiring Soon
        </h2>

        {/* Description */}
        <p
          id="session-warning-desc"
          className="text-sm text-neutral-600 text-center mb-6"
        >
          Your session will expire due to inactivity. Any unsaved work has been
          auto-saved as a draft.
        </p>

        {/* Countdown */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <span className={`text-5xl font-mono font-bold ${urgentColor}`}>
              {formattedTime}
            </span>
            <p className="text-xs text-neutral-500 mt-1">remaining</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-200 rounded-full h-1.5 mb-6 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-1000 ${
              countdown <= 60
                ? 'bg-red-500'
                : countdown <= 120
                ? 'bg-amber-500'
                : 'bg-primary-500'
            }`}
            style={{ width: `${Math.min((countdown / 300) * 100, 100)}%` }}
            role="progressbar"
            aria-valuenow={countdown}
            aria-valuemin={0}
            aria-valuemax={300}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={onContinue}
            className="w-full"
            aria-label="Continue session and stay logged in"
          >
            Stay Logged In
          </Button>
          <Button
            variant="ghost"
            icon={LogOut}
            onClick={onLogout}
            className="w-full text-neutral-500"
            aria-label="Log out now"
          >
            Log Out Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;
