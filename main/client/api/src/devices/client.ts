// main/client/api/src/devices/client.ts
/**
 * Device Management API Client
 *
 * Framework-agnostic client for trusted device management endpoints.
 */

import {
  deviceListResponseSchema,
  trustDeviceResponseSchema,
  totpVerifyResponseSchema,
  invalidateSessionsResponseSchema,
  type DeviceItem as SharedDeviceItem,
  type InvalidateSessionsResponse,
  type TotpVerifyResponse,
  type TrustDeviceResponse,
} from '@abe-stack/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';

// ============================================================================
// Types
// ============================================================================

export type DeviceClientConfig = BaseClientConfig;
export type DeviceItem = SharedDeviceItem;

export interface DeviceClient {
  listDevices(): Promise<{ devices: DeviceItem[] }>;
  trustDevice(deviceId: string): Promise<TrustDeviceResponse>;
  revokeDevice(deviceId: string): Promise<TotpVerifyResponse>;
  invalidateSessions(): Promise<InvalidateSessionsResponse>;
}

// ============================================================================
// Client Factory
// ============================================================================

export function createDeviceClient(config: DeviceClientConfig): DeviceClient {
  const factory = createRequestFactory(config);

  return {
    listDevices: () =>
      apiRequest(factory, '/users/me/devices', undefined, true, deviceListResponseSchema),
    trustDevice: (deviceId) =>
      apiRequest(
        factory,
        `/users/me/devices/${deviceId}/trust`,
        { method: 'POST' },
        true,
        trustDeviceResponseSchema,
      ),
    revokeDevice: (deviceId) =>
      apiRequest(
        factory,
        `/users/me/devices/${deviceId}`,
        { method: 'DELETE' },
        true,
        totpVerifyResponseSchema,
      ),
    invalidateSessions: () =>
      apiRequest(
        factory,
        '/auth/invalidate-sessions',
        { method: 'POST' },
        true,
        invalidateSessionsResponseSchema,
      ),
  };
}
