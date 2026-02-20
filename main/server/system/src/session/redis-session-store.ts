// main/server/system/src/session/redis-session-store.ts
/**
 * Redis Session Store
 *
 * Redis-backed session storage for horizontal scaling.
 * Uses ioredis for connection pooling and TTL-based expiration.
 *
 * While the app uses JWT-based auth (no server sessions today),
 * this store provides infrastructure for session-like data
 * (e.g., CSRF tokens, rate-limit windows, ephemeral user state)
 * that must be shared across multiple server instances.
 *
 * @module @bslt/server-system/session
 */

import redisConstructor, { type Redis, type RedisOptions } from 'ioredis';

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal logger interface for session store operations.
 * Compatible with any structured logger (Fastify, Pino, etc.)
 */
export interface SessionLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Session data stored in Redis.
 * Uses a generic record to allow flexible session payloads.
 */
export interface SessionData {
  /** User ID associated with this session */
  userId?: string;
  /** Session creation timestamp (ISO string) */
  createdAt: string;
  /** Last activity timestamp (ISO string) */
  lastAccessedAt: string;
  /** Arbitrary session payload */
  [key: string]: unknown;
}

/**
 * Configuration options for the Redis session store.
 */
export interface RedisSessionStoreOptions {
  /** Redis server hostname (default: 'localhost') */
  host?: string;
  /** Redis server port (default: 6379) */
  port?: number;
  /** Redis auth password */
  password?: string;
  /** Redis database index (default: 0) */
  db?: number;
  /** Enable TLS connection */
  tls?: boolean;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
  /** Command timeout in ms (default: 3000) */
  commandTimeout?: number;
  /** Key prefix for all session keys (default: 'session') */
  keyPrefix?: string;
  /** Default TTL in milliseconds for sessions (default: 86400000 = 24h) */
  defaultTtlMs?: number;
  /** Logger instance */
  logger?: SessionLogger;
  /** Existing ioredis client to reuse (skips internal connection) */
  client?: Redis;
}

/**
 * Abstract session store interface.
 * Implementations can be backed by Redis, memory, or other stores.
 */
export interface SessionStore {
  /** Retrieve session data by ID. Returns null if not found or expired. */
  get(sessionId: string): Promise<SessionData | null>;

  /** Store session data with optional TTL. */
  set(sessionId: string, data: SessionData, ttlMs?: number): Promise<void>;

  /** Delete a session by ID. Returns true if session existed. */
  delete(sessionId: string): Promise<boolean>;

  /** Refresh the TTL of an existing session without modifying data. Returns true if session existed. */
  touch(sessionId: string, ttlMs?: number): Promise<boolean>;

  /** Check if a session exists. */
  exists(sessionId: string): Promise<boolean>;

  /** Close the store and release connections. */
  close(): Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 6379;
const DEFAULT_KEY_PREFIX = 'session';
const DEFAULT_TTL_MS = 86_400_000; // 24 hours
const DEFAULT_CONNECT_TIMEOUT = 5000;
const DEFAULT_COMMAND_TIMEOUT = 3000;
const MAX_RETRY_ATTEMPTS = 3;

// ============================================================================
// Redis Session Store Implementation
// ============================================================================

export class RedisSessionStore implements SessionStore {
  private readonly client: Redis;
  private readonly ownsClient: boolean;
  private readonly keyPrefix: string;
  private readonly defaultTtlMs: number;
  private readonly logger: SessionLogger | undefined;
  private closed = false;

  constructor(options: RedisSessionStoreOptions = {}) {
    this.keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
    this.logger = options.logger;

    if (options.client !== undefined) {
      // Reuse an existing ioredis client
      this.client = options.client;
      this.ownsClient = false;
    } else {
      // Create a new ioredis client
      const redisOptions: RedisOptions = {
        host: options.host ?? DEFAULT_HOST,
        port: options.port ?? DEFAULT_PORT,
        db: options.db ?? 0,
        connectTimeout: options.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT,
        commandTimeout: options.commandTimeout ?? DEFAULT_COMMAND_TIMEOUT,
        retryStrategy: (times: number): number | null => {
          if (times > MAX_RETRY_ATTEMPTS) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      };

      if (options.password !== undefined) {
        redisOptions.password = options.password;
      }

      if (options.tls === true) {
        redisOptions.tls = {};
      }

      this.client = new redisConstructor(redisOptions);
      this.ownsClient = true;

      this.client.on('error', (err: Error) => {
        this.logger?.error('Redis session store connection error', { error: err.message });
      });

      this.client.on('connect', () => {
        this.logger?.debug('Redis session store connected', {
          host: options.host ?? DEFAULT_HOST,
          port: options.port ?? DEFAULT_PORT,
        });
      });

      // Eagerly connect
      this.client.connect().catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger?.error('Redis session store initial connection failed', {
          error: error.message,
        });
      });
    }
  }

  // --------------------------------------------------------------------------
  // SessionStore Interface
  // --------------------------------------------------------------------------

  /**
   * Retrieve session data by ID.
   *
   * @param sessionId - The session identifier
   * @returns Session data or null if not found/expired
   */
  async get(sessionId: string): Promise<SessionData | null> {
    const key = this.buildKey(sessionId);

    try {
      const raw = await this.client.get(key);
      if (raw === null) {
        return null;
      }

      const data = JSON.parse(raw) as SessionData;
      return data;
    } catch (error) {
      this.logger?.error('Failed to get session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Store session data with TTL-based expiration.
   *
   * @param sessionId - The session identifier
   * @param data - Session data to store
   * @param ttlMs - TTL in milliseconds (uses default if not provided)
   */
  async set(sessionId: string, data: SessionData, ttlMs?: number): Promise<void> {
    const key = this.buildKey(sessionId);
    const ttl = ttlMs ?? this.defaultTtlMs;

    try {
      const serialized = JSON.stringify(data);

      if (ttl > 0) {
        await this.client.psetex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger?.error('Failed to set session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a session by ID.
   *
   * @param sessionId - The session identifier
   * @returns True if a session was deleted
   */
  async delete(sessionId: string): Promise<boolean> {
    const key = this.buildKey(sessionId);

    try {
      const deleted = await this.client.del(key);
      return deleted > 0;
    } catch (error) {
      this.logger?.error('Failed to delete session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Refresh the TTL of an existing session without modifying data.
   *
   * @param sessionId - The session identifier
   * @param ttlMs - New TTL in milliseconds (uses default if not provided)
   * @returns True if the session existed and TTL was updated
   */
  async touch(sessionId: string, ttlMs?: number): Promise<boolean> {
    const key = this.buildKey(sessionId);
    const ttl = ttlMs ?? this.defaultTtlMs;

    try {
      let result: number;
      if (ttl > 0) {
        // PEXPIRE returns 1 if key exists and timeout was set
        result = await this.client.pexpire(key, ttl);
      } else {
        // Remove expiration (persist the key)
        result = await this.client.persist(key);
      }
      return result === 1;
    } catch (error) {
      this.logger?.error('Failed to touch session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if a session exists.
   *
   * @param sessionId - The session identifier
   * @returns True if the session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const key = this.buildKey(sessionId);

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger?.error('Failed to check session existence', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Close the store and release connections.
   * Only closes the client if it was created internally (not shared).
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    if (this.ownsClient) {
      await this.client.quit();
      this.logger?.info('Redis session store closed');
    }
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Build a Redis key with the configured prefix.
   *
   * @param sessionId - The session identifier
   * @returns Prefixed key string (e.g., "session:abc123")
   */
  private buildKey(sessionId: string): string {
    return `${this.keyPrefix}:${sessionId}`;
  }

  /**
   * Get the underlying Redis client (for testing or advanced use).
   */
  getClient(): Redis {
    return this.client;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new Redis session store.
 *
 * @param options - Configuration options
 * @returns A new RedisSessionStore instance
 */
export function createRedisSessionStore(options: RedisSessionStoreOptions = {}): RedisSessionStore {
  return new RedisSessionStore(options);
}
