// packages/ui/src/layouts/layers/ProtectedRoute.tsx
import { LoadingContainer } from '../../components/LoadingContainer';
import { useDelayedFlag } from '../../hooks/useDelayedFlag';
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
  /** Delay in ms before showing loading state (default: 150) */
  loadingDelay?: number;
};

/**
 * A route wrapper that checks authentication status and shows a loading state
 * while fetching auth state. Redirects to the specified path if not authenticated.
 *
 * Uses delayed loading to prevent flash of loading state for fast auth checks.
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
  loadingDelay = 150,
}: ProtectedRouteProps): ReactElement => {
  // Delay showing loading state to prevent flash for fast auth checks
  const showLoading = useDelayedFlag(isLoading, loadingDelay);

  if (isLoading) {
    // Still loading but delay hasn't passed - render nothing to prevent flash
    if (!showLoading) {
      return <></>;
    }
    return (loadingComponent ?? (
      <div className="flex-center h-screen">
        <LoadingContainer text="" size="md" />
      </div>
    )) as ReactElement;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
