// main/shared/src/engine/crypto/index.ts
/**
 * Cryptographic & Token Utilities
 *
 * Secure random generation, constant-time comparison, JWT implementation,
 * and client-side token storage.
 */

export { constantTimeCompare, generateSecureId, generateToken, generateUUID } from './crypto';

export {
  checkTokenSecret,
  createJwtRotationHandler,
  decode,
  jwtDecode,
  JwtError,
  jwtSign,
  jwtVerify,
  sign,
  signWithRotation,
  verify,
  verifyWithRotation,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtRotationConfig,
  type SignOptions,
} from './jwt';

export { addAuthHeader, createTokenStore, tokenStore, type TokenStore } from './token';
