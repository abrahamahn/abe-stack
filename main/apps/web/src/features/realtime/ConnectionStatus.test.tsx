// main/apps/web/src/features/realtime/ConnectionStatus.test.tsx
/** @vitest-environment jsdom */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionStatus } from './ConnectionStatus';

import type { ConnectionState, ConnectionStateListener } from '@bslt/client-engine';

// ============================================================================
// Mock PubSub Client
// ============================================================================

interface MockPubsubClient {
  getConnectionState: () => ConnectionState;
  onConnectionStateChange: (listener: ConnectionStateListener) => () => void;
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

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render a status dot and label', () => {
    const mockPubsub = createMockPubsub('connected');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    expect(screen.getByTestId('connection-status')).toBeTruthy();
    expect(screen.getByTestId('connection-status-dot')).toBeTruthy();
    expect(screen.getByTestId('connection-status-label')).toBeTruthy();
    expect(screen.getByTestId('connection-status-label').textContent).toBe('Connected');
  });

  it('should hide label when showLabel is false', () => {
    const mockPubsub = createMockPubsub('connected');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
        showLabel={false}
      />,
    );

    expect(screen.getByTestId('connection-status-dot')).toBeTruthy();
    expect(screen.queryByTestId('connection-status-label')).toBeNull();
  });

  it('should show green dot for connected state', () => {
    const mockPubsub = createMockPubsub('connected');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    const dot = screen.getByTestId('connection-status-dot');
    expect(dot.style.backgroundColor).toBe('var(--ui-color-success)');
  });

  it('should show yellow dot for reconnecting state', () => {
    const mockPubsub = createMockPubsub('reconnecting');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    const dot = screen.getByTestId('connection-status-dot');
    expect(dot.style.backgroundColor).toBe('var(--ui-color-warning)');
    expect(screen.getByTestId('connection-status-label').textContent).toBe('Reconnecting');
  });

  it('should show yellow dot for connecting state', () => {
    const mockPubsub = createMockPubsub('connecting');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    const dot = screen.getByTestId('connection-status-dot');
    expect(dot.style.backgroundColor).toBe('var(--ui-color-warning)');
    expect(screen.getByTestId('connection-status-label').textContent).toBe('Connecting');
  });

  it('should show red dot for disconnected state', () => {
    const mockPubsub = createMockPubsub('disconnected');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    const dot = screen.getByTestId('connection-status-dot');
    expect(dot.style.backgroundColor).toBe('var(--ui-color-danger)');
    expect(screen.getByTestId('connection-status-label').textContent).toBe('Offline');
  });

  it('should update when connection state changes', () => {
    const mockPubsub = createMockPubsub('disconnected');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    expect(screen.getByTestId('connection-status-label').textContent).toBe('Offline');
    expect(screen.getByTestId('connection-status-dot').style.backgroundColor).toBe(
      'var(--ui-color-danger)',
    );

    act(() => {
      mockPubsub._setState('reconnecting');
    });

    expect(screen.getByTestId('connection-status-label').textContent).toBe('Reconnecting');
    expect(screen.getByTestId('connection-status-dot').style.backgroundColor).toBe(
      'var(--ui-color-warning)',
    );

    act(() => {
      mockPubsub._setState('connected');
    });

    expect(screen.getByTestId('connection-status-label').textContent).toBe('Connected');
    expect(screen.getByTestId('connection-status-dot').style.backgroundColor).toBe(
      'var(--ui-color-success)',
    );
  });

  it('should have accessible role and aria-label', () => {
    const mockPubsub = createMockPubsub('connected');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    const status = screen.getByTestId('connection-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-label')).toBe('Connection status: Connected');
  });

  it('should update aria-label on state change', () => {
    const mockPubsub = createMockPubsub('disconnected');

    render(
      <ConnectionStatus
        pubsub={mockPubsub as unknown as Parameters<typeof ConnectionStatus>[0]['pubsub']}
      />,
    );

    expect(screen.getByTestId('connection-status').getAttribute('aria-label')).toBe(
      'Connection status: Offline',
    );

    act(() => {
      mockPubsub._setState('reconnecting');
    });

    expect(screen.getByTestId('connection-status').getAttribute('aria-label')).toBe(
      'Connection status: Reconnecting',
    );
  });
});
