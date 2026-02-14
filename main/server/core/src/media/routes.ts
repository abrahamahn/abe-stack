// main/server/core/src/media/routes.ts
/**
 * Media Routes
 *
 * Route definitions for the media module.
 * Uses framework-agnostic route definition types from types.ts.
 */

import {
  handleDeleteMedia,
  handleGetMedia,
  handleGetMediaStatus,
  handleUploadMedia,
} from './handlers';

import type {
  MediaAppContext,
  MediaBaseRouteDefinition,
  MediaRequest,
  MediaRouteMap,
  MediaRouteResult,
} from './types';

// ============================================================================
// Route Helper Functions
// ============================================================================

/**
 * Create a route map from an array of path-definition tuples.
 *
 * @param entries - Array of [path, definition] tuples
 * @returns Route map object keyed by path
 * @complexity O(n) where n is the number of entries
 */
function createMediaRouteMap(entries: Array<[string, MediaBaseRouteDefinition]>): MediaRouteMap {
  return Object.fromEntries(entries);
}

/**
 * Create a protected route definition (authentication required).
 *
 * @param method - HTTP method for this route
 * @param handler - Route handler function
 * @param auth - Required authentication level
 * @returns Base route definition with auth requirement
 * @complexity O(1)
 */
function mediaProtectedRoute(
  method: MediaBaseRouteDefinition['method'],
  handler: MediaBaseRouteDefinition['handler'],
  auth: 'user' | 'admin' = 'user',
): MediaBaseRouteDefinition {
  return {
    method,
    handler,
    auth,
  };
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Media module route map.
 *
 * Defines all media-related HTTP endpoints:
 * - Upload (protected): POST /api/media/upload
 * - Get metadata (protected): GET /api/media/:id
 * - Delete (protected): DELETE /api/media/:id
 * - Processing status (protected): GET /api/media/:id/status
 *
 * All routes require user authentication.
 */
export const mediaRoutes: MediaRouteMap = createMediaRouteMap([
  // Upload media file
  [
    'media/upload',
    mediaProtectedRoute(
      'POST',
      async (ctx: MediaAppContext, body: unknown, req: MediaRequest): Promise<MediaRouteResult> => {
        return handleUploadMedia(ctx, body, req);
      },
      'user',
    ),
  ],

  // Get media metadata by ID
  [
    'media/:id',
    mediaProtectedRoute(
      'GET',
      async (ctx: MediaAppContext, body: unknown, req: MediaRequest): Promise<MediaRouteResult> => {
        return handleGetMedia(ctx, body, req);
      },
      'user',
    ),
  ],

  // Delete media by ID
  [
    'media/:id/delete',
    mediaProtectedRoute(
      'DELETE',
      async (ctx: MediaAppContext, body: unknown, req: MediaRequest): Promise<MediaRouteResult> => {
        return handleDeleteMedia(ctx, body, req);
      },
      'user',
    ),
  ],

  // Get processing status by ID
  [
    'media/:id/status',
    mediaProtectedRoute(
      'GET',
      async (ctx: MediaAppContext, body: unknown, req: MediaRequest): Promise<MediaRouteResult> => {
        return handleGetMediaStatus(ctx, body, req);
      },
      'user',
    ),
  ],
]);
