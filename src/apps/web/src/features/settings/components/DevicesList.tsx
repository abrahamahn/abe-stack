// src/apps/web/src/features/settings/components/DevicesList.tsx
/**
 * DevicesList — Displays and manages trusted devices.
 */

import { Alert, Button, Card, Heading, Skeleton, Text } from '@abe-stack/ui';
import { useCallback, useMemo, type ReactElement } from 'react';

import { useDevices } from '@abe-stack/api';

import type { DeviceItem } from '@abe-stack/api';

// ============================================================================
// Helpers
// ============================================================================

function parseUserAgent(ua: string | null): string {
  if (ua === null || ua === '') return 'Unknown device';
  // Simple UA parsing — extract browser and OS
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Browser';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Device Row
// ============================================================================

interface DeviceRowProps {
  device: DeviceItem;
  onTrust: (id: string) => void;
  onRevoke: (id: string) => void;
}

const DeviceRow = ({ device, onTrust, onRevoke }: DeviceRowProps): ReactElement => {
  const browser = parseUserAgent(device.userAgent);

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Text weight="medium">{device.label ?? browser}</Text>
          {device.trusted && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--ui-badge-success-bg)',
                color: 'var(--ui-color-success)',
              }}
            >
              Trusted
            </span>
          )}
        </div>
        <Text tone="muted" size="sm">
          {device.ipAddress ?? 'Unknown IP'} &middot; Last seen {formatDate(device.lastSeenAt)}
        </Text>
      </div>
      <div className="flex gap-2">
        {!device.trusted && (
          <Button type="button" variant="outline" size="sm" onClick={() => onTrust(device.id)}>
            Trust
          </Button>
        )}
        <Button type="button" variant="danger" size="sm" onClick={() => onRevoke(device.id)}>
          Remove
        </Button>
      </div>
    </Card>
  );
};

// ============================================================================
// DevicesList
// ============================================================================

interface DevicesListProps {
  baseUrl: string;
  getToken?: () => string | null;
}

export const DevicesList = ({ baseUrl, getToken }: DevicesListProps): ReactElement => {
  const clientConfig = useMemo(() => ({ baseUrl, getToken }), [baseUrl, getToken]);
  const { devices, isLoading, error, trustDevice, revokeDevice } = useDevices({
    clientConfig,
    autoFetch: true,
  });

  const handleTrust = useCallback(
    (id: string) => {
      void trustDevice(id);
    },
    [trustDevice],
  );

  const handleRevoke = useCallback(
    (id: string) => {
      void revokeDevice(id);
    },
    [revokeDevice],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error !== null) {
    return <Alert variant="danger">{error.message}</Alert>;
  }

  if (devices.length === 0) {
    return (
      <Card className="p-4">
        <Text tone="muted">No devices recorded yet. Devices are tracked on login.</Text>
      </Card>
    );
  }

  return (
    <div>
      <Heading as="h4" size="sm" className="mb-3">
        Known Devices ({String(devices.length)})
      </Heading>
      <div className="space-y-3">
        {devices.map((device) => (
          <DeviceRow
            key={device.id}
            device={device}
            onTrust={handleTrust}
            onRevoke={handleRevoke}
          />
        ))}
      </div>
    </div>
  );
};
