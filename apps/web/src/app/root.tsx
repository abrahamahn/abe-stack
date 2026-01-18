// apps/web/src/app/root.tsx
import { toastStore } from '@abe-stack/core';
import { ScrollArea, Toaster } from '@abe-stack/ui';
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
import { Route, Routes } from 'react-router-dom';

import { AppProvider } from './AppProvider';

import type { ClientEnvironment } from './ClientEnvironment';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

interface AppProps {
  environment: ClientEnvironment;
}

// ============================================================================
// Components
// ============================================================================

function AppToaster(): ReactElement {
  const { messages, dismiss } = toastStore();
  return <Toaster messages={messages} onDismiss={dismiss} />;
}

export function App({ environment }: AppProps): ReactElement {
  return (
    <AppProvider environment={environment}>
      <div className="theme h-screen">
        <ScrollArea className="h-full">
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
        </ScrollArea>
        <AppToaster />
      </div>
    </AppProvider>
  );
}
