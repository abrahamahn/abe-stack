// packages/ui/src/layouts/layers/ProtectedRoute.tsx
import { Spinner } from '@elements/Spinner';
import { Text } from '@elements/Text';

import { Navigate, Outlet } from '../../router';
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
      <div className="loading-container">
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
