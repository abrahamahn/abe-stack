// main/apps/web/src/features/media/hooks/useMedia.ts
/**
 * Media Hooks
 *
 * Query and mutation hooks for media upload and retrieval.
 */

import { getAccessToken } from '@app/authToken';
import { useMutation, useQuery } from '@bslt/react';
import { clientConfig } from '@config';
import { useEffect } from 'react';

import { createMediaApi } from '../api';

import type { MediaMetadata, MediaStatusResponse, MediaUploadResponse } from '../api';

// ============================================================================
// API Instance
// ============================================================================

let mediaApi: ReturnType<typeof createMediaApi> | null = null;

function getMediaApi(): ReturnType<typeof createMediaApi> {
  mediaApi ??= createMediaApi({
    baseUrl: clientConfig.apiUrl,
    getToken: getAccessToken,
  });
  return mediaApi;
}

// ============================================================================
// Upload Media
// ============================================================================

export interface UseUploadMediaResult {
  mutate: (file: File) => void;
  mutateAsync: (file: File) => Promise<MediaUploadResponse>;
  data: MediaUploadResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUploadMedia(): UseUploadMediaResult {
  const mutationResult = useMutation<MediaUploadResponse, Error, File>({
    mutationFn: async (file: File): Promise<MediaUploadResponse> => {
      const api = getMediaApi();
      return api.uploadMedia(file);
    },
  });

  return {
    mutate: mutationResult.mutate,
    mutateAsync: mutationResult.mutateAsync,
    data: mutationResult.data,
    isLoading: mutationResult.status === 'pending',
    isError: mutationResult.status === 'error',
    error: mutationResult.error,
    reset: mutationResult.reset,
  };
}

// ============================================================================
// Get Media Metadata
// ============================================================================

export interface UseMediaOptions {
  id: string;
  enabled?: boolean;
}

export interface UseMediaResult {
  media: MediaMetadata | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useMedia(options: UseMediaOptions): UseMediaResult {
  const queryResult = useQuery<MediaMetadata>({
    queryKey: ['media', options.id],
    queryFn: async (): Promise<MediaMetadata> => {
      const api = getMediaApi();
      return api.getMedia(options.id);
    },
    enabled: options.enabled ?? true,
  });

  return {
    media: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

// ============================================================================
// Delete Media
// ============================================================================

export interface UseDeleteMediaResult {
  mutate: (id: string) => void;
  mutateAsync: (id: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useDeleteMedia(): UseDeleteMediaResult {
  const mutationResult = useMutation<undefined, Error, string>({
    mutationFn: async (id: string): Promise<undefined> => {
      const api = getMediaApi();
      await api.deleteMedia(id);
      return undefined;
    },
  });

  return {
    mutate: mutationResult.mutate,
    mutateAsync: mutationResult.mutateAsync,
    isLoading: mutationResult.status === 'pending',
    isError: mutationResult.status === 'error',
    error: mutationResult.error,
    reset: mutationResult.reset,
  };
}

// ============================================================================
// Get Media Processing Status
// ============================================================================

export interface UseMediaStatusOptions {
  id: string;
  enabled?: boolean;
}

export interface UseMediaStatusResult {
  status: MediaStatusResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useMediaStatus(options: UseMediaStatusOptions): UseMediaStatusResult {
  const queryResult = useQuery<MediaStatusResponse>({
    queryKey: ['mediaStatus', options.id],
    queryFn: async (): Promise<MediaStatusResponse> => {
      const api = getMediaApi();
      return api.getMediaStatus(options.id);
    },
    enabled: options.enabled ?? true,
  });

  // Poll when status is pending or processing
  useEffect(() => {
    if (options.enabled === false || options.id === '' || queryResult.data === undefined) {
      return undefined;
    }

    if (queryResult.data.status === 'pending' || queryResult.data.status === 'processing') {
      const interval = setInterval((): void => {
        void queryResult.refetch();
      }, 3000);

      return (): void => {
        clearInterval(interval);
      };
    }

    return undefined;
  }, [options.enabled, options.id, queryResult.data, queryResult.refetch]);

  return {
    status: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
