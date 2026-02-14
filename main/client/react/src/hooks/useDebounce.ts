// main/client/react/src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Debounces a value by delaying updates until after the specified delay.
 * Useful for search inputs, window resize handlers, etc.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = DEFAULT_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect((): (() => void) => {
    const handler = setTimeout((): void => {
      setDebouncedValue(value);
    }, delay);

    return (): void => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
