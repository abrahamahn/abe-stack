// apps/server/src/shared/index.ts
/**
 * Shared Kernel
 *
 * Server-specific types, constants, and utilities.
 *
 * Note: Error classes, time constants, and service interfaces should be
 * imported directly from @abe-stack/core.
 */

// Server-specific shared types
export type {
  AppContext,
  AuthResult,
  HasContext,
  IServiceContainer,
  MagicLinkData,
  OAuthUserInfo,
  RefreshTokenData,
  ReplyWithCookies,
  RequestInfo,
  RequestWithCookies,
  TokenPayload,
  TotpSecret,
  User,
  UserRole,
  UserWithPassword,
} from './types';

// Error mapping (Adapted for Server AppContext)
export { mapErrorToResponse } from './errorMapper';

// Constants and Messages
export {
  CSRF_COOKIE_NAME,
  ERROR_MESSAGES,
  FAILURE_REASONS,
  HTTP_STATUS,
  MAX_PROGRESSIVE_DELAY_MS,
  MIN_JWT_SECRET_LENGTH,
  PROGRESSIVE_DELAY_WINDOW_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_BYTES,
  SUCCESS_MESSAGES,
} from './constants';
