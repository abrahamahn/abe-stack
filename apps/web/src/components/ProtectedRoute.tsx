import { Spinner, Text } from '@abe-stack/ui';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import type { ReactElement, ReactNode } from 'react';

export const ProtectedRoute = ({ children }: { children?: ReactNode }): ReactElement => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spinner />
        <Text>Loading...</Text>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
