// src/apps/web/src/features/settings/components/DataExportSection.tsx
/**
 * Data Export Section
 *
 * Allows users to request a personal data export and view export status.
 * Displays pending/ready/expired states with appropriate actions.
 */

import { formatDateTime } from '@abe-stack/shared';
import { Alert, Badge, Button, Card, Heading, Text } from '@abe-stack/ui';


import { useDataExport } from '../hooks/useDataExport';

import type { ExportStatus } from '../hooks/useDataExport';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface DataExportSectionProps {
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusBadgeTone(status: ExportStatus): 'success' | 'warning' | 'info' {
  switch (status) {
    case 'ready':
      return 'success';
    case 'pending':
      return 'warning';
    default:
      return 'info';
  }
}

function getStatusLabel(status: ExportStatus): string {
  switch (status) {
    case 'pending':
      return 'Processing';
    case 'ready':
      return 'Ready';
    case 'expired':
      return 'Expired';
    default:
      return 'No Export';
  }
}

// ============================================================================
// Component
// ============================================================================

export const DataExportSection = ({ className }: DataExportSectionProps): ReactElement => {
  const { exportInfo, isLoading, error, requestExport, isRequesting, requestError } =
    useDataExport();

  const handleRequestExport = (): void => {
    void requestExport();
  };

  const currentError = error ?? requestError;
  const status = exportInfo?.status ?? 'none';
  const hasPendingExport = status === 'pending';
  const hasReadyExport = status === 'ready';

  if (isLoading) {
    return (
      <Card className={`p-4 ${className ?? ''}`}>
        <Text tone="muted">Loading export status...</Text>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className ?? ''}`} data-testid="data-export-section">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h4" size="sm" className="mb-1">
              Export Your Data
            </Heading>
            <Text size="sm" tone="muted">
              Download a copy of all your personal data in a portable format.
            </Text>
          </div>
          {status !== 'none' && (
            <Badge tone={getStatusBadgeTone(status)} data-testid="export-status-badge">
              {getStatusLabel(status)}
            </Badge>
          )}
        </div>

        {currentError !== null && (
          <Alert tone="danger" data-testid="export-error">
            {currentError.message}
          </Alert>
        )}

        {hasPendingExport && exportInfo !== null && (
          <Alert tone="info" data-testid="export-pending-alert">
            Your data export is being prepared.
            {exportInfo.estimatedReadyAt !== null && (
              <> Estimated ready by {formatDateTime(exportInfo.estimatedReadyAt)}.</>
            )}
            {exportInfo.requestedAt !== null && (
              <>
                {' '}
                Requested on {formatDateTime(exportInfo.requestedAt)}.
              </>
            )}
          </Alert>
        )}

        {hasReadyExport && exportInfo !== null && (
          <Alert tone="success" data-testid="export-ready-alert">
            Your data export is ready for download.
            {exportInfo.expiresAt !== null && (
              <> The link expires on {formatDateTime(exportInfo.expiresAt)}.</>
            )}
          </Alert>
        )}

        {status === 'expired' && (
          <Alert tone="warning" data-testid="export-expired-alert">
            Your previous export has expired. Request a new one to download your data.
          </Alert>
        )}

        <div className="flex gap-3">
          {hasReadyExport && exportInfo?.downloadUrl !== null && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (exportInfo?.downloadUrl !== null && exportInfo?.downloadUrl !== undefined) {
                  window.open(exportInfo.downloadUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              data-testid="download-export-button"
            >
              Download Export
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={handleRequestExport}
            disabled={isRequesting || hasPendingExport}
            data-testid="request-export-button"
          >
            {isRequesting
              ? 'Requesting...'
              : hasPendingExport
                ? 'Export in Progress'
                : 'Request Export'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
