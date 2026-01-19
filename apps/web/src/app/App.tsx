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
import { HistoryProvider, ScrollArea, Toaster } from '@abe-stack/ui';
import { DemoPage } from '@demo';
import {
  AuthPage,
  ConfirmEmailPage,
  LoginPage,
  ProtectedRoute,
  RegisterPage,
  ResetPasswordPage,
} from '@features/auth';
import { DashboardPage } from '@features/dashboard';
import { HomePage } from '@pages/HomePage';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ClientEnvironmentProvider } from './ClientEnvironment';

import type { ClientEnvironment } from './ClientEnvironment';
import type { ReactElement } from 'react';

// ============================================================================
// Persister (module level, created once)
// ============================================================================

const persister = createQueryPersister({
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
 * Root component that sets up all application infrastructure.
 *
 * Provider stack (outer to inner):
 * - Suspense: Loading fallback
 * - PersistQueryClientProvider: Query persistence for offline support
 * - BrowserRouter: React Router infrastructure
 * - ClientEnvironmentProvider: Our unified service context
 * - HistoryProvider: Navigation history tracking
 */
export function App({ environment }: AppProps): ReactElement {
  return (
    <Suspense fallback={<Loading />}>
      <PersistQueryClientProvider
        client={environment.queryClient}
        persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
      >
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
      </PersistQueryClientProvider>
    </Suspense>
  );
}
