// main/shared/src/contracts/contract.activities.ts
/**
 * Activities Contracts
 *
 * API contract definitions for the activity feed (workspace and user scoped).
 * @module Contracts/Activities
 */

import { activitiesListFiltersSchema, activitySchema } from '../core/activities/activities.schemas';
import { errorResponseSchema, successResponseSchema } from '../engine/http';
import { cursorPaginatedResultSchema } from '../engine/pagination';

import type { Contract } from '../primitives/api';

// ============================================================================
// Response Schemas
// ============================================================================

const activitiesListResponseSchema = cursorPaginatedResultSchema(activitySchema);

// ============================================================================
// Contract Definition
// ============================================================================

export const activitiesContract = {
  listForWorkspace: {
    method: 'GET' as const,
    path: '/api/tenants/:tenantId/activities',
    query: activitiesListFiltersSchema,
    responses: {
      200: successResponseSchema(activitiesListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'List activities for a workspace (cursor-paginated)',
  },

  listForUser: {
    method: 'GET' as const,
    path: '/api/users/me/activities',
    query: activitiesListFiltersSchema,
    responses: {
      200: successResponseSchema(activitiesListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List activities for the authenticated user (cursor-paginated)',
  },
} satisfies Contract;
