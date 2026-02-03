// apps/web/src/features/settings/hooks/usePasswordChange.ts
/**
 * Password Change Hook
 *
 * Hook for changing user password.
 */

import { useMutation } from '@abe-stack/engine';

import { createSettingsApi, type ChangePasswordRequest, type ChangePasswordResponse } from '../api';

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
// Password Change Hook
// ============================================================================

export interface UsePasswordChangeOptions {
  onSuccess?: (response: ChangePasswordResponse) => void;
  onError?: (error: Error) => void;
}

export interface UsePasswordChangeResult {
  changePassword: (data: ChangePasswordRequest) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function usePasswordChange(options?: UsePasswordChangeOptions): UsePasswordChangeResult {
  const mutation = useMutation<ChangePasswordResponse, Error, ChangePasswordRequest>({
    mutationFn: async (data): Promise<ChangePasswordResponse> => {
      const api = getSettingsApi();
      return api.changePassword(data);
    },
    onSuccess: (data: ChangePasswordResponse): void => {
      options?.onSuccess?.(data);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    changePassword: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    reset: mutation.reset,
  };
}
