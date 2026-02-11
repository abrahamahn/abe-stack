// src/server/core/src/auth/handlers/devices.test.ts
/**
 * Tests for Device Management Handlers
 *
 * Validates listing, trusting, and revoking trusted devices.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mock Dependencies
// ============================================================================

const { mockMapErrorToHttpResponse } = vi.hoisted(() => ({
  mockMapErrorToHttpResponse: vi.fn(
    (error: unknown, logger: { error: (context: unknown, message?: string) => void }) => {
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotFoundError':
            return { status: 404, body: { message: error.message } };
          default:
            logger.error(error);
            return { status: 500, body: { message: 'Internal server error' } };
        }
      }
      logger.error(error);
      return { status: 500, body: { message: 'Internal server error' } };
    },
  ),
}));

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToHttpResponse,
  };
});

import { handleListDevices, handleRevokeDevice, handleTrustDevice } from './devices';

import type { AppContext, RequestWithCookies } from '../types';
import type { TrustedDevice } from '@abe-stack/db';

// ============================================================================
// Mock Context
// ============================================================================

function createMockDevice(overrides: Partial<TrustedDevice> = {}): TrustedDevice {
  return {
    id: 'device-1',
    userId: 'user-1',
    deviceFingerprint: 'abc123hash',
    label: 'Chrome on Windows',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows)',
    firstSeenAt: new Date('2024-01-01T00:00:00Z'),
    lastSeenAt: new Date('2024-01-15T10:00:00Z'),
    trustedAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockCtx(): AppContext {
  return {
    repos: {
      trustedDevices: {
        findByUser: vi.fn(),
        findById: vi.fn(),
        markTrusted: vi.fn(),
        revoke: vi.fn(),
        create: vi.fn(),
        findByFingerprint: vi.fn(),
        updateLastSeen: vi.fn(),
        upsert: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    },
    db: {} as never,
    email: {} as never,
    emailTemplates: {} as never,
    storage: {} as never,
    pubsub: {} as never,
    config: {
      auth: {} as never,
      server: { appBaseUrl: 'http://localhost:3000' },
    },
  } as unknown as AppContext;
}

function createMockRequest(userId?: string): RequestWithCookies {
  return {
    user: userId !== undefined ? { userId, email: 'test@example.com', role: 'user' } : undefined,
    requestInfo: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    },
    cookies: {},
    headers: {},
  } as unknown as RequestWithCookies;
}

// ============================================================================
// Tests: handleListDevices
// ============================================================================

describe('handleListDevices', () => {
  let ctx: AppContext;

  beforeEach(() => {
    ctx = createMockCtx();
    vi.clearAllMocks();
  });

  it('should return list of devices for authenticated user', async () => {
    const devices = [
      createMockDevice({ id: 'device-1' }),
      createMockDevice({ id: 'device-2', trustedAt: new Date('2024-01-10T00:00:00Z') }),
    ];
    vi.mocked(ctx.repos.trustedDevices.findByUser).mockResolvedValue(devices);

    const result = await handleListDevices(ctx, createMockRequest('user-1'));

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.devices).toHaveLength(2);
      const first = result.body.devices[0];
      const second = result.body.devices[1];
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first?.id).toBe('device-1');
      expect(first?.trusted).toBe(false);
      expect(second?.id).toBe('device-2');
      expect(second?.trusted).toBe(true);
    }
  });

  it('should return empty list when user has no devices', async () => {
    vi.mocked(ctx.repos.trustedDevices.findByUser).mockResolvedValue([]);

    const result = await handleListDevices(ctx, createMockRequest('user-1'));

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.devices).toEqual([]);
    }
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleListDevices(ctx, createMockRequest());

    expect(result.status).toBe(401);
  });

  it('should serialize dates as ISO strings', async () => {
    const devices = [createMockDevice()];
    vi.mocked(ctx.repos.trustedDevices.findByUser).mockResolvedValue(devices);

    const result = await handleListDevices(ctx, createMockRequest('user-1'));

    expect(result.status).toBe(200);
    if (result.status === 200) {
      const device = result.body.devices[0];
      expect(device).toBeDefined();
      expect(device?.firstSeenAt).toBe('2024-01-01T00:00:00.000Z');
      expect(device?.lastSeenAt).toBe('2024-01-15T10:00:00.000Z');
      expect(device?.createdAt).toBe('2024-01-01T00:00:00.000Z');
    }
  });
});

// ============================================================================
// Tests: handleTrustDevice
// ============================================================================

describe('handleTrustDevice', () => {
  let ctx: AppContext;

  beforeEach(() => {
    ctx = createMockCtx();
    vi.clearAllMocks();
  });

  it('should mark a device as trusted', async () => {
    const device = createMockDevice({ userId: 'user-1' });
    const updatedDevice = createMockDevice({
      userId: 'user-1',
      trustedAt: new Date('2024-01-20T00:00:00Z'),
    });
    vi.mocked(ctx.repos.trustedDevices.findById).mockResolvedValue(device);
    vi.mocked(ctx.repos.trustedDevices.markTrusted).mockResolvedValue(updatedDevice);

    const result = await handleTrustDevice(ctx, { id: 'device-1' }, createMockRequest('user-1'));

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.device.trusted).toBe(true);
    }
  });

  it('should return 404 when device does not exist', async () => {
    vi.mocked(ctx.repos.trustedDevices.findById).mockResolvedValue(null);

    const result = await handleTrustDevice(ctx, { id: 'nonexistent' }, createMockRequest('user-1'));

    expect(result.status).toBe(404);
  });

  it('should return 404 when device belongs to different user', async () => {
    const device = createMockDevice({ userId: 'user-2' });
    vi.mocked(ctx.repos.trustedDevices.findById).mockResolvedValue(device);

    const result = await handleTrustDevice(ctx, { id: 'device-1' }, createMockRequest('user-1'));

    expect(result.status).toBe(404);
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleTrustDevice(ctx, { id: 'device-1' }, createMockRequest());

    expect(result.status).toBe(401);
  });
});

// ============================================================================
// Tests: handleRevokeDevice
// ============================================================================

describe('handleRevokeDevice', () => {
  let ctx: AppContext;

  beforeEach(() => {
    ctx = createMockCtx();
    vi.clearAllMocks();
  });

  it('should revoke a device', async () => {
    const device = createMockDevice({ userId: 'user-1' });
    vi.mocked(ctx.repos.trustedDevices.findById).mockResolvedValue(device);
    vi.mocked(ctx.repos.trustedDevices.revoke).mockResolvedValue(true);

    const result = await handleRevokeDevice(ctx, { id: 'device-1' }, createMockRequest('user-1'));

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.message).toBe('Device revoked successfully');
    }
  });

  it('should return 404 when device does not exist', async () => {
    vi.mocked(ctx.repos.trustedDevices.findById).mockResolvedValue(null);

    const result = await handleRevokeDevice(
      ctx,
      { id: 'nonexistent' },
      createMockRequest('user-1'),
    );

    expect(result.status).toBe(404);
  });

  it('should return 404 when device belongs to different user', async () => {
    const device = createMockDevice({ userId: 'user-2' });
    vi.mocked(ctx.repos.trustedDevices.findById).mockResolvedValue(device);

    const result = await handleRevokeDevice(ctx, { id: 'device-1' }, createMockRequest('user-1'));

    expect(result.status).toBe(404);
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleRevokeDevice(ctx, { id: 'device-1' }, createMockRequest());

    expect(result.status).toBe(401);
  });
});
