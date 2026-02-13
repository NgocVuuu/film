'use client';

import { useEffect, useState } from 'react';

export function usePWA() {
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [displayMode, setDisplayMode] = useState<'browser' | 'standalone' | 'minimal-ui' | 'fullscreen'>('browser');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check display mode
    const checkDisplayMode = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setDisplayMode('standalone');
        setIsStandalone(true);
      } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
        setDisplayMode('fullscreen');
        setIsStandalone(true);
      } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        setDisplayMode('minimal-ui');
        setIsStandalone(false);
      } else {
        setDisplayMode('browser');
        setIsStandalone(false);
      }

      // iOS Safari check
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window.navigator as any).standalone === true) {
        setIsStandalone(true);
        setDisplayMode('standalone');
      }
    };

    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    checkDisplayMode();
    updateOnlineStatus();

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addEventListener('change', checkDisplayMode);

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      standaloneQuery.removeEventListener('change', checkDisplayMode);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return {
    isOnline,
    isStandalone,
    displayMode,
    isPWA: isStandalone,
  };
}
