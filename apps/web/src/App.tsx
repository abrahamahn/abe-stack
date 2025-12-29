import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';
import { AuthProvider } from './contexts/AuthContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { DemoPage } from './demo';
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
            <div className="ui-theme">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
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
              <Toaster />
            </div>
          </HistoryProvider>
        </ApiProvider>
      </BrowserRouter>
    </AuthProvider>
  );
};
