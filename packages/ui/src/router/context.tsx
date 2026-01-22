// packages/ui/src/router/context.tsx
/**
 * Custom Router Context
 *
 * Minimal router implementation using native browser APIs.
 */

import React, { createContext, useContext, useSyncExternalStore } from 'react';

import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface RouterLocation {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

export interface RouterContextValue {
  location: RouterLocation;
  navigate: NavigateFunction;
  /** For MemoryRouter - allows direct location setting */
  setLocation?: (location: RouterLocation) => void;
}

export type NavigateFunction = (
  to: string | number,
  options?: { replace?: boolean; state?: unknown },
) => void;

// ============================================================================
// Context
// ============================================================================

export const RouterContext = createContext<RouterContextValue | null>(null);

// ============================================================================
// Browser Location Store
// ============================================================================

function createBrowserLocationStore(): {
  getSnapshot: () => RouterLocation;
  subscribe: (callback: () => void) => () => void;
} {
  let currentLocation = getLocationFromWindow();

  function getLocationFromWindow(): RouterLocation {
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state,
    };
  }

  return {
    getSnapshot: (): RouterLocation => currentLocation,
    subscribe: (callback: () => void): (() => void) => {
      const handlePopState = (): void => {
        currentLocation = getLocationFromWindow();
        callback();
      };

      window.addEventListener('popstate', handlePopState);
      return (): void => {
        window.removeEventListener('popstate', handlePopState);
      };
    },
  };
}

const browserStore = typeof window !== 'undefined' ? createBrowserLocationStore() : null;

// ============================================================================
// Browser Router Provider
// ============================================================================

export interface RouterProps {
  children: ReactNode;
}

export function Router({ children }: RouterProps): React.ReactElement {
  const location = useSyncExternalStore(
    browserStore?.subscribe ?? ((): (() => void) => (): void => {}),
    browserStore?.getSnapshot ??
      ((): RouterLocation => ({ pathname: '/', search: '', hash: '', state: null })),
    (): RouterLocation => ({ pathname: '/', search: '', hash: '', state: null }), // Server snapshot
  );

  const navigate: NavigateFunction = (to, options = {}) => {
    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }

    const url = to.startsWith('/') ? to : `/${to}`;

    if (options.replace) {
      window.history.replaceState(options.state ?? null, '', url);
    } else {
      window.history.pushState(options.state ?? null, '', url);
    }

    // Trigger re-render by dispatching popstate
    window.dispatchEvent(new PopStateEvent('popstate', { state: options.state }));
  };

  return <RouterContext.Provider value={{ location, navigate }}>{children}</RouterContext.Provider>;
}

// ============================================================================
// Memory Router Provider (for tests)
// ============================================================================

export interface MemoryRouterProps {
  children: ReactNode;
  initialEntries?: (string | { pathname: string; state?: unknown })[];
  initialIndex?: number;
}

export function MemoryRouter({
  children,
  initialEntries = ['/'],
  initialIndex,
}: MemoryRouterProps): React.ReactElement {
  // Normalize entries to strings and extract state
  const normalizedEntries = React.useMemo((): Array<{ path: string; state: unknown }> => {
    return initialEntries.map((entry): { path: string; state: unknown } => {
      if (typeof entry === 'string') {
        return { path: entry, state: null };
      }
      return { path: entry.pathname, state: entry.state ?? null };
    });
  }, [initialEntries]);

  const [entries, setEntries] = React.useState(normalizedEntries);
  const [index, setIndex] = React.useState(initialIndex ?? normalizedEntries.length - 1);

  const location = React.useMemo((): RouterLocation => {
    const entry = entries[index] ?? { path: '/', state: null };
    const url = new URL(entry.path, 'http://localhost');
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      state: entry.state,
    };
  }, [entries, index]);

  const navigate: NavigateFunction = React.useCallback(
    (to, options = {}) => {
      if (typeof to === 'number') {
        setIndex((prev) => Math.max(0, Math.min(entries.length - 1, prev + to)));
        return;
      }

      const url = to.startsWith('/') ? to : `/${to}`;
      const newEntry = { path: url, state: options.state ?? null };

      if (options.replace) {
        setEntries((prev) => {
          const next = [...prev];
          next[index] = newEntry;
          return next;
        });
      } else {
        setEntries((prev) => [...prev.slice(0, index + 1), newEntry]);
        setIndex((prev) => prev + 1);
      }
    },
    [entries.length, index],
  );

  const setLocation = React.useCallback((loc: RouterLocation) => {
    const url = `${loc.pathname}${loc.search}${loc.hash}`;
    setEntries((prev) => [...prev, { path: url, state: loc.state ?? null }]);
    setIndex((prev) => prev + 1);
  }, []);

  return (
    <RouterContext.Provider value={{ location, navigate, setLocation }}>
      {children}
    </RouterContext.Provider>
  );
}

// ============================================================================
// Hook to access router context
// ============================================================================

export function useRouterContext(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouterContext must be used within a Router');
  }
  return context;
}
