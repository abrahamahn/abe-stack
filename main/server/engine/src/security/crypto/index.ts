// main/server/engine/src/security/crypto/index.ts
/**
 * Crypto Module
 *
 * JWT signing, verification, and secret rotation utilities.
 *
 * @module @abe-stack/server-engine/security/crypto
 */

// ============================================================================
// Base JWT
// ============================================================================

export { decode, JwtError, sign, verify } from '../jwt';
export type { JwtErrorCode, JwtHeader, JwtPayload, SignOptions, VerifyOptions } from '../jwt';

// ============================================================================
// JWT Rotation
// ============================================================================

export {
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
} from './jwt-rotation';
export type { JwtRotationConfig, JwtRotationHandler, RotatingJwtOptions } from './jwt-rotation';
