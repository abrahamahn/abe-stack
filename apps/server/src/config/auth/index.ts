// apps/server/src/config/auth/index.ts

// auth.ts
export {
  AuthValidationError,
  getRefreshCookieOptions,
  isStrategyEnabled,
  loadAuth,
  validateAuth,
} from './auth';

// jwt.ts
export { DEFAULT_JWT_ROTATION_CONFIG, loadJwtRotationConfig } from './jwt';

// rate-limit.ts
export { DEFAULT_RATE_LIMIT_CONFIG, loadRateLimitConfig } from './rate-limit';
