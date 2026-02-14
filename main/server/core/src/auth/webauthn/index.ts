// main/server/core/src/auth/webauthn/index.ts
/**
 * WebAuthn Module
 *
 * Passkey/FIDO2 authentication support.
 */

export {
  clearChallengeStore,
  getAuthenticationOptions,
  getRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from './service';

export { webauthnRouteEntries } from './routes';
