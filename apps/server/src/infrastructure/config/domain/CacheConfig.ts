import { injectable, inject } from "inversify";

import type { IConfigService } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

/**
 * Cache provider types
 */
export enum CacheProviderType {
  MEMORY = "memory",
  REDIS = "redis",
}

/**
 * Redis cache configuration
 */
export interface RedisCacheOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  keyPrefix?: string;
}

/**
 * Cache service configuration
 */
export interface CacheServiceOptions {
  provider: CacheProviderType;
  cleanupInterval?: number; // In seconds, for memory cache
  redis?: RedisCacheOptions; // Redis-specific options
}

/**
 * Cache configuration provider
 */
@injectable()
export class CacheConfigProvider {
  private defaultConfig: CacheServiceOptions = {
    provider: CacheProviderType.MEMORY,
    cleanupInterval: 10, // 10 seconds
  };

  constructor(
    @inject(TYPES.ConfigService) private readonly config: IConfigService
  ) {}

  /**
   * Get cache configuration
   */
  public getConfig(): CacheServiceOptions {
    // Get provider type
    const provider = this.config.getWithDefault<string>(
      "cache.provider",
      CacheProviderType.MEMORY
    ) as CacheProviderType;

    // Get cleanup interval for memory cache
    const cleanupInterval = this.config.getWithDefault<number>(
      "cache.cleanupInterval",
      this.defaultConfig.cleanupInterval || 10
    );

    // Build the basic config
    const result: CacheServiceOptions = {
      provider,
      cleanupInterval,
    };

    // If Redis provider is selected, get Redis config
    if (provider === CacheProviderType.REDIS) {
      result.redis = {
        host: this.config.getWithDefault<string>(
          "cache.redis.host",
          "localhost"
        ),
        port: this.config.getWithDefault<number>("cache.redis.port", 6379),
        db: this.config.getWithDefault<number>("cache.redis.db", 0),
        keyPrefix: this.config.getWithDefault<string>(
          "cache.redis.keyPrefix",
          "cache:"
        ),
        password: this.config.getString("cache.redis.password", undefined),
        tls: this.config.getBoolean("cache.redis.tls", false),
      };
    }

    return result;
  }
}
