// main/apps/web/src/features/settings/hooks/useTotpManagement.ts
/**
 * useTotpManagement hook
 *
 * Manages TOTP (2FA) setup, enable, disable, and status checking.
 * Wraps API calls with loading/error state management.
 *
 * @module settings/hooks
 */

import { getAccessToken } from '@app/authToken';
import { getApiClient } from '@bslt/api';
import { clientConfig } from '@config';
import { useCallback, useEffect, useMemo, useState } from 'react';


import type { TotpSetupResponse } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

export type TotpState = 'loading' | 'enabled' | 'disabled' | 'setup-in-progress';

export interface UseTotpManagementResult {
  /** Current state of TOTP */
  state: TotpState;
  /** Error message if an operation failed */
  error: string | null;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Setup data (secret, otpauth URL, backup codes) — only available during setup */
  setupData: TotpSetupResponse | null;
  /** Start TOTP setup (generate secret and backup codes) */
  beginSetup: () => Promise<void>;
  /** Enable TOTP with verification code */
  enable: (code: string) => Promise<void>;
  /** Disable TOTP with verification code */
  disable: (code: string) => Promise<void>;
  /** Refresh status from server */
  refresh: () => Promise<void>;
  /** Clear setup state and go back to status view */
  cancelSetup: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing TOTP (2FA) settings.
 *
 * @returns TOTP management state and operations
 * @complexity O(1) per operation (async API calls)
 */
export function useTotpManagement(): UseTotpManagementResult {
  const [state, setState] = useState<TotpState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);

  const api = useMemo(
    () =>
      getApiClient({
        baseUrl: clientConfig.apiUrl,
        getToken: getAccessToken,
      }),
    [],
  );

  const fetchStatus = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.totpStatus();
      setState(result.enabled ? 'enabled' : 'disabled');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check 2FA status';
      setError(message);
      setState('disabled');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const beginSetup = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.totpSetup();
      setSetupData(result);
      setState('setup-in-progress');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start 2FA setup';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const enable = useCallback(
    async (code: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.totpEnable({ code });
        if ('message' in result && typeof result.message === 'string') {
          // Check if it was successful by the response message pattern
          setState('enabled');
          setSetupData(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to enable 2FA';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  const disable = useCallback(
    async (code: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await api.totpDisable({ code });
        setState('disabled');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to disable 2FA';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  const cancelSetup = useCallback((): void => {
    setState('disabled');
    setSetupData(null);
    setError(null);
  }, []);

  return {
    state,
    error,
    isLoading,
    setupData,
    beginSetup,
    enable,
    disable,
    refresh: fetchStatus,
    cancelSetup,
  };
}
