// apps/web/src/features/auth/components/ProtectedRoute.tsx
import { useAuth } from '@auth/hooks';
import { ProtectedRoute as ProtectedRouteBase } from '@ui';

import type { ReactElement, ReactNode } from 'react';

/**
 * App-specific ProtectedRoute that uses the local useAuth hook.
 * Wraps the generic ProtectedRoute from @ui.
 */
export const ProtectedRoute = ({ children }: { children?: ReactNode }): ReactElement => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <ProtectedRouteBase isAuthenticated={isAuthenticated} isLoading={isLoading} redirectTo="/login">
      {children}
    </ProtectedRouteBase>
  );
};
