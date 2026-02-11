// src/client/engine/src/realtime/WebsocketPubsubClient.ts

/**
 * Time constants for reconnection delays
 */
const SECOND_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30 * SECOND_MS;

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
  | { type: 'unsubscribe'; key: string };

/**
 * Message types received from server
 */
export interface ServerPubsubMessage<T = unknown> {
  type: 'update';
  key: string;
  value: T;
}

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
}

/**
 * Promise-based sleep utility for reconnection delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      'host' | 'secure' | 'debug' | 'maxReconnectAttempts' | 'baseReconnectDelayMs' | 'maxQueueSize'
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

  constructor(config: WebsocketPubsubClientConfig) {
    // Determine secure default: use secure if page is loaded over HTTPS
    const isSecureDefault = typeof window !== 'undefined' && window.location.protocol === 'https:';

    this.config = {
      ...config,
      secure: config.secure ?? isSecureDefault,
      debug: config.debug ?? false,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      baseReconnectDelayMs: config.baseReconnectDelayMs ?? SECOND_MS,
      maxQueueSize: config.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE,
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

    // Clear offline queue and subscriptions on close
    this.offlineQueue.length = 0;
    this.activeSubscriptions.clear();
    this.stateListeners.clear();

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

    const protocol = this.config.secure ? 'wss' : 'ws';
    const url = `${protocol}://${this.config.host}/ws`;

    try {
      this.ws = new this.webSocketConstructor(url);
    } catch (error) {
      this.log('Failed to create WebSocket:', error);
      void this.attemptReconnect();
      return;
    }

    this.ws.onopen = (): void => {
      this.log('Connected!');
      this.reconnectAttempt = 0;
      this.setConnectionState('connected');

      // Re-subscribe to all tracked subscriptions
      this.resubscribeAll();

      // Flush the offline queue
      this.flushQueue();

      this.config.onConnect?.();
    };

    this.ws.onmessage = (event: MessageEvent<string>): void => {
      try {
        const message = JSON.parse(event.data) as ServerPubsubMessage;
        this.log('<', message.type, message.key, message.value);
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
    const delay = baseDelay + jitter;

    this.log(`Reconnecting in ${String(delay)}ms (attempt ${String(this.reconnectAttempt)})...`);
    this.setConnectionState('reconnecting');

    await sleep(delay);

    // Reconnect (isClosedIntentionally is checked at the start of this function)
    this.connect();
  }

  /**
   * Send a message immediately if connected, otherwise add to offline queue.
   */
  private sendOrQueue(message: ClientPubsubMessage): void {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.log('>', message.type, message.key);
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
    this.log('Queued (offline):', message.type, message.key);
    this.offlineQueue.push(message);

    // Drop oldest if over capacity
    while (this.offlineQueue.length > this.config.maxQueueSize) {
      const dropped = this.offlineQueue.shift();
      if (dropped !== undefined) {
        this.log('Dropped oldest queued message:', dropped.type, dropped.key);
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
        this.log('> (flushed)', message.type, message.key);
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

  private log(...args: unknown[]): void {
    if (this.config.debug && this.config.onDebug !== undefined) {
      this.config.onDebug(...args);
    }
  }
}
