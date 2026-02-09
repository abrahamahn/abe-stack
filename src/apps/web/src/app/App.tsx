// src/apps/web/src/app/App.tsx
/**
 * App - Root component that composes providers and routes.
 *
 * Following chet-stack pattern:
 * - Single component wraps all providers
 * - Routes defined inline
 * - Environment passed as prop (dependency injection)
 */

import {
  createQueryPersister,
  QueryCacheProvider,
  type QueryKey,
  type QueryState,
} from '@abe-stack/client-engine';
import { toastStore } from '@abe-stack/react';
import {
  BrowserRouter,
  ErrorBoundary,
  HistoryProvider,
  LiveRegion,
  ProtectedRoute,
  Route,
  Routes,
  SkipLink,
  ThemeProvider,
  Toaster,
  useRouteFocusAnnounce,
} from '@abe-stack/ui';
import { useAuth } from '@features/auth';
import { useEffect, type ReactElement, Suspense } from 'react';

import { ClientEnvironmentProvider, type ClientEnvironment } from './ClientEnvironment';
import { appRoutes, type AppRoute } from './routes'; // Import appRoutes and AppRoute type

// ============================================================================
// Types for Persistence (re-added)
// ============================================================================

type PersistedQuery = {
  queryKey: readonly unknown[];
  queryHash: string;
  state: {
    data: unknown;
    dataUpdatedAt: number;
    error: unknown;
    errorUpdatedAt: number;
    fetchFailureCount: number;
    fetchFailureReason: unknown;
    fetchMeta: unknown;
    fetchStatus: string;
    isInvalidated: boolean;
    status: string;
  };
};

type PersistedClientState = {
  queries: PersistedQuery[];
  mutations: unknown[];
};

type PersistedClient = {
  timestamp: number;
  buster: string;
  clientState: PersistedClientState;
};

type QueryCacheEntry = {
  queryKey: QueryKey;
  state: QueryState;
};

type QueryPersister = {
  persistClient: (client: PersistedClient) => void;
  restoreClient: () => Promise<PersistedClient | undefined>;
  removeClient: () => Promise<void>;
};

// ============================================================================
// Types
// ============================================================================

interface AppProps {
  environment: ClientEnvironment;
}

// ============================================================================
// Components
// ============================================================================

const AppToaster = (): ReactElement => {
  const { messages, dismiss } = toastStore();
  return <Toaster messages={messages} onDismiss={dismiss} />;
};

/** Announces route changes to screen readers via the LiveRegion provider */
const RouteFocusAnnouncer = (): null => {
  useRouteFocusAnnounce();
  return null;
};

// Helper function to render routes recursively
const renderRoutes = (routes: AppRoute[]): ReactElement[] => {
  return routes.map((route: AppRoute, index) => {
    const Element = route.element;
    let elementToRender = <Element />;

    // Apply ProtectedRoute if 'protected' is true
    if (route.protected === true) {
      const { isAuthenticated, isLoading } = useAuth();
      elementToRender = (
        <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
          <Element />
        </ProtectedRoute>
      );
    }

    const routeProps: { key: number; element: ReactElement; path?: string; index?: boolean } = {
      key: index,
      element: elementToRender,
    };

    if (route.path !== undefined) {
      routeProps.path = route.path;
    }

    if (route.index !== undefined) {
      routeProps.index = route.index;
    }

    // Safely check for children before mapping
    const childRoutes =
      Array.isArray(route.children) && route.children.length > 0
        ? renderRoutes(route.children)
        : null;

    return <Route {...routeProps}>{childRoutes}</Route>;
  });
};

const AppRoutes = (): ReactElement => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>{renderRoutes(appRoutes)}</Routes>
    </Suspense>
  );
};
// ============================================================================
// App
// ============================================================================

/**
 * Hook to manage query cache persistence in the background.
 *
 * Non-blocking approach for instant app load:
 * - App renders immediately without waiting for IndexedDB
 * - Cache restoration happens in background
 * - Persists cache changes to IndexedDB (throttled)
 */
function useQueryPersistence(environment: ClientEnvironment): void {
  const { queryCache, config } = environment;
  const { maxAge, throttleTime } = config.queryPersistence;

  const persister = createQueryPersister({
    maxAge,
    throttleTime,
  }) as QueryPersister;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async (): Promise<void> => {
      // Restore cached data from IndexedDB in background
      try {
        const persistedClient: PersistedClient | undefined = await persister.restoreClient();
        if (persistedClient !== undefined) {
          for (const persistedQuery of persistedClient.clientState.queries) {
            queryCache.setQueryData(persistedQuery.queryKey, persistedQuery.state.data);
          }
        }
      } catch (_error: unknown) {
        // Restore failed silently, continue with empty cache
        // Optionally log error for debugging: console.error(_error);
      }

      // Subscribe to cache changes for persistence
      unsubscribe = queryCache.subscribeAll(() => {
        const allQueries: QueryCacheEntry[] = queryCache.getAll();
        const queries = allQueries
          .filter(
            (entry): entry is QueryCacheEntry & { state: QueryState & { data: unknown } } =>
              entry.state.data !== undefined,
          )
          .map(
            (entry: QueryCacheEntry): PersistedQuery => ({
              queryKey: entry.queryKey,
              queryHash: JSON.stringify(entry.queryKey),
              state: {
                data: entry.state.data,
                dataUpdatedAt: entry.state.dataUpdatedAt,
                error: entry.state.error,
                errorUpdatedAt: entry.state.errorUpdatedAt,
                fetchFailureCount: entry.state.fetchFailureCount,
                fetchFailureReason: null,
                fetchMeta: null,
                fetchStatus: entry.state.fetchStatus,
                isInvalidated: entry.state.isInvalidated,
                status: entry.state.status,
              },
            }),
          );

        persister.persistClient({
          timestamp: Date.now(),
          buster: '',
          clientState: { queries, mutations: [] },
        });
      });
    };

    void init();

    return (): void => {
      unsubscribe?.();
    };
  }, [queryCache, maxAge, throttleTime, persister]);
}

/**
 * useAuthInitialization - Restores authentication session on app mount
 *
 * Calls auth.initialize() which:
 * - Attempts to restore session from HTTP-only refresh token cookie
 * - Updates auth state if session is valid
 * - Handles session expiration gracefully
 */
function useAuthInitialization(environment: ClientEnvironment): void {
  const { auth } = environment;

  useEffect(() => {
    void auth.initialize();
  }, [auth]);
}

/**
 * Root component that sets up all application infrastructure.
 *
 * Provider stack (outer to inner):
 * - ErrorBoundary: Catches unhandled render errors
 * - QueryCacheProvider: Custom query cache infrastructure
 * - BrowserRouter: React Router infrastructure
 * - ClientEnvironmentProvider: Our unified service context
 * - HistoryProvider: Navigation history tracking
 * - LiveRegion: Screen reader announcement support
 *
 * Query persistence is handled manually via useQueryPersistence hook,
 * which restores from and persists to IndexedDB.
 */
export const App = ({ environment }: AppProps): ReactElement => {
  // Start background cache restoration (non-blocking)
  useQueryPersistence(environment);

  // Restore authentication session from cookies
  useAuthInitialization(environment);

  return (
    <ErrorBoundary>
      <QueryCacheProvider cache={environment.queryCache}>
        <ThemeProvider>
          <BrowserRouter>
            <ClientEnvironmentProvider value={environment}>
              <HistoryProvider>
                <LiveRegion>
                  <div className="h-screen flex flex-col overflow-hidden">
                    <SkipLink />
                    <RouteFocusAnnouncer />
                    <div className="flex-1 min-h-0 relative">
                      <AppRoutes />
                    </div>
                    <AppToaster />
                  </div>
                </LiveRegion>
              </HistoryProvider>
            </ClientEnvironmentProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryCacheProvider>
    </ErrorBoundary>
  );
};
