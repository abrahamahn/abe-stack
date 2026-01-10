import { ScrollArea } from '@ui';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { LoginPage, ProtectedRoute } from '../features/auth';
import { DashboardPage } from '../features/dashboard';
import { DemoPage } from '../features/demo';
import { Toaster } from '../features/toast';
import { HomePage } from '../pages/Home';

import { AppProviders } from './providers';

import type { ReactElement } from 'react';

export function App(): ReactElement {
  return (
    <AppProviders>
      <BrowserRouter>
        <div className="ui-theme" style={{ height: '100vh' }}>
          <ScrollArea style={{ height: '100%' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
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
          <Toaster />
        </div>
      </BrowserRouter>
    </AppProviders>
  );
}
