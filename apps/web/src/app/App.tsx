// apps/web/src/app/App.tsx
/**
 * App - Root component that composes providers and routes.
 *
 * Following chet-stack pattern:
 * - Single component wraps all providers
 * - Routes defined inline
 * - Environment passed as prop (dependency injection)
 */

import { toastStore } from '@abe-stack/core';
import { createQueryPersister } from '@abe-stack/sdk';
import { BrowserRouter, HistoryProvider, Route, Routes, ScrollArea, Toaster } from '@abe-stack/ui';
import { ProtectedRoute } from '@features/auth';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';

// ============================================================================
// Lazy-loaded Routes (Code Splitting)
// ============================================================================

const HomePage = lazy(() => import('@pages/HomePage').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('@features/auth').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('@features/auth').then((m) => ({ default: m.RegisterPage })),
);
const AuthPage = lazy(() => import('@features/auth').then((m) => ({ default: m.AuthPage })));
const ResetPasswordPage = lazy(() =>
  import('@features/auth').then((m) => ({ default: m.ResetPasswordPage })),
);
const ConfirmEmailPage = lazy(() =>
  import('@features/auth').then((m) => ({ default: m.ConfirmEmailPage })),
);
const DemoPage = lazy(() => import('@demo').then((m) => ({ default: m.DemoPage })));
const DashboardPage = lazy(() =>
  import('@features/dashboard').then((m) => ({ default: m.DashboardPage })),
);

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

function Loading(): ReactElement {
  return (
    <div className="flex-center h-screen">
      <div className="text-muted">Loading...</div>
    </div>
  );
}

function AppToaster(): ReactElement {
  const { messages, dismiss } = toastStore();
  return <Toaster messages={messages} onDismiss={dismiss} />;
}

function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/clean" element={<HomePage />} />
    </Routes>
  );
}

// ============================================================================
// App
// ============================================================================

/**
 * Hook to manage query cache persistence manually.
 *
 * Replaces PersistQueryClientProvider with direct IndexedDB persistence:
 * - On mount: restores cached queries from IndexedDB
 * - On cache updates: persists to IndexedDB (throttled)
 * - On unmount: final persistence and cleanup
 */
function useQueryPersistence(environment: ClientEnvironment): boolean {
  const [isRestored, setIsRestored] = useState(false);
  const { queryClient } = environment;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async (): Promise<void> => {
      // Restore cached data from IndexedDB
      try {
        const persistedClient = await persister.restoreClient();
        if (persistedClient) {
          // Restore each query's data from the persisted state
          for (const persistedQuery of persistedClient.clientState.queries) {
            queryClient.setQueryData(persistedQuery.queryKey, persistedQuery.state.data);
          }
        }
      } catch {
        // Restore failed silently, continue with empty cache
      }

      setIsRestored(true);

      // Subscribe to cache changes for persistence
      unsubscribe = queryClient.getQueryCache().subscribe(() => {
        const queries = queryClient
          .getQueryCache()
          .getAll()
          .filter((query) => query.state.data !== undefined)
          .map((query) => ({
            queryKey: query.queryKey,
            queryHash: query.queryHash,
            state: {
              data: query.state.data,
              dataUpdatedAt: query.state.dataUpdatedAt,
              error: query.state.error,
              errorUpdatedAt: query.state.errorUpdatedAt,
              fetchFailureCount: query.state.fetchFailureCount,
              fetchFailureReason: query.state.fetchFailureReason,
              fetchMeta: query.state.fetchMeta,
              fetchStatus: query.state.fetchStatus,
              isInvalidated: query.state.isInvalidated,
              status: query.state.status,
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
  }, [queryClient]);

  return isRestored;
}

/**
 * Root component that sets up all application infrastructure.
 *
 * Provider stack (outer to inner):
 * - Suspense: Loading fallback
 * - QueryClientProvider: React Query infrastructure
 * - BrowserRouter: React Router infrastructure
 * - ClientEnvironmentProvider: Our unified service context
 * - HistoryProvider: Navigation history tracking
 *
 * Query persistence is handled manually via useQueryPersistence hook,
 * which restores from and persists to IndexedDB.
 */
export function App({ environment }: AppProps): ReactElement {
  const isRestored = useQueryPersistence(environment);

  if (!isRestored) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <QueryClientProvider client={environment.queryClient}>
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
      </QueryClientProvider>
    </Suspense>
  );
}
