// src/client/api/src/devices/hooks.ts
/**
 * Device Management React Hooks
 *
 * Wraps the device client in React state management.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createDeviceClient } from './client';

import type { DeviceClientConfig, DeviceItem } from './client';

// ============================================================================
// Types
// ============================================================================

export interface UseDevicesOptions {
  clientConfig: DeviceClientConfig;
  autoFetch?: boolean;
}

export interface DevicesState {
  devices: DeviceItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  trustDevice: (deviceId: string) => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  invalidateSessions: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDevices(options: UseDevicesOptions): DevicesState {
  const { clientConfig, autoFetch = true } = options;
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createDeviceClient(clientConfig), [clientConfig]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.listDevices();
      setDevices(result.devices);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const trustDevice = useCallback(
    async (deviceId: string) => {
      try {
        const result = await client.trustDevice(deviceId);
        setDevices((prev) => prev.map((d) => (d.id === deviceId ? result.device : d)));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [client],
  );

  const revokeDevice = useCallback(
    async (deviceId: string) => {
      try {
        await client.revokeDevice(deviceId);
        setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [client],
  );

  const invalidateSessions = useCallback(async () => {
    try {
      await client.invalidateSessions();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [client]);

  useEffect(() => {
    if (autoFetch) {
      void refresh();
    }
  }, [autoFetch, refresh]);

  return { devices, isLoading, error, refresh, trustDevice, revokeDevice, invalidateSessions };
}
