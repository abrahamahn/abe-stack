// main/server/core/src/files/routes.ts
/**
 * Files Routes
 *
 * Route definitions for the files module.
 * Uses the generic router pattern for DRY registration.
 *
 * All routes are protected and require the 'user' role.
 * Route map keys must be unique strings; each path maps to one method.
 *
 * @module files/routes
 */

import { emptyBodySchema, fileUploadRequestSchema } from '@bslt/shared';

import { createRouteMap, protectedRoute } from '../../../engine/src';

import { handleDeleteFile, handleDownloadFile, handleGetFile, handleUploadFile } from './handlers';

import type { RouteDefinition } from '../../../engine/src';

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * File route entries as typed tuples for createRouteMap.
 *
 * Endpoints:
 * - POST   files/upload         -> upload a file
 * - GET    files/:id            -> get file metadata + download URL
 * - POST   files/:id/delete     -> delete a file (POST instead of DELETE to avoid map key conflict)
 * - GET    files/:id/download   -> get presigned download URL
 *
 * Note: Route map keys must be unique (Map<string, RouteDefinition>).
 * Since GET files/:id and DELETE files/:id would share the same key,
 * the delete endpoint uses POST files/:id/delete instead.
 *
 * @complexity O(n) where n = number of routes
 */
const fileRouteEntries: [string, RouteDefinition][] = [
  // Upload a file
  [
    'files/upload',
    protectedRoute('POST', handleUploadFile, 'user', fileUploadRequestSchema, {
      summary: 'Upload file',
      tags: ['Files'],
    }),
  ],

  // Get file metadata
  [
    'files/:id',
    protectedRoute('GET', handleGetFile, 'user', undefined, {
      summary: 'Get file metadata',
      tags: ['Files'],
    }),
  ],

  // Delete a file
  [
    'files/:id/delete',
    protectedRoute('POST', handleDeleteFile, 'user', emptyBodySchema, {
      summary: 'Delete file',
      tags: ['Files'],
    }),
  ],

  // Get download URL
  [
    'files/:id/download',
    protectedRoute('GET', handleDownloadFile, 'user', undefined, {
      summary: 'Get download URL',
      tags: ['Files'],
    }),
  ],
];

/**
 * File route map with all file storage endpoints.
 *
 * @complexity O(n) where n = number of route entries
 */
export const fileRoutes = createRouteMap(fileRouteEntries);
