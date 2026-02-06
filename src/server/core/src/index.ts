// backend/core/src/index.ts
/**
 * @abe-stack/core — Unified Business Modules
 *
 * Top-level barrel re-exports only route maps and key factories
 * needed by the server route registration layer. For full module
 * APIs, import from subpath exports:
 *
 * @example
 * ```ts
 * import { authRoutes, createAuthGuard } from '@abe-stack/core/auth';
 * import { billingRoutes } from '@abe-stack/core/billing';
 * ```
 */

export { adminRoutes } from './admin';
export { authRoutes, createAuthGuard, verifyToken } from './auth';
export { billingRoutes, registerWebhookRoutes } from './billing';
export { notificationRoutes } from './notifications';
export { userRoutes } from './users';
