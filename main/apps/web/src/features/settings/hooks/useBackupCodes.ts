// main/apps/web/src/features/settings/hooks/useBackupCodes.ts
/**
 * useBackupCodes hook
 *
 * Manages backup codes: viewing remaining count and regenerating new codes.
 * Backup codes are one-time-use codes for 2FA recovery.
 *
 * @module settings/hooks
 */

import { getAccessToken } from '@app/authToken';
import { getApiClient } from '@bslt/api';
import { clientConfig } from '@config';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface BackupCodesStatus {
  /** Number of remaining unused backup codes */
  remaining: number;
  /** Total codes originally generated */
  total: number;
}

export interface UseBackupCodesResult {
  /** Current status (null while loading) */
  status: BackupCodesStatus | null;
  /** Whether loading status */
  isLoading: boolean;
  /** Whether regeneration is in progress */
  isRegenerating: boolean;
  /** Newly generated codes (only available after regeneration) */
  newCodes: string[] | null;
  /** Error message if any */
  error: string | null;
  /** Fetch current backup codes status */
  refresh: () => Promise<void>;
  /** Regenerate backup codes (requires TOTP or password confirmation) */
  regenerate: (confirmationCode: string) => Promise<void>;
  /** Clear the displayed new codes */
  dismissCodes: () => void;
}

interface BackupCodesApi {
  backupCodesStatus: () => Promise<BackupCodesStatus>;
  regenerateBackupCodes: (data: { code: string }) => Promise<{ backupCodes: string[] }>;
}

// ============================================================================
// Hook
// ============================================================================

export function useBackupCodes(): UseBackupCodesResult {
  const [status, setStatus] = useState<BackupCodesStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo<BackupCodesApi>(
    () =>
      getApiClient({
        baseUrl: clientConfig.apiUrl,
        getToken: getAccessToken,
      }) as unknown as BackupCodesApi,
    [],
  );

  const fetchStatus = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.backupCodesStatus();
      setStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch backup codes status';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const regenerate = useCallback(
    async (confirmationCode: string): Promise<void> => {
      setIsRegenerating(true);
      setError(null);
      try {
        const result = await api.regenerateBackupCodes({ code: confirmationCode });
        setNewCodes(result.backupCodes);
        // Refresh status to get updated remaining count
        const updatedStatus = await api.backupCodesStatus();
        setStatus(updatedStatus);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to regenerate backup codes';
        setError(message);
      } finally {
        setIsRegenerating(false);
      }
    },
    [api],
  );

  const dismissCodes = useCallback((): void => {
    setNewCodes(null);
  }, []);

  return {
    status,
    isLoading,
    isRegenerating,
    newCodes,
    error,
    refresh: fetchStatus,
    regenerate,
    dismissCodes,
  };
}
