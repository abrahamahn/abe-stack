// apps/server/src/infrastructure/security/crypto/index.ts
/**
 * Cryptographic Infrastructure
 *
 * Re-exports from @abe-stack/core/crypto with server-specific naming.
 * Includes JWT rotation support for secret key rotation.
 */

export {
  sign as jwtSign,
  verify as jwtVerify,
  decode as jwtDecode,
  JwtError,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type SignOptions as JwtSignOptions,
} from '@abe-stack/core/crypto';

// JWT Rotation Support
export {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
  type JwtRotationConfig,
  type RotatingJwtOptions,
} from './jwtRotation';
