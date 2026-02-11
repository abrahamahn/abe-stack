// src/server/db/src/schema/trusted-devices.test.ts
/**
 * Unit tests for trusted devices schema type definitions
 *
 * Tests type correctness, constant values, and column mappings for the
 * trusted_devices table schema.
 */

import { describe, expect, test } from 'vitest';

import {
  type NewTrustedDevice,
  type TrustedDevice,
  type UpdateTrustedDevice,
  TRUSTED_DEVICE_COLUMNS,
  TRUSTED_DEVICES_TABLE,
} from './trusted-devices';

describe('Schema Constants', () => {
  describe('Table Names', () => {
    test('TRUSTED_DEVICES_TABLE should be "trusted_devices"', () => {
      expect(TRUSTED_DEVICES_TABLE).toBe('trusted_devices');
      expect(typeof TRUSTED_DEVICES_TABLE).toBe('string');
    });
  });

  describe('TRUSTED_DEVICE_COLUMNS', () => {
    test('should contain all trusted device column mappings', () => {
      expect(TRUSTED_DEVICE_COLUMNS).toEqual({
        id: 'id',
        userId: 'user_id',
        deviceFingerprint: 'device_fingerprint',
        label: 'label',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        firstSeenAt: 'first_seen_at',
        lastSeenAt: 'last_seen_at',
        trustedAt: 'trusted_at',
        createdAt: 'created_at',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(TRUSTED_DEVICE_COLUMNS.userId).toBe('user_id');
      expect(TRUSTED_DEVICE_COLUMNS.deviceFingerprint).toBe('device_fingerprint');
      expect(TRUSTED_DEVICE_COLUMNS.ipAddress).toBe('ip_address');
      expect(TRUSTED_DEVICE_COLUMNS.userAgent).toBe('user_agent');
      expect(TRUSTED_DEVICE_COLUMNS.firstSeenAt).toBe('first_seen_at');
      expect(TRUSTED_DEVICE_COLUMNS.lastSeenAt).toBe('last_seen_at');
      expect(TRUSTED_DEVICE_COLUMNS.trustedAt).toBe('trusted_at');
      expect(TRUSTED_DEVICE_COLUMNS.createdAt).toBe('created_at');
    });

    test('should be a const object (readonly)', () => {
      const keys = Object.keys(TRUSTED_DEVICE_COLUMNS);
      expect(keys).toHaveLength(10);
    });

    test('should have all values as strings', () => {
      const values = Object.values(TRUSTED_DEVICE_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    test('should have unique column names', () => {
      const values = Object.values(TRUSTED_DEVICE_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

describe('TrustedDevice Type Structure', () => {
  describe('TrustedDevice interface', () => {
    test('should accept a valid complete device object', () => {
      const device: TrustedDevice = {
        id: 'device-123',
        userId: 'user-456',
        deviceFingerprint: 'abc123hash',
        label: 'Chrome on Windows',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        firstSeenAt: new Date('2024-01-01'),
        lastSeenAt: new Date('2024-01-15'),
        trustedAt: new Date('2024-01-10'),
        createdAt: new Date('2024-01-01'),
      };

      expect(device.id).toBe('device-123');
      expect(device.deviceFingerprint).toBe('abc123hash');
      expect(device.trustedAt).toBeInstanceOf(Date);
    });

    test('should allow null for nullable fields', () => {
      const device: TrustedDevice = {
        id: 'device-123',
        userId: 'user-456',
        deviceFingerprint: 'abc123hash',
        label: null,
        ipAddress: null,
        userAgent: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        trustedAt: null,
        createdAt: new Date(),
      };

      expect(device.label).toBeNull();
      expect(device.ipAddress).toBeNull();
      expect(device.userAgent).toBeNull();
      expect(device.trustedAt).toBeNull();
    });
  });

  describe('NewTrustedDevice interface', () => {
    test('should accept minimal required fields', () => {
      const newDevice: NewTrustedDevice = {
        userId: 'user-123',
        deviceFingerprint: 'abc123hash',
      };

      expect(newDevice.userId).toBe('user-123');
      expect(newDevice.deviceFingerprint).toBe('abc123hash');
    });

    test('should accept all optional fields', () => {
      const fullDevice: NewTrustedDevice = {
        id: 'custom-id',
        userId: 'user-123',
        deviceFingerprint: 'abc123hash',
        label: 'My Phone',
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        trustedAt: null,
        createdAt: new Date(),
      };

      expect(fullDevice.label).toBe('My Phone');
      expect(fullDevice.ipAddress).toBe('10.0.0.1');
    });
  });

  describe('UpdateTrustedDevice interface', () => {
    test('should allow updating label only', () => {
      const update: UpdateTrustedDevice = {
        label: 'Updated Label',
      };

      expect(update.label).toBe('Updated Label');
    });

    test('should allow updating lastSeenAt', () => {
      const update: UpdateTrustedDevice = {
        lastSeenAt: new Date(),
      };

      expect(update.lastSeenAt).toBeInstanceOf(Date);
    });

    test('should allow setting trustedAt', () => {
      const update: UpdateTrustedDevice = {
        trustedAt: new Date(),
      };

      expect(update.trustedAt).toBeInstanceOf(Date);
    });

    test('should allow empty update object', () => {
      const emptyUpdate: UpdateTrustedDevice = {};

      expect(Object.keys(emptyUpdate)).toHaveLength(0);
    });
  });
});
