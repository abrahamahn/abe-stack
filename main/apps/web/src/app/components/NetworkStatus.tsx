// main/apps/web/src/app/components/NetworkStatus.tsx
import { toastStore } from '@bslt/react';
import { useEffect, useRef } from 'react';

const DEBOUNCE_MS = 2000;

/**
 * Monitors browser online/offline status and shows toast notifications.
 *
 * Debounces the offline event by 2 seconds to avoid flashing on brief
 * network blips. Shows a success toast when connectivity is restored.
 */
export function NetworkStatus(): null {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const { show } = toastStore.getState();

    const handleOffline = (): void => {
      timerRef.current = setTimeout(() => {
        wasOfflineRef.current = true;
        show({
          title: 'You are offline',
          description: 'Check your internet connection',
          tone: 'warning',
        });
      }, DEBOUNCE_MS);
    };

    const handleOnline = (): void => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        show({
          title: 'Back online',
          description: 'Your connection has been restored',
          tone: 'success',
        });
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return (): void => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return null;
}
