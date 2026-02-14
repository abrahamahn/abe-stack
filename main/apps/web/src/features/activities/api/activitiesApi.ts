// main/apps/web/src/features/activities/api/activitiesApi.ts
/**
 * Activities API Client
 *
 * API client for fetching user and tenant activity feeds.
 */

import { createActivitiesClient } from '@abe-stack/api';

import type { ActivitiesClient, ActivitiesClientConfig } from '@abe-stack/api';

// ============================================================================
// Types
// ============================================================================

export type ActivityLocal = import('@abe-stack/api').ActivityLocal;
export type ActivityListResponse = import('@abe-stack/api').ActivityListResponse;
export type ActivitiesApiConfig = ActivitiesClientConfig;
export type ActivitiesApi = ActivitiesClient;

// ============================================================================
// API Client
// ============================================================================

export function createActivitiesApi(config: ActivitiesApiConfig): ActivitiesApi {
  return createActivitiesClient(config);
}
