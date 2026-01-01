import { ScrollArea } from '@abe-stack/ui';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';
import { HistoryProvider } from './contexts/HistoryContext';
import { AuthProvider } from './features/auth/AuthContext';
import { DemoPage } from './features/demo';
import { DashboardPage } from './pages/Dashboard';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { ApiProvider } from './providers/ApiProvider';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ApiProvider>
          <HistoryProvider>
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
          </HistoryProvider>
        </ApiProvider>
      </BrowserRouter>
    </AuthProvider>
  );
};
