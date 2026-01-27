// packages/sdk/src/notifications/__tests__/hooks.test.ts
/**
 * Notification Hooks Tests
 *
 * Tests for React hooks.
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useNotificationPreferences,
  usePushPermission,
  usePushSubscription,
  useTestNotification,
} from '../hooks';

// Mock the client module
vi.mock('../client', async () => {
  const actual = await vi.importActual('../client');
  return {
    ...actual,
    isPushSupported: vi.fn(() => true),
    getPushPermission: vi.fn(() => 'default' as NotificationPermission),
    requestPushPermission: vi.fn(() => Promise.resolve('granted' as NotificationPermission)),
    getExistingSubscription: vi.fn(() => Promise.resolve(null)),
    subscribeToPush: vi.fn(() =>
      Promise.resolve({
        toJSON: () => ({
          endpoint: 'https://example.com/push',
          expirationTime: null,
          keys: { p256dh: 'key1', auth: 'key2' },
        }),
      }),
    ),
    unsubscribeFromPush: vi.fn(() => Promise.resolve(true)),
    getDeviceId: vi.fn(() => 'device-123'),
    createNotificationClient: vi.fn(() => ({
      getVapidKey: vi.fn(() => Promise.resolve({ publicKey: 'test-key' })),
      subscribe: vi.fn(() => Promise.resolve({ subscriptionId: 'sub-123', message: 'Subscribed' })),
      unsubscribe: vi.fn(() => Promise.resolve({ success: true, message: 'Unsubscribed' })),
      getPreferences: vi.fn(() =>
        Promise.resolve({
          preferences: {
            userId: 'user-1',
            globalEnabled: true,
            quietHours: { enabled: false, startHour: 22, endHour: 8, timezone: 'UTC' },
            types: {},
            updatedAt: new Date(),
          },
        }),
      ),
      updatePreferences: vi.fn(() =>
        Promise.resolve({
          preferences: {
            globalEnabled: false,
          },
        }),
      ),
      testNotification: vi.fn(() =>
        Promise.resolve({
          messageId: 'msg-123',
          result: { total: 1, successful: 1, failed: 0 },
        }),
      ),
    })),
  };
});

describe('usePushSubscription', () => {
  const clientConfig = {
    baseUrl: 'http://localhost:3001',
    getToken: () => 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => usePushSubscription({ clientConfig, autoCheck: false }));

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.subscription).toBeNull();
  });

  it('should check subscription status on mount when autoCheck is true', async () => {
    const { result } = renderHook(() => usePushSubscription({ clientConfig, autoCheck: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should subscribe successfully', async () => {
    const { result } = renderHook(() => usePushSubscription({ clientConfig, autoCheck: false }));

    await act(async () => {
      await result.current.subscribe();
    });

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.subscriptionId).toBe('sub-123');
    });
  });

  it('should unsubscribe successfully', async () => {
    const { result } = renderHook(() => usePushSubscription({ clientConfig, autoCheck: false }));

    // First subscribe
    await act(async () => {
      await result.current.subscribe();
    });

    // Then unsubscribe
    await act(async () => {
      await result.current.unsubscribe();
    });

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.subscriptionId).toBeNull();
    });
  });
});

describe('useNotificationPreferences', () => {
  const clientConfig = {
    baseUrl: 'http://localhost:3001',
    getToken: () => 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch preferences on mount when autoFetch is true', async () => {
    const { result } = renderHook(() =>
      useNotificationPreferences({ clientConfig, autoFetch: true }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.preferences).toBeDefined();
    });
  });

  it('should not fetch on mount when autoFetch is false', async () => {
    const { result } = renderHook(() =>
      useNotificationPreferences({ clientConfig, autoFetch: false }),
    );

    // Wait a bit to ensure no fetch happened
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.preferences).toBeNull();
  });

  it('should update preferences', async () => {
    const { result } = renderHook(() =>
      useNotificationPreferences({ clientConfig, autoFetch: false }),
    );

    await act(async () => {
      await result.current.updatePreferences({ globalEnabled: false });
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });
  });
});

describe('usePushPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial permission state', () => {
    const { result } = renderHook(() => usePushPermission());

    expect(result.current.isSupported).toBe(true);
    expect(result.current.permission).toBe('default');
    expect(result.current.isGranted).toBe(false);
    expect(result.current.isDenied).toBe(false);
  });

  it('should request permission', async () => {
    const { result } = renderHook(() => usePushPermission());

    await act(async () => {
      const permission = await result.current.requestPermission();
      expect(permission).toBe('granted');
    });
  });
});

describe('useTestNotification', () => {
  const clientConfig = {
    baseUrl: 'http://localhost:3001',
    getToken: () => 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => useTestNotification(clientConfig));

    expect(result.current.isSending).toBe(false);
    expect(result.current.lastResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should send test notification', async () => {
    const { result } = renderHook(() => useTestNotification(clientConfig));

    await act(async () => {
      await result.current.sendTest();
    });

    await waitFor(() => {
      expect(result.current.isSending).toBe(false);
      expect(result.current.lastResult?.success).toBe(true);
    });
  });
});
