// main/apps/web/src/app/App.tsx
/**
 * App - Root component that composes providers and routes.
 *
 * Following chet-stack pattern:
 * - Single component wraps all providers
 * - Routes defined inline
 * - Environment passed as prop (dependency injection)
 */

import { getApiClient } from '@abe-stack/api';
import {
  createPersistedClientFromQueryCache,
  createQueryPersister,
  restorePersistedQueryCache,
  type Persister,
} from '@abe-stack/client-engine';
import { LiveRegion, QueryCacheProvider, toastStore } from '@abe-stack/react';
import { HistoryProvider, useRouteFocusAnnounce } from '@abe-stack/react/hooks';
import { BrowserRouter, Route, Routes } from '@abe-stack/react/router';
import {
  ErrorBoundary,
  LoadingContainer,
  ProtectedRoute,
  SkipLink,
  ThemeProvider,
  Toaster,
} from '@abe-stack/ui';
import { TosAcceptanceModal } from '@auth/components';
import { useAuth } from '@features/auth';
import { CookieConsentBanner } from '@settings/components';
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactElement,
} from 'react';

import { getAccessToken } from './authToken';
import { ClientEnvironmentProvider, type ClientEnvironment } from './ClientEnvironment';
import { NetworkStatus } from './components';
import { appRoutes, type AppRoute } from './routes'; // Import appRoutes and AppRoute type
import { setTosHandler } from './tosHandler';

import type { TosRequiredPayload } from '@abe-stack/api';

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

/** Wraps a page component with auth protection using hooks properly */
const ProtectedPage = ({ Component }: { Component: ElementType }): ReactElement => {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
      <Component />
    </ProtectedRoute>
  );
};

// Helper function to render routes recursively
const renderRoutes = (routes: AppRoute[]): ReactElement[] => {
  return routes.map((route: AppRoute, index) => {
    const Element = route.element;
    const elementToRender =
      route.protected === true ? <ProtectedPage Component={Element} /> : <Element />;

    const routeProps: { element: ReactElement; path?: string; index?: boolean } = {
      element: elementToRender,
    };

    if (route.path !== undefined) {
      routeProps.path = route.path;
    }

    if (route.index !== undefined) {
      routeProps.index = route.index;
    }

    const childRoutes =
      Array.isArray(route.children) && route.children.length > 0
        ? renderRoutes(route.children)
        : null;

    return (
      <Route key={index} {...routeProps}>
        {childRoutes}
      </Route>
    );
  });
};

const AppRoutes = (): ReactElement => {
  return (
    <Suspense fallback={<LoadingContainer />}>
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

  const persister: Persister = createQueryPersister({
    maxAge,
    throttleTime,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async (): Promise<void> => {
      // Restore cached data from IndexedDB in background
      try {
        const persistedClient = await persister.restoreClient();
        restorePersistedQueryCache(queryCache, persistedClient);
      } catch (_error: unknown) {
        // Restore failed silently, continue with empty cache
        // Optionally log error for debugging: console.error(_error);
      }

      // Subscribe to cache changes for persistence
      unsubscribe = queryCache.subscribeAll(() => {
        const persisted = createPersistedClientFromQueryCache(queryCache.getAll());
        persister.persistClient(persisted);
      });
    };

    void init();

    return (): void => {
      unsubscribe?.();
    };
  }, [queryCache, maxAge, throttleTime, persister]);
}

// ============================================================================
// ToS Acceptance State
// ============================================================================

interface TosModalState {
  open: boolean;
  documentId: string | null;
  requiredVersion: number | null;
}

const TOS_INITIAL_STATE: TosModalState = {
  open: false,
  documentId: null,
  requiredVersion: null,
};

/**
 * useTosAcceptance - Manages ToS acceptance modal state.
 *
 * Registers a handler with the tosHandler module so the API client's
 * onTosRequired callback can trigger the modal from any API call.
 */
function useTosAcceptance(environment: ClientEnvironment): {
  state: TosModalState;
  handleAccept: (documentId: string) => Promise<void>;
  handleDismiss: () => void;
} {
  const [state, setState] = useState<TosModalState>(TOS_INITIAL_STATE);
  const resolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cleanup = setTosHandler((payload: TosRequiredPayload) => {
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
        setState({
          open: true,
          documentId: payload.documentId,
          requiredVersion: payload.requiredVersion,
        });
      });
    });
    return cleanup;
  }, []);

  const handleAccept = useCallback(
    async (documentId: string) => {
      const api = getApiClient({
        baseUrl: environment.config.apiUrl,
        getToken: getAccessToken,
      });
      await api.acceptTos(documentId);

      // Close modal and resolve the pending promise so the original request retries
      setState(TOS_INITIAL_STATE);
      resolveRef.current?.();
      resolveRef.current = null;
    },
    [environment.config],
  );

  const handleDismiss = useCallback(() => {
    setState(TOS_INITIAL_STATE);
    // Don't resolve - the original request will remain rejected
    resolveRef.current = null;
  }, []);

  return { state, handleAccept, handleDismiss };
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

  // ToS acceptance modal state
  const {
    state: tosState,
    handleAccept: handleTosAccept,
    handleDismiss: handleTosDismiss,
  } = useTosAcceptance(environment);

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
                    <NetworkStatus />
                    <CookieConsentBanner />
                    <TosAcceptanceModal
                      open={tosState.open}
                      documentId={tosState.documentId}
                      requiredVersion={tosState.requiredVersion}
                      onAccept={handleTosAccept}
                      onDismiss={handleTosDismiss}
                    />
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
