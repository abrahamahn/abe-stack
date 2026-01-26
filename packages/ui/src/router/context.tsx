// packages/ui/src/router/context.tsx
/**
 * Custom Router Context
 *
 * Minimal router implementation using native browser APIs.
 * Inspired by react-router patterns but simplified.
 */

import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';

import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Navigation action type - matches react-router pattern */
export type NavigationType = 'PUSH' | 'POP' | 'REPLACE';

export interface RouterLocation {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  /** Unique key for this location entry */
  key: string;
}

export interface RouterState {
  location: RouterLocation;
  navigationType: NavigationType;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  /** Prevent scroll restoration for this navigation */
  preventScrollReset?: boolean;
}

export type NavigateFunction = (to: string | number, options?: NavigateOptions) => void;

export interface RouterContextValue {
  location: RouterLocation;
  navigationType: NavigationType;
  navigate: NavigateFunction;
  /** For MemoryRouter - allows direct location setting */
  setLocation?: (location: RouterLocation) => void;
}

// ============================================================================
// History Abstraction
// ============================================================================

interface HistoryState {
  key: string;
  scrollX?: number;
  scrollY?: number;
  usr?: unknown; // user state
}

function createKey(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getHistoryState(): HistoryState {
  const state = window.history.state as HistoryState | null;
  return state ?? { key: createKey() };
}

export interface History {
  readonly location: RouterLocation;
  readonly navigationType: NavigationType;
  push(to: string, state?: unknown): void;
  replace(to: string, state?: unknown): void;
  go(delta: number): void;
  back(): void;
  forward(): void;
  listen(callback: () => void): () => void;
  /** Save current scroll position */
  saveScrollPosition(): void;
  /** Restore scroll position for current location */
  restoreScrollPosition(): void;
}

function createBrowserHistory(): History {
  let currentNavigationType: NavigationType = 'POP';
  const listeners = new Set<() => void>();
  const scrollPositions = new Map<string, { x: number; y: number }>();

  // Cache the current location - only updated on navigation events
  // This is critical for useSyncExternalStore to work correctly
  let cachedLocation: RouterLocation = buildLocation();

  function buildLocation(): RouterLocation {
    const historyState = getHistoryState();
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: historyState.usr ?? null,
      key: historyState.key,
    };
  }

  function updateCachedLocation(): void {
    cachedLocation = buildLocation();
  }

  function notify(): void {
    updateCachedLocation();
    listeners.forEach((listener) => {
      listener();
    });
  }

  function saveScrollPosition(): void {
    const key = getHistoryState().key;
    if (key !== '') {
      scrollPositions.set(key, { x: window.scrollX, y: window.scrollY });
      // Also save to history state for persistence across page reloads
      const currentState = getHistoryState();
      window.history.replaceState(
        { ...currentState, scrollX: window.scrollX, scrollY: window.scrollY },
        '',
      );
    }
  }

  function restoreScrollPosition(): void {
    const historyState = getHistoryState();
    const saved = scrollPositions.get(historyState.key);
    if (saved !== undefined) {
      window.scrollTo(saved.x, saved.y);
    } else if (historyState.scrollX !== undefined && historyState.scrollY !== undefined) {
      window.scrollTo(historyState.scrollX, historyState.scrollY);
    } else {
      window.scrollTo(0, 0);
    }
  }

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    currentNavigationType = 'POP';
    notify();
  });

  return {
    get location(): RouterLocation {
      return cachedLocation;
    },
    get navigationType(): NavigationType {
      return currentNavigationType;
    },
    push(to: string, state?: unknown): void {
      saveScrollPosition();
      const key = createKey();
      const historyState: HistoryState = { key, usr: state };
      window.history.pushState(historyState, '', to);
      currentNavigationType = 'PUSH';
      notify();
    },
    replace(to: string, state?: unknown): void {
      const currentKey = getHistoryState().key;
      const key = currentKey !== '' ? currentKey : createKey();
      const historyState: HistoryState = { key, usr: state };
      window.history.replaceState(historyState, '', to);
      currentNavigationType = 'REPLACE';
      notify();
    },
    go(delta: number): void {
      window.history.go(delta);
    },
    back(): void {
      window.history.back();
    },
    forward(): void {
      window.history.forward();
    },
    listen(callback: () => void): () => void {
      listeners.add(callback);
      return (): void => {
        listeners.delete(callback);
      };
    },
    saveScrollPosition,
    restoreScrollPosition,
  };
}

// Singleton browser history instance
let browserHistory: History | null = null;

function getBrowserHistory(): History {
  if (browserHistory === null && typeof window !== 'undefined') {
    browserHistory = createBrowserHistory();
  }
  if (browserHistory === null) throw new Error('Browser history not initialized');
  return browserHistory;
}

// ============================================================================
// Context
// ============================================================================

export const RouterContext = createContext<RouterContextValue | null>(null);

// ============================================================================
// Browser Router Store (using History abstraction)
// ============================================================================

function createBrowserRouterStore(): {
  getSnapshot: () => RouterState;
  getServerSnapshot: () => RouterState;
  subscribe: (callback: () => void) => () => void;
  history: History;
} {
  const history = getBrowserHistory();

  // Cache the state object - only updated when history notifies
  // This is critical for useSyncExternalStore to work correctly
  let cachedState: RouterState = {
    location: history.location,
    navigationType: history.navigationType,
  };

  const serverSnapshot: RouterState = {
    location: {
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    },
    navigationType: 'POP',
  };

  return {
    getSnapshot: (): RouterState => cachedState,
    getServerSnapshot: (): RouterState => serverSnapshot,
    subscribe: (callback: () => void): (() => void) => {
      return history.listen(() => {
        // Update cached state before notifying React
        cachedState = {
          location: history.location,
          navigationType: history.navigationType,
        };
        callback();
      });
    },
    history,
  };
}

const browserStore = typeof window !== 'undefined' ? createBrowserRouterStore() : null;

// ============================================================================
// Browser Router Provider
// ============================================================================

export interface RouterProps {
  children: ReactNode;
  /** Enable automatic scroll restoration (default: true) */
  scrollRestoration?: boolean;
}

export function Router({ children, scrollRestoration = true }: RouterProps): React.ReactElement {
  const state = useSyncExternalStore(
    browserStore?.subscribe ?? ((): (() => void) => (): void => {}),
    browserStore?.getSnapshot ??
      ((): RouterState => ({
        location: { pathname: '/', search: '', hash: '', state: null, key: 'default' },
        navigationType: 'POP',
      })),
    browserStore?.getServerSnapshot ??
      ((): RouterState => ({
        location: { pathname: '/', search: '', hash: '', state: null, key: 'default' },
        navigationType: 'POP',
      })),
  );

  const preventScrollRef = useRef(false);

  const navigate: NavigateFunction = React.useCallback((to, options = {}) => {
    if (typeof to === 'number') {
      browserStore?.history.go(to);
      return;
    }

    const url = to.startsWith('/') ? to : `/${to}`;
    preventScrollRef.current = options.preventScrollReset ?? false;

    if (options.replace ?? false) {
      browserStore?.history.replace(url, options.state);
    } else {
      browserStore?.history.push(url, options.state);
    }
  }, []);

  // Handle scroll restoration
  useEffect(() => {
    if (!scrollRestoration || browserStore === null) return;

    if (state.navigationType === 'POP') {
      // Back/forward navigation - restore previous scroll position
      browserStore.history.restoreScrollPosition();
    } else if (!preventScrollRef.current) {
      // New navigation - scroll to top (unless prevented)
      window.scrollTo(0, 0);
    }
    preventScrollRef.current = false;
  }, [state.location.key, state.navigationType, scrollRestoration]);

  // Disable browser's native scroll restoration (we handle it ourselves)
  useEffect(() => {
    if (!scrollRestoration || !('scrollRestoration' in window.history)) {
      return;
    }
    const original = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return (): void => {
      window.history.scrollRestoration = original;
    };
  }, [scrollRestoration]);

  return (
    <RouterContext.Provider
      value={{
        location: state.location,
        navigationType: state.navigationType,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

// ============================================================================
// Memory Router Provider (for tests)
// ============================================================================

export interface MemoryRouterProps {
  children: ReactNode;
  initialEntries?: (string | { pathname: string; state?: unknown })[];
  initialIndex?: number;
}

interface MemoryEntry {
  path: string;
  state: unknown;
  key: string;
}

export function MemoryRouter({
  children,
  initialEntries = ['/'],
  initialIndex,
}: MemoryRouterProps): React.ReactElement {
  // Normalize entries to strings and extract state
  const normalizedEntries = React.useMemo((): MemoryEntry[] => {
    return initialEntries.map((entry): MemoryEntry => {
      if (typeof entry === 'string') {
        return { path: entry, state: null, key: createKey() };
      }
      return { path: entry.pathname, state: entry.state ?? null, key: createKey() };
    });
  }, [initialEntries]);

  const [entries, setEntries] = React.useState(normalizedEntries);
  const [index, setIndex] = React.useState(initialIndex ?? normalizedEntries.length - 1);
  const [navigationType, setNavigationType] = React.useState<NavigationType>('POP');

  const location = React.useMemo((): RouterLocation => {
    const entry = entries[index] ?? { path: '/', state: null, key: 'default' };
    const url = new URL(entry.path, 'http://localhost');
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      state: entry.state,
      key: entry.key,
    };
  }, [entries, index]);

  const navigate: NavigateFunction = React.useCallback(
    (to, options = {}) => {
      if (typeof to === 'number') {
        setIndex((prev) => Math.max(0, Math.min(entries.length - 1, prev + to)));
        setNavigationType('POP');
        return;
      }

      const url = to.startsWith('/') ? to : `/${to}`;
      const newEntry: MemoryEntry = { path: url, state: options.state ?? null, key: createKey() };

      if (options.replace ?? false) {
        setEntries((prev) => {
          const next = [...prev];
          next[index] = newEntry;
          return next;
        });
        setNavigationType('REPLACE');
      } else {
        setEntries((prev) => [...prev.slice(0, index + 1), newEntry]);
        setIndex((prev) => prev + 1);
        setNavigationType('PUSH');
      }
    },
    [entries.length, index],
  );

  const setLocation = React.useCallback((loc: RouterLocation) => {
    const url = `${loc.pathname}${loc.search}${loc.hash}`;
    setEntries((prev) => [...prev, { path: url, state: loc.state ?? null, key: createKey() }]);
    setIndex((prev) => prev + 1);
    setNavigationType('PUSH');
  }, []);

  return (
    <RouterContext.Provider value={{ location, navigationType, navigate, setLocation }}>
      {children}
    </RouterContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/** Access the full router context */
export function useRouterContext(): RouterContextValue {
  const context = useContext(RouterContext);
  if (context === null) {
    throw new Error('useRouterContext must be used within a Router');
  }
  return context;
}

/** Get the current navigation type (PUSH, POP, or REPLACE) */
export function useNavigationType(): NavigationType {
  const { navigationType } = useRouterContext();
  return navigationType;
}

/** Get the history object for advanced navigation control */
export function useHistory(): History | null {
  // Only available in browser environment
  return browserStore?.history ?? null;
}
