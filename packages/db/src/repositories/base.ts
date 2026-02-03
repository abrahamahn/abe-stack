// packages/db/src/repositories/base.ts
import { type DbClient, type RawDb } from '../client';

export interface RepositoryConfig {
  db: DbClient;
}

/**
 * Base Repository
 *
 * Provides a foundation for all repositories with common utility methods
 * and transaction support.
 */
export abstract class BaseRepository {
  protected readonly db: DbClient;

  constructor(config: RepositoryConfig) {
    this.db = config.db;
  }

  /**
   * Helper to get the underlying raw database client.
   * Useful for specialized queries that don't fit the repository abstractions.
   */
  protected get raw(): RawDb {
    return this.db;
  }
}
