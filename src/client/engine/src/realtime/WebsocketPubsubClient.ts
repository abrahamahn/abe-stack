// src/client/engine/src/realtime/WebsocketPubsubClient.ts

/**
 * Time constants for reconnection delays
 */
const SECOND_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30 * SECOND_MS;

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
   * Defaults to 0 (unlimited).
   */
  maxReconnectAttempts?: number;

  /**
   * Base delay in milliseconds for exponential backoff.
   * Defaults to 1000 (1 second).
   */
  baseReconnectDelayMs?: number;
}

/**
 * Promise-based sleep utility for reconnection delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * WebSocket-based PubSub client with automatic reconnection.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Online/offline detection for smart reconnection
 * - Subscribe/unsubscribe to topics
 * - Message callback handling
 * - Connection state management
 *
 * @example
 * ```typescript
 * const pubsub = new WebsocketPubsubClient({
 *   host: 'localhost:3000',
 *   onMessage: (key, value) => {
 *     console.log(`Received update for ${key}:`, value);
 *     // Update your local cache/state
 *   },
 *   onConnect: () => {
 *     // Resubscribe to active keys
 *     subscriptionCache.keys().forEach(key => pubsub.subscribe(key));
 *   },
 * });
 *
 * // Subscribe to a topic
 * pubsub.subscribe('user:123');
 *
 * // Unsubscribe when done
 * pubsub.unsubscribe('user:123');
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
      'host' | 'secure' | 'debug' | 'maxReconnectAttempts' | 'baseReconnectDelayMs'
    >
  > &
    WebsocketPubsubClientConfig;
  private readonly webSocketConstructor: typeof WebSocket;
  private onlineHandler: (() => void) | null = null;

  constructor(config: WebsocketPubsubClientConfig) {
    // Determine secure default: use secure if page is loaded over HTTPS
    const isSecureDefault = typeof window !== 'undefined' && window.location.protocol === 'https:';

    this.config = {
      ...config,
      secure: config.secure ?? isSecureDefault,
      debug: config.debug ?? false,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 0,
      baseReconnectDelayMs: config.baseReconnectDelayMs ?? SECOND_MS,
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
   */
  subscribe(key: string): void {
    this.send({ type: 'subscribe', key });
  }

  /**
   * Unsubscribe from a topic.
   */
  unsubscribe(key: string): void {
    this.send({ type: 'unsubscribe', key });
  }

  /**
   * Close the WebSocket connection.
   * Call this when you no longer need the pubsub client.
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

    // Calculate delay with exponential backoff: baseDelay * 2^attempt, capped at max
    const delay = Math.min(
      this.config.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    this.log(`Reconnecting in ${String(delay)}ms (attempt ${String(this.reconnectAttempt)})...`);
    this.setConnectionState('reconnecting');

    await sleep(delay);

    // Reconnect (isClosedIntentionally is checked at the start of this function)
    this.connect();
  }

  private send(message: ClientPubsubMessage): void {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.log('>', message.type, message.key);
      this.ws.send(JSON.stringify(message));
    } else {
      this.log('Cannot send, not connected:', message.type, message.key);
    }
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug && this.config.onDebug !== undefined) {
      this.config.onDebug(...args);
    }
  }
}
