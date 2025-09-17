/**
 * Security Infrastructure Index
 *
 * This file exports all security-related components to simplify imports.
 */

// Token management
export { TokenManager, DEFAULT_TOKEN_OPTIONS } from "./TokenManager";
export type { TokenStorage } from "./TokenStorageService";
export type { TokenBlacklist } from "./TokenBlacklistService";
export { InMemoryTokenStorage } from "./InMemoryTokenStorage";
export { InMemoryTokenBlacklist } from "./InMemoryTokenBlacklist";
export { TokenType } from "./tokenTypes";
export {
  createTokenId,
  revokeToken,
  generateSecureToken,
  hashToken,
} from "./tokenUtils";

// Authentication and authorization
export { WebSocketAuthService } from "./WebSocketAuthService";
export type { WebSocketAuthResult } from "./WebSocketAuthService";
export {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hashData,
  createSignature as createEncryptionSignature,
  verifySignature as verifyEncryptionSignature,
} from "./encryptionUtils";
export {
  hashPassword,
  verifyPassword,
  generateRandomPassword,
  validatePasswordStrength,
  DEFAULT_PASSWORD_REQUIREMENTS,
} from "./passwordUtils";
export {
  createSignature,
  generateSignature,
  verifySignature,
  parseSignature,
  serializeSignature,
  deserializeSignature,
} from "./signatureHelpers";
export type {
  SecuritySignature,
  SignatureOptions,
  StringSignatureOptions,
  ObjectSignatureOptions,
  ParsedSignature,
} from "./signatureHelpers";
export {
  sanitizeInput,
  generateSecureRandomString,
  validateSafeUrl,
  serialize as serializeObject,
} from "./securityHelpers";

// Middleware
export {
  csrfProtection,
  csrfToken,
  SecurityMiddlewareService,
} from "./middlewareUtils";
export {
  validateRequest,
  validateQuery,
  validateParams,
  validateHeaders,
} from "./validationMiddleware";
export {
  createRateLimiter as createRateLimiterMiddleware,
  rateLimitMiddleware,
} from "./rateLimitMiddleware";

// CSRF and CORS
export { generateCsrfToken, verifyCsrfToken } from "./csrfUtils";
export type { CorsOptions } from "./corsConfig";
export {
  validateOrigin,
  corsWithAuthOptions,
  createCorsMiddleware,
} from "./corsConfig";
export { CorsConfigService } from "./CorsConfigService";

// Cookies
export {
  CookieService,
  setCookie,
  getCookie,
  clearCookie,
  setAuthCookies,
  getAuthTokenCookie,
  clearAuthCookies,
} from "./cookieUtils";
