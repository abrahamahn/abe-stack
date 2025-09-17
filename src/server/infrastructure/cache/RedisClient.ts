import { createClient, RedisClientType } from "redis";

/**
 * Redis client connection options
 */
export interface RedisOptions {
  /** Redis server host */
  host: string;
  /** Redis server port */
  port: number;
  /** Redis password if required */
  password?: string;
  /** Database number to use */
  db?: number;
  /** Connection timeout in milliseconds */
  connectTimeout?: number;
  /** Whether to enable TLS/SSL */
  tls?: boolean;
  /** Prefix for all keys */
  keyPrefix?: string;
}

/**
 * Default Redis connection options
 */
export const DEFAULT_REDIS_OPTIONS: RedisOptions = {
  host: "localhost",
  port: 6379,
  db: 0,
  connectTimeout: 10000,
  tls: false,
  keyPrefix: "",
};

// Global Redis client instance
let redisClient: RedisClientType | null = null;

/**
 * Get the Redis client instance
 * Creates a new client if one doesn't exist
 */
export async function getRedisClient(
  options?: Partial<RedisOptions>
): Promise<RedisClientType> {
  if (!redisClient) {
    const opts = { ...DEFAULT_REDIS_OPTIONS, ...options };
    const url = `${opts.tls ? "rediss" : "redis"}://${
      opts.password ? `:${opts.password}@` : ""
    }${opts.host}:${opts.port}/${opts.db}`;

    redisClient = createClient({
      url,
      socket: {
        connectTimeout: opts.connectTimeout,
      },
    });

    // Handle connection events
    redisClient.on("error", (err: Error) => {
      console.error("Redis client error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis client connected");
    });

    redisClient.on("reconnecting", () => {
      console.log("Redis client reconnecting");
    });

    try {
      // Connect to Redis server
      await redisClient.connect();
    } catch (error) {
      redisClient = null;
      throw error;
    }
  }

  return redisClient;
}

/**
 * Close the Redis client connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      throw error;
    } finally {
      redisClient = null;
      console.log("Redis connection closed");
    }
  }
}

/**
 * Create a new Redis client with specific options
 * Use this when you need a separate client with different settings
 */
export async function createRedisClient(
  options?: Partial<RedisOptions>
): Promise<RedisClientType> {
  const opts = { ...DEFAULT_REDIS_OPTIONS, ...options };
  const url = `${opts.tls ? "rediss" : "redis"}://${
    opts.password ? `:${opts.password}@` : ""
  }${opts.host}:${opts.port}/${opts.db}`;

  const client = createClient({
    url,
    socket: {
      connectTimeout: opts.connectTimeout,
    },
  });

  try {
    // Connect to Redis server
    await client.connect();
    return client as RedisClientType;
  } catch (error) {
    throw error;
  }
}
