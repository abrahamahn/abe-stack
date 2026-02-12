// src/apps/web/src/features/auth/hooks/index.ts
/**
 * Auth Hooks
 *
 * Note: useAuthModeNavigation should be imported directly from @abe-stack/ui
 */

export { useAuth } from './useAuth';
export type { AuthContextType } from './useAuth';
export { useLoginWithPasskey, usePasskeys, useRegisterPasskey } from './useWebauthn';
export type { LoginWithPasskeyState, PasskeysState, RegisterPasskeyState } from './useWebauthn';
