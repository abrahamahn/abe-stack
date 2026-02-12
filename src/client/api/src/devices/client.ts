// src/client/api/src/devices/client.ts
/**
 * Device Management API Client
 *
 * Framework-agnostic client for trusted device management endpoints.
 */

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';

// ============================================================================
// Types
// ============================================================================

export type DeviceClientConfig = BaseClientConfig;

export interface DeviceItem {
  id: string;
  deviceFingerprint: string;
  label: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  trusted: boolean;
  createdAt: string;
}

export interface DeviceClient {
  listDevices(): Promise<{ devices: DeviceItem[] }>;
  trustDevice(deviceId: string): Promise<{ device: DeviceItem }>;
  revokeDevice(deviceId: string): Promise<{ message: string }>;
  invalidateSessions(): Promise<{ message: string }>;
}

// ============================================================================
// Client Factory
// ============================================================================

export function createDeviceClient(config: DeviceClientConfig): DeviceClient {
  const factory = createRequestFactory(config);

  return {
    listDevices: () => apiRequest<{ devices: DeviceItem[] }>(factory, '/users/me/devices'),
    trustDevice: (deviceId) =>
      apiRequest<{ device: DeviceItem }>(factory, `/users/me/devices/${deviceId}/trust`, {
        method: 'POST',
      }),
    revokeDevice: (deviceId) =>
      apiRequest<{ message: string }>(factory, `/users/me/devices/${deviceId}`, {
        method: 'DELETE',
      }),
    invalidateSessions: () =>
      apiRequest<{ message: string }>(factory, '/auth/invalidate-sessions', {
        method: 'POST',
      }),
  };
}
