// main/apps/web/src/features/settings/components/DevicesList.tsx
/**
 * DevicesList — Displays and manages trusted devices.
 */

import { useDevices } from '@bslt/react';
import { Alert, Card, Heading, Skeleton, Text } from '@bslt/ui';
import { DeviceRowCard } from '@bslt/ui/components/DeviceRowCard';
import { useCallback, useMemo, type ReactElement } from 'react';

// ============================================================================
// DevicesList
// ============================================================================

interface DevicesListProps {
  baseUrl: string;
  getToken?: () => string | null;
}

export const DevicesList = ({ baseUrl, getToken }: DevicesListProps): ReactElement => {
  const clientConfig = useMemo(() => {
    const config: { baseUrl: string; getToken?: () => string | null } = { baseUrl };
    if (getToken !== undefined) {
      config.getToken = getToken;
    }
    return config;
  }, [baseUrl, getToken]);
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
    return <Alert tone="danger">{error.message}</Alert>;
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
          <DeviceRowCard
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
