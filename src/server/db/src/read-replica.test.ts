// src/server/db/src/read-replica.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createReadReplicaClient } from './read-replica';

import type { RawDb } from './client';

vi.mock('./client', () => {
  let callCount = 0;
  return {
    createRawDb: vi
      .fn()
      .mockImplementation((urlOrConfig: string | { connectionString: string }) => {
        callCount += 1;
        const url = typeof urlOrConfig === 'string' ? urlOrConfig : urlOrConfig.connectionString;
        return { __mockId: callCount, __url: url } as unknown as RawDb;
      }),
  };
});

describe('createReadReplicaClient', () => {
  test('no replica URL: read and write are the same reference', () => {
    const result = createReadReplicaClient('postgres://primary:5432/db');

    expect(result.primary).toBe(result.replica);
    expect(result.read).toBe(result.write);
    expect(result.read).toBe(result.primary);
  });

  test('empty string replica URL: same as no replica', () => {
    const result = createReadReplicaClient('postgres://primary:5432/db', '');

    expect(result.primary).toBe(result.replica);
    expect(result.read).toBe(result.write);
    expect(result.read).toBe(result.primary);
  });

  test('with replica URL: read and write are different references', () => {
    const result = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
    );

    expect(result.write).toBe(result.primary);
    expect(result.read).toBe(result.replica);
    expect(result.read).not.toBe(result.write);
  });

  test('with replica URL: primary and replica have correct URLs', () => {
    const result = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
    );

    const primary = result.primary as unknown as { __url: string };
    const replica = result.replica as unknown as { __url: string };

    expect(primary.__url).toBe('postgres://primary:5432/db');
    expect(replica.__url).toBe('postgres://replica:5432/db');
  });
});

describe('readClient() routing', () => {
  test('returns replica by default (eventual consistency)', () => {
    const client = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
    );

    expect(client.readClient()).toBe(client.replica);
    expect(client.readClient({ consistency: 'eventual' })).toBe(client.replica);
  });

  test('returns primary for strong consistency', () => {
    const client = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
    );

    expect(client.readClient({ consistency: 'strong' })).toBe(client.primary);
  });

  test('no replica: readClient always returns primary', () => {
    const client = createReadReplicaClient('postgres://primary:5432/db');

    expect(client.readClient()).toBe(client.primary);
    expect(client.readClient({ consistency: 'eventual' })).toBe(client.primary);
    expect(client.readClient({ consistency: 'strong' })).toBe(client.primary);
  });
});

describe('markWrite() grace period', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('after markWrite(), readClient returns primary within grace period', () => {
    const client = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
    );

    client.markWrite();

    // Immediately after write — should route to primary
    expect(client.readClient()).toBe(client.primary);

    // Still within default grace period (2000ms)
    vi.advanceTimersByTime(1500);
    expect(client.readClient()).toBe(client.primary);
  });

  test('after grace period expires, readClient returns replica again', () => {
    const client = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
    );

    client.markWrite();
    expect(client.readClient()).toBe(client.primary);

    // Advance past the default grace period (2000ms)
    vi.advanceTimersByTime(2001);
    expect(client.readClient()).toBe(client.replica);
  });

  test('custom grace period is respected', () => {
    const client = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
      { writeGraceMs: 500 },
    );

    client.markWrite();
    expect(client.readClient()).toBe(client.primary);

    vi.advanceTimersByTime(400);
    expect(client.readClient()).toBe(client.primary);

    vi.advanceTimersByTime(200);
    expect(client.readClient()).toBe(client.replica);
  });

  test('markWrite resets the grace period', () => {
    const client = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
      { writeGraceMs: 1000 },
    );

    client.markWrite();
    vi.advanceTimersByTime(800);
    expect(client.readClient()).toBe(client.primary);

    // Second write resets the timer
    client.markWrite();
    vi.advanceTimersByTime(800);
    expect(client.readClient()).toBe(client.primary);

    vi.advanceTimersByTime(300);
    expect(client.readClient()).toBe(client.replica);
  });

  test('strong consistency ignores grace period', () => {
    const client = createReadReplicaClient(
      'postgres://primary:5432/db',
      'postgres://replica:5432/db',
    );

    // Even without markWrite, strong returns primary
    expect(client.readClient({ consistency: 'strong' })).toBe(client.primary);
  });
});
