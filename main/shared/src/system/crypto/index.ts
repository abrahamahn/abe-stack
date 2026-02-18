// main/shared/src/system/crypto/index.ts
/**
 * Cryptographic & Token Utilities
 *
 * Secure random generation, constant-time comparison, JWT implementation,
 * and client-side token storage.
 */

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
  type VerifyOptions,
} from './jwt';

export { addAuthHeader, createTokenStore, tokenStore, type TokenStore } from './token';
