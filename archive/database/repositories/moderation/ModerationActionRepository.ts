import crypto from "crypto";

import {
  ModerationAction,
  ActionType,
  ActionStatus,
} from "@/server/database/models/moderation/ModerationAction";
import { EntityType } from "@/server/database/models/shared/EntityTypes";
import {
  ContentFilterError,
  ContentFilterNotFoundError,
  ContentFilterValidationError,
  ContentFilterOperationError,
} from "@/server/infrastructure/errors/domain/moderation/ContentFilterError";

import { BaseRepository } from "../BaseRepository";

export class ModerationActionRepository extends BaseRepository<ModerationAction> {
  protected tableName = "moderation_actions";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "action_type as actionType",
    "reason",
    "metadata",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("ModerationAction");
  }

  /**
   * Create a new moderation action
   * @param action The action to create
   * @returns The created moderation action
   * @throws {ContentFilterValidationError} If validation fails
   * @throws {ContentFilterOperationError} If an error occurs during the operation
   */
  async create(action: ModerationAction): Promise<ModerationAction> {
    try {
      // Validate the action before saving
      if (typeof action.validate === "function") {
        const validationErrors = action.validate();
        if (validationErrors.length > 0) {
          throw new ContentFilterValidationError(validationErrors);
        }
      }

      // Generate ID if not provided
      if (!action.id) {
        action.id = crypto.randomUUID();
      }

      const query = `
        INSERT INTO ${this.tableName} (
          id, user_id, target_id, target_type, action_type, reason, metadata, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING ${this.columns.join(", ")}
      `;

      const params = [
        action.id,
        action.userId,
        action.targetId,
        action.targetType,
        action.actionType,
        action.reason,
        action.metadata,
        action.createdAt,
        action.updatedAt,
      ];

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof ContentFilterValidationError) {
        throw error;
      }
      throw new ContentFilterOperationError("create", error);
    }
  }

  /**
   * Update an existing moderation action
   * @param action The action with updated values
   * @returns The updated action
   * @throws {ContentFilterNotFoundError} If the action doesn't exist
   * @throws {ContentFilterValidationError} If validation fails
   * @throws {ContentFilterOperationError} If an error occurs during the operation
   */
  async updateAction(action: ModerationAction): Promise<ModerationAction> {
    try {
      // Validate the action before updating
      if (typeof action.validate === "function") {
        const validationErrors = action.validate();
        if (validationErrors.length > 0) {
          throw new ContentFilterValidationError(validationErrors);
        }
      }

      // Check if action exists
      const existingAction = await this.findById(action.id);
      if (!existingAction) {
        throw new ContentFilterNotFoundError(action.id);
      }

      const query = `
        UPDATE ${this.tableName} SET
          user_id = $2,
          target_id = $3,
          target_type = $4,
          action_type = $5,
          reason = $6,
          metadata = $7,
          updated_at = $8
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const params = [
        action.id,
        action.userId,
        action.targetId,
        action.targetType,
        action.actionType,
        action.reason,
        action.metadata,
        new Date(),
      ];

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (
        error instanceof ContentFilterNotFoundError ||
        error instanceof ContentFilterValidationError
      ) {
        throw error;
      }
      throw new ContentFilterOperationError("updateAction", error);
    }
  }

  /**
   * Find action by ID
   * @param id Action ID
   * @returns The action or null if not found
   * @throws {ContentFilterOperationError} If an error occurs during the operation
   */
  async findById(id: string): Promise<ModerationAction | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) {
        return null;
      }

      return this.mapResultToModel(result);
    } catch (error) {
      throw new ContentFilterOperationError("findById", error);
    }
  }

  /**
   * Find action by ID or throw if not found
   * @param id Action ID
   * @returns The action
   * @throws {ContentFilterNotFoundError} If the action is not found
   * @throws {ContentFilterOperationError} If an error occurs during the operation
   */
  async findByIdOrThrow(id: string): Promise<ModerationAction> {
    const action = await this.findById(id);
    if (!action) {
      throw new ContentFilterNotFoundError(id);
    }
    return action;
  }

  /**
   * Find actions by moderator ID
   * @param moderatorId User ID of the moderator
   * @param limit Maximum number of actions to return
   * @param offset Number of actions to skip for pagination
   * @returns List of actions
   * @throws {ContentFilterOperationError} If an error occurs during the operation
   */
  async findByModeratorId(
    moderatorId: string,
    limit = 20,
    offset = 0
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
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
      throw new ContentFilterOperationError("findByModeratorId", error);
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
    offset = 0
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE target_id = $1
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
      throw new ContentFilterOperationError("findByTargetUserId", error);
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
    offset = 0
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE target_id = $1 AND target_type = $2
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
      throw new ContentFilterOperationError("findByContent", error);
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
    offset = 0
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE target_id = $1
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
      throw new ContentFilterOperationError("findByReportId", error);
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
    offset = 0
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE action_type = $1
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
      throw new ContentFilterOperationError("findByType", error);
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
    offset = 0
  ): Promise<ModerationAction[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE action_type = $1
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
      throw new ContentFilterOperationError("findByStatus", error);
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
        WHERE action_type = $1 AND (updated_at IS NULL OR updated_at > $2)
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
      throw new ContentFilterOperationError("findActiveActions", error);
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
        WHERE action_type = $1 AND updated_at IS NOT NULL AND updated_at <= $2
        ORDER BY updated_at ASC
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        ActionStatus.APPLIED,
        now,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new ContentFilterOperationError("findExpiredActions", error);
    }
  }

  /**
   * Apply an action to a target
   * @param actionId The ID of the action to apply
   * @returns The updated action
   * @throws {ContentFilterNotFoundError} If the action doesn't exist
   * @throws {ContentFilterOperationError} If an error occurs during the operation
   */
  async applyAction(actionId: string): Promise<ModerationAction> {
    try {
      const action = await this.findById(actionId);
      if (!action) {
        throw new ContentFilterNotFoundError(actionId);
      }

      // Apply the action logic...
      action.status = ActionStatus.ACTIVE;
      action.updatedAt = new Date();

      return this.updateAction(action);
    } catch (error) {
      if (error instanceof ContentFilterNotFoundError) {
        throw error;
      }
      throw new ContentFilterOperationError("applyAction", error);
    }
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
          throw new ContentFilterNotFoundError(actionId);
        }

        action.reverse();
        return await this.updateAction(action);
      } catch (error) {
        if (error instanceof ContentFilterNotFoundError) {
          throw error;
        }
        throw new ContentFilterOperationError("reverseAction", error);
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
          throw new ContentFilterNotFoundError(actionId);
        }

        action.expire();
        return await this.updateAction(action);
      } catch (error) {
        if (error instanceof ContentFilterNotFoundError) {
          throw error;
        }
        throw new ContentFilterOperationError("expireAction", error);
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
    daysToAdd: number
  ): Promise<ModerationAction> {
    return this.withTransaction(async () => {
      try {
        const action = await this.findById(actionId);
        if (!action) {
          throw new ContentFilterError(
            "Cannot extend expiration for a permanent action"
          );
        }

        if (!action.updatedAt) {
          throw new ContentFilterError(
            "Cannot extend expiration for a permanent action"
          );
        }

        const newExpirationDate = new Date(action.updatedAt);
        newExpirationDate.setDate(newExpirationDate.getDate() + daysToAdd);
        action.updatedAt = newExpirationDate;

        return await this.updateAction(action);
      } catch (error) {
        if (
          error instanceof ContentFilterNotFoundError ||
          error instanceof ContentFilterError
        ) {
          throw error;
        }
        throw new ContentFilterOperationError("extendExpiration", error);
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
        throw new ContentFilterNotFoundError(actionId);
      }
      return true;
    } catch (error) {
      if (error instanceof ContentFilterNotFoundError) {
        throw error;
      }
      throw new ContentFilterOperationError("delete", error);
    }
  }

  /**
   * Get count of actions by type
   * @returns Object with count by action type
   */
  async getActionCountsByType(): Promise<Record<ActionType, number>> {
    try {
      const query = `
        SELECT action_type, COUNT(*) as count
        FROM ${this.tableName}
        GROUP BY action_type
      `;

      const result = await this.executeQuery<{
        action_type: ActionType;
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
        counts[row.action_type] = parseInt(row.count);
      });

      return counts;
    } catch (error) {
      throw new ContentFilterOperationError("getActionCountsByType", error);
    }
  }

  /**
   * Maps a database row to a ModerationAction model
   * @param row Database result row
   * @returns ModerationAction instance
   */
  protected mapResultToModel(row: Record<string, unknown>): ModerationAction {
    if (!row) return null as unknown as ModerationAction;

    const metadata = row.metadata
      ? JSON.parse(row.metadata as string)
      : undefined;

    return new ModerationAction({
      ...row,
      metadata,
    });
  }
}

// Export singleton instance
export const moderationActionRepository = new ModerationActionRepository();
