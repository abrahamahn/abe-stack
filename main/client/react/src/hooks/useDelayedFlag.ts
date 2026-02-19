// main/client/react/src/hooks/useDelayedFlag.ts
import { useEffect, useState } from 'react';

const DEFAULT_DELAY_MS = 150;

/**
 * Delay turning a boolean "on" to avoid flash-of-loading for fast transitions.
 * When active becomes false, the flag resets immediately.
 *
 * @example
 * ```tsx
 * const showSpinner = useDelayedFlag(isLoading, 150);
 * // showSpinner only becomes true after 150ms of isLoading=true
 * ```
 */
export function useDelayedFlag(active: boolean, delayMs = DEFAULT_DELAY_MS): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!active) {
      // Reset immediately when deactivated — synchronous so callers observe
      // the change on the same render cycle without needing to advance timers.
      setDelayed(false);
      return undefined;
    }

    const timeout = setTimeout(() => {
      setDelayed(true);
    }, delayMs);

    return (): void => {
      clearTimeout(timeout);
    };
  }, [active, delayMs]);

  return delayed;
}
