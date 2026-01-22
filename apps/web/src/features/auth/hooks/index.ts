// apps/web/src/features/auth/hooks/index.ts
export { useAuth } from './useAuth';
export type { AuthContextType } from './useAuth';
// Re-export from UI - useAuthModeNavigation lives in @abe-stack/ui (uses router)
export { useAuthModeNavigation } from '@abe-stack/ui';
export type { AuthModeNavigation, AuthModeNavigationOptions } from '@abe-stack/ui';
export { useResendCooldown } from './useResendCooldown';
