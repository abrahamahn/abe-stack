// src/apps/web/src/features/settings/hooks/useProfileCompleteness.ts
/**
 * Profile Completeness Hook
 *
 * Hook for fetching the user's profile completeness percentage and missing fields.
 */

import { useQuery, useQueryCache } from '@abe-stack/client-engine';
import { MS_PER_MINUTE } from '@abe-stack/shared';

import { createSettingsApi } from '../api';

import type { ProfileCompletenessResponse } from '@abe-stack/shared';

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

export interface UseProfileCompletenessResult {
  data: ProfileCompletenessResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useProfileCompleteness(): UseProfileCompletenessResult {
  const queryCache = useQueryCache();

  const query = useQuery<ProfileCompletenessResponse>({
    queryKey: ['user', 'me', 'profile-completeness'],
    queryFn: async (): Promise<ProfileCompletenessResponse> => {
      const api = getSettingsApi();
      return api.getProfileCompleteness();
    },
    staleTime: MS_PER_MINUTE,
  });

  const refetch = (): void => {
    queryCache.invalidateQuery(['user', 'me', 'profile-completeness']);
  };

  return {
    data: query.data ?? null,
    isLoading: query.status === 'pending',
    isError: query.status === 'error',
    error: query.error ?? null,
    refetch,
  };
}
