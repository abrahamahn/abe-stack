// src/apps/web/src/features/realtime/useConnectionStatus.test.ts
/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useConnectionStatus } from './useConnectionStatus';

import type { ConnectionState, ConnectionStateListener } from '@abe-stack/client-engine';

// ============================================================================
// Mock PubSub Client
// ============================================================================

interface MockPubsubClient {
  getConnectionState: () => ConnectionState;
  onConnectionStateChange: (listener: ConnectionStateListener) => () => void;
  /** Test helper: simulate a state change */
  _setState: (state: ConnectionState) => void;
}

function createMockPubsub(initialState: ConnectionState = 'disconnected'): MockPubsubClient {
  let currentState: ConnectionState = initialState;
  const listeners = new Set<ConnectionStateListener>();

  return {
    getConnectionState: () => currentState,
    onConnectionStateChange: (listener: ConnectionStateListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    _setState: (state: ConnectionState) => {
      currentState = state;
      for (const listener of listeners) {
        listener(state);
      }
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial connection state', () => {
    const mockPubsub = createMockPubsub('disconnected');

    const { result } = renderHook(() =>
      useConnectionStatus(mockPubsub as unknown as Parameters<typeof useConnectionStatus>[0]),
    );

    expect(result.current.state).toBe('disconnected');
    expect(result.current.label).toBe('Offline');
  });

  it('should return "Connected" label for connected state', () => {
    const mockPubsub = createMockPubsub('connected');

    const { result } = renderHook(() =>
      useConnectionStatus(mockPubsub as unknown as Parameters<typeof useConnectionStatus>[0]),
    );

    expect(result.current.state).toBe('connected');
    expect(result.current.label).toBe('Connected');
  });

  it('should return "Connecting" label for connecting state', () => {
    const mockPubsub = createMockPubsub('connecting');

    const { result } = renderHook(() =>
      useConnectionStatus(mockPubsub as unknown as Parameters<typeof useConnectionStatus>[0]),
    );

    expect(result.current.state).toBe('connecting');
    expect(result.current.label).toBe('Connecting');
  });

  it('should return "Reconnecting" label for reconnecting state', () => {
    const mockPubsub = createMockPubsub('reconnecting');

    const { result } = renderHook(() =>
      useConnectionStatus(mockPubsub as unknown as Parameters<typeof useConnectionStatus>[0]),
    );

    expect(result.current.state).toBe('reconnecting');
    expect(result.current.label).toBe('Reconnecting');
  });

  it('should update when connection state changes', () => {
    const mockPubsub = createMockPubsub('disconnected');

    const { result } = renderHook(() =>
      useConnectionStatus(mockPubsub as unknown as Parameters<typeof useConnectionStatus>[0]),
    );

    expect(result.current.state).toBe('disconnected');
    expect(result.current.label).toBe('Offline');

    act(() => {
      mockPubsub._setState('connecting');
    });

    expect(result.current.state).toBe('connecting');
    expect(result.current.label).toBe('Connecting');

    act(() => {
      mockPubsub._setState('connected');
    });

    expect(result.current.state).toBe('connected');
    expect(result.current.label).toBe('Connected');
  });

  it('should unsubscribe on unmount', () => {
    const mockPubsub = createMockPubsub('connected');
    const originalOnChange = mockPubsub.onConnectionStateChange;
    const unsubscribeFn = vi.fn();

    mockPubsub.onConnectionStateChange = (listener: ConnectionStateListener) => {
      const unsub = originalOnChange(listener);
      return () => {
        unsub();
        unsubscribeFn();
      };
    };

    const { unmount } = renderHook(() =>
      useConnectionStatus(mockPubsub as unknown as Parameters<typeof useConnectionStatus>[0]),
    );

    unmount();

    expect(unsubscribeFn).toHaveBeenCalled();
  });
});
