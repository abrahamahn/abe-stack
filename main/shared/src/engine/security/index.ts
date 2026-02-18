// main/shared/src/engine/security/index.ts

export {
  detectNoSQLInjection,
  detectSQLInjection,
  isValidInputKeyName,
  sanitizeString,
  type SQLInjectionDetectionOptions
} from './input';

export { hasDangerousKeys, sanitizePrototype } from './prototype';
export { createRateLimiter, type RateLimitInfo } from './rate.limit';

export {
  getInjectionErrors,
  sanitizeObject,
  type SanitizationResult,
  type ValidationOptions,
} from './sanitization';
