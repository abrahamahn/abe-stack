// apps/web/src/features/auth/hooks/index.ts
export { useAuth } from './useAuth';
export type { AuthContextType } from './useAuth';
// Re-export from SDK - useAuthModeNavigation migrated to @abe-stack/sdk
export { useAuthModeNavigation } from '@abe-stack/sdk';
export type { AuthModeNavigation, AuthModeNavigationOptions } from '@abe-stack/sdk';
export { useResendCooldown } from './useResendCooldown';
