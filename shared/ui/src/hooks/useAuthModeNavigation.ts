// shared/ui/src/hooks/useAuthModeNavigation.ts
import { useCallback } from 'react';

import { useNavigate } from '../router';

/**
 * Authentication mode - determines which auth form/page is shown.
 */
export type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

/**
 * Navigation options for auth mode changes.
 */
export interface AuthModeNavigationOptions {
  /** Called before navigation occurs */
  onBeforeNavigate?: (mode: AuthMode) => void;
  /** Use replace instead of push for navigation */
  replace?: boolean;
  /** Custom route mapping (defaults to standard routes) */
  routeMap?: Partial<Record<AuthMode, string>>;
}

/**
 * Return type for useAuthModeNavigation hook.
 */
export interface AuthModeNavigation {
  /** Navigate to a different auth mode */
  navigateToMode: (mode: AuthMode) => void;
  /** Navigate to login page */
  navigateToLogin: () => void;
  /** Navigate to register page */
  navigateToRegister: () => void;
  /** Navigate to forgot password page */
  navigateToForgotPassword: () => void;
}

/**
 * Default route mappings for each auth mode.
 */
const DEFAULT_AUTH_MODE_ROUTES: Record<AuthMode, string> = {
  login: '/login',
  register: '/register',
  ['forgot-password']: '/auth?mode=forgot-password',
  ['reset-password']: '/auth?mode=reset-password',
};

/**
 * Hook that centralizes auth-related navigation patterns.
 *
 * Provides consistent navigation between auth pages:
 * - Login -> /login
 * - Register -> /register
 * - Forgot Password -> /auth?mode=forgot-password
 * - Reset Password -> /auth?mode=reset-password
 *
 * @param options - Navigation options
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { navigateToMode } = useAuthModeNavigation();
 *
 *   return <AuthForm onModeChange={navigateToMode} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With callback before navigation
 * const { navigateToMode } = useAuthModeNavigation({
 *   onBeforeNavigate: (mode) => clearError(),
 * });
 * ```
 *
 * @example
 * ```tsx
 * // With custom routes
 * const { navigateToMode } = useAuthModeNavigation({
 *   routeMap: {
 *     login: '/auth/login',
 *     register: '/auth/register',
 *   },
 * });
 * ```
 */
export function useAuthModeNavigation(options?: AuthModeNavigationOptions): AuthModeNavigation {
  const navigate = useNavigate();
  const { onBeforeNavigate, replace = false, routeMap } = options ?? {};

  // Merge custom routes with defaults
  const routes: Record<AuthMode, string> = {
    ...DEFAULT_AUTH_MODE_ROUTES,
    ...routeMap,
  };

  const navigateToMode = useCallback(
    (mode: AuthMode): void => {
      onBeforeNavigate?.(mode);
      const route = routes[mode];
      navigate(route, { replace });
    },
    [navigate, onBeforeNavigate, replace, routes],
  );

  const navigateToLogin = useCallback((): void => {
    navigateToMode('login');
  }, [navigateToMode]);

  const navigateToRegister = useCallback((): void => {
    navigateToMode('register');
  }, [navigateToMode]);

  const navigateToForgotPassword = useCallback((): void => {
    navigateToMode('forgot-password');
  }, [navigateToMode]);

  return {
    navigateToMode,
    navigateToLogin,
    navigateToRegister,
    navigateToForgotPassword,
  };
}
