// apps/web/src/features/settings/hooks/useProfile.ts
/**
 * Profile Hook
 *
 * Hook for managing user profile updates.
 */

import { useMutation, useQueryCache } from '@abe-stack/client';

import { createSettingsApi, type UpdateProfileRequest, type User } from '../api';

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
// Profile Update Hook
// ============================================================================

export interface UseProfileUpdateOptions {
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
}

export interface UseProfileUpdateResult {
  updateProfile: (data: UpdateProfileRequest) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useProfileUpdate(options?: UseProfileUpdateOptions): UseProfileUpdateResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<User, Error, UpdateProfileRequest>({
    mutationFn: async (data): Promise<User> => {
      const api = getSettingsApi();
      return api.updateProfile(data);
    },
    onSuccess: (user) => {
      // Invalidate user queries to refresh the cached data
      queryCache.invalidateQuery(['user', 'me']);
      queryCache.invalidateQuery(['users']);
      options?.onSuccess?.(user);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    updateProfile: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    reset: mutation.reset,
  };
}
