// main/server/system/src/security/crypto/index.ts
/**
 * Crypto Module
 *
 * JWT signing, verification, and secret rotation utilities.
 * Base JWT functions are canonical in @bslt/shared/system/crypto.
 *
 * @module @bslt/server-system/security/crypto
 */

// ============================================================================
// Base JWT (canonical in @bslt/shared)
// ============================================================================

export { decode, JwtError, sign, verify } from '@bslt/shared/system/crypto';
export type { JwtErrorCode, JwtHeader, JwtPayload, SignOptions, VerifyOptions } from '@bslt/shared/system/crypto';

// ============================================================================
// JWT Rotation
// ============================================================================

export {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
} from './jwt.rotation';
export type { JwtRotationConfig, JwtRotationHandler, RotatingJwtOptions } from './jwt.rotation';
