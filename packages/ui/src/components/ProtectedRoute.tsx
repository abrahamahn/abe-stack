import { Navigate, Outlet } from 'react-router-dom';

import { Text } from '../elements/Text';

import { Spinner } from './Spinner';

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
  if (isLoading) {
    return (loadingComponent ?? (
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spinner />
        <Text>Loading...</Text>
      </div>
    )) as ReactElement;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
