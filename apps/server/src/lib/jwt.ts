// apps/server/src/lib/jwt.ts
// Re-export from modules/auth for backwards compatibility
// New code should import from '../modules/auth' directly
export {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
  createToken,
  type TokenPayload,
} from '../modules/auth/utils/jwt';
