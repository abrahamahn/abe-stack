// src/client/react/src/hooks/useFocusReturn.ts
import { useCallback, useEffect, useRef } from 'react';

/**
 * Options for the useFocusReturn hook.
 *
 * @param restoreOnUnmount - Whether to automatically restore focus when the
 *   component unmounts (default: true)
 */
export interface UseFocusReturnOptions {
  /** Restore focus automatically on unmount (default: true) */
  restoreOnUnmount?: boolean;
}

/**
 * Return value from the useFocusReturn hook.
 *
 * @param restoreFocus - Manually restore focus to the previously active element
 */
export interface UseFocusReturnResult {
  /** Manually restore focus to the previously focused element */
  restoreFocus: () => void;
}

/**
 * Captures the currently focused element on mount and provides a function
 * to restore focus back to it.
 *
 * Lighter-weight alternative to FocusTrap when you only need focus restoration
 * without trapping Tab navigation (useful for dropdowns, popovers, tooltips).
 *
 * @param options - Configuration options
 * @returns Object with `restoreFocus` function
 *
 * @example
 * ```tsx
 * function Dropdown({ onClose }: { onClose: () => void }) {
 *   const { restoreFocus } = useFocusReturn();
 *
 *   const handleClose = () => {
 *     restoreFocus();
 *     onClose();
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useFocusReturn(options: UseFocusReturnOptions = {}): UseFocusReturnResult {
  const { restoreOnUnmount = true } = options;
  const previousElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousElementRef.current = document.activeElement as HTMLElement | null;

    return (): void => {
      if (restoreOnUnmount && previousElementRef.current !== null) {
        previousElementRef.current.focus();
      }
    };
  }, [restoreOnUnmount]);

  const restoreFocus = useCallback((): void => {
    if (previousElementRef.current !== null) {
      previousElementRef.current.focus();
    }
  }, []);

  return { restoreFocus };
}
