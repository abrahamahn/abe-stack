// src/apps/web/src/features/settings/hooks/useUsername.ts
/**
 * Username Hook
 *
 * Hook for updating the user's username.
 */

import { useMutation, useQueryCache } from '@abe-stack/client-engine';

import { createSettingsApi } from '../api';

import type { UpdateUsernameRequest, UpdateUsernameResponse } from '@abe-stack/shared';

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
// Types
// ============================================================================

export interface UseUsernameUpdateOptions {
  onSuccess?: (response: UpdateUsernameResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseUsernameUpdateResult {
  updateUsername: (data: UpdateUsernameRequest) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  data: UpdateUsernameResponse | null;
  reset: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useUsernameUpdate(options?: UseUsernameUpdateOptions): UseUsernameUpdateResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<UpdateUsernameResponse, Error, UpdateUsernameRequest>({
    mutationFn: async (data): Promise<UpdateUsernameResponse> => {
      const api = getSettingsApi();
      return api.updateUsername(data);
    },
    onSuccess: (response) => {
      queryCache.invalidateQuery(['user', 'me']);
      queryCache.invalidateQuery(['users']);
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    updateUsername: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    data: mutation.data ?? null,
    reset: mutation.reset,
  };
}
