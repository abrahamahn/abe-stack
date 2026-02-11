// src/apps/web/src/features/realtime/useConnectionStatus.ts

import { useCallback, useSyncExternalStore } from 'react';

import type { ConnectionState, WebsocketPubsubClient } from '@abe-stack/client-engine';

/**
 * Result from useConnectionStatus hook.
 */
export interface ConnectionStatusState {
  /** Current connection state */
  state: ConnectionState;
  /** Human-readable label for the state */
  label: string;
}

/**
 * Map connection state to a human-readable label.
 */
function getLabel(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'reconnecting':
      return 'Reconnecting';
    case 'disconnected':
      return 'Offline';
  }
}

/**
 * Hook that subscribes to the WebSocket client's connection state.
 *
 * Uses useSyncExternalStore to subscribe to the PubSub client's
 * connection state change events for consistent React updates.
 *
 * @param pubsub - The WebsocketPubsubClient instance to observe
 * @returns Current connection state and human-readable label
 *
 * @example
 * ```tsx
 * function StatusIndicator({ pubsub }: { pubsub: WebsocketPubsubClient }) {
 *   const { state, label } = useConnectionStatus(pubsub);
 *   return <span>{label}</span>;
 * }
 * ```
 */
export function useConnectionStatus(pubsub: WebsocketPubsubClient): ConnectionStatusState {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return pubsub.onConnectionStateChange(onStoreChange);
    },
    [pubsub],
  );

  const getSnapshot = useCallback((): ConnectionState => {
    return pubsub.getConnectionState();
  }, [pubsub]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    state,
    label: getLabel(state),
  };
}
