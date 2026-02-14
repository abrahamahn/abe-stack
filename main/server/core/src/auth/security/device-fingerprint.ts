// main/server/core/src/auth/security/device-fingerprint.ts
/**
 * Device Fingerprint Helper
 *
 * Generates deterministic fingerprints from IP + user agent for device tracking.
 * Checks trusted devices table and records device access.
 *
 * @module security/device-fingerprint
 */

import { createHash } from 'node:crypto';

import type { Repositories } from '../../../../db/src';

// ============================================================================
// Fingerprint Generation
// ============================================================================

/**
 * Generate a deterministic device fingerprint from IP address and user agent.
 * Uses SHA-256 hash of the concatenated values.
 *
 * @param ipAddress - Client IP address
 * @param userAgent - Browser user agent string
 * @returns Hex-encoded SHA-256 hash of `${ipAddress}:${userAgent}`
 * @complexity O(n) where n is the length of the input strings
 */
export function generateDeviceFingerprint(ipAddress: string, userAgent: string): string {
  const input = `${ipAddress}:${userAgent}`;
  return createHash('sha256').update(input).digest('hex');
}

// ============================================================================
// Device Lookup
// ============================================================================

/**
 * Check if a device fingerprint is known for a given user.
 *
 * @param repos - Repository container
 * @param userId - The user ID to check against
 * @param fingerprint - The device fingerprint hash
 * @returns True if the device has been seen before for this user
 * @complexity O(1) - single database lookup
 */
export async function isKnownDevice(
  repos: Repositories,
  userId: string,
  fingerprint: string,
): Promise<boolean> {
  const device = await repos.trustedDevices.findByFingerprint(userId, fingerprint);
  return device !== null;
}

/**
 * Check if a device fingerprint has been explicitly trusted by the user.
 *
 * @param repos - Repository container
 * @param userId - The user ID to check against
 * @param fingerprint - The device fingerprint hash
 * @returns True if the device has been explicitly trusted (trusted_at is set)
 * @complexity O(1) - single database lookup
 */
export async function isTrustedDevice(
  repos: Repositories,
  userId: string,
  fingerprint: string,
): Promise<boolean> {
  const device = await repos.trustedDevices.findByFingerprint(userId, fingerprint);
  return device !== null && device.trustedAt !== null;
}

// ============================================================================
// Device Access Recording
// ============================================================================

/**
 * Record a device access by upserting the trusted_devices table.
 * If the device exists, update last_seen_at. If new, create a record.
 *
 * @param repos - Repository container
 * @param userId - The user who is accessing from this device
 * @param fingerprint - The device fingerprint hash
 * @param ipAddress - Current IP address
 * @param userAgent - Current user agent string
 * @complexity O(1) - single database upsert
 */
export async function recordDeviceAccess(
  repos: Repositories,
  userId: string,
  fingerprint: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  await repos.trustedDevices.upsert({
    userId,
    deviceFingerprint: fingerprint,
    ipAddress,
    userAgent,
    lastSeenAt: new Date(),
  });
}
