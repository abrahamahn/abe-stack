// main/apps/web/src/features/settings/hooks/useProfile.ts
/**
 * Profile Hook
 *
 * Hook for managing user profile updates with undo/redo support.
 */

import { getAccessToken } from '@app/authToken';
import { useQueryCache } from '@bslt/react';
import { useUndoableMutation } from '@bslt/react/hooks';
import { clientConfig } from '@config';
import { useEffect, useRef } from 'react';

import { createSettingsApi, type UpdateProfileRequest, type User } from '../api';

// ============================================================================
// Settings API Instance
// ============================================================================

let settingsApi: ReturnType<typeof createSettingsApi> | null = null;

function getSettingsApi(): ReturnType<typeof createSettingsApi> {
  settingsApi ??= createSettingsApi({
    baseUrl: clientConfig.apiUrl,
    getToken: getAccessToken,
  });
  return settingsApi;
}

// ============================================================================
// Profile Update Hook
// ============================================================================

export interface UseProfileUpdateOptions {
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
  /** Current profile data for undo snapshots */
  currentProfile?: Record<string, unknown>;
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
  const profileRef = useRef<Record<string, unknown>>({});

  // Keep snapshot ref in sync with provided profile data
  useEffect(() => {
    if (options?.currentProfile !== undefined) {
      profileRef.current = options.currentProfile;
    }
  });

  const mutation = useUndoableMutation<User, Error, UpdateProfileRequest>({
    mutationFn: async (data): Promise<User> => {
      const api = getSettingsApi();
      return api.updateProfile(data);
    },
    getSnapshot: () => profileRef.current,
    path: ['users', 'me'],
    applyTransaction: async (data) => {
      const api = getSettingsApi();
      await api.updateProfile(data as UpdateProfileRequest);
    },
    onSuccess: (user) => {
      // Invalidate user queries to refresh the cached data
      queryCache.invalidateQuery(['user', 'me']);
      queryCache.invalidateQuery(['users']);
      // Update ref with latest data for future snapshots
      profileRef.current = user as unknown as Record<string, unknown>;
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
