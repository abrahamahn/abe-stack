// packages/auth/src/magic-link/index.ts
/**
 * Magic Link Module
 *
 * Passwordless authentication via magic links.
 *
 * @module magic-link
 */

// Routes
export { magicLinkRouteEntries, magicLinkRoutes } from './routes';

// Handlers
export { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';

// Service
export {
  cleanupExpiredMagicLinkTokens,
  requestMagicLink,
  verifyMagicLink,
  type MagicLinkRequestOptions,
  type MagicLinkResult,
  type RequestMagicLinkResult,
} from './service';
