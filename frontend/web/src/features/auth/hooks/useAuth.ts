// apps/web/src/features/auth/hooks/useAuth.ts
import { AuthContext, type AuthContextType } from '@auth/contexts';
import { useContext } from 'react';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
