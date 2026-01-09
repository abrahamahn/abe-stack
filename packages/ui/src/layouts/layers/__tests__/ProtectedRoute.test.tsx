// packages/ui/src/layouts/layers/__tests__/ProtectedRoute.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ProtectedRoute } from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  describe('loading state', () => {
    it('should show default loading UI when isLoading is true', () => {
      render(
        <MemoryRouter>
          <ProtectedRoute isAuthenticated={false} isLoading={true}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom loading component when provided', () => {
      render(
        <MemoryRouter>
          <ProtectedRoute
            isAuthenticated={false}
            isLoading={true}
            loadingComponent={<div>Custom Loading</div>}
          >
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated state', () => {
    it('should redirect to /login by default', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute isAuthenticated={false} isLoading={false}>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to custom path when redirectTo is provided', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute isAuthenticated={false} isLoading={false} redirectTo="/signin">
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Sign In Page')).toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    it('should render children when authenticated', () => {
      render(
        <MemoryRouter>
          <ProtectedRoute isAuthenticated={true} isLoading={false}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render Outlet when no children provided', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/" element={<ProtectedRoute isAuthenticated={true} isLoading={false} />}>
              <Route path="dashboard" element={<div>Dashboard via Outlet</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Dashboard via Outlet')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <MemoryRouter>
          <ProtectedRoute isAuthenticated={true} isLoading={false}>
            <div>First</div>
            <div>Second</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should prioritize loading state over authenticated state', () => {
      render(
        <MemoryRouter>
          <ProtectedRoute isAuthenticated={true} isLoading={true}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});
