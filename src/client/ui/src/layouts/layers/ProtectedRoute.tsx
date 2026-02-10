// src/client/ui/src/layouts/layers/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from '@abe-stack/react/router';

import { LoadingContainer } from '../../components/LoadingContainer';
import '../../styles/components.css';

import type { ReactElement, ReactNode } from 'react';

export type ProtectedRouteProps = {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the auth state is still loading */
  isLoading: boolean;
  /** Path to redirect to when not authenticated (default: '/login') */
  redirectTo?: string;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Children to render when authenticated */
  children?: ReactNode;
};

/**
 * A route wrapper that checks authentication status and shows a loading state
 * while fetching auth state. Redirects to the specified path if not authenticated.
 * Preserves the original path as a `returnTo` query parameter so the user can
 * be redirected back after login.
 *
 * @example
 * ```tsx
 * // With useAuth hook
 * const { isAuthenticated, isLoading } = useAuth();
 * <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // With custom redirect
 * <ProtectedRoute
 *   isAuthenticated={isAuthenticated}
 *   isLoading={isLoading}
 *   redirectTo="/signin"
 * />
 * ```
 */
export const ProtectedRoute = ({
  isAuthenticated,
  isLoading,
  redirectTo = '/login',
  loadingComponent,
  children,
}: ProtectedRouteProps): ReactElement => {
  const location = useLocation();

  if (isLoading) {
    return (loadingComponent ?? (
      <div className="flex-center h-screen">
        <LoadingContainer text="" size="md" />
      </div>
    )) as ReactElement;
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    // Append returnTo param so login can redirect back (skip for root path)
    const target =
      currentPath !== '/' && currentPath !== ''
        ? `${redirectTo}?returnTo=${encodeURIComponent(currentPath)}`
        : redirectTo;
    return <Navigate to={target} replace />;
  }

  return children !== undefined && children !== null ? <>{children}</> : <Outlet />;
};
