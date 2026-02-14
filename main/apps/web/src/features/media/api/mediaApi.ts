// main/apps/web/src/features/media/api/mediaApi.ts
/**
 * Media API Client
 *
 * API client for media upload, retrieval, and management operations.
 */

import { createMediaClient } from '@abe-stack/api';

import type { MediaClient, MediaClientConfig } from '@abe-stack/api';

// ============================================================================
// Types
// ============================================================================

export type MediaUploadResponse = import('@abe-stack/api').MediaUploadResponse;
export type MediaMetadata = import('@abe-stack/api').ApiMediaMetadata;
export type MediaStatusResponse = import('@abe-stack/api').MediaStatusResponse;
export type MediaApiConfig = MediaClientConfig;
export type MediaApi = MediaClient;

// ============================================================================
// API Client
// ============================================================================

export function createMediaApi(config: MediaApiConfig): MediaApi {
  return createMediaClient(config);
}
