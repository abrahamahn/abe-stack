// main/client/api/src/media/client.ts
/**
 * Media API Client
 *
 * Type-safe client for media upload, retrieval, and management operations.
 */

import { createCsrfRequestClient } from '../utils';

import type { BaseClientConfig } from '../utils';

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

export type MediaClientConfig = BaseClientConfig;

export interface MediaClient {
  uploadMedia: (file: File) => Promise<MediaUploadResponse>;
  getMedia: (id: string) => Promise<MediaMetadata>;
  deleteMedia: (id: string) => Promise<void>;
  getMediaStatus: (id: string) => Promise<MediaStatusResponse>;
}

export function createMediaClient(config: MediaClientConfig): MediaClient {
  const { request } = createCsrfRequestClient(config);

  return {
    async uploadMedia(file: File): Promise<MediaUploadResponse> {
      const formData = new FormData();
      formData.append('file', file);
      return request<MediaUploadResponse>('/media/upload', {
        method: 'POST',
        body: formData,
      });
    },

    async getMedia(id: string): Promise<MediaMetadata> {
      return request<MediaMetadata>(`/media/${id}`);
    },

    async deleteMedia(id: string): Promise<void> {
      await request<undefined>(`/media/${id}/delete`, {
        method: 'DELETE',
      });
    },

    async getMediaStatus(id: string): Promise<MediaStatusResponse> {
      return request<MediaStatusResponse>(`/media/${id}/status`);
    },
  };
}
