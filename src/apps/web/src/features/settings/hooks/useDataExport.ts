// src/apps/web/src/features/settings/hooks/useDataExport.ts
/**
 * Data Export Hook
 *
 * Hook for requesting and checking status of user data exports.
 */

import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ExportStatus = 'none' | 'pending' | 'ready' | 'expired';

export interface DataExportInfo {
  /** Current status of the export */
  readonly status: ExportStatus;
  /** When the export was requested */
  readonly requestedAt: string | null;
  /** When the export will be ready (estimated) */
  readonly estimatedReadyAt: string | null;
  /** Download URL when ready */
  readonly downloadUrl: string | null;
  /** When the download link expires */
  readonly expiresAt: string | null;
}

export interface UseDataExportResult {
  /** Current export info */
  exportInfo: DataExportInfo | null;
  /** Whether export info is being loaded */
  isLoading: boolean;
  /** Error from fetching export status */
  error: Error | null;
  /** Request a new data export */
  requestExport: () => Promise<void>;
  /** Whether an export request is in progress */
  isRequesting: boolean;
  /** Error from requesting an export */
  requestError: Error | null;
  /** Refresh the export status */
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Manage user data export requests and status.
 *
 * Fetches current export status on mount and provides a function to request new exports.
 */
export function useDataExport(): UseDataExportResult {
  const [exportInfo, setExportInfo] = useState<DataExportInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<Error | null>(null);

  const fetchExportStatus = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me/export', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch export status');
      }

      const data = (await response.json()) as DataExportInfo;
      setExportInfo(data);
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExportStatus();
  }, [fetchExportStatus]);

  const requestExport = useCallback(async (): Promise<void> => {
    setIsRequesting(true);
    setRequestError(null);

    try {
      const response = await fetch('/api/users/me/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message ?? 'Failed to request data export');
      }

      const data = (await response.json()) as DataExportInfo;
      setExportInfo(data);
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setRequestError(errorObj);
      throw errorObj;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  return {
    exportInfo,
    isLoading,
    error,
    requestExport,
    isRequesting,
    requestError,
    refetch: fetchExportStatus,
  };
}
