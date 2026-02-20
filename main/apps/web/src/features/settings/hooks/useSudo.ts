// main/apps/web/src/features/settings/hooks/useSudo.ts
/**
 * Sudo Hook
 *
 * Hook for sudo re-authentication (elevated privilege confirmation).
 */

import { getAccessToken } from '@app/authToken';
import { useMutation } from '@bslt/react';
import { clientConfig } from '@config';

import { createSettingsApi } from '../api';

import type { SudoRequest, SudoResponse } from '@bslt/shared';

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
// Types
// ============================================================================

export interface UseSudoOptions {
  onSuccess?: (response: SudoResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseSudoResult {
  sudo: (data: SudoRequest) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  data: SudoResponse | null;
  reset: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useSudo(options?: UseSudoOptions): UseSudoResult {
  const mutation = useMutation<SudoResponse, Error, SudoRequest>({
    mutationFn: async (data): Promise<SudoResponse> => {
      const api = getSettingsApi();
      return api.sudo(data);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    sudo: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    data: mutation.data ?? null,
    reset: mutation.reset,
  };
}
