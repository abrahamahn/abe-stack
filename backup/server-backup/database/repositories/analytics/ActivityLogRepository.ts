import {
  ActivityLog,
  ActivityLogAttributes,
  ActivityType,
} from "@/server/database/models/analytics/ActivityLog";
import {
  UserActivityError,
  UserActivityNotFoundError,
  UserActivityValidationError,
  UserActivityOperationError,
} from "@/server/infrastructure/errors/domain/analytics/UserActivityError";

import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling ActivityLog database operations.
 * This class is responsible for:
 * 1. All database operations related to activity logs
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for activity logs
 * 4. NOT implementing business logic - that belongs in the ActivityLog model
 */
export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  protected tableName = "activity_logs";
  protected columns = [
    "id",
    "user_id as userId",
    "action",
    "entity_type as entityType",
    "entity_id as entityId",
    "metadata",
    "ip_address as ipAddress",
    "user_agent as userAgent",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("ActivityLog");
  }

  /**
   * Creates a new activity log entry.
   * This method handles the database operation and model conversion.
   *
   * @param data The activity log data to create
   * @returns The created ActivityLog instance
   * @throws {UserActivityValidationError} If validation fails
   * @throws {UserActivityOperationError} If an error occurs during the operation
   */
  async create(
    data: Partial<ActivityLogAttributes> & {
      userId: string;
      type: ActivityType;
    }
  ): Promise<ActivityLog> {
    try {
      const activityLog = new ActivityLog(data);

      // Validate activity log data
      const validationErrors = activityLog.validate();
      if (validationErrors.length > 0) {
        throw new UserActivityValidationError(validationErrors);
      }

      const result = await super.create(activityLog);
      return this.mapResultToModel(result);
    } catch (error) {
      if (error instanceof UserActivityValidationError) {
        throw error;
      }
      throw new UserActivityOperationError("create", error);
    }
  }

  /**
   * Finds an activity log by its ID.
   *
   * @param id The activity log ID
   * @returns The ActivityLog instance or null if not found
   * @throws {UserActivityOperationError} If an error occurs during the operation
   */
  async findById(id: string): Promise<ActivityLog | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) return null;
      return this.mapResultToModel(result);
    } catch (error) {
      throw new UserActivityOperationError("findById", error);
    }
  }

  /**
   * Find an activity log by ID or throw if not found
   *
   * @param id The activity log ID
   * @returns The ActivityLog instance
   * @throws {UserActivityNotFoundError} If activity log not found
   * @throws {UserActivityOperationError} If an error occurs during the operation
   */
  async findByIdOrThrow(id: string): Promise<ActivityLog> {
    const activityLog = await this.findById(id);
    if (!activityLog) {
      throw new UserActivityNotFoundError(id);
    }
    return activityLog;
  }

  /**
   * Finds all activity logs for a specific user.
   *
   * @param userId The user ID
   * @param options Query options for pagination
   * @returns Array of ActivityLog instances
   * @throws {UserActivityOperationError} If an error occurs during the operation
   */
  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ActivityLog[]> {
    try {
      const results = await this.findByField("user_id", userId, {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: "created_at DESC",
      });

      return results.map((result) => this.mapResultToModel(result));
    } catch (error) {
      throw new UserActivityOperationError("findByUserId", error);
    }
  }

  /**
   * Finds all activity logs of a specific type.
   *
   * @param type The activity type to search for
   * @param options Query options for pagination
   * @returns Array of ActivityLog instances
   * @throws {UserActivityOperationError} If an error occurs during the operation
   */
  async findByType(
    type: ActivityType,
    options?: { limit?: number; offset?: number }
  ): Promise<ActivityLog[]> {
    try {
      const results = await this.findByField("type", type, {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: "created_at DESC",
      });

      return results.map((result) => this.mapResultToModel(result));
    } catch (error) {
      throw new UserActivityOperationError("findByType", error);
    }
  }

  /**
   * Finds all activity logs within a specific time range.
   *
   * @param startDate The start date
   * @param endDate The end date
   * @param options Query options for pagination
   * @returns Array of ActivityLog instances
   * @throws {UserActivityOperationError} If an error occurs during the operation
   */
  async findByTimeRange(
    startDate: Date,
    endDate: Date,
    options?: { limit?: number; offset?: number }
  ): Promise<ActivityLog[]> {
    try {
      // Validate date range
      if (startDate > endDate) {
        throw new UserActivityValidationError([
          { field: "dateRange", message: "Start date must be before end date" },
        ]);
      }

      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE created_at >= $1 AND created_at <= $2
        ORDER BY created_at DESC
        ${options?.limit ? "LIMIT $3" : ""}
        ${options?.offset ? "OFFSET $4" : ""}
      `;

      const params: (Date | number)[] = [startDate, endDate];
      if (options?.limit) params.push(options.limit);
      if (options?.offset) params.push(options.offset);

      const results = await this.executeQuery<Record<string, unknown>>(
        query,
        params
      );

      return results.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      if (error instanceof UserActivityValidationError) {
        throw error;
      }
      throw new UserActivityOperationError("findByTimeRange", error);
    }
  }

  /**
   * Gets a summary of user activity within a specified time period.
   * This is a database operation that aggregates activity data.
   *
   * @param userId The user ID
   * @param days The number of days to look back
   * @returns Object containing activity counts by type
   * @throws {UserActivityOperationError} If an error occurs during the operation
   */
  async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<Record<string, number>> {
    try {
      if (days <= 0) {
        throw new UserActivityValidationError([
          { field: "days", message: "Number of days must be positive" },
        ]);
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = `
        SELECT type, COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
        GROUP BY type
      `;

      const results = await this.executeQuery<{
        type: ActivityType;
        count: string;
      }>(query, [userId, startDate, endDate]);

      return results.rows.reduce((summary: Record<string, number>, row) => {
        summary[row.type] = parseInt(row.count, 10);
        return summary;
      }, {});
    } catch (error) {
      if (error instanceof UserActivityValidationError) {
        throw error;
      }
      throw new UserActivityOperationError("getUserActivitySummary", error);
    }
  }

  /**
   * Maps a database row to an ActivityLog model instance
   *
   * @param row The database row
   * @returns ActivityLog instance
   */
  protected mapResultToModel(row: Record<string, unknown>): ActivityLog {
    if (!row) return null as unknown as ActivityLog;
    return new ActivityLog(row as unknown as ActivityLogAttributes);
  }
}

// Export singleton instance
export const activityLogRepository = new ActivityLogRepository();
