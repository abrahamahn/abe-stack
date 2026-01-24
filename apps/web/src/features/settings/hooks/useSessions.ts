// apps/web/src/features/settings/hooks/useSessions.ts
/**
 * Sessions Hook
 *
 * Hook for managing user sessions.
 */

import { useMutation, useQuery, useQueryCache } from '@abe-stack/sdk';

import {
  createSettingsApi,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
  type Session,
  type SessionsListResponse,
} from '../api';

// ============================================================================
// Settings API Instance
// ============================================================================

let settingsApi: ReturnType<typeof createSettingsApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : '';

function getSettingsApi(): ReturnType<typeof createSettingsApi> {
  if (!settingsApi) {
    settingsApi = createSettingsApi({
      baseUrl: apiBaseUrl,
      getToken: (): string | null => localStorage.getItem('accessToken'),
    });
  }
  return settingsApi;
}

// ============================================================================
// Sessions List Hook
// ============================================================================

export interface UseSessionsResult {
  sessions: Session[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSessions(): UseSessionsResult {
  const query = useQuery<SessionsListResponse>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const api = getSettingsApi();
      return api.listSessions();
    },
  });

  return {
    sessions: query.data?.sessions ?? [],
    isLoading: query.status === 'pending',
    isError: query.status === 'error',
    error: query.error,
    refetch: (): void => {
      void query.refetch();
    },
  };
}

// ============================================================================
// Revoke Session Hook
// ============================================================================

export interface UseRevokeSessionOptions {
  onSuccess?: (response: RevokeSessionResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseRevokeSessionResult {
  revokeSession: (sessionId: string) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useRevokeSession(options?: UseRevokeSessionOptions): UseRevokeSessionResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<RevokeSessionResponse, Error, string>({
    mutationFn: async (sessionId) => {
      const api = getSettingsApi();
      return api.revokeSession(sessionId);
    },
    onSuccess: (response) => {
      queryCache.invalidateQuery(['sessions']);
      options?.onSuccess?.(response);
    },
    onError: options?.onError,
  });

  return {
    revokeSession: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    reset: mutation.reset,
  };
}

// ============================================================================
// Revoke All Sessions Hook
// ============================================================================

export interface UseRevokeAllSessionsOptions {
  onSuccess?: (response: RevokeAllSessionsResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseRevokeAllSessionsResult {
  revokeAllSessions: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  revokedCount: number | null;
  reset: () => void;
}

export function useRevokeAllSessions(
  options?: UseRevokeAllSessionsOptions,
): UseRevokeAllSessionsResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<RevokeAllSessionsResponse>({
    mutationFn: async () => {
      const api = getSettingsApi();
      return api.revokeAllSessions();
    },
    onSuccess: (response) => {
      queryCache.invalidateQuery(['sessions']);
      options?.onSuccess?.(response);
    },
    onError: options?.onError,
  });

  return {
    revokeAllSessions: (): void => {
      mutation.mutate();
    },
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    revokedCount: mutation.data?.revokedCount ?? null,
    reset: mutation.reset,
  };
}
