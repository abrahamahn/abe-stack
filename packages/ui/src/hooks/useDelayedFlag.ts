// packages/ui/src/hooks/useDelayedFlag.ts
import { useEffect, useState } from 'react';

/**
 * Delay turning a boolean "on" to avoid flash-of-loading for fast transitions.
 * When active becomes false, the flag resets immediately.
 */
export function useDelayedFlag(active: boolean, delayMs = 150): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!active) {
      setDelayed(false);
      return;
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
