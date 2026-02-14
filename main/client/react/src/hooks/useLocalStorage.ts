// main/client/react/src/hooks/useLocalStorage.ts
import { useEffect, useRef, useState } from 'react';

/**
 * Persist state to localStorage with SSR safety.
 * Automatically syncs across tabs/windows.
 *
 * @param key - localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns Tuple of [value, setValue] like useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const canUseStorage = typeof window !== 'undefined';
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!canUseStorage) return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)): void => {
    try {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        // Defer localStorage write to avoid blocking UI updates
        if (canUseStorage) {
          queueMicrotask(() => {
            try {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch {
              // Silently fail if localStorage is unavailable
            }
          });
        }
        return valueToStore;
      });
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  useEffect(() => {
    if (!canUseStorage) {
      setStoredValue(initialValueRef.current);
      return;
    }

    try {
      const item = window.localStorage.getItem(key);
      setStoredValue(item !== null ? (JSON.parse(item) as T) : initialValueRef.current);
    } catch {
      setStoredValue(initialValueRef.current);
    }
  }, [key, canUseStorage]);

  useEffect((): (() => void) | undefined => {
    if (!canUseStorage) return;

    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // Ignore parse errors from other tabs
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return (): void => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, canUseStorage]);

  return [storedValue, setValue];
}
