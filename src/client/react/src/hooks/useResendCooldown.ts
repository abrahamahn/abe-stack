// client/ui/src/hooks/useResendCooldown.ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseResendCooldownReturn {
  cooldown: number;
  isOnCooldown: boolean;
  startCooldown: (seconds?: number) => void;
  resetCooldown: () => void;
}

const DEFAULT_COOLDOWN_SECONDS = 60;

/**
 * Hook to manage a cooldown timer for resend actions (e.g., resend verification email).
 * Handles interval cleanup on unmount to prevent memory leaks.
 *
 * @param initialCooldown - Default cooldown duration in seconds (default: 60)
 * @returns Object containing cooldown state and control functions
 *
 * @example
 * ```tsx
 * function ResendButton() {
 *   const { cooldown, isOnCooldown, startCooldown } = useResendCooldown(30);
 *
 *   const handleResend = async () => {
 *     await sendEmail();
 *     startCooldown();
 *   };
 *
 *   return (
 *     <button disabled={isOnCooldown} onClick={handleResend}>
 *       {isOnCooldown ? `Resend in ${cooldown}s` : 'Resend'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useResendCooldown(
  initialCooldown: number = DEFAULT_COOLDOWN_SECONDS,
): UseResendCooldownReturn {
  const [cooldown, setCooldown] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount to prevent memory leaks
  useEffect((): (() => void) => {
    return (): void => {
      if (cooldownIntervalRef.current !== null) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const clearCooldownInterval = useCallback((): void => {
    if (cooldownIntervalRef.current !== null) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, []);

  const startCooldown = useCallback(
    (seconds: number = initialCooldown): void => {
      // Clear any existing interval before starting a new one
      clearCooldownInterval();

      setCooldown(seconds);

      cooldownIntervalRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearCooldownInterval();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [initialCooldown, clearCooldownInterval],
  );

  const resetCooldown = useCallback((): void => {
    clearCooldownInterval();
    setCooldown(0);
  }, [clearCooldownInterval]);

  return {
    cooldown,
    isOnCooldown: cooldown > 0,
    startCooldown,
    resetCooldown,
  };
}
