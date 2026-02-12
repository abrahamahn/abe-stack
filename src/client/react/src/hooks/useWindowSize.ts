// src/client/react/src/hooks/useWindowSize.ts
import { useEffect, useState } from 'react';

const RESIZE_DEBOUNCE_MS = 150;

type WindowSize = {
  width: number;
  height: number;
};

/**
 * Track window dimensions with debounced updates.
 * SSR-safe, returns 0x0 on server.
 *
 * @returns Object with width and height properties
 */
export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>(() => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect((): (() => void) | undefined => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = (): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout((): void => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);
    return (): void => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
}
