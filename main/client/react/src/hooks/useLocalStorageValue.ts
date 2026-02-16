// main/client/react/src/hooks/useLocalStorageValue.ts
import { useCallback, useSyncExternalStore } from 'react';

const listenersByKey = new Map<string, Set<() => void>>();
const localSnapshots = new Map<string, string | null>();

function getListeners(key: string): Set<() => void> {
  let listeners = listenersByKey.get(key);
  if (listeners === undefined) {
    listeners = new Set();
    listenersByKey.set(key, listeners);
  }
  return listeners;
}

function notifyKeyListeners(key: string): void {
  const listeners = listenersByKey.get(key);
  if (listeners === undefined) return;

  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribe to a raw localStorage key value with same-tab and cross-tab sync.
 *
 * Unlike `useLocalStorage`, this hook keeps native string/null storage semantics
 * (no JSON serialization) and provides explicit remove semantics via `null`.
 */
export function useLocalStorageValue(
  key: string,
): [value: string | null, setValue: (value: string | null) => void] {
  const getSnapshot = useCallback((): string | null => {
    if (localSnapshots.has(key)) {
      return localSnapshots.get(key) ?? null;
    }
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const listeners = getListeners(key);
      listeners.add(onStoreChange);

      const handleStorage = (event: StorageEvent): void => {
        if (event.key === key) {
          localSnapshots.delete(key);
          onStoreChange();
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorage);
      }

      return (): void => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0) {
          listenersByKey.delete(key);
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorage);
        }
      };
    },
    [key],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setValue = useCallback(
    (nextValue: string | null): void => {
      if (typeof window === 'undefined') return;
      try {
        if (nextValue === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, nextValue);
        }

        const persisted = window.localStorage.getItem(key);
        const writeSucceeded =
          (nextValue === null && persisted === null) ||
          (nextValue !== null && persisted === nextValue);

        if (writeSucceeded) {
          localSnapshots.delete(key);
        } else {
          // Keep an in-memory fallback so UI still updates if storage write is blocked.
          localSnapshots.set(key, nextValue);
        }
      } catch {
        // Ignore storage write errors (private mode/quota/security settings)
        localSnapshots.set(key, nextValue);
      }
      notifyKeyListeners(key);
    },
    [key],
  );

  return [value, setValue];
}
