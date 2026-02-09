// src/server/db/src/pubsub/postgres-pubsub.ts
/**
 * PostgreSQL NOTIFY/LISTEN Pub/Sub Adapter
 *
 * Uses Postgres NOTIFY/LISTEN for cross-instance messaging.
 * Enables horizontal scaling with native Postgres capabilities.
 *
 * How it works:
 * 1. Each server instance opens a dedicated LISTEN connection
 * 2. When data changes, NOTIFY is sent to Postgres
 * 3. All listening instances receive the notification
 * 4. Each instance forwards to its local WebSocket clients
 */

import postgres, { type Options } from 'postgres';

import type { SubscriptionKey } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface PostgresPubSubOptions {
  /** Postgres connection string */
  connectionString: string;
  /** Channel name for notifications (default: 'app_events') */
  channel?: string;
  /** Callback when a message is received from another instance */
  onMessage?: (key: SubscriptionKey, version: number) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface PubSubMessage {
  key: SubscriptionKey;
  version: number;
  /** Instance ID to prevent echo (receiving own messages) */
  instanceId: string;
}

// ============================================================================
// PostgresPubSub Class
// ============================================================================

const DEFAULT_CHANNEL = 'app_events';

export class PostgresPubSub {
  private readonly channel: string;
  private readonly instanceId: string;
  private readonly onMessage: (key: SubscriptionKey, version: number) => void;
  private readonly onError: (error: Error) => void;

  private listenClient: postgres.Sql | null = null;
  private notifyClient: postgres.Sql | null = null;
  private isListening = false;
  private readonly connectionString: string;

  constructor(options: PostgresPubSubOptions) {
    this.connectionString = options.connectionString;
    this.channel = options.channel ?? DEFAULT_CHANNEL;
    this.instanceId = this.generateInstanceId();
    this.onMessage = options.onMessage ?? ((): void => {});
    this.onError = options.onError ?? ((): void => {});
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Start listening for notifications
   * Creates a dedicated connection for LISTEN (required by Postgres)
   */
  async start(): Promise<void> {
    if (this.isListening) return;

    try {
      // Create dedicated LISTEN connection (cannot share with queries)
      // Note: postgres library requires snake_case property names per its API
      const listenOpts: Record<string, unknown> = {
        max: 1,
      };
      listenOpts['idle_timeout'] = 0; // Never timeout - keep connection open
      listenOpts['connect_timeout'] = 10000;
      listenOpts['onclose'] = (): void => {
        this.onError(new Error('Postgres PubSub connection closed (attempting reconnection)'));
      };
      this.listenClient = postgres(
        this.connectionString,
        listenOpts as Options<Record<string, never>>,
      );

      // Create separate connection for NOTIFY (can be shared)
      // Note: postgres library requires snake_case property names per its API
      const notifyOpts: Record<string, unknown> = {
        max: 3,
      };
      notifyOpts['idle_timeout'] = 30000;
      this.notifyClient = postgres(
        this.connectionString,
        notifyOpts as Options<Record<string, never>>,
      );

      // Subscribe to channel
      await this.listenClient.listen(this.channel, (payload) => {
        this.handleNotification(payload);
      });

      this.isListening = true;
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * Stop listening and close connections
   */
  async stop(): Promise<void> {
    if (!this.isListening) return;

    try {
      if (this.listenClient !== null) {
        await this.listenClient.end({ timeout: 5 });
        this.listenClient = null;
      }

      if (this.notifyClient !== null) {
        await this.notifyClient.end({ timeout: 5 });
        this.notifyClient = null;
      }
    } catch (error) {
      this.onError(error as Error);
    }

    this.isListening = false;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Publish a message to all instances via NOTIFY
   */
  async publish(key: SubscriptionKey, version: number): Promise<void> {
    if (this.notifyClient === null) {
      throw new Error('PostgresPubSub not started');
    }

    const message: PubSubMessage = {
      key,
      version,
      instanceId: this.instanceId,
    };

    try {
      // NOTIFY with JSON payload
      await this.notifyClient.notify(this.channel, JSON.stringify(message));
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * Check if pub/sub is active
   */
  get isActive(): boolean {
    return this.isListening;
  }

  /**
   * Get the instance ID (for debugging)
   */
  get id(): string {
    return this.instanceId;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private handleNotification(payload: string): void {
    try {
      const message = JSON.parse(payload) as PubSubMessage;

      // Ignore messages from self (already handled locally)
      if (message.instanceId === this.instanceId) {
        return;
      }

      // Forward to local subscription manager
      this.onMessage(message.key, message.version);
    } catch {
      this.onError(new Error(`Invalid notification payload: ${payload}`));
    }
  }

  private generateInstanceId(): string {
    // Unique ID for this server instance
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${timestamp}-${random}`;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a PostgresPubSub instance
 *
 * @example
 * const pubsub = createPostgresPubSub({
 *   connectionString: 'postgres://...',
 *   onMessage: (key, version) => {
 *     subscriptionManager.publish(key, version);
 *   },
 * });
 *
 * await pubsub.start();
 */
export function createPostgresPubSub(options: PostgresPubSubOptions): PostgresPubSub {
  return new PostgresPubSub(options);
}
