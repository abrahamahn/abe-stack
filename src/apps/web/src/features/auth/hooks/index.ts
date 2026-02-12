// src/apps/web/src/features/auth/hooks/index.ts
export { useAuth } from './useAuth';
export type { AuthContextType } from './useAuth';
export { useLoginWithPasskey, usePasskeys, useRegisterPasskey } from './useWebauthn';
export type { LoginWithPasskeyState, PasskeysState, RegisterPasskeyState } from './useWebauthn';
