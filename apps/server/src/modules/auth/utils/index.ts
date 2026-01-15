// apps/server/src/modules/auth/utils/index.ts
// Auth utility functions

export {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
  JwtError,
  type TokenPayload,
} from './jwt';

export { hashPassword, verifyPassword, verifyPasswordSafe, needsRehash } from './password';

export {
  createRefreshTokenFamily,
  rotateRefreshToken,
  revokeTokenFamily,
  revokeAllUserTokens,
  cleanupExpiredTokens,
} from './refresh-token';

export { extractRequestInfo, extractAndVerifyToken } from './request';
