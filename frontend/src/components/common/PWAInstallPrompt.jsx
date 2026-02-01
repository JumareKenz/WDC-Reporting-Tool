import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  }, [installPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in">
      <div className="m-3 max-w-md mx-auto bg-white rounded-xl shadow-xl border border-neutral-200 p-4">
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon-192.png"
            alt="WDC"
            className="w-14 h-14 rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-900 text-sm">
              Add to Home Screen
            </p>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              Install Kaduna WDC Reporting for faster access and offline capability.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download size={14} />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-neutral-500 text-sm font-medium rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
