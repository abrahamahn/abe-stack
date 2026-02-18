// main/apps/web/src/features/media/api/mediaApi.ts
/**
 * Media API Client
 *
 * API client for media upload, retrieval, and management operations.
 */

import { createMediaClient } from '@bslt/api';

import type { MediaClient, MediaClientConfig } from '@bslt/api';

// ============================================================================
// Types
// ============================================================================

export type MediaUploadResponse = import('@bslt/api').MediaUploadResponse;
export type MediaMetadata = import('@bslt/api').ApiMediaMetadata;
export type MediaStatusResponse = import('@bslt/api').MediaStatusResponse;
export type MediaApiConfig = MediaClientConfig;
export type MediaApi = MediaClient;

// ============================================================================
// API Client
// ============================================================================

export function createMediaApi(config: MediaApiConfig): MediaApi {
  return createMediaClient(config);
}
