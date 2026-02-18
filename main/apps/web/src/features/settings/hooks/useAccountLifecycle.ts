// main/apps/web/src/features/settings/hooks/useAccountLifecycle.ts
/**
 * Account Lifecycle Hooks
 *
 * Hooks for account deactivation, deletion request, and reactivation.
 */

import { getAccessToken } from '@app/authToken';
import { useMutation } from '@bslt/react';

import { createSettingsApi } from '../api';

import type {
  AccountLifecycleResponse,
  DeactivateAccountRequest,
  DeleteAccountRequest,
} from '@bslt/shared';

// ============================================================================
// Settings API Instance
// ============================================================================

let settingsApi: ReturnType<typeof createSettingsApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getSettingsApi(): ReturnType<typeof createSettingsApi> {
  settingsApi ??= createSettingsApi({
    baseUrl: apiBaseUrl,
    getToken: getAccessToken,
  });
  return settingsApi;
}

// ============================================================================
// Types
// ============================================================================

export interface UseDeactivateAccountOptions {
  onSuccess?: (response: AccountLifecycleResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseDeactivateAccountResult {
  deactivate: (data: DeactivateAccountRequest, sudoToken: string) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseDeleteAccountOptions {
  onSuccess?: (response: AccountLifecycleResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseDeleteAccountResult {
  requestDeletion: (data: DeleteAccountRequest, sudoToken: string) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseReactivateAccountOptions {
  onSuccess?: (response: AccountLifecycleResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseReactivateAccountResult {
  reactivate: () => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

export function useDeactivateAccount(
  options?: UseDeactivateAccountOptions,
): UseDeactivateAccountResult {
  const mutation = useMutation<
    AccountLifecycleResponse,
    Error,
    { data: DeactivateAccountRequest; sudoToken: string }
  >({
    mutationFn: async ({ data, sudoToken }): Promise<AccountLifecycleResponse> => {
      const api = getSettingsApi();
      return api.deactivateAccount(data, sudoToken);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    deactivate: (data: DeactivateAccountRequest, sudoToken: string): void => {
      mutation.mutate({ data, sudoToken });
    },
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useDeleteAccount(options?: UseDeleteAccountOptions): UseDeleteAccountResult {
  const mutation = useMutation<
    AccountLifecycleResponse,
    Error,
    { data: DeleteAccountRequest; sudoToken: string }
  >({
    mutationFn: async ({ data, sudoToken }): Promise<AccountLifecycleResponse> => {
      const api = getSettingsApi();
      return api.requestDeletion(data, sudoToken);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    requestDeletion: (data: DeleteAccountRequest, sudoToken: string): void => {
      mutation.mutate({ data, sudoToken });
    },
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useReactivateAccount(
  options?: UseReactivateAccountOptions,
): UseReactivateAccountResult {
  const mutation = useMutation<AccountLifecycleResponse>({
    mutationFn: async (): Promise<AccountLifecycleResponse> => {
      const api = getSettingsApi();
      return api.reactivateAccount();
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    reactivate: (): void => {
      mutation.mutate();
    },
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}
