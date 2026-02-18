// main/apps/web/src/features/media/components/MediaStatusIndicator.tsx
/**
 * MediaStatusIndicator Component
 *
 * Displays the processing status of a media file with polling.
 */

import { Spinner, Text } from '@bslt/ui';
import React from 'react';

import { useMediaStatus } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface MediaStatusIndicatorProps {
  mediaId: string;
}

// ============================================================================
// Component
// ============================================================================

export function MediaStatusIndicator({ mediaId }: MediaStatusIndicatorProps): React.JSX.Element {
  const { status, isLoading, isError } = useMediaStatus({
    id: mediaId,
    enabled: true,
  });

  if (isLoading && status === undefined) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ui-gap-sm)',
        }}
      >
        <Spinner size="sm" />
        <Text style={{ color: 'var(--ui-color-text-muted)' }}>Loading status...</Text>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ui-gap-sm)',
          padding: 'var(--ui-gap-md)',
          backgroundColor: 'var(--ui-alert-danger-bg)',
          border: '1px solid var(--ui-alert-danger-border)',
          borderRadius: 'var(--ui-radius-md)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--ui-font-size-lg)',
            color: 'var(--ui-alert-danger-text)',
          }}
        >
          ✕
        </span>
        <Text style={{ color: 'var(--ui-alert-danger-text)' }}>Failed to load status</Text>
      </div>
    );
  }

  if (status === undefined) {
    return <Text style={{ color: 'var(--ui-color-text-muted)' }}>No status available</Text>;
  }

  const getStatusDisplay = (): React.JSX.Element => {
    switch (status.status) {
      case 'pending':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ui-gap-sm)',
              padding: 'var(--ui-gap-md)',
              backgroundColor: 'var(--ui-alert-info-bg)',
              border: '1px solid var(--ui-alert-info-border)',
              borderRadius: 'var(--ui-radius-md)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--ui-font-size-lg)',
                color: 'var(--ui-alert-info-text)',
              }}
            >
              🕐
            </span>
            <Text style={{ color: 'var(--ui-alert-info-text)' }}>Pending processing</Text>
          </div>
        );

      case 'processing':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ui-gap-sm)',
              padding: 'var(--ui-gap-md)',
              backgroundColor: 'var(--ui-alert-info-bg)',
              border: '1px solid var(--ui-alert-info-border)',
              borderRadius: 'var(--ui-radius-md)',
            }}
          >
            <Spinner size="sm" />
            <Text style={{ color: 'var(--ui-alert-info-text)' }}>Processing...</Text>
          </div>
        );

      case 'complete':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ui-gap-sm)',
              padding: 'var(--ui-gap-md)',
              backgroundColor: 'var(--ui-alert-success-bg)',
              border: '1px solid var(--ui-alert-success-border)',
              borderRadius: 'var(--ui-radius-md)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--ui-font-size-lg)',
                color: 'var(--ui-alert-success-text)',
              }}
            >
              ✓
            </span>
            <Text style={{ color: 'var(--ui-alert-success-text)' }}>Processing complete</Text>
          </div>
        );

      case 'failed':
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ui-gap-sm)',
              padding: 'var(--ui-gap-md)',
              backgroundColor: 'var(--ui-alert-danger-bg)',
              border: '1px solid var(--ui-alert-danger-border)',
              borderRadius: 'var(--ui-radius-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ui-gap-sm)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--ui-font-size-lg)',
                  color: 'var(--ui-alert-danger-text)',
                }}
              >
                ✕
              </span>
              <Text style={{ color: 'var(--ui-alert-danger-text)' }}>Processing failed</Text>
            </div>
            {status.error !== null && (
              <Text
                style={{
                  color: 'var(--ui-alert-danger-text)',
                  fontSize: 'var(--ui-font-size-sm)',
                }}
              >
                {status.error}
              </Text>
            )}
          </div>
        );

      default:
        return <Text style={{ color: 'var(--ui-color-text-muted)' }}>Unknown status</Text>;
    }
  };

  return getStatusDisplay();
}
