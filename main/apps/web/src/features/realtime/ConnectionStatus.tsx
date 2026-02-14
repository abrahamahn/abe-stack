// main/apps/web/src/features/realtime/ConnectionStatus.tsx

import { useConnectionStatus } from './useConnectionStatus';

import type { ConnectionState, WebsocketPubsubClient } from '@abe-stack/client-engine';
import type { ReactElement } from 'react';

/**
 * Map connection state to a CSS variable color name.
 */
function getIndicatorColor(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'var(--ui-color-success)';
    case 'connecting':
    case 'reconnecting':
      return 'var(--ui-color-warning)';
    case 'disconnected':
      return 'var(--ui-color-danger)';
  }
}

/**
 * Props for the ConnectionStatus component.
 */
export interface ConnectionStatusProps {
  /** The WebsocketPubsubClient instance to observe */
  pubsub: WebsocketPubsubClient;
  /** Whether to show the text label alongside the dot. Defaults to true. */
  showLabel?: boolean;
}

/**
 * Small connection status indicator showing a colored dot and optional label.
 *
 * Colors:
 * - Green dot = connected
 * - Yellow dot = connecting or reconnecting
 * - Red dot = disconnected / offline
 *
 * @example
 * ```tsx
 * <ConnectionStatus pubsub={pubsubClient} />
 * <ConnectionStatus pubsub={pubsubClient} showLabel={false} />
 * ```
 */
export function ConnectionStatus({
  pubsub,
  showLabel = true,
}: ConnectionStatusProps): ReactElement {
  const { state, label } = useConnectionStatus(pubsub);
  const color = getIndicatorColor(state);

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-label={`Connection status: ${label}`}
      data-testid="connection-status"
    >
      <span
        data-testid="connection-status-dot"
        style={{
          display: 'inline-block',
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: 'var(--ui-radius-full)',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {showLabel && (
        <span
          data-testid="connection-status-label"
          style={{
            fontSize: 'var(--ui-font-size-xs)',
            color: 'var(--ui-color-text-muted)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
