// main/apps/web/src/features/admin/hooks/useExportEvents.ts
/**
 * useExportEvents hook
 *
 * Export security events as CSV or JSON.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMutation } from '@bslt/react';
import { useCallback, useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

interface SecurityEventsFilterLocal {
  eventType?: string;
  severity?: string;
  email?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

interface SecurityEventsExportRequestLocal {
  format: 'csv' | 'json';
  filter?: SecurityEventsFilterLocal;
}

interface SecurityEventsExportResponseLocal {
  data: string;
  contentType: string;
  filename: string;
}

export interface UseExportEventsResult {
  exportEvents: (format: 'csv' | 'json', filter?: SecurityEventsFilterLocal) => void;
  downloadExport: (format: 'csv' | 'json', filter?: SecurityEventsFilterLocal) => void;
  isExporting: boolean;
  isError: boolean;
  error: Error | null;
  data: SecurityEventsExportResponseLocal | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useExportEvents(): UseExportEventsResult {
  const { config } = useClientEnvironment();

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      }),
    [config.apiUrl],
  );

  const mutation = useMutation<
    SecurityEventsExportResponseLocal,
    Error,
    SecurityEventsExportRequestLocal
  >({
    mutationFn: async (
      request: SecurityEventsExportRequestLocal,
    ): Promise<SecurityEventsExportResponseLocal> => {
      const result = await adminApi.exportSecurityEvents(request);
      return result as SecurityEventsExportResponseLocal;
    },
  });

  const exportEvents = useCallback(
    (format: 'csv' | 'json', filter?: SecurityEventsFilterLocal) => {
      mutation.mutate({ format, ...(filter !== undefined && { filter }) });
    },
    [mutation],
  );

  const downloadExport = useCallback(
    (format: 'csv' | 'json', filter?: SecurityEventsFilterLocal) => {
      void mutation
        .mutateAsync({ format, ...(filter !== undefined && { filter }) })
        .then((response: SecurityEventsExportResponseLocal) => {
          // Create a blob and download link
          const blob = new Blob([response.data], { type: response.contentType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = response.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        })
        .catch(() => {
          // Error is already handled in mutation state
        });
    },
    [mutation],
  );

  return {
    exportEvents,
    downloadExport,
    isExporting: mutation.status === 'pending',
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data ?? null,
  };
}
