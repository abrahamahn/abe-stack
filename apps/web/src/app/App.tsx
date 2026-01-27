// apps/web/src/app/App.tsx
/**
 * App - Root component that composes providers and routes.
 *
 * Following chet-stack pattern:
 * - Single component wraps all providers
 * - Routes defined inline
 * - Environment passed as prop (dependency injection)
 */

import { createQueryPersister, QueryCacheProvider } from '@abe-stack/sdk';
import { toastStore } from '@abe-stack/stores';
import { BrowserRouter, HistoryProvider, Route, Routes, ScrollArea, Toaster } from '@abe-stack/ui';
import { DemoPage, SidePeekDemoPage } from '@demo';
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
  ProtectedRoute,
  RegisterPage,
  ResetPasswordPage,
} from '@features/auth';
import {
  BillingSettingsPage,
  CheckoutCancelPage,
  CheckoutSuccessPage,
  PricingPage,
} from '@features/billing';
import { DashboardPage } from '@features/dashboard';
import { SettingsPage } from '@features/settings';
import { HomePage } from '@pages/HomePage';
import { useEffect } from 'react';

import { ClientEnvironmentProvider } from './ClientEnvironment';

import type { ClientEnvironment } from './ClientEnvironment';
import type { ReactElement } from 'react';

// ============================================================================
// Persistence Configuration
// ============================================================================

const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

const persister = createQueryPersister({
  maxAge: PERSIST_MAX_AGE,
  throttleTime: 1000, // 1 second
});

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

const AppRoutes = (): ReactElement => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/clean" element={<HomePage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/side-peek-demo" element={<SidePeekDemoPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Settings Routes */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/accounts"
        element={
          <ProtectedRoute>
            <ConnectedAccountsPage />
          </ProtectedRoute>
        }
      />

      {/* Billing Routes */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route
        path="/settings/billing"
        element={
          <ProtectedRoute>
            <BillingSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/success"
        element={
          <ProtectedRoute>
            <CheckoutSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/cancel"
        element={
          <ProtectedRoute>
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
 * - Suspense: Loading fallback
 * - QueryCacheProvider: Custom query cache infrastructure
 * - BrowserRouter: React Router infrastructure
 * - ClientEnvironmentProvider: Our unified service context
 * - HistoryProvider: Navigation history tracking
 *
 * Query persistence is handled manually via useQueryPersistence hook,
 * which restores from and persists to IndexedDB.
 */
export const App = ({ environment }: AppProps): ReactElement => {
  // Start background cache restoration (non-blocking)
  useQueryPersistence(environment);

  return (
    <QueryCacheProvider cache={environment.queryCache}>
      <BrowserRouter>
        <ClientEnvironmentProvider value={environment}>
          <HistoryProvider>
            <div className="theme h-screen">
              <ScrollArea className="h-full">
                <AppRoutes />
              </ScrollArea>
              <AppToaster />
            </div>
          </HistoryProvider>
        </ClientEnvironmentProvider>
      </BrowserRouter>
    </QueryCacheProvider>
  );
};
