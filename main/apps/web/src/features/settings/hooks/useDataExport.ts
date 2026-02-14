// main/apps/web/src/features/settings/hooks/useDataExport.ts
/**
 * Data Export Hook
 *
 * Hook for requesting and checking status of user data exports.
 */

import { getApiClient, isApiError } from '@abe-stack/api';
import { useLocalStorageValue } from '@abe-stack/react/hooks';
import { useClientEnvironment } from '@app/ClientEnvironment';
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

interface ExportRequestPayload {
  exportRequest?: {
    id?: unknown;
    status?: unknown;
    createdAt?: unknown;
    expiresAt?: unknown;
    downloadUrl?: unknown;
  };
}

const EXPORT_REQUEST_ID_KEY = 'dataExportRequestId';

const mapExportStatus = (
  rawStatus: string | null,
  downloadUrl: string | null,
  expiresAt: string | null,
): ExportStatus => {
  if (rawStatus === 'pending' || rawStatus === 'processing') {
    return 'pending';
  }
  if (rawStatus === 'completed' && downloadUrl !== null) {
    if (expiresAt !== null && new Date(expiresAt).getTime() < Date.now()) {
      return 'expired';
    }
    return 'ready';
  }
  return 'none';
};

const parseExportInfo = (payload: unknown): { info: DataExportInfo | null; id: string | null } => {
  const request = (payload as ExportRequestPayload | null | undefined)?.exportRequest;
  if (request == null || typeof request !== 'object') {
    return { info: null, id: null };
  }

  const id = typeof request.id === 'string' && request.id.length > 0 ? request.id : null;
  const rawStatus = typeof request.status === 'string' ? request.status : null;
  const requestedAt = typeof request.createdAt === 'string' ? request.createdAt : null;
  const expiresAt = typeof request.expiresAt === 'string' ? request.expiresAt : null;
  const downloadUrl = typeof request.downloadUrl === 'string' ? request.downloadUrl : null;

  return {
    id,
    info: {
      status: mapExportStatus(rawStatus, downloadUrl, expiresAt),
      requestedAt,
      estimatedReadyAt: null,
      downloadUrl,
      expiresAt,
    },
  };
};

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
  const { config } = useClientEnvironment();
  const [exportInfo, setExportInfo] = useState<DataExportInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<Error | null>(null);
  const [exportRequestId, setExportRequestId] = useLocalStorageValue(EXPORT_REQUEST_ID_KEY);

  const fetchExportStatus = useCallback(async (): Promise<void> => {
    if (exportRequestId === null || exportRequestId.length === 0) {
      setExportInfo(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const api = getApiClient({
        baseUrl: config.apiUrl,
      });
      const data = await api.getDataExportStatus(exportRequestId);

      const parsed = parseExportInfo(data);
      setExportInfo(parsed.info);

      if (parsed.id !== null && parsed.id !== exportRequestId) {
        setExportRequestId(parsed.id);
      }
    } catch (err: unknown) {
      if (isApiError(err) && err.status === 404) {
        setExportInfo(null);
        setExportRequestId(null);
        return;
      }
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [config.apiUrl, exportRequestId]);

  useEffect(() => {
    void fetchExportStatus();
  }, [fetchExportStatus]);

  const requestExport = useCallback(async (): Promise<void> => {
    setIsRequesting(true);
    setRequestError(null);

    try {
      const api = getApiClient({
        baseUrl: config.apiUrl,
      });
      const data = await api.requestDataExport();
      const parsed = parseExportInfo(data);
      setExportInfo(parsed.info);
      if (parsed.id !== null) {
        setExportRequestId(parsed.id);
      }
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setRequestError(errorObj);
      throw errorObj;
    } finally {
      setIsRequesting(false);
    }
  }, [config.apiUrl]);

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
