// src/client/api/src/devices/client.ts
/**
 * Device Management API Client
 *
 * Framework-agnostic client for trusted device management endpoints.
 */

import { addAuthHeader } from '@abe-stack/shared';

import { createApiError, NetworkError } from '../errors';

import type { ApiErrorBody } from '../errors';

// ============================================================================
// Types
// ============================================================================

export interface DeviceClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

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
  async function request<T>(method: string, path: string): Promise<T> {
    const url = `${config.baseUrl}${path}`;
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = config.getToken?.() ?? null;
    addAuthHeader(headers, token);

    let response: Response;
    try {
      response = await fetch(url, { method, headers, credentials: 'include' });
    } catch {
      throw new NetworkError('Failed to connect to server');
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
      throw createApiError(response.status, body);
    }

    return (await response.json()) as T;
  }

  return {
    listDevices: () => request<{ devices: DeviceItem[] }>('GET', '/api/users/me/devices'),
    trustDevice: (deviceId) =>
      request<{ device: DeviceItem }>('POST', `/api/users/me/devices/${deviceId}/trust`),
    revokeDevice: (deviceId) =>
      request<{ message: string }>('DELETE', `/api/users/me/devices/${deviceId}`),
    invalidateSessions: () =>
      request<{ message: string }>('POST', '/api/auth/invalidate-sessions'),
  };
}
