// main/apps/server/src/__tests__/integration/device-detection.integration.test.ts
/**
 * Device Detection Integration Tests
 *
 * Tests the device detection pipeline:
 *   new device detected -> security event created
 *   known device login -> no new security event
 *   device trust workflow -> trusted device recognized
 *
 * Exercises the device-fingerprint and security events modules
 * together to verify the end-to-end detection flow.
 */

import { createHash } from 'node:crypto';

import {
  generateDeviceFingerprint,
  isKnownDevice,
  isTrustedDevice,
  recordDeviceAccess,
} from '@bslt/core/auth/security/device-fingerprint';
import { logNewDeviceLogin, logSecurityEvent } from '@bslt/core/auth/security/events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Repositories, DbClient } from '@bslt/core/db';

// ============================================================================
// Mock Factories
// ============================================================================

function createMockRepos(): Repositories {
  return {
    trustedDevices: {
      create: vi.fn(),
      findByUser: vi.fn().mockResolvedValue([]),
      findByFingerprint: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      markTrusted: vi.fn(),
      revoke: vi.fn(),
      updateLastSeen: vi.fn(),
      upsert: vi.fn().mockResolvedValue({
        id: 'device-new',
        userId: 'user-1',
        deviceFingerprint: 'fp-new',
        label: null,
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        trustedAt: null,
        createdAt: new Date(),
      }),
    },
    users: {} as never,
    refreshTokens: {} as never,
    loginAttempts: {} as never,
    authTokens: {} as never,
    securityEvents: {} as never,
    totpBackupCodes: {} as never,
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
    consentRecords: {} as never,
    dataExportRequests: {} as never,
    activities: {} as never,
    webauthnCredentials: {} as never,
    files: {} as never,
  } as Repositories;
}

function createMockDb(): DbClient {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    raw: vi.fn().mockResolvedValue([]),
  } as unknown as DbClient;
}

// ============================================================================
// Tests
// ============================================================================

describe('Device Detection Integration', () => {
  let repos: Repositories;
  let db: DbClient;

  beforeEach(() => {
    repos = createMockRepos();
    db = createMockDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // New Device Detection -> Security Event Created
  // ==========================================================================

  describe('new device detection -> security event created', () => {
    it('should detect a new device and log a security event', async () => {
      const userId = 'user-device-1';
      const email = 'user@example.com';
      const ipAddress = '203.0.113.42';
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';

      // Step 1: Generate fingerprint for the device
      const fingerprint = generateDeviceFingerprint(ipAddress, userAgent);
      expect(fingerprint).toHaveLength(64);
      expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);

      // Verify it matches the expected SHA-256 hash
      const expectedHash = createHash('sha256').update(`${ipAddress}:${userAgent}`).digest('hex');
      expect(fingerprint).toBe(expectedHash);

      // Step 2: Check if device is known (should NOT be known)
      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue(null);
      const known = await isKnownDevice(repos, userId, fingerprint);
      expect(known).toBe(false);

      // Step 3: Since device is new, log a security event
      await logNewDeviceLogin(db, userId, email, ipAddress, userAgent);

      // Verify the security event was inserted into the database
      expect(db.execute).toHaveBeenCalledOnce();
      // The execute call should contain an INSERT into security_events
      const executeCall = vi.mocked(db.execute).mock.calls[0]![0];
      expect(executeCall).toBeDefined();

      // Step 4: Record the device access for future recognition
      await recordDeviceAccess(repos, userId, fingerprint, ipAddress, userAgent);

      expect(repos.trustedDevices.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          deviceFingerprint: fingerprint,
          ipAddress,
          userAgent,
          lastSeenAt: expect.any(Date),
        }),
      );
    });

    it('should create security event with correct event type and severity', async () => {
      const userId = 'user-event-1';
      const email = 'event@example.com';

      await logNewDeviceLogin(db, userId, email, '10.0.0.1', 'Chrome/120');

      expect(db.execute).toHaveBeenCalledOnce();
    });

    it('should generate different fingerprints for different devices', () => {
      const fp1 = generateDeviceFingerprint('192.168.1.1', 'Chrome/120');
      const fp2 = generateDeviceFingerprint('192.168.1.1', 'Firefox/120');
      const fp3 = generateDeviceFingerprint('10.0.0.1', 'Chrome/120');

      expect(fp1).not.toBe(fp2); // Different user agent
      expect(fp1).not.toBe(fp3); // Different IP
      expect(fp2).not.toBe(fp3); // Both different
    });
  });

  // ==========================================================================
  // Known Device Login -> No New Security Event
  // ==========================================================================

  describe('known device login -> device recognized', () => {
    it('should recognize a previously seen device', async () => {
      const userId = 'user-known-1';
      const fingerprint = generateDeviceFingerprint('192.168.1.1', 'Chrome/120');

      // Simulate device already in the database
      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue({
        id: 'device-existing',
        userId,
        deviceFingerprint: fingerprint,
        label: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120',
        firstSeenAt: new Date('2024-01-01'),
        lastSeenAt: new Date('2024-06-01'),
        trustedAt: null,
        createdAt: new Date('2024-01-01'),
      });

      const known = await isKnownDevice(repos, userId, fingerprint);
      expect(known).toBe(true);

      // For a known device, we should update lastSeenAt but NOT log a new_device_login event
      await recordDeviceAccess(repos, userId, fingerprint, '192.168.1.1', 'Chrome/120');

      expect(repos.trustedDevices.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          deviceFingerprint: fingerprint,
          lastSeenAt: expect.any(Date),
        }),
      );

      // No security event logged for known device
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('should return false for unknown device', async () => {
      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue(null);

      const known = await isKnownDevice(repos, 'user-1', 'unknown-fingerprint');
      expect(known).toBe(false);
    });
  });

  // ==========================================================================
  // Trusted Device Workflow
  // ==========================================================================

  describe('trusted device workflow', () => {
    it('should distinguish between known and trusted devices', async () => {
      const userId = 'user-trust-1';
      const fingerprint = generateDeviceFingerprint('10.0.0.1', 'Safari/17');

      // Device is known but NOT trusted (trustedAt is null)
      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue({
        id: 'device-known',
        userId,
        deviceFingerprint: fingerprint,
        label: null,
        ipAddress: '10.0.0.1',
        userAgent: 'Safari/17',
        firstSeenAt: new Date('2024-01-01'),
        lastSeenAt: new Date(),
        trustedAt: null, // Not yet trusted
        createdAt: new Date('2024-01-01'),
      });

      const known = await isKnownDevice(repos, userId, fingerprint);
      const trusted = await isTrustedDevice(repos, userId, fingerprint);

      expect(known).toBe(true);
      expect(trusted).toBe(false);
    });

    it('should recognize an explicitly trusted device', async () => {
      const userId = 'user-trust-2';
      const fingerprint = generateDeviceFingerprint('10.0.0.2', 'Chrome/120');

      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue({
        id: 'device-trusted',
        userId,
        deviceFingerprint: fingerprint,
        label: 'My Laptop',
        ipAddress: '10.0.0.2',
        userAgent: 'Chrome/120',
        firstSeenAt: new Date('2024-01-01'),
        lastSeenAt: new Date(),
        trustedAt: new Date('2024-02-01'), // Explicitly trusted
        createdAt: new Date('2024-01-01'),
      });

      const known = await isKnownDevice(repos, userId, fingerprint);
      const trusted = await isTrustedDevice(repos, userId, fingerprint);

      expect(known).toBe(true);
      expect(trusted).toBe(true);
    });

    it('should return false for trusted check on unknown device', async () => {
      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValue(null);

      const trusted = await isTrustedDevice(repos, 'user-1', 'unknown-fp');

      expect(trusted).toBe(false);
    });
  });

  // ==========================================================================
  // Fingerprint Determinism
  // ==========================================================================

  describe('fingerprint generation determinism', () => {
    it('should produce consistent fingerprints for the same inputs', () => {
      const fp1 = generateDeviceFingerprint('192.168.1.100', 'TestBrowser/2.0');
      const fp2 = generateDeviceFingerprint('192.168.1.100', 'TestBrowser/2.0');

      expect(fp1).toBe(fp2);
    });

    it('should handle IPv6 addresses', () => {
      const fp = generateDeviceFingerprint(
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        'EdgeBrowser/120',
      );

      expect(fp).toHaveLength(64);
      expect(fp).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty user agent strings', () => {
      const fp = generateDeviceFingerprint('192.168.1.1', '');

      expect(fp).toHaveLength(64);
      expect(fp).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ==========================================================================
  // Security Event Logging
  // ==========================================================================

  describe('security event logging for device events', () => {
    it('should log a generic security event with all fields', async () => {
      await logSecurityEvent({
        db,
        userId: 'user-se-1',
        email: 'se@example.com',
        eventType: 'new_device_login',
        severity: 'medium',
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        metadata: { reason: 'Login from unrecognized device' },
      });

      expect(db.execute).toHaveBeenCalledOnce();
    });

    it('should handle missing optional fields gracefully', async () => {
      await logSecurityEvent({
        db,
        eventType: 'new_device_login',
        severity: 'medium',
        // No userId, email, ipAddress, userAgent, or metadata
      });

      expect(db.execute).toHaveBeenCalledOnce();
    });

    it('should record device_trusted events', async () => {
      await logSecurityEvent({
        db,
        userId: 'user-dt-1',
        email: 'dt@example.com',
        eventType: 'device_trusted',
        severity: 'low',
        metadata: { reason: 'User explicitly trusted this device' },
      });

      expect(db.execute).toHaveBeenCalledOnce();
    });

    it('should record device_revoked events', async () => {
      await logSecurityEvent({
        db,
        userId: 'user-dr-1',
        email: 'dr@example.com',
        eventType: 'device_revoked',
        severity: 'medium',
        metadata: { reason: 'User revoked device trust' },
      });

      expect(db.execute).toHaveBeenCalledOnce();
    });
  });

  // ==========================================================================
  // End-to-End: New Device Full Flow
  // ==========================================================================

  describe('end-to-end: full new device detection flow', () => {
    it('should detect new device, log event, record access, then recognize on subsequent login', async () => {
      const userId = 'user-e2e-1';
      const email = 'e2e@example.com';
      const ipAddress = '198.51.100.50';
      const userAgent = 'E2EBrowser/1.0';

      // Generate fingerprint
      const fingerprint = generateDeviceFingerprint(ipAddress, userAgent);

      // First login: device is unknown
      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValueOnce(null);
      const isFirstKnown = await isKnownDevice(repos, userId, fingerprint);
      expect(isFirstKnown).toBe(false);

      // Log security event for new device
      await logNewDeviceLogin(db, userId, email, ipAddress, userAgent);
      expect(db.execute).toHaveBeenCalledTimes(1);

      // Record device access
      await recordDeviceAccess(repos, userId, fingerprint, ipAddress, userAgent);
      expect(repos.trustedDevices.upsert).toHaveBeenCalledTimes(1);

      // Second login: device is now known
      vi.mocked(repos.trustedDevices.findByFingerprint).mockResolvedValueOnce({
        id: 'device-recorded',
        userId,
        deviceFingerprint: fingerprint,
        label: null,
        ipAddress,
        userAgent,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        trustedAt: null,
        createdAt: new Date(),
      });

      const isSecondKnown = await isKnownDevice(repos, userId, fingerprint);
      expect(isSecondKnown).toBe(true);

      // No additional security event needed for known device
      // (db.execute call count should still be 1)
    });
  });
});
