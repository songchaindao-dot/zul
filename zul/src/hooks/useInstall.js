import { useState, useEffect } from 'react';

export function useInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS] = useState(() =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  );
  const [isInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    if (outcome === 'accepted' && 'Notification' in window && Notification.permission === 'default') {
      // After the app installs, ask for notification permission automatically
      setTimeout(() => Notification.requestPermission(), 1500);
    }
    return outcome;
  };

  return { isInstallable, isIOS, isInstalled, install };
}
