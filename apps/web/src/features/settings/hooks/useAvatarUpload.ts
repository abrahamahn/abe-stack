// apps/web/src/features/settings/hooks/useAvatarUpload.ts
/**
 * Avatar Upload Hook
 *
 * Hook for uploading and deleting user avatar.
 */

import { useMutation, useQueryCache } from '@abe-stack/sdk';

import { createSettingsApi, type AvatarDeleteResponse, type AvatarUploadResponse } from '../api';

// ============================================================================
// Settings API Instance
// ============================================================================

let settingsApi: ReturnType<typeof createSettingsApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getSettingsApi(): ReturnType<typeof createSettingsApi> {
  settingsApi ??= createSettingsApi({
    baseUrl: apiBaseUrl,
    getToken: (): string | null => localStorage.getItem('accessToken'),
  });
  return settingsApi;
}

// ============================================================================
// Avatar Upload Hook
// ============================================================================

export interface UseAvatarUploadOptions {
  onSuccess?: (response: AvatarUploadResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseAvatarUploadResult {
  uploadAvatar: (file: File) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  avatarUrl: string | null;
  reset: () => void;
}

export function useAvatarUpload(options?: UseAvatarUploadOptions): UseAvatarUploadResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<AvatarUploadResponse, Error, File>({
    mutationFn: async (file): Promise<AvatarUploadResponse> => {
      const api = getSettingsApi();
      return api.uploadAvatar(file);
    },
    onSuccess: (response) => {
      // Invalidate user query to refresh the cached data
      queryCache.invalidateQuery(['user', 'me']);
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    uploadAvatar: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    avatarUrl: mutation.data?.avatarUrl ?? null,
    reset: mutation.reset,
  };
}

// ============================================================================
// Avatar Delete Hook
// ============================================================================

export interface UseAvatarDeleteOptions {
  onSuccess?: (response: AvatarDeleteResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseAvatarDeleteResult {
  deleteAvatar: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useAvatarDelete(options?: UseAvatarDeleteOptions): UseAvatarDeleteResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<AvatarDeleteResponse>({
    mutationFn: async (): Promise<AvatarDeleteResponse> => {
      const api = getSettingsApi();
      return api.deleteAvatar();
    },
    onSuccess: (response) => {
      queryCache.invalidateQuery(['user', 'me']);
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    deleteAvatar: (): void => {
      mutation.mutate();
    },
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    reset: mutation.reset,
  };
}
