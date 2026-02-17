// main/shared/src/core/auth/auth.devices.schemas.ts
/**
 * @file Auth Device Schemas
 * @description Schemas for device management (fingerprints, trust, listing).
 * @module Core/Auth
 */

import { createSchema, parseBoolean, parseString } from '../../primitives/schema';

import type { Schema } from '../../primitives/schema';

// ============================================================================
// Types
// ============================================================================

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

export interface DeviceListResponse {
  devices: DeviceItem[];
}

export interface TrustDeviceResponse {
  device: DeviceItem;
}

// ============================================================================
// Schemas
// ============================================================================

export const deviceItemSchema: Schema<DeviceItem> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: parseString(obj['id'], 'id'),
    deviceFingerprint: parseString(obj['deviceFingerprint'], 'deviceFingerprint'),
    label: obj['label'] === null ? null : parseString(obj['label'], 'label'),
    ipAddress: obj['ipAddress'] === null ? null : parseString(obj['ipAddress'], 'ipAddress'),
    userAgent: obj['userAgent'] === null ? null : parseString(obj['userAgent'], 'userAgent'),
    firstSeenAt: parseString(obj['firstSeenAt'], 'firstSeenAt'),
    lastSeenAt: parseString(obj['lastSeenAt'], 'lastSeenAt'),
    trusted: parseBoolean(obj['trusted'], 'trusted'),
    createdAt: parseString(obj['createdAt'], 'createdAt'),
  };
});

export const deviceListResponseSchema: Schema<DeviceListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (!Array.isArray(obj['devices'])) {
      throw new Error('devices must be an array');
    }
    return {
      devices: obj['devices'].map((item) => deviceItemSchema.parse(item)),
    };
  },
);

export const trustDeviceResponseSchema: Schema<TrustDeviceResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      device: deviceItemSchema.parse(obj['device']),
    };
  },
);
