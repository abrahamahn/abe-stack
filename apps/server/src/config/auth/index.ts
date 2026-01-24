// apps/server/src/config/auth/index.ts
export {
  AuthValidationError,
  getRefreshCookieOptions,
  isStrategyEnabled,
  loadAuthConfig,
  validateAuthConfig,
} from './auth';

export { DEFAULT_JWT_ROTATION_CONFIG, loadJwtRotationConfig } from './jwt';

export { DEFAULT_RATE_LIMIT_CONFIG, loadRateLimitConfig } from './rate-limit';
