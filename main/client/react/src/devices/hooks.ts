// main/client/react/src/devices/hooks.ts
/**
 * Device Management React Hooks
 *
 * Uses useQuery/useMutation for data fetching and mutations.
 */

import { createDeviceClient } from '@bslt/client-engine';
import { useMemo } from 'react';

import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type { DeviceClientConfig, DeviceItem } from '@bslt/client-engine';

// ============================================================================
// Query Keys
// ============================================================================

export const devicesQueryKeys = {
  all: ['devices'] as const,
  list: () => [...devicesQueryKeys.all, 'list'] as const,
};

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
  trustDevice: (deviceId: string) => Promise<{ device: DeviceItem }>;
  revokeDevice: (deviceId: string) => Promise<{ message: string }>;
  invalidateSessions: () => Promise<{ message: string }>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDevices(options: UseDevicesOptions): DevicesState {
  const { clientConfig, autoFetch = true } = options;
  const client = useMemo(() => createDeviceClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: devicesQueryKeys.list(),
    queryFn: () => client.listDevices(),
    enabled: autoFetch,
  });

  const trustMutation = useMutation({
    mutationFn: (deviceId: string) => client.trustDevice(deviceId),
    invalidateOnSuccess: [devicesQueryKeys.list()],
  });

  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) => client.revokeDevice(deviceId),
    invalidateOnSuccess: [devicesQueryKeys.list()],
  });

  const invalidateSessionsMutation = useMutation<{ message: string }>({
    mutationFn: () => client.invalidateSessions(),
  });

  return {
    devices: query.data?.devices ?? [],
    isLoading: query.isLoading,
    error:
      query.error ??
      trustMutation.error ??
      revokeMutation.error ??
      invalidateSessionsMutation.error ??
      null,
    refresh: query.refetch,
    trustDevice: trustMutation.mutateAsync,
    revokeDevice: revokeMutation.mutateAsync,
    invalidateSessions: invalidateSessionsMutation.mutateAsync,
  };
}
