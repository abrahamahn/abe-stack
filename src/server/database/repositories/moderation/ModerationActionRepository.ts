import crypto from "crypto";

import { Logger } from "../../../services/dev/logger/LoggerService";
import {
  ModerationAction,
  ActionType,
  ActionStatus,
} from "../../models/moderation/ModerationAction";
import { EntityType } from "../../models/shared/EntityTypes";
import { BaseRepository } from "../BaseRepository";

export class ModerationActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModerationActionError";
  }
}

export class ModerationActionNotFoundError extends ModerationActionError {
  constructor(id: string) {
    super(`Moderation action with ID ${id} not found`);
    this.name = "ModerationActionNotFoundError";
  }
}

export class ModerationActionRepository extends BaseRepository<ModerationAction> {
  private static instance: ModerationActionRepository;
  protected logger = new Logger("ModerationActionRepository");
  protected tableName = "moderation_actions";
  protected columns = [
    "id",
    "moderator_id as moderatorId",
    "target_user_id as targetUserId",
    "content_id as contentId",
    "content_type as contentType",
    "report_id as reportId",
    "type",
    "reason",
    "status",
    "expires_at as expiresAt",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ModerationActionRepository {
    if (!ModerationActionRepository.instance) {
      ModerationActionRepository.instance = new ModerationActionRepository();
    }
    return ModerationActionRepository.instance;
  }

  /**
   * Create a new moderation action
   * @param action The action to create
   * @returns The created moderation action
   */
  async create(action: ModerationAction): Promise<ModerationAction> {
    try {
      // Validate the action before saving
      if (typeof action.validate === "function") {
        action.validate();
      }

      // Generate ID if not provided
      if (!action.id) {
        action.id = crypto.randomUUID();
      }

      const query = `
        INSERT INTO ${this.tableName} (
          id, moderator_id, target_user_id, content_id, content_type,
          report_id, type, reason, status, expires_at, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING ${this.columns.join(", ")}
      `;

      const params = [
        action.id,
        action.moderatorId,
        action.targetUserId,
        action.contentId || null,
        action.contentType || null,
        action.reportId || null,
        action.type,
        action.reason,
        action.status,
        action.expiresAt || null,
        action.createdAt,
        action.updatedAt,
      ];

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params,
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error creating moderation action", error);
      throw new ModerationActionError(
        `Failed to create moderation action: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update an existing moderation action
   * @param action The action with updated values
   * @returns The updated action
   * @throws ModerationActionNotFoundError if the action doesn't exist
   */
  async updateAction(action: ModerationAction): Promise<ModerationAction> {
    try {
      // Validate the action before updating
      if (typeof action.validate === "function") {
        action.validate();
      }

      // Check if action exists
      const existingAction = await this.findById(action.id);
      if (!existingAction) {
        throw new ModerationActionNotFoundError(action.id);
      }

      const query = `
        UPDATE ${this.tableName} SET
          moderator_id = $2,
          target_user_id = $3,
          content_id = $4,
          content_type = $5,
          report_id = $6,
          type = $7,
          reason = $8,
          status = $9,
          expires_at = $10,
          updated_at = $11
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const params = [
        action.id,
        action.moderatorId,
        action.targetUserId,
        action.contentId || null,
        action.contentType || null,
        action.reportId || null,
        action.type,
        action.reason,
        action.status,
        action.expiresAt || null,
        new Date(),
      ];

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params,
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error updating moderation action", error);
      if (error instanceof ModerationActionNotFoundError) {
        throw error;
      }
      throw new ModerationActionError(
        `Failed to update moderation action: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find action by ID
   * @param id Action ID
   * @returns The action or null if not found
   */
  async findById(id: string): Promise<ModerationAction | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) {
        return null;
      }

      return this.mapResultToModel(result);
    } catch (error) {
      this.logger.error(`Error finding moderation action by ID ${id}`, error);
      throw new ModerationActionError(
        `Failed to find moderation action: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find actions by moderator ID
   * @param moderatorId User ID of the moderator
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of actions
   */
  async findByModeratorId(
    moderatorId: string,
    limit = 20,
    offset = 0,
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE moderator_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        moderatorId,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding moderation actions by moderator ID ${moderatorId}`,
        error,
      );
      throw new ModerationActionError(
        `Failed to find actions by moderator: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find actions against a specific user
   * @param userId User ID of the target
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of actions
   */
  async findByTargetUserId(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE target_user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding moderation actions by target user ID ${userId}`,
        error,
      );
      throw new ModerationActionError(
        `Failed to find actions by target user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find actions by content ID and type
   * @param contentId ID of the content
   * @param contentType Type of the content
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of actions
   */
  async findByContent(
    contentId: string,
    contentType: EntityType,
    limit = 20,
    offset = 0,
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE content_id = $1 AND content_type = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        contentId,
        contentType,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding moderation actions for content ${contentId} of type ${contentType}`,
        error,
      );
      throw new ModerationActionError(
        `Failed to find actions for content: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find actions by report ID
   * @param reportId ID of the report
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of actions
   */
  async findByReportId(
    reportId: string,
    limit = 20,
    offset = 0,
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE report_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        reportId,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding moderation actions by report ID ${reportId}`,
        error,
      );
      throw new ModerationActionError(
        `Failed to find actions by report: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find actions by type
   * @param type Action type to filter by
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of actions
   */
  async findByType(
    type: ActionType,
    limit = 20,
    offset = 0,
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE type = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        type,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding moderation actions by type ${type}`,
        error,
      );
      throw new ModerationActionError(
        `Failed to find actions by type: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find actions by status
   * @param status Action status to filter by
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of actions
   */
  async findByStatus(
    status: ActionStatus,
    limit = 20,
    offset = 0,
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        status,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding moderation actions by status ${status}`,
        error,
      );
      throw new ModerationActionError(
        `Failed to find actions by status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find active actions (APPLIED status and not expired)
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of active actions
   */
  async findActiveActions(limit = 20, offset = 0): Promise<ModerationAction[]> {
    try {
      const now = new Date();
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1 AND (expires_at IS NULL OR expires_at > $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        ActionStatus.APPLIED,
        now,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding active moderation actions", error);
      throw new ModerationActionError(
        `Failed to find active actions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find expired temporary actions that still have APPLIED status
   * @returns List of expired actions
   */
  async findExpiredActions(): Promise<ModerationAction[]> {
    try {
      const now = new Date();
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1 AND expires_at IS NOT NULL AND expires_at <= $2
        ORDER BY expires_at ASC
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        ActionStatus.APPLIED,
        now,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding expired moderation actions", error);
      throw new ModerationActionError(
        `Failed to find expired actions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Apply a moderation action
   * @param actionId ID of the action to apply
   * @returns The updated action
   */
  async applyAction(actionId: string): Promise<ModerationAction> {
    return this.withTransaction(async () => {
      try {
        const action = await this.findById(actionId);
        if (!action) {
          throw new ModerationActionNotFoundError(actionId);
        }

        action.apply();
        return await this.updateAction(action);
      } catch (error) {
        this.logger.error(
          `Error applying moderation action ${actionId}`,
          error,
        );
        if (error instanceof ModerationActionNotFoundError) {
          throw error;
        }
        throw new ModerationActionError(
          `Failed to apply action: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Reverse a moderation action
   * @param actionId ID of the action to reverse
   * @returns The updated action
   */
  async reverseAction(actionId: string): Promise<ModerationAction> {
    return this.withTransaction(async () => {
      try {
        const action = await this.findById(actionId);
        if (!action) {
          throw new ModerationActionNotFoundError(actionId);
        }

        action.reverse();
        return await this.updateAction(action);
      } catch (error) {
        this.logger.error(
          `Error reversing moderation action ${actionId}`,
          error,
        );
        if (error instanceof ModerationActionNotFoundError) {
          throw error;
        }
        throw new ModerationActionError(
          `Failed to reverse action: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Mark a temporary action as expired
   * @param actionId ID of the action to expire
   * @returns The updated action
   */
  async expireAction(actionId: string): Promise<ModerationAction> {
    return this.withTransaction(async () => {
      try {
        const action = await this.findById(actionId);
        if (!action) {
          throw new ModerationActionNotFoundError(actionId);
        }

        action.expire();
        return await this.updateAction(action);
      } catch (error) {
        this.logger.error(
          `Error expiring moderation action ${actionId}`,
          error,
        );
        if (error instanceof ModerationActionNotFoundError) {
          throw error;
        }
        throw new ModerationActionError(
          `Failed to expire action: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Update a temporary action's expiration date
   * @param actionId ID of the action
   * @param daysToAdd Number of days to add to current expiration
   * @returns The updated action
   */
  async extendExpiration(
    actionId: string,
    daysToAdd: number,
  ): Promise<ModerationAction> {
    return this.withTransaction(async () => {
      try {
        const action = await this.findById(actionId);
        if (!action) {
          throw new ModerationActionNotFoundError(actionId);
        }

        if (!action.expiresAt) {
          throw new ModerationActionError(
            "Cannot extend expiration for a permanent action",
          );
        }

        const newExpirationDate = new Date(action.expiresAt);
        newExpirationDate.setDate(newExpirationDate.getDate() + daysToAdd);
        action.expiresAt = newExpirationDate;

        return await this.updateAction(action);
      } catch (error) {
        this.logger.error(
          `Error extending expiration for action ${actionId}`,
          error,
        );
        if (
          error instanceof ModerationActionNotFoundError ||
          error instanceof ModerationActionError
        ) {
          throw error;
        }
        throw new ModerationActionError(
          `Failed to extend action expiration: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Delete a moderation action
   * @param actionId ID of the action to delete
   * @returns True if successful
   */
  async delete(actionId: string): Promise<boolean> {
    try {
      const result = await super.delete(actionId);
      if (!result) {
        throw new ModerationActionNotFoundError(actionId);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error deleting moderation action ${actionId}`, error);
      if (error instanceof ModerationActionNotFoundError) {
        throw error;
      }
      throw new ModerationActionError(
        `Failed to delete action: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get count of actions by type
   * @returns Object with count by action type
   */
  async getActionCountsByType(): Promise<Record<ActionType, number>> {
    try {
      const query = `
        SELECT type, COUNT(*) as count
        FROM ${this.tableName}
        GROUP BY type
      `;

      const result = await this.executeQuery<{
        type: ActionType;
        count: string;
      }>(query);

      const counts: Record<ActionType, number> = {} as Record<
        ActionType,
        number
      >;

      // Initialize all types with 0
      Object.values(ActionType).forEach((type) => {
        counts[type] = 0;
      });

      // Update counts from query results
      result.rows.forEach((row) => {
        counts[row.type] = parseInt(row.count);
      });

      return counts;
    } catch (error) {
      this.logger.error("Error getting action counts by type", error);
      throw new ModerationActionError(
        `Failed to get action counts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map database result to ModerationAction model
   * @param row Database result row
   * @returns ModerationAction model
   */
  protected mapResultToModel(row: Record<string, unknown>): ModerationAction {
    if (!row) return null as unknown as ModerationAction;

    const action = new ModerationAction({
      moderatorId: String(row.moderatorId || row.moderator_id),
      targetUserId: String(row.targetUserId || row.target_user_id),
      type: row.type as ActionType,
      reason: String(row.reason || ""),
    });

    action.id = String(row.id || "");
    action.contentId =
      row.contentId || row.content_id
        ? String(row.contentId || row.content_id)
        : undefined;
    action.contentType =
      row.contentType || row.content_type
        ? (String(row.contentType || row.content_type) as EntityType)
        : undefined;
    action.reportId =
      row.reportId || row.report_id
        ? String(row.reportId || row.report_id)
        : undefined;
    action.status = row.status as ActionStatus;
    action.expiresAt =
      row.expiresAt || row.expires_at
        ? new Date(String(row.expiresAt || row.expires_at))
        : undefined;
    action.createdAt = new Date(String(row.createdAt || row.created_at));
    action.updatedAt = new Date(String(row.updatedAt || row.updated_at));

    return action;
  }
}

// Export a singleton instance
export const moderationActionRepository =
  ModerationActionRepository.getInstance();
