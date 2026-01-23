// apps/web/src/features/admin/hooks/useExportEvents.ts
/**
 * useExportEvents hook
 *
 * Export security events as CSV or JSON.
 */

import { tokenStore } from '@abe-stack/core';
import { useMutation, type UseMutationResult } from '@abe-stack/sdk';
import { useCallback, useMemo } from 'react';

import { useClientEnvironment } from '@app/ClientEnvironment';

import { createAdminApiClient } from '../services/adminApi';

import type {
  SecurityEventsExportRequest,
  SecurityEventsExportResponse,
  SecurityEventsFilter,
} from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface UseExportEventsResult {
  exportEvents: (format: 'csv' | 'json', filter?: SecurityEventsFilter) => void;
  downloadExport: (format: 'csv' | 'json', filter?: SecurityEventsFilter) => void;
  isExporting: boolean;
  isError: boolean;
  error: Error | null;
  data: SecurityEventsExportResponse | null;
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
        getToken: () => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const mutation: UseMutationResult<SecurityEventsExportResponse, Error, SecurityEventsExportRequest> =
    useMutation({
      mutationFn: async (request: SecurityEventsExportRequest) => {
        return adminApi.exportSecurityEvents(request);
      },
    });

  const exportEvents = useCallback(
    (format: 'csv' | 'json', filter?: SecurityEventsFilter) => {
      mutation.mutate({ format, filter });
    },
    [mutation],
  );

  const downloadExport = useCallback(
    (format: 'csv' | 'json', filter?: SecurityEventsFilter) => {
      void mutation.mutateAsync({ format, filter }).then((response) => {
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
      }).catch(() => {
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
