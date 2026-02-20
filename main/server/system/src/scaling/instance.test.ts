// main/server/system/src/scaling/instance.test.ts
import { hostname } from 'os';

import { describe, expect, test } from 'vitest';

import { getInstanceId, getInstanceMetadata } from './instance';

// ============================================================================
// Instance ID Tests
// ============================================================================

describe('getInstanceId', () => {
  test('should return a non-empty string', () => {
    const id = getInstanceId();

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('should start with "inst_" prefix', () => {
    const id = getInstanceId();

    expect(id.startsWith('inst_')).toBe(true);
  });

  test('should contain timestamp and random components separated by underscores', () => {
    const id = getInstanceId();
    const parts = id.split('_');

    // Format: inst_<timestamp>_<random>
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('inst');
    // Timestamp part should be hex
    expect(/^[0-9a-f]+$/.test(parts[1] ?? '')).toBe(true);
    // Random part should be 12-char hex (6 bytes)
    expect(parts[2]).toHaveLength(12);
    expect(/^[0-9a-f]+$/.test(parts[2] ?? '')).toBe(true);
  });

  test('should return the same ID on repeated calls (singleton)', () => {
    const id1 = getInstanceId();
    const id2 = getInstanceId();
    const id3 = getInstanceId();

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });
});

// ============================================================================
// Instance Metadata Tests
// ============================================================================

describe('getInstanceMetadata', () => {
  test('should return metadata object with required fields', () => {
    const meta = getInstanceMetadata();

    expect(meta).toHaveProperty('instanceId');
    expect(meta).toHaveProperty('hostname');
    expect(meta).toHaveProperty('pid');
    expect(meta).toHaveProperty('startedAt');
    expect(meta).toHaveProperty('uptimeMs');
  });

  test('should return the same instance ID as getInstanceId()', () => {
    const meta = getInstanceMetadata();
    const id = getInstanceId();

    expect(meta.instanceId).toBe(id);
  });

  test('should return the correct hostname', () => {
    const meta = getInstanceMetadata();

    expect(meta.hostname).toBe(hostname());
  });

  test('should return the current process PID', () => {
    const meta = getInstanceMetadata();

    expect(meta.pid).toBe(process.pid);
    expect(typeof meta.pid).toBe('number');
  });

  test('should return a valid ISO 8601 startedAt timestamp', () => {
    const meta = getInstanceMetadata();
    const parsed = new Date(meta.startedAt);

    expect(parsed.toISOString()).toBe(meta.startedAt);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  test('should return a non-negative uptimeMs', () => {
    const meta = getInstanceMetadata();

    expect(meta.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  test('should return increasing uptimeMs on subsequent calls', async () => {
    const meta1 = getInstanceMetadata();

    // Small delay to ensure uptimeMs increases
    await new Promise((resolve) => setTimeout(resolve, 10));

    const meta2 = getInstanceMetadata();

    expect(meta2.uptimeMs).toBeGreaterThanOrEqual(meta1.uptimeMs);
  });

  test('should return stable values across calls (except uptimeMs)', () => {
    const meta1 = getInstanceMetadata();
    const meta2 = getInstanceMetadata();

    expect(meta1.instanceId).toBe(meta2.instanceId);
    expect(meta1.hostname).toBe(meta2.hostname);
    expect(meta1.pid).toBe(meta2.pid);
    expect(meta1.startedAt).toBe(meta2.startedAt);
  });
});
