// main/apps/web/src/features/activities/api/activitiesApi.ts
/**
 * Activities API Client
 *
 * API client for fetching user and tenant activity feeds.
 */

import { createActivitiesClient } from '@bslt/api';

import type { ActivitiesClient, ActivitiesClientConfig } from '@bslt/api';

// ============================================================================
// Types
// ============================================================================

export type ActivityLocal = import('@bslt/api').ActivityLocal;
export type ActivityListResponse = import('@bslt/api').ActivityListResponse;
export type ActivitiesApiConfig = ActivitiesClientConfig;
export type ActivitiesApi = ActivitiesClient;

// ============================================================================
// API Client
// ============================================================================

export function createActivitiesApi(config: ActivitiesApiConfig): ActivitiesApi {
  return createActivitiesClient(config);
}
