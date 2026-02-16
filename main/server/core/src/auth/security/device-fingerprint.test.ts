// main/server/core/src/auth/security/device-fingerprint.test.ts
/**
 * Tests for Device Fingerprint Helper
 *
 * Validates fingerprint generation, known device checking, trusted device
 * checking, and device access recording.
 */

import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  generateDeviceFingerprint,
  isKnownDevice,
  isTrustedDevice,
  recordDeviceAccess,
} from './device-fingerprint';

import type { Repositories } from '../../../../db/src';

// ============================================================================
// Mock Repositories
// ============================================================================

function createMockRepos(): Repositories {
  return {
    trustedDevices: {
      create: vi.fn(),
      findByUser: vi.fn(),
      findByFingerprint: vi.fn(),
      findById: vi.fn(),
      markTrusted: vi.fn(),
      revoke: vi.fn(),
      updateLastSeen: vi.fn(),
      upsert: vi.fn(),
    },
    users: {} as never,
    refreshTokens: {} as never,
    refreshTokenFamilies: {} as never,
    loginAttempts: {} as never,
    passwordResetTokens: {} as never,
    emailVerificationTokens: {} as never,
    securityEvents: {} as never,
    totpBackupCodes: {} as never,
    emailChangeTokens: {} as never,
    emailChangeRevertTokens: {} as never,
    magicLinkTokens: {} as never,
    oauthConnections: {} as never,
    apiKeys: {} as never,
    pushSubscriptions: {} as never,
    notificationPreferences: {} as never,
    plans: {} as never,
    subscriptions: {} as never,
    customerMappings: {} as never,
    invoices: {} as never,
    paymentMethods: {} as never,
    billingEvents: {} as never,
    userSessions: {} as never,
    tenants: {} as never,
    memberships: {} as never,
    invitations: {} as never,
    notifications: {} as never,
    auditEvents: {} as never,
    jobs: {} as never,
    webhooks: {} as never,
    webhookDeliveries: {} as never,
    featureFlags: {} as never,
    tenantFeatureOverrides: {} as never,
    usageMetrics: {} as never,
    usageSnapshots: {} as never,
    legalDocuments: {} as never,
    userAgreements: {} as never,
    consentLogs: {} as never,
    dataExportRequests: {} as never,
    activities: {} as never,
    webauthnCredentials: {} as never,
    files: {} as never,
  } as Repositories;
}

// ============================================================================
// Tests: generateDeviceFingerprint
// ============================================================================

describe('generateDeviceFingerprint', () => {
  it('should generate a SHA-256 hash of ip:userAgent', () => {
    const ip = '192.168.1.1';
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

    const result = generateDeviceFingerprint(ip, ua);

    const expected = createHash('sha256').update(`${ip}:${ua}`).digest('hex');
    expect(result).toBe(expected);
  });

  it('should produce deterministic output for same inputs', () => {
    const ip = '10.0.0.1';
    const ua = 'TestAgent/1.0';

    const result1 = generateDeviceFingerprint(ip, ua);
    const result2 = generateDeviceFingerprint(ip, ua);

    expect(result1).toBe(result2);
  });

  it('should produce different output for different IPs', () => {
    const ua = 'TestAgent/1.0';

    const result1 = generateDeviceFingerprint('192.168.1.1', ua);
    const result2 = generateDeviceFingerprint('10.0.0.1', ua);

    expect(result1).not.toBe(result2);
  });

  it('should produce different output for different user agents', () => {
    const ip = '192.168.1.1';

    const result1 = generateDeviceFingerprint(ip, 'Chrome/100');
    const result2 = generateDeviceFingerprint(ip, 'Firefox/100');

    expect(result1).not.toBe(result2);
  });

  it('should return a 64-character hex string', () => {
    const result = generateDeviceFingerprint('127.0.0.1', 'TestAgent');

    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle empty strings', () => {
    const result = generateDeviceFingerprint('', '');

    const expected = createHash('sha256').update(':').digest('hex');
    expect(result).toBe(expected);
  });

  it('should handle IPv6 addresses', () => {
    const result = generateDeviceFingerprint(
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      'TestAgent',
    );

    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ============================================================================
// Tests: isKnownDevice
// ============================================================================

describe('isKnownDevice', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  it('should return true when device exists for user', async () => {
    vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceFingerprint: 'abc123',
      label: null,
      ipAddress: '192.168.1.1',
      userAgent: 'TestAgent',
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      trustedAt: null,
      createdAt: new Date(),
    });

    const result = await isKnownDevice(repos, 'user-1', 'abc123');

    expect(result).toBe(true);
    expect(repos.trustedDevices.findByFingerprint).toHaveBeenCalledWith('user-1', 'abc123');
  });

  it('should return false when device does not exist', async () => {
    vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue(null);

    const result = await isKnownDevice(repos, 'user-1', 'unknown-fp');

    expect(result).toBe(false);
  });
});

// ============================================================================
// Tests: isTrustedDevice
// ============================================================================

describe('isTrustedDevice', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  it('should return true when device is explicitly trusted', async () => {
    vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceFingerprint: 'abc123',
      label: null,
      ipAddress: '192.168.1.1',
      userAgent: 'TestAgent',
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      trustedAt: new Date('2024-01-15T10:00:00Z'),
      createdAt: new Date(),
    });

    const result = await isTrustedDevice(repos, 'user-1', 'abc123');

    expect(result).toBe(true);
  });

  it('should return false when device is known but not trusted', async () => {
    vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceFingerprint: 'abc123',
      label: null,
      ipAddress: '192.168.1.1',
      userAgent: 'TestAgent',
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      trustedAt: null,
      createdAt: new Date(),
    });

    const result = await isTrustedDevice(repos, 'user-1', 'abc123');

    expect(result).toBe(false);
  });

  it('should return false when device is unknown', async () => {
    vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue(null);

    const result = await isTrustedDevice(repos, 'user-1', 'unknown-fp');

    expect(result).toBe(false);
  });
});

// ============================================================================
// Tests: recordDeviceAccess
// ============================================================================

describe('recordDeviceAccess', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  it('should upsert the device with correct data', async () => {
    vi.mocked(repos.trustedDevices.upsert).mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceFingerprint: 'abc123',
      label: null,
      ipAddress: '192.168.1.1',
      userAgent: 'TestAgent',
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      trustedAt: null,
      createdAt: new Date(),
    });

    await recordDeviceAccess(repos, 'user-1', 'abc123', '192.168.1.1', 'TestAgent');

    expect(repos.trustedDevices.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        deviceFingerprint: 'abc123',
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent',
        lastSeenAt: expect.any(Date),
      }),
    );
  });

  it('should not throw on successful upsert', async () => {
    vi.mocked(repos.trustedDevices.upsert).mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceFingerprint: 'abc123',
      label: null,
      ipAddress: '10.0.0.1',
      userAgent: 'Chrome/100',
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      trustedAt: null,
      createdAt: new Date(),
    });

    await expect(
      recordDeviceAccess(repos, 'user-1', 'abc123', '10.0.0.1', 'Chrome/100'),
    ).resolves.toBeUndefined();
  });

  it('should propagate errors from repository', async () => {
    vi.mocked(repos.trustedDevices.upsert).mockRejectedValue(new Error('Database error'));

    await expect(
      recordDeviceAccess(repos, 'user-1', 'abc123', '192.168.1.1', 'TestAgent'),
    ).rejects.toThrow('Database error');
  });
});
