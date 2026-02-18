// main/server/system/src/security/crypto/index.ts
/**
 * Crypto Module
 *
 * JWT signing, verification, and secret rotation utilities.
 *
 * @module @bslt/server-system/security/crypto
 */

// ============================================================================
// Base JWT
// ============================================================================

export { decode, JwtError, sign, verify } from './jwt';
export type { JwtErrorCode, JwtHeader, JwtPayload, SignOptions, VerifyOptions } from './jwt';

// ============================================================================
// JWT Rotation
// ============================================================================

export {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation
} from './jwt.rotation';
export type { JwtRotationConfig, JwtRotationHandler, RotatingJwtOptions } from './jwt.rotation';

