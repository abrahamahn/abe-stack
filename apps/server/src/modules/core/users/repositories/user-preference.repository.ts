import { injectable, inject } from "inversify";

import { UserPreference, UserPreferenceInterface } from "./UserPreference";
import { TYPES } from "../../../infrastructure/di/types";
import { BaseRepository } from "../../base/baseRepository";

import type { IDatabaseServer } from "../../../infrastructure/database";
import type { ILoggerService } from "../../../infrastructure/logging";

/**
 * Repository for managing UserPreference entities
 */
@injectable()
export class UserPreferenceRepository extends BaseRepository<UserPreference> {
  /**
   * The database table name for this repository
   */
  protected tableName: string = "user_preferences";

  /**
   * The columns available in the database table
   */
  protected columns: string[] = [
    "id",
    "user_id",
    "theme",
    "language",
    "timezone",
    "notifications",
    "privacy",
    "created_at",
    "updated_at",
  ];

  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseService) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "UserPreference");
  }

  /**
   * Find preferences by user ID
   * @param userId - User ID to find preferences for
   * @returns User preferences or null if not found
   */
  public async findByUserId(userId: string): Promise<UserPreference | null> {
    try {
      // In a real implementation, this would query the database
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
        LIMIT 1
      `;

      const result = await this.executeQuery(query, [userId]);

      if (result.rowCount === 0) {
        return UserPreference.getDefaults(userId);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error(`Error finding preferences for user ${userId}:`, {
        error,
        userId,
      });
      return null;
    }
  }

  /**
   * Create new user preferences
   * @param userId - User ID to create preferences for
   * @returns Created user preferences
   */
  public async createForUser(userId: string): Promise<UserPreference> {
    try {
      const preferences = UserPreference.getDefaults(userId);
      // In a real implementation, this would save to the database
      return preferences;
    } catch (error) {
      this.logger.error(`Error creating preferences for user ${userId}:`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param userId - User ID to update preferences for
   * @param data - Partial preference data to update
   * @returns Updated user preferences
   */
  public async updateForUser(
    userId: string,
    data: Partial<UserPreferenceInterface>
  ): Promise<UserPreference> {
    try {
      // Find existing preferences or create new ones
      let preferences = await this.findByUserId(userId);

      if (!preferences) {
        preferences = UserPreference.getDefaults(userId);
      }

      // Update preferences with new data
      preferences.update(data);

      // In a real implementation, this would save to the database
      return preferences;
    } catch (error) {
      this.logger.error(`Error updating preferences for user ${userId}:`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   * @param userId - User ID to reset preferences for
   * @returns Reset user preferences
   */
  public async resetForUser(userId: string): Promise<UserPreference> {
    try {
      const preferences = UserPreference.getDefaults(userId);
      // In a real implementation, this would save to the database
      return preferences;
    } catch (error) {
      this.logger.error(`Error resetting preferences for user ${userId}:`, {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete user preferences
   * @param userId - User ID to delete preferences for
   * @returns True if successfully deleted
   */
  public async deleteForUser(userId: string): Promise<boolean> {
    try {
      // In a real implementation, this would delete from the database
      return true;
    } catch (error) {
      this.logger.error(`Error deleting preferences for user ${userId}:`, {
        error,
        userId,
      });
      return false;
    }
  }

  /**
   * Map database result row to model
   * @param row Database row
   * @returns Mapped model
   */
  protected mapResultToModel(row: Record<string, unknown>): UserPreference {
    return new UserPreference({
      id: row.id as string,
      userId: row.user_id as string,
      theme: row.theme as string,
      language: row.language as string,
      timezone: row.timezone as string,
      notifications:
        row.notifications as UserPreferenceInterface["notifications"],
      privacy: row.privacy as UserPreferenceInterface["privacy"],
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }
}
