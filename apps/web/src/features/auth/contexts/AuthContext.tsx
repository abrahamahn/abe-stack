// apps/web/src/features/auth/contexts/AuthContext.tsx
/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * AuthContext - Backward compatibility layer.
 *
 * The actual auth logic is now in ClientEnvironment's AuthService.
 * This context exists for backward compatibility with code that uses:
 * - useContext(AuthContext) directly
 * - AuthProvider component
 *
 * Prefer using useAuth() hook or useClientEnvironment().auth instead.
 */

import { useAuth } from '@auth/hooks/useAuth';
import { createContext } from 'react';


import type { User } from '@features/auth';
import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

// ============================================================================
// Context
// ============================================================================

/**
 * @deprecated Use useAuth() hook or useClientEnvironment().auth instead
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider (backward compatibility)
// ============================================================================

/**
 * AuthProvider - Backward compatibility wrapper.
 *
 * @deprecated The ClientEnvironmentProvider now handles auth.
 * This component is kept for backward compatibility only.
 * It simply passes through the useAuth() values to context.
 */
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
