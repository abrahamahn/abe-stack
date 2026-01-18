// apps/web/src/app/root.tsx
import { toastStore } from '@abe-stack/core';
import { ScrollArea, Toaster } from '@abe-stack/ui';
import { AppProviders } from '@app/providers';
import { DemoPage } from '@demo';
import { LoginPage, ProtectedRoute, RegisterPage } from '@features/auth';
import { DashboardPage } from '@features/dashboard';
import { HomePage } from '@pages/HomePage';
import { Route, Routes } from 'react-router-dom';

import type { ReactElement } from 'react';

function AppToaster(): ReactElement {
  const { messages, dismiss } = toastStore();
  return <Toaster messages={messages} onDismiss={dismiss} />;
}

export function App(): ReactElement {
  return (
    <AppProviders>
      <div className="theme" style={{ height: '100vh' }}>
        <ScrollArea style={{ height: '100%' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/features/demo" element={<DemoPage />} />
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
    </AppProviders>
  );
}
