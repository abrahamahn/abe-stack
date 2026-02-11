// src/server/core/src/api-keys/routes.ts
/**
 * API Keys Routes
 *
 * Route definitions for the API keys module.
 * Uses the generic router pattern for DRY registration.
 *
 * All routes are protected and require the 'user' role.
 * Route map keys must be unique strings; each path maps to one method.
 *
 * @module api-keys/routes
 */

import { createRouteMap, protectedRoute } from '@abe-stack/server-engine';

import {
  handleCreateApiKey,
  handleDeleteApiKey,
  handleListApiKeys,
  handleRevokeApiKey,
} from './handlers';

import type { RouteDefinition } from '@abe-stack/server-engine';

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * API key route entries as typed tuples for createRouteMap.
 *
 * Endpoints:
 * - GET    users/me/api-keys          -> list all keys for current user
 * - POST   users/me/api-keys          -> create a new key
 * - POST   users/me/api-keys/:id/revoke -> revoke a specific key
 * - DELETE  users/me/api-keys/:id      -> permanently delete a key
 *
 * Note: GET and POST on the same path require different map keys.
 * We use "list" suffix for the GET variant to ensure unique keys.
 *
 * @complexity O(n) where n = number of routes
 */
const apiKeyRouteEntries: [string, RouteDefinition][] = [
  // List all API keys for the authenticated user
  ['users/me/api-keys', protectedRoute('GET', handleListApiKeys, 'user')],

  // Create a new API key
  ['users/me/api-keys/create', protectedRoute('POST', handleCreateApiKey, 'user')],

  // Revoke an API key (soft delete - sets revokedAt)
  ['users/me/api-keys/:id/revoke', protectedRoute('POST', handleRevokeApiKey, 'user')],

  // Delete an API key permanently
  ['users/me/api-keys/:id', protectedRoute('DELETE', handleDeleteApiKey, 'user')],
];

/**
 * API keys route map with all key management endpoints.
 *
 * @complexity O(n) where n = number of route entries
 */
export const apiKeyRoutes = createRouteMap(apiKeyRouteEntries);
