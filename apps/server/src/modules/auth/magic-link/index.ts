// apps/server/src/modules/auth/magic-link/index.ts
/**
 * Magic Link Module
 *
 * Passwordless authentication via magic links.
 */

// Routes
export { magicLinkRoutes } from './routes';

// Handlers
export { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';

// Service
export {
  cleanupExpiredMagicLinkTokens,
  requestMagicLink,
  verifyMagicLink,
  type MagicLinkResult,
  type RequestMagicLinkResult,
} from './service';
