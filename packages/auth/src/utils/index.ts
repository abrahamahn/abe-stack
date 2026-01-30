// packages/auth/src/utils/index.ts
/**
 * Auth utility functions.
 *
 * @module utils
 */

export {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
  JwtError,
  type TokenPayload,
} from './jwt';

export {
  hashPassword,
  verifyPassword,
  verifyPasswordSafe,
  needsRehash,
  initDummyHashPool,
  isDummyHashPoolInitialized,
  resetDummyHashPool,
} from './password';

export {
  createRefreshTokenFamily,
  rotateRefreshToken,
  revokeTokenFamily,
  revokeAllUserTokens,
  cleanupExpiredTokens,
} from './refresh-token';

export { extractRequestInfo, type RequestWithClientInfo } from './request';

export { createAuthResponse, type AuthResponseData, type AuthUser } from './response';

export { setRefreshTokenCookie, clearRefreshTokenCookie } from './cookies';
