// main/server/core/src/index.ts
/**
 * @bslt/core — Unified Business Modules
 *
 * Top-level barrel re-exports only route maps and key factories
 * needed by the server route registration layer. For full module
 * APIs, import from subpath exports:
 *
 * @example
 * ```ts
 * import { authRoutes, createAuthGuard } from '@bslt/core/auth';
 * import { billingRoutes } from '@bslt/core/billing';
 * ```
 */

export { adminRoutes } from './admin';
export { authRoutes, createAuthGuard, verifyToken } from './auth';
export { billingRoutes } from './billing';
export { fileRoutes } from './files';
export { notificationRoutes } from './notifications';
export {
  coreApiManifestRouteModuleRegistrations,
  coreRouteModuleRegistrations,
} from './route-modules';
export { userRoutes } from './users';
export { webhookRoutes } from './webhooks';

export { bootstrapSystem, type SystemContext } from './bootstrap';

// Re-export common types for consumers (apps/server)
export type { AppConfig } from '@bslt/shared/config';
export type { DbClient, PostgresPubSub, QueueStore, Repositories, SessionContext } from '@bslt/db';
export type {
  Logger,
  QueueServer,
  ServerSearchProvider,
  SmsProvider,
  WriteService,
} from '@bslt/server-system';
