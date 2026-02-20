// main/client/engine/src/realtime/WebsocketPubsubClient.ts

import { AUTH_CONSTANTS, delay, MS_PER_SECOND } from '@bslt/shared';

const { WEBSOCKET_PATH } = AUTH_CONSTANTS;

/**
 * Time constants for reconnection delays
 */
const MAX_RECONNECT_DELAY_MS = 30 * MS_PER_SECOND;

/**
 * Default maximum number of queued messages when offline.
 * When exceeded, oldest messages are dropped (FIFO).
 */
const DEFAULT_MAX_QUEUE_SIZE = 100;

/**
 * Default maximum reconnection attempts before giving up.
 */
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Jitter factor applied to reconnection delay.
 * A random value between 0 and JITTER_FACTOR * delay is added.
 */
const JITTER_FACTOR = 0.3;

/**
 * Message types sent from client to server
 */
export type ClientPubsubMessage =
  | { type: 'subscribe'; key: string }
  | { type: 'unsubscribe'; key: string }
  | { type: 'sync_request'; lastTimestamp: number; keys: string[] };

/**
 * Message types received from server
 */
export type ServerPubsubMessage<T = unknown> =
  | { type: 'update'; key: string; value: T; timestamp?: number }
  | { type: 'sync_response'; messages: Array<{ key: string; version: number; timestamp: number }> };

/**
 * Connection states for the WebSocket client
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Listener for connection state changes.
 */
export type ConnectionStateListener = (state: ConnectionState) => void;

/**
 * Configuration options for WebsocketPubsubClient
 */
export interface WebsocketPubsubClientConfig {
  /**
   * The WebSocket host (e.g., 'localhost:3000').
   * The client will connect to ws://{host}/ws or wss://{host}/ws based on protocol.
   */
  host: string;

  /**
   * Whether to use secure WebSocket (wss://) instead of ws://.
   * Defaults to true if running on HTTPS, false otherwise.
   */
  secure?: boolean;

  /**
   * Called when a message is received for a subscribed key.
   */
  onMessage: (key: string, value: unknown) => void;

  /**
   * Called when the connection is established.
   * Use this to resubscribe to all active subscriptions.
   */
  onConnect?: () => void;

  /**
   * Called when the connection is closed.
   */
  onDisconnect?: () => void;

  /**
   * Called when a connection error occurs.
   */
  onError?: (error: Event) => void;

  /**
   * Custom WebSocket constructor for testing or environments without global WebSocket.
   */
  WebSocketImpl?: typeof WebSocket;

  /**
   * Enable debug logging.
   * Defaults to false.
   */
  debug?: boolean;

  /**
   * Custom debug logging function.
   * Called with log messages when debug is enabled.
   */
  onDebug?: (...args: unknown[]) => void;

  /**
   * Maximum reconnection attempts before giving up.
   * Set to 0 for unlimited attempts.
   * Defaults to 10.
   */
  maxReconnectAttempts?: number;

  /**
   * Base delay in milliseconds for exponential backoff.
   * Defaults to 1000 (1 second).
   */
  baseReconnectDelayMs?: number;

  /**
   * Maximum number of messages to buffer when disconnected.
   * When exceeded, oldest messages are dropped (FIFO).
   * Defaults to 100.
   */
  maxQueueSize?: number;

  /**
   * Enable delta sync recovery on reconnect.
   * When enabled, the client tracks the last received message timestamp
   * per subscription and sends a sync_request after reconnecting to
   * recover any messages missed during disconnection.
   * Defaults to true.
   */
  deltaSyncEnabled?: boolean;

  /**
   * Called when a sync_response is received after reconnect.
   * The messages array contains all missed updates since disconnect.
   * Each message has { key, version, timestamp }.
   * If not provided, missed messages are delivered via onMessage.
   */
  onSyncResponse?: (messages: Array<{ key: string; version: number; timestamp: number }>) => void;
}

/**
 * Calculate jitter for a given delay to prevent thundering herd.
 * Returns a value between 0 and JITTER_FACTOR * delay.
 */
function calculateJitter(delay: number): number {
  return Math.floor(Math.random() * JITTER_FACTOR * delay);
}

/**
 * WebSocket-based PubSub client with automatic reconnection.
 *
 * Features:
 * - Automatic reconnection with exponential backoff and jitter
 * - Online/offline detection for smart reconnection
 * - Offline message queue with FIFO overflow
 * - Active subscription tracking with auto-resubscribe on reconnect
 * - Connection state change listeners
 * - Subscribe/unsubscribe to topics
 * - Message callback handling
 *
 * @example
 * ```typescript
 * const pubsub = new WebsocketPubsubClient({
 *   host: 'localhost:3000',
 *   onMessage: (key, value) => {
 *     console.log(`Received update for ${key}:`, value);
 *   },
 *   maxReconnectAttempts: 10,
 *   maxQueueSize: 100,
 * });
 *
 * // Subscribe to a topic
 * pubsub.subscribe('user:123');
 *
 * // Unsubscribe when done
 * pubsub.unsubscribe('user:123');
 *
 * // Listen for connection state changes
 * const unsubscribe = pubsub.onConnectionStateChange((state) => {
 *   console.log('Connection state:', state);
 * });
 *
 * // Clean up when component unmounts
 * pubsub.close();
 * ```
 */
export class WebsocketPubsubClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private isClosedIntentionally = false;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly config: Required<
    Pick<
      WebsocketPubsubClientConfig,
      | 'host'
      | 'secure'
      | 'debug'
      | 'maxReconnectAttempts'
      | 'baseReconnectDelayMs'
      | 'maxQueueSize'
      | 'deltaSyncEnabled'
    >
  > &
    WebsocketPubsubClientConfig;
  private readonly webSocketConstructor: typeof WebSocket;
  private onlineHandler: (() => void) | null = null;

  /**
   * Set of active subscription keys, tracked for auto-resubscribe on reconnect.
   */
  private readonly activeSubscriptions = new Set<string>();

  /**
   * Queue of messages buffered while disconnected.
   * Flushed in FIFO order on reconnect.
   */
  private readonly offlineQueue: ClientPubsubMessage[] = [];

  /**
   * Set of listeners notified on connection state changes.
   */
  private readonly stateListeners = new Set<ConnectionStateListener>();

  /**
   * Tracks the last received server timestamp per subscription key.
   * Used for delta sync recovery on reconnect.
   */
  private readonly lastReceivedTimestamp = new Map<string, number>();

  /**
   * Global last received timestamp across all subscriptions.
   * Used as fallback when per-key timestamps are unavailable.
   */
  private globalLastTimestamp = 0;

  constructor(config: WebsocketPubsubClientConfig) {
    // Default to secure (wss://). Only use ws:// when explicitly set to false (e.g. local dev).
    this.config = {
      ...config,
      secure: config.secure ?? true,
      debug: config.debug ?? false,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      baseReconnectDelayMs: config.baseReconnectDelayMs ?? MS_PER_SECOND,
      maxQueueSize: config.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE,
      deltaSyncEnabled: config.deltaSyncEnabled ?? true,
    };

    this.webSocketConstructor = config.WebSocketImpl ?? WebSocket;

    // Start connection
    this.connect();

    // Listen for online events to reconnect
    if (typeof window !== 'undefined') {
      this.onlineHandler = (): void => {
        this.log('Network came online, reconnecting...');
        this.reconnectAttempt = 0;
        if (this.connectionState === 'disconnected' && !this.isClosedIntentionally) {
          this.connect();
        }
      };
      window.addEventListener('online', this.onlineHandler);
    }
  }

  /**
   * Get the current connection state.
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if the WebSocket is currently connected and ready to send messages.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to a topic.
   * Messages for this topic will be delivered to the onMessage callback.
   * If disconnected, the subscription is tracked and the subscribe message is queued.
   */
  subscribe(key: string): void {
    this.activeSubscriptions.add(key);
    this.sendOrQueue({ type: 'subscribe', key });
  }

  /**
   * Unsubscribe from a topic.
   * If disconnected, the unsubscription is tracked and the message is queued.
   */
  unsubscribe(key: string): void {
    this.activeSubscriptions.delete(key);
    this.sendOrQueue({ type: 'unsubscribe', key });
  }

  /**
   * Get the set of currently active subscription keys.
   */
  getActiveSubscriptions(): ReadonlySet<string> {
    return this.activeSubscriptions;
  }

  /**
   * Get the current number of messages in the offline queue.
   */
  getQueueSize(): number {
    return this.offlineQueue.length;
  }

  /**
   * Register a listener for connection state changes.
   * Returns an unsubscribe function.
   */
  onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Close the WebSocket connection.
   * Call this when you no longer need the pubsub client.
   * Clears the offline queue and active subscriptions.
   */
  close(): void {
    this.isClosedIntentionally = true;

    // Cancel any pending reconnection
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Remove online listener
    if (typeof window !== 'undefined' && this.onlineHandler !== null) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }

    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }

    // Clear offline queue, subscriptions, and delta sync state on close
    this.offlineQueue.length = 0;
    this.activeSubscriptions.clear();
    this.stateListeners.clear();
    this.lastReceivedTimestamp.clear();
    this.globalLastTimestamp = 0;

    this.setConnectionState('disconnected');
  }

  /**
   * Manually trigger a reconnection attempt.
   * Useful if you know the server is available after a disconnect.
   */
  reconnect(): void {
    if (this.isClosedIntentionally) {
      this.isClosedIntentionally = false;
    }
    this.reconnectAttempt = 0;
    this.connect();
  }

  private connect(): void {
    // Don't connect if already connecting or connected
    if (this.ws !== null) {
      const state = this.ws.readyState;
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        return;
      }
    }

    this.setConnectionState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    this.log('Connecting...');

    // Always use wss:// unless explicitly opted out for localhost development
    const host = this.config.host;
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const protocol = this.config.secure || !isLocalhost ? 'wss' : 'ws';
    const url = `${protocol}://${host}${WEBSOCKET_PATH}`;

    try {
      this.ws = new this.webSocketConstructor(url);
    } catch (error) {
      this.log('Failed to create WebSocket:', error);
      void this.attemptReconnect();
      return;
    }

    this.ws.onopen = (): void => {
      this.log('Connected!');
      const wasReconnect = this.reconnectAttempt > 0;
      this.reconnectAttempt = 0;
      this.setConnectionState('connected');

      // Re-subscribe to all tracked subscriptions
      this.resubscribeAll();

      // Request delta sync for missed messages on reconnect
      if (wasReconnect && this.config.deltaSyncEnabled) {
        this.requestDeltaRecovery();
      }

      // Flush the offline queue
      this.flushQueue();

      this.config.onConnect?.();
    };

    this.ws.onmessage = (event: MessageEvent<string>): void => {
      try {
        const raw = JSON.parse(event.data) as Record<string, unknown>;
        const msgType = raw['type'] as string;

        if (msgType === 'sync_response') {
          const message = raw as unknown as Extract<ServerPubsubMessage, { type: 'sync_response' }>;
          this.log('< sync_response', message.messages.length, 'missed messages');
          this.handleSyncResponse(message.messages);
          return;
        }

        // Standard update message
        const message = raw as unknown as Extract<ServerPubsubMessage, { type: 'update' }>;
        this.log('<', message.type, message.key, message.value);

        // Track timestamp for delta sync
        if (message.timestamp !== undefined) {
          this.lastReceivedTimestamp.set(message.key, message.timestamp);
          if (message.timestamp > this.globalLastTimestamp) {
            this.globalLastTimestamp = message.timestamp;
          }
        }

        this.config.onMessage(message.key, message.value);
      } catch (error) {
        this.log('Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error: Event): void => {
      this.log('WebSocket error:', error);
      this.config.onError?.(error);
    };

    this.ws.onclose = (): void => {
      this.log('Connection closed');
      this.ws = null;
      this.setConnectionState('disconnected');
      this.config.onDisconnect?.();

      if (!this.isClosedIntentionally) {
        void this.attemptReconnect();
      }
    };
  }

  private async attemptReconnect(): Promise<void> {
    if (this.isClosedIntentionally) {
      return;
    }

    // Check if we're online (browser environment)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.log('Offline, waiting for online event...');
      return;
    }

    // Check max attempts
    const { maxReconnectAttempts } = this.config;
    if (maxReconnectAttempts > 0 && this.reconnectAttempt >= maxReconnectAttempts) {
      this.log(`Max reconnect attempts (${String(maxReconnectAttempts)}) reached, giving up`);
      return;
    }

    this.reconnectAttempt++;

    // Calculate delay with exponential backoff + jitter, capped at max
    const baseDelay = Math.min(
      this.config.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS,
    );
    const jitter = calculateJitter(baseDelay);
    const reconnectDelay = baseDelay + jitter;

    this.log(
      `Reconnecting in ${String(reconnectDelay)}ms (attempt ${String(this.reconnectAttempt)})...`,
    );
    this.setConnectionState('reconnecting');

    await delay(reconnectDelay);

    // Reconnect (isClosedIntentionally is checked at the start of this function)
    this.connect();
  }

  /**
   * Send a message immediately if connected, otherwise add to offline queue.
   */
  private sendOrQueue(message: ClientPubsubMessage): void {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.log('>', message.type, 'key' in message ? message.key : undefined);
      this.ws.send(JSON.stringify(message));
    } else {
      this.enqueue(message);
    }
  }

  /**
   * Add a message to the offline queue.
   * Drops the oldest message if the queue exceeds maxQueueSize.
   */
  private enqueue(message: ClientPubsubMessage): void {
    this.log('Queued (offline):', message.type, 'key' in message ? message.key : undefined);
    this.offlineQueue.push(message);

    // Drop oldest if over capacity
    while (this.offlineQueue.length > this.config.maxQueueSize) {
      const dropped = this.offlineQueue.shift();
      if (dropped !== undefined) {
        this.log('Dropped oldest queued message:', dropped.type, 'key' in dropped ? dropped.key : undefined);
      }
    }
  }

  /**
   * Flush all queued messages in FIFO order.
   * Called after a successful reconnection.
   */
  private flushQueue(): void {
    if (this.offlineQueue.length === 0) return;

    this.log(`Flushing ${String(this.offlineQueue.length)} queued messages`);

    while (this.offlineQueue.length > 0) {
      const message = this.offlineQueue.shift();
      if (message !== undefined && this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
        this.log('> (flushed)', message.type, 'key' in message ? message.key : undefined);
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Re-subscribe to all active subscriptions.
   * Called after a successful reconnection.
   */
  private resubscribeAll(): void {
    if (this.activeSubscriptions.size === 0) return;

    this.log(`Resubscribing to ${String(this.activeSubscriptions.size)} active subscriptions`);

    for (const key of this.activeSubscriptions) {
      if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
        this.log('> (resubscribe)', 'subscribe', key);
        this.ws.send(JSON.stringify({ type: 'subscribe', key }));
      }
    }
  }

  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;

    // Only notify listeners if state actually changed
    if (previousState !== state) {
      for (const listener of this.stateListeners) {
        listener(state);
      }
    }
  }

  // ==========================================================================
  // Delta Sync Recovery
  // ==========================================================================

  /**
   * Send a sync_request to the server to recover messages missed during disconnect.
   * Uses the global last timestamp and requests messages for all active subscriptions.
   */
  private requestDeltaRecovery(): void {
    if (this.globalLastTimestamp === 0) {
      this.log('Delta sync: no previous timestamp, skipping');
      return;
    }

    if (this.activeSubscriptions.size === 0) {
      this.log('Delta sync: no active subscriptions, skipping');
      return;
    }

    const syncRequest: ClientPubsubMessage = {
      type: 'sync_request',
      lastTimestamp: this.globalLastTimestamp,
      keys: Array.from(this.activeSubscriptions),
    };

    this.log(
      'Delta sync: requesting messages since',
      this.globalLastTimestamp,
      'for',
      this.activeSubscriptions.size,
      'subscriptions',
    );

    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(syncRequest));
    }
  }

  /**
   * Handle a sync_response from the server containing missed messages.
   * Delivers each missed message via onSyncResponse (batch) or onMessage (individual).
   *
   * @param messages - Array of missed messages with key, version, and timestamp
   */
  private handleSyncResponse(
    messages: Array<{ key: string; version: number; timestamp: number }>,
  ): void {
    if (messages.length === 0) {
      this.log('Delta sync: no missed messages');
      return;
    }

    this.log('Delta sync: received', messages.length, 'missed messages');

    // Update tracked timestamps from recovered messages
    for (const msg of messages) {
      if (msg.timestamp > (this.lastReceivedTimestamp.get(msg.key) ?? 0)) {
        this.lastReceivedTimestamp.set(msg.key, msg.timestamp);
      }
      if (msg.timestamp > this.globalLastTimestamp) {
        this.globalLastTimestamp = msg.timestamp;
      }
    }

    // Deliver via batch callback or individual messages
    if (this.config.onSyncResponse !== undefined) {
      this.config.onSyncResponse(messages);
    } else {
      // Fall back to delivering each missed message via onMessage
      for (const msg of messages) {
        this.config.onMessage(msg.key, msg.version);
      }
    }
  }

  /**
   * Get the last received timestamp for a specific key.
   * Useful for debugging or custom sync logic.
   */
  getLastReceivedTimestamp(key: string): number | undefined {
    return this.lastReceivedTimestamp.get(key);
  }

  /**
   * Get the global last received timestamp.
   * This is the most recent timestamp across all subscriptions.
   */
  getGlobalLastTimestamp(): number {
    return this.globalLastTimestamp;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug && this.config.onDebug !== undefined) {
      this.config.onDebug(...args);
    }
  }
}
