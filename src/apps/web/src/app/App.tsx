// apps/web/src/app/App.tsx
/**
 * App - Root component that composes providers and routes.
 *
 * Following chet-stack pattern:
 * - Single component wraps all providers
 * - Routes defined inline
 * - Environment passed as prop (dependency injection)
 */

import { createQueryPersister, QueryCacheProvider } from '@abe-stack/client-engine';
import { toastStore } from '@abe-stack/react';
import {
  BrowserRouter,
  ErrorBoundary,
  HistoryProvider,
  LiveRegion,
  ProtectedRoute,
  Route,
  Routes,
  ScrollArea,
  SkipLink,
  ThemeProvider,
  Toaster,
  useRouteFocusAnnounce,
} from '@abe-stack/ui';
import {
  AdminLayout,
  JobMonitorPage,
  PlanManagementPage,
  SecurityEventDetailPage,
  SecurityEventsPage,
  UserDetailPage,
  UserListPage,
} from '@features/admin';
import {
  AuthPage,
  ConfirmEmailPage,
  ConnectedAccountsPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  useAuth,
} from '@features/auth';
import {
  BillingSettingsPage,
  CheckoutCancelPage,
  CheckoutSuccessPage,
  PricingPage,
} from '@features/billing';
import { DashboardPage } from '@features/dashboard';
import { SettingsPage } from '@features/settings';
import { HomePage } from '@home';
import { UILibraryPage, SidePeekUILibraryPage } from '@ui-library';
import { useEffect, type ReactElement } from 'react';

import { ClientEnvironmentProvider, type ClientEnvironment } from './ClientEnvironment';

// ============================================================================
// Persistence Configuration
// ============================================================================

const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

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

type QueryPersister = {
  persistClient: (client: PersistedClient) => void;
  restoreClient: () => Promise<PersistedClient | undefined>;
  removeClient: () => Promise<void>;
};

const persister = createQueryPersister({
  maxAge: PERSIST_MAX_AGE,
  throttleTime: 1000, // 1 second
}) as QueryPersister;

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

const AppRoutes = (): ReactElement => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/clean" element={<HomePage />} />
      <Route path="/ui-library" element={<UILibraryPage />} />
      <Route path="/side-peek-ui-library" element={<SidePeekUILibraryPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Settings Routes */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/accounts"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <ConnectedAccountsPage />
          </ProtectedRoute>
        }
      />

      {/* Billing Routes */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route
        path="/settings/billing"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <BillingSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/success"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <CheckoutSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/cancel"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <CheckoutCancelPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<UserListPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="security" element={<SecurityEventsPage />} />
        <Route path="security/:id" element={<SecurityEventDetailPage />} />
        <Route path="jobs" element={<JobMonitorPage />} />
        <Route path="billing/plans" element={<PlanManagementPage />} />
      </Route>
    </Routes>
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
  const { queryCache } = environment;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async (): Promise<void> => {
      // Restore cached data from IndexedDB in background
      try {
        const persistedClient = await persister.restoreClient();
        if (persistedClient !== undefined) {
          for (const persistedQuery of persistedClient.clientState.queries) {
            queryCache.setQueryData(persistedQuery.queryKey, persistedQuery.state.data);
          }
        }
      } catch {
        // Restore failed silently, continue with empty cache
      }

      // Subscribe to cache changes for persistence
      unsubscribe = queryCache.subscribeAll(() => {
        const allQueries = queryCache.getAll();
        const queries = allQueries
          .filter((entry) => entry.state.data !== undefined)
          .map((entry) => ({
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
          }));

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
  }, [queryCache]);
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

  return (
    <ErrorBoundary>
      <QueryCacheProvider cache={environment.queryCache}>
        <ThemeProvider>
          <BrowserRouter>
            <ClientEnvironmentProvider value={environment}>
              <HistoryProvider>
                <LiveRegion>
                  <div className="h-screen">
                    <SkipLink />
                    <ScrollArea className="h-full">
                      <div id="main-content">
                        <RouteFocusAnnouncer />
                        <AppRoutes />
                      </div>
                    </ScrollArea>
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
