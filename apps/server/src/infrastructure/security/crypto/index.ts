// apps/server/src/infrastructure/security/crypto/index.ts
/**
 * Cryptographic Infrastructure
 *
 * JWT rotation support for secret key rotation.
 *
 * Note: Base JWT functions (sign, verify, decode, JwtError) should be
 * imported directly from @abe-stack/core/crypto
 */

// JWT Rotation Support
export {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
  type JwtRotationConfig,
  type RotatingJwtOptions,
} from './jwtRotation';
