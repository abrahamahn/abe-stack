import {
  ActivityLog,
  ActivityType,
} from "@/server/database/models/analytics/ActivityLog";
import { ActivityLogRepository } from "@/server/database/repositories/analytics/ActivityLogRepository";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared/base/BaseService";

/**
 * Options for querying system events
 */
export interface SystemEventOptions extends PaginationOptions {
  startDate?: Date;
  endDate?: Date;
  types?: ActivityType[];
}

/**
 * Options for querying activity logs
 */
export interface ActivityQueryOptions extends PaginationOptions {
  startDate?: Date;
  endDate?: Date;
  types?: ActivityType[];
}

/**
 * Service for tracking and querying user activities and system events
 * Features:
 * 1. Activity tracking for user actions
 * 2. System event logging for auditing
 * 3. Activity pattern analysis
 * 4. Compliance reporting for security audits
 */
export class ActivityLogService extends BaseService {
  /**
   * Creates a new instance of ActivityLogService
   * @param activityLogRepository Repository for activity log operations
   */
  constructor(private readonly activityLogRepository: ActivityLogRepository) {
    super("ActivityLogService");
  }

  /**
   * Logs a user activity
   * @param userId ID of the user performing the activity
   * @param action Type of activity being performed
   * @param metadata Additional data related to the activity
   * @param options Additional options like IP address, user agent
   * @returns The created activity log
   */
  async logActivity(
    userId: string,
    action: ActivityType,
    metadata: Record<string, unknown> = {},
    options?: {
      ipAddress?: string;
      userAgent?: string;
      targetId?: string;
      targetType?: string;
    }
  ): Promise<ActivityLog> {
    try {
      this.logger.info(`Logging activity ${action} for user ${userId}`);

      return await this.activityLogRepository.create({
        userId,
        type: action,
        metadata,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        targetId: options?.targetId,
        targetType: options?.targetType,
      });
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error}`);
      throw error;
    }
  }

  /**
   * Gets activities for a specific user with pagination
   * @param userId ID of the user
   * @param options Pagination and filtering options
   * @returns Paginated list of activities
   */
  async getUserActivities(
    userId: string,
    options: ActivityQueryOptions = {}
  ): Promise<PaginatedResult<ActivityLog>> {
    try {
      const { page = 1, limit = 20, startDate, endDate, types } = options;
      const offset = (page - 1) * limit;

      // If date range is specified, use time range query
      if (startDate && endDate) {
        const activities = await this.activityLogRepository.findByTimeRange(
          startDate,
          endDate,
          { limit, offset }
        );

        // Filter by user and types if needed
        const filteredActivities = activities.filter(
          (activity) =>
            activity.userId === userId &&
            (!types || types.includes(activity.type))
        );

        // In a real implementation, we would get the total count from the repository
        // For now, estimate based on the filtered results
        const total = filteredActivities.length * (page + 1); // Estimated total

        return {
          items: filteredActivities,
          total: Math.max(total, filteredActivities.length),
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }

      // Standard user activity query
      const activities = await this.activityLogRepository.findByUserId(userId, {
        limit,
        offset,
      });

      // Filter by types if needed
      const filteredActivities = types
        ? activities.filter((activity) => types.includes(activity.type))
        : activities;

      // In a real implementation, we would get the total count from the repository
      const total = filteredActivities.length * (page + 1); // Estimated total

      return {
        items: filteredActivities,
        total: Math.max(total, filteredActivities.length),
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get user activities: ${error}`);
      throw error;
    }
  }

  /**
   * Gets system events with pagination
   * @param options Pagination and filtering options
   * @returns Paginated list of system events
   */
  async getSystemEvents(
    options: SystemEventOptions = {}
  ): Promise<PaginatedResult<ActivityLog>> {
    try {
      const { page = 1, limit = 20, startDate, endDate, types } = options;

      // In a real implementation, we would have a dedicated method to query system events
      // For now, use time range query if dates are specified
      if (startDate && endDate) {
        const logs = await this.activityLogRepository.findByTimeRange(
          startDate,
          endDate,
          { limit, offset: (page - 1) * limit }
        );

        // Filter by types if specified
        const filteredLogs = types
          ? logs.filter((log) => types.includes(log.type))
          : logs;

        // Estimate total count
        const total = filteredLogs.length * (page + 1);

        return {
          items: filteredLogs,
          total: Math.max(total, filteredLogs.length),
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }

      // If no date range, get all activities and filter them
      // In a real implementation, this would be a more efficient query
      const offset = (page - 1) * limit;

      // Get activities of specific types if specified
      const logs =
        types && types.length > 0
          ? await Promise.all(
              types.map((type) =>
                this.activityLogRepository.findByType(type, { limit, offset })
              )
            ).then((results) => results.flat())
          : []; // If no types specified, we'd need a method to get all logs

      // Estimate total count
      const total = logs.length * (page + 1);

      return {
        items: logs,
        total: Math.max(total, logs.length),
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get system events: ${error}`);
      throw error;
    }
  }

  /**
   * Gets an audit trail for a specific entity
   * @param entityId ID of the entity
   * @param entityType Type of entity
   * @returns Array of activity logs related to the entity
   */
  async getAuditTrail(
    entityId: string,
    entityType: string
  ): Promise<ActivityLog[]> {
    try {
      this.logger.info(
        `Getting audit trail for ${entityType} with ID ${entityId}`
      );

      // In a real implementation, we would have a dedicated method in the repository
      // For now, simulate by querying and filtering
      const allActivities = await this.activityLogRepository.findByTimeRange(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date(),
        { limit: 1000 } // Get a large number of activities
      );

      // Filter activities related to the entity
      return allActivities.filter(
        (activity) =>
          activity.targetId === entityId && activity.targetType === entityType
      );
    } catch (error) {
      this.logger.error(`Failed to get audit trail: ${error}`);
      throw error;
    }
  }

  /**
   * Analyzes activity patterns for a user
   * @param userId ID of the user
   * @param days Number of days to analyze
   * @returns Activity pattern analysis
   */
  async analyzeUserActivityPatterns(
    userId: string,
    days: number = 30
  ): Promise<{
    activityByDay: Record<string, number>;
    activityByHour: Record<number, number>;
    activityByType: Record<string, number>;
    totalActivities: number;
    averageActivitiesPerDay: number;
    mostActiveDay: string;
    mostActiveHour: number;
    mostFrequentActivityType: ActivityType;
  }> {
    try {
      // Get activities for the specified time range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await this.activityLogRepository.findByTimeRange(
        startDate,
        endDate,
        { limit: 10000 } // Large limit to get all activities
      );

      // Filter for the specific user
      const userActivities = activities.filter(
        (activity) => activity.userId === userId
      );

      // Initialize analysis objects
      const activityByDay: Record<string, number> = {};
      const activityByHour: Record<number, number> = {};
      const activityByType: Record<string, number> = {};

      // Analyze patterns
      userActivities.forEach((activity) => {
        // Format date as YYYY-MM-DD for day analysis
        const day = activity.createdAt.toISOString().split("T")[0];
        activityByDay[day] = (activityByDay[day] || 0) + 1;

        // Get hour for hour analysis
        const hour = activity.createdAt.getHours();
        activityByHour[hour] = (activityByHour[hour] || 0) + 1;

        // Count by activity type
        activityByType[activity.type] =
          (activityByType[activity.type] || 0) + 1;
      });

      // Calculate derived metrics
      const totalActivities = userActivities.length;
      const averageActivitiesPerDay = totalActivities / days;

      // Find most active day, hour, and activity type
      let mostActiveDay = "";
      let maxDayCount = 0;
      Object.entries(activityByDay).forEach(([day, count]) => {
        if (count > maxDayCount) {
          mostActiveDay = day;
          maxDayCount = count;
        }
      });

      let mostActiveHour = 0;
      let maxHourCount = 0;
      Object.entries(activityByHour).forEach(([hour, count]) => {
        if (count > maxHourCount) {
          mostActiveHour = parseInt(hour, 10);
          maxHourCount = count;
        }
      });

      let mostFrequentActivityType = ActivityType.USER_LOGIN;
      let maxTypeCount = 0;
      Object.entries(activityByType).forEach(([type, count]) => {
        if (count > maxTypeCount) {
          mostFrequentActivityType = type as ActivityType;
          maxTypeCount = count;
        }
      });

      return {
        activityByDay,
        activityByHour,
        activityByType,
        totalActivities,
        averageActivitiesPerDay,
        mostActiveDay,
        mostActiveHour,
        mostFrequentActivityType,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze user activity patterns: ${error}`);
      throw error;
    }
  }

  /**
   * Gets compliance reports for security auditing
   * @param startDate Start date for the report
   * @param endDate End date for the report
   * @returns Compliance report data
   */
  async getComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSystemEvents: number;
    userActionsByType: Record<ActivityType, number>;
    securityEvents: ActivityLog[];
    unusualActivities: ActivityLog[];
    reportGeneratedAt: Date;
  }> {
    try {
      // Get all activities in the time range
      const activities = await this.activityLogRepository.findByTimeRange(
        startDate,
        endDate,
        { limit: 10000 } // Large limit to get all activities
      );

      // Count events by type
      const userActionsByType = activities.reduce(
        (acc, activity) => {
          acc[activity.type] = (acc[activity.type] || 0) + 1;
          return acc;
        },
        {} as Record<ActivityType, number>
      );

      // Define security-related activity types
      const securityRelatedTypes = [
        ActivityType.USER_LOGIN,
        ActivityType.USER_SIGNUP,
        // Add other security-related types
      ];

      // Filter security events
      const securityEvents = activities.filter((activity) =>
        securityRelatedTypes.includes(activity.type)
      );

      // Simulate detection of unusual activities
      // In a real implementation, this would use more sophisticated anomaly detection
      const unusualActivities = activities.filter((activity) => {
        // Example: Activities with metadata flagged as unusual
        return activity.metadata && activity.metadata.unusual === true;
      });

      return {
        totalSystemEvents: activities.length,
        userActionsByType,
        securityEvents,
        unusualActivities,
        reportGeneratedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate compliance report: ${error}`);
      throw error;
    }
  }
}
