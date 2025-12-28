import { BaseService } from "../../../modules/base/baseService";

import { CacheService } from "../../cache/CacheService";
import { ConfigService } from "../../config/ConfigService";
import { DatabaseServer } from "../../database/DatabaseServer";
import { ILoggerService } from "../../logging/ILoggerService";

/**
 * Reset service interface
 */
export interface IResetService {
  /**
   * Reset the database to its initial state
   */
  resetDatabase(): Promise<void>;

  /**
   * Reset user data
   */
  resetUsers(): Promise<void>;

  /**
   * Reset application configuration
   */
  resetConfig(): Promise<void>;

  /**
   * Reset cache
   */
  resetCache(): Promise<void>;
}

/**
 * Service for resetting database and application state
 * Used primarily for development and testing
 */
export class ResetService extends BaseService implements IResetService {
  private configService: ConfigService;
  private cacheService: CacheService;

  /**
   * Constructor
   */
  constructor(
    logger: ILoggerService,
    databaseServer: DatabaseServer,
    configService: ConfigService,
    cacheService: CacheService
  ) {
    super(logger, databaseServer);
    this.configService = configService;
    this.cacheService = cacheService;
  }

  /**
   * Reset the database to its initial state
   */
  async resetDatabase(): Promise<void> {
    try {
      this.logger.info("Resetting database...");
      await this.databaseService.reset();
      this.logger.info("Database reset complete");
    } catch (error) {
      this.logger.error("Error resetting database:", { error });
    }
  }

  /**
   * Reset user data
   */
  async resetUsers(): Promise<void> {
    try {
      this.logger.info("Resetting user data...");
      // Clear all users from the database
      await this.databaseService.query("DELETE FROM users");
      this.logger.info("User data reset complete");
    } catch (error) {
      this.logger.error("Error resetting users:", { error });
    }
  }

  /**
   * Reset application configuration
   */
  async resetConfig(): Promise<void> {
    try {
      this.logger.info("Resetting configuration...");
      await this.configService.reset();
      this.logger.info("Configuration reset complete");
    } catch (error) {
      this.logger.error("Error resetting config:", { error });
    }
  }

  /**
   * Reset cache
   */
  async resetCache(): Promise<void> {
    try {
      this.logger.info("Clearing cache...");
      await this.cacheService.clear();
      this.logger.info("Cache reset complete");
    } catch (error) {
      this.logger.error("Error resetting cache:", { error });
    }
  }
}
