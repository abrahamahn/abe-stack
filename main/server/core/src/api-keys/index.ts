// main/server/core/src/api-keys/index.ts
/**
 * API Keys Package
 *
 * Key generation, CRUD handlers, route definitions, and types
 * for managing programmatic API access keys.
 */

// Service
export {
  generateApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  type CreateApiKeyParams,
  type CreateApiKeyResult,
  type GeneratedKey,
} from './service';

// Handlers
export {
  handleCreateApiKey,
  handleListApiKeys,
  handleRevokeApiKey,
  handleDeleteApiKey,
} from './handlers';

// Middleware
export { createApiKeyAuthMiddleware, createScopeGuard, getApiKeyContext } from './middleware';

// Routes
export { apiKeyRoutes } from './routes';

// Types
export type { ApiKeyAppContext } from './types';
export type {
  ApiKeyContext,
  ApiKeyAuthenticatedRequest,
  ApiKeyAuthMiddlewareOptions,
} from './middleware';
