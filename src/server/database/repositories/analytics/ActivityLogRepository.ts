import {
  ActivityLog,
  ActivityLogAttributes,
  ActivityType,
} from "../../models/analytics/ActivityLog";
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
    "user_id",
    "type",
    "target_id",
    "target_type",
    "metadata",
    "ip_address",
    "user_agent",
    "created_at",
  ];

  constructor() {
    super();
  }

  /**
   * Creates a new activity log entry.
   * This method handles the database operation and model conversion.
   *
   * @param data The activity log data to create
   * @returns The created ActivityLog instance
   */
  async create(
    data: Partial<ActivityLogAttributes> & {
      userId: string;
      type: ActivityType;
    },
  ): Promise<ActivityLog> {
    const activityLog = new ActivityLog(data);
    await super.create(activityLog);
    return activityLog;
  }

  /**
   * Finds an activity log by its ID.
   *
   * @param id The activity log ID
   * @returns The ActivityLog instance or null if not found
   */
  async findById(id: string): Promise<ActivityLog | null> {
    const result = await this.findOneByField("id", id);
    if (!result) return null;
    return new ActivityLog(result as unknown as ActivityLogAttributes);
  }

  /**
   * Finds all activity logs for a specific user.
   *
   * @param userId The user ID
   * @param options Query options for pagination
   * @returns Array of ActivityLog instances
   */
  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ActivityLog[]> {
    const results = await this.findByField("user_id", userId, {
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at DESC",
    });

    return this.mapResultRows(
      results,
      (result) => new ActivityLog(result as unknown as ActivityLogAttributes),
    );
  }

  /**
   * Finds all activity logs of a specific type.
   *
   * @param type The activity type to search for
   * @param options Query options for pagination
   * @returns Array of ActivityLog instances
   */
  async findByType(
    type: ActivityType,
    options?: { limit?: number; offset?: number },
  ): Promise<ActivityLog[]> {
    const results = await this.findByField("type", type, {
      limit: options?.limit,
      offset: options?.offset,
      orderBy: "created_at DESC",
    });

    return this.mapResultRows(
      results,
      (result) => new ActivityLog(result as unknown as ActivityLogAttributes),
    );
  }

  /**
   * Finds all activity logs within a specific time range.
   *
   * @param startDate The start date
   * @param endDate The end date
   * @param options Query options for pagination
   * @returns Array of ActivityLog instances
   */
  async findByTimeRange(
    startDate: Date,
    endDate: Date,
    options?: { limit?: number; offset?: number },
  ): Promise<ActivityLog[]> {
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
      params,
    );
    return this.mapResultRows(
      results.rows,
      (result) => new ActivityLog(result as unknown as ActivityLogAttributes),
    );
  }

  /**
   * Gets a summary of user activity within a specified time period.
   * This is a database operation that aggregates activity data.
   *
   * @param userId The user ID
   * @param days The number of days to look back
   * @returns Object containing activity counts by type
   */
  async getUserActivitySummary(
    userId: string,
    days: number = 30,
  ): Promise<Record<string, number>> {
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
