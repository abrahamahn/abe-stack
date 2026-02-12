// src/apps/web/src/features/media/api/mediaApi.ts
/**
 * Media API Client
 *
 * API client for media upload, retrieval, and management operations.
 */

import { createApiError, NetworkError } from '@abe-stack/client-engine';
import { addAuthHeader, API_PREFIX, trimTrailingSlashes } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface MediaUploadResponse {
  fileId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  processingJobId: string | null;
}

export interface MediaMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
  purpose: string;
  processingStatus: 'pending' | 'processing' | 'complete' | 'failed';
  createdAt: string;
}

export interface MediaStatusResponse {
  fileId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  error: string | null;
}

export interface MediaApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface MediaApi {
  uploadMedia: (file: File) => Promise<MediaUploadResponse>;
  getMedia: (id: string) => Promise<MediaMetadata>;
  deleteMedia: (id: string) => Promise<void>;
  getMediaStatus: (id: string) => Promise<MediaStatusResponse>;
}

// ============================================================================
// API Client
// ============================================================================

export function createMediaApi(config: MediaApiConfig): MediaApi {
  const baseUrl = trimTrailingSlashes(config.baseUrl);
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T = unknown>(
    path: string,
    options: {
      method?: string;
      body?: FormData;
      headers?: Headers;
    } = {},
  ): Promise<T | undefined> => {
    const headers = options.headers ?? new Headers();

    // Only set Content-Type for non-FormData requests
    // FormData sets multipart/form-data with boundary automatically
    if (options.body === undefined || !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    addAuthHeader(headers, config.getToken?.());

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      const fetchOptions: RequestInit = {
        method: options.method ?? 'GET',
        headers,
        credentials: 'include',
      };

      if (options.body !== undefined) {
        fetchOptions.body = options.body;
      }

      response = await fetcher(url, fetchOptions);
    } catch (error: unknown) {
      throw new NetworkError(
        `Failed to fetch ${options.method ?? 'GET'} ${path}`,
        error instanceof Error ? error : undefined,
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined;
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data as { message?: string; code?: string });
    }

    return data as T;
  };

  return {
    async uploadMedia(file: File): Promise<MediaUploadResponse> {
      const formData = new FormData();
      formData.append('file', file);

      const result = await request<MediaUploadResponse>('/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (result === undefined) {
        throw new Error('Upload failed: no response data');
      }

      return result;
    },

    async getMedia(id: string): Promise<MediaMetadata> {
      const result = await request<MediaMetadata>(`/media/${id}`);

      if (result === undefined) {
        throw new Error('Get media failed: no response data');
      }

      return result;
    },

    async deleteMedia(id: string): Promise<void> {
      await request<undefined>(`/media/${id}/delete`, {
        method: 'DELETE',
      });
    },

    async getMediaStatus(id: string): Promise<MediaStatusResponse> {
      const result = await request<MediaStatusResponse>(`/media/${id}/status`);

      if (result === undefined) {
        throw new Error('Get status failed: no response data');
      }

      return result;
    },
  };
}
