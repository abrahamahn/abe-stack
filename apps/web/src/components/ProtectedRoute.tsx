import { ProtectedRoute as ProtectedRouteBase } from '@abe-stack/ui';

import { useAuth } from '../features/auth/useAuth';

import type { ReactElement, ReactNode } from 'react';

/**
 * App-specific ProtectedRoute that uses the local useAuth hook.
 * Wraps the generic ProtectedRoute from @abe-stack/ui.
 */
export const ProtectedRoute = ({ children }: { children?: ReactNode }): ReactElement => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <ProtectedRouteBase isAuthenticated={isAuthenticated} isLoading={isLoading} redirectTo="/login">
      {children}
    </ProtectedRouteBase>
  );
};
