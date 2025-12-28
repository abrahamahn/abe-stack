import { injectable, inject } from "inversify";
import { QueryResultRow, PoolClient } from "pg";

import { GroupMemberRole } from "@/server/database/models/community/Group";
import {
  GroupMember,
  GroupMemberAttributes,
  MembershipStatus,
} from "@/server/database/models/community/GroupMember";
import TYPES from "@/server/infrastructure/di/types";
import {
  GroupMemberNotFoundError,
  GroupMemberValidationError,
  GroupMemberOperationError,
  GroupMemberAlreadyExistsError,
  LastAdminError,
} from "@/server/infrastructure/errors/domain/community/GroupMemberError";

import { BaseRepository } from "../BaseRepository";

import type { IDatabaseServer } from "@/server/infrastructure/database";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Repository class for handling GroupMember database operations.
 * This class is responsible for:
 * 1. All database operations related to group members
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for group memberships
 * 4. NOT implementing business logic - that belongs in the GroupMember model
 */
@injectable()
export class GroupMemberRepository extends BaseRepository<GroupMember> {
  protected tableName = "group_members";
  protected columns = [
    "id",
    "group_id as groupId",
    "user_id as userId",
    "role",
    "status",
    "notification_settings as notificationSettings",
    "metadata",
    "last_activity as lastActivity",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor(
    @inject(TYPES.LoggerService) protected logger: ILoggerService,
    @inject(TYPES.DatabaseService) protected databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "GroupMember");
  }

  /**
   * Find members of a group
   * @param groupId The group ID
   * @param limit Maximum number of members to return
   * @param offset Number of members to skip
   * @param status The membership status to filter by
   * @returns Array of GroupMember instances
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async findByGroupId(
    groupId: string,
    limit = 50,
    offset = 0,
    status = MembershipStatus.APPROVED
  ): Promise<GroupMember[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE group_id = $1 AND status = $2
        ORDER BY role, created_at ASC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery(query, [
        groupId,
        status,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new GroupMemberOperationError("findByGroupId", error);
    }
  }

  /**
   * Find groups that a user is a member of
   * @param userId The user ID
   * @param limit Maximum number of memberships to return
   * @param offset Number of memberships to skip
   * @param status The membership status to filter by
   * @returns Array of GroupMember instances
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    status = MembershipStatus.APPROVED
  ): Promise<GroupMember[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1 AND status = $2
        ORDER BY last_activity DESC NULLS LAST, created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery(query, [
        userId,
        status,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new GroupMemberOperationError("findByUserId", error);
    }
  }

  /**
   * Find membership record by group and user IDs
   * @param groupId The group ID
   * @param userId The user ID
   * @returns The GroupMember instance or null if not found
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async findByGroupAndUserId(
    groupId: string,
    userId: string
  ): Promise<GroupMember | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE group_id = $1 AND user_id = $2
        LIMIT 1
      `;

      const result = await this.executeQuery(query, [groupId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new GroupMemberOperationError("findByGroupAndUserId", error);
    }
  }

  /**
   * Find or throw if group member doesn't exist
   * @param groupId The group ID
   * @param userId The user ID
   * @returns The GroupMember instance
   * @throws {GroupMemberNotFoundError} If member not found
   * @throws {GroupMemberOperationError} If an error occurs during operation
   */
  async findByGroupAndUserIdOrThrow(
    groupId: string,
    userId: string
  ): Promise<GroupMember> {
    const member = await this.findByGroupAndUserId(groupId, userId);

    if (!member) {
      throw new GroupMemberNotFoundError(undefined, groupId, userId);
    }

    return member;
  }

  /**
   * Find members by role
   * @param groupId The group ID
   * @param role The role to filter by
   * @param limit Maximum number of members to return
   * @param offset Number of members to skip
   * @returns Array of GroupMember instances
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async findByRole(
    groupId: string,
    role: GroupMemberRole,
    limit = 20,
    offset = 0
  ): Promise<GroupMember[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE group_id = $1 AND role = $2 AND status = $3
        ORDER BY created_at ASC
        LIMIT $4 OFFSET $5
      `;

      const result = await this.executeQuery(query, [
        groupId,
        role,
        MembershipStatus.APPROVED,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new GroupMemberOperationError("findByRole", error);
    }
  }

  /**
   * Find members by status
   * @param groupId The group ID
   * @param status The status to filter by
   * @param limit Maximum number of members to return
   * @param offset Number of members to skip
   * @returns Array of GroupMember instances
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async findByStatus(
    groupId: string,
    status: MembershipStatus,
    limit = 20,
    offset = 0
  ): Promise<GroupMember[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE group_id = $1 AND status = $2
        ORDER BY created_at ASC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery(query, [
        groupId,
        status,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new GroupMemberOperationError("findByStatus", error);
    }
  }

  /**
   * Count members by status
   * @param groupId The group ID
   * @param status The status to count
   * @returns The count of members with the specified status
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async countByStatus(
    groupId: string,
    status: MembershipStatus
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE group_id = $1 AND status = $2
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        groupId,
        status,
      ]);

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new GroupMemberOperationError("countByStatus", error);
    }
  }

  /**
   * Count admins in a group
   * @param groupId The group ID
   * @returns The count of admin members
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async countAdmins(groupId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE group_id = $1 AND role = $2 AND status = $3
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        groupId,
        GroupMemberRole.ADMIN,
        MembershipStatus.APPROVED,
      ]);

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new GroupMemberOperationError("countAdmins", error);
    }
  }

  /**
   * Update member role
   * @param groupId The group ID
   * @param userId The user ID
   * @param role The new role
   * @returns The updated GroupMember instance
   * @throws {GroupMemberNotFoundError} If member not found
   * @throws {LastAdminError} If trying to demote the last admin
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async updateRole(
    groupId: string,
    userId: string,
    role: GroupMemberRole
  ): Promise<GroupMember> {
    try {
      // Check if member exists
      const member = await this.findByGroupAndUserIdOrThrow(groupId, userId);

      // Check if demoting from admin and is the last admin
      if (
        member.role === GroupMemberRole.ADMIN &&
        role !== GroupMemberRole.ADMIN
      ) {
        const adminCount = await this.countAdmins(groupId);
        if (adminCount <= 1) {
          throw new LastAdminError(groupId, userId);
        }
      }

      const query = `
        UPDATE ${this.tableName}
        SET role = $3,
            updated_at = NOW()
        WHERE group_id = $1 AND user_id = $2
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [groupId, userId, role]);

      if (result.rows.length === 0) {
        throw new GroupMemberNotFoundError(undefined, groupId, userId);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (
        error instanceof GroupMemberNotFoundError ||
        error instanceof LastAdminError
      ) {
        throw error;
      }
      throw new GroupMemberOperationError("updateRole", error);
    }
  }

  /**
   * Update member status
   * @param groupId The group ID
   * @param userId The user ID
   * @param status The new status
   * @returns The updated GroupMember instance
   * @throws {GroupMemberNotFoundError} If member not found
   * @throws {LastAdminError} If trying to remove the last admin
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async updateStatus(
    groupId: string,
    userId: string,
    status: MembershipStatus
  ): Promise<GroupMember> {
    return this.withTransaction(async (client) => {
      try {
        // First find the member to check their current status and role
        const member = await this.findByGroupAndUserIdOrThrow(groupId, userId);

        // Check if removing an admin and is the last admin
        if (
          member.isAdmin() &&
          member.isApproved() &&
          status !== MembershipStatus.APPROVED
        ) {
          const adminCount = await this.countAdmins(groupId);
          if (adminCount <= 1) {
            throw new LastAdminError(groupId, userId);
          }
        }

        const query = `
          UPDATE ${this.tableName}
          SET status = $3,
              updated_at = NOW()
          WHERE group_id = $1 AND user_id = $2
          RETURNING ${this.columns.join(", ")}
        `;

        const result = await this.executeQuery(
          query,
          [groupId, userId, status],
          client
        );

        if (result.rows.length === 0) {
          throw new GroupMemberNotFoundError(undefined, groupId, userId);
        }

        const updatedMember = this.mapResultToModel(result.rows[0]);
        const previousStatus = member.status;

        // Only update group member count if status changes to or from APPROVED
        if (
          status === MembershipStatus.APPROVED &&
          previousStatus !== MembershipStatus.APPROVED
        ) {
          // Update group member count when a new member is approved
          await client.query(
            `
            UPDATE groups
            SET member_count = member_count + 1,
                updated_at = NOW()
            WHERE id = $1
          `,
            [groupId]
          );
        } else if (
          status !== MembershipStatus.APPROVED &&
          previousStatus === MembershipStatus.APPROVED
        ) {
          // Decrease group member count when a member is no longer approved
          await client.query(
            `
            UPDATE groups
            SET member_count = GREATEST(member_count - 1, 0),
                updated_at = NOW()
            WHERE id = $1
          `,
            [groupId]
          );
        }

        return updatedMember;
      } catch (error) {
        if (
          error instanceof GroupMemberNotFoundError ||
          error instanceof LastAdminError
        ) {
          throw error;
        }
        throw new GroupMemberOperationError("updateStatus", error);
      }
    });
  }

  /**
   * Update last activity timestamp
   * @param groupId The group ID
   * @param userId The user ID
   * @returns True if the update was successful
   * @throws {GroupMemberNotFoundError} If member not found
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async updateLastActivity(groupId: string, userId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET last_activity = NOW(),
            updated_at = NOW()
        WHERE group_id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await this.executeQuery<{ id: string }>(query, [
        groupId,
        userId,
      ]);

      if (result.rows.length === 0) {
        throw new GroupMemberNotFoundError(undefined, groupId, userId);
      }

      return true;
    } catch (error) {
      if (error instanceof GroupMemberNotFoundError) {
        throw error;
      }
      throw new GroupMemberOperationError("updateLastActivity", error);
    }
  }

  /**
   * Update notification settings
   * @param id The membership ID
   * @param settings The notification settings to update
   * @returns The updated GroupMember instance
   * @throws {GroupMemberNotFoundError} If member not found
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async updateNotificationSettings(
    id: string,
    settings: Record<string, boolean>
  ): Promise<GroupMember> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET notification_settings = notification_settings || $2::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [
        id,
        JSON.stringify(settings),
      ]);

      if (result.rows.length === 0) {
        throw new GroupMemberNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof GroupMemberNotFoundError) {
        throw error;
      }
      throw new GroupMemberOperationError("updateNotificationSettings", error);
    }
  }

  /**
   * Create a new group member
   * @param data The group member data
   * @returns The created GroupMember instance
   * @throws {GroupMemberValidationError} If validation fails
   * @throws {GroupMemberAlreadyExistsError} If membership already exists with the same status
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async create(
    data: Omit<GroupMemberAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<GroupMember> {
    return this.withTransaction(async (client) => {
      try {
        // Create the group member instance and validate it
        const groupMember = new GroupMember(data as GroupMemberAttributes);
        const validationErrors = groupMember.validate();
        if (validationErrors.length > 0) {
          throw new GroupMemberValidationError(validationErrors);
        }

        // Check if membership already exists
        const existingMember = await this.findByGroupAndUserId(
          data.groupId as string,
          data.userId as string
        );

        if (existingMember) {
          // If the membership exists but status is changing to approved, update it
          if (
            existingMember.status !== MembershipStatus.APPROVED &&
            data.status === MembershipStatus.APPROVED
          ) {
            return this.updateStatus(
              data.groupId as string,
              data.userId as string,
              MembershipStatus.APPROVED
            );
          }

          throw new GroupMemberAlreadyExistsError(
            data.groupId as string,
            data.userId as string
          );
        }

        // Convert model to database format
        const insertData = {
          id: groupMember.id,
          group_id: groupMember.groupId,
          user_id: groupMember.userId,
          role: groupMember.role,
          status: groupMember.status,
          notification_settings: JSON.stringify(
            groupMember.notificationSettings
          ),
          metadata: null,
          last_activity: groupMember.lastActivity,
        };

        // Insert the new record
        const columns = Object.keys(insertData);
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const values = Object.values(insertData);

        const query = `
          INSERT INTO ${this.tableName} (${columns.join(", ")}, created_at, updated_at)
          VALUES (${placeholders.join(", ")}, NOW(), NOW())
          RETURNING ${this.columns.join(", ")}
        `;

        const result = await this.executeQuery(query, values, client);
        const newMember = this.mapResultToModel(result.rows[0]);

        // Update group member count if new member is approved
        if (data.status === MembershipStatus.APPROVED) {
          await client.query(
            `
            UPDATE groups
            SET member_count = member_count + 1,
                updated_at = NOW()
            WHERE id = $1
          `,
            [data.groupId]
          );
        }

        return newMember;
      } catch (error) {
        if (
          error instanceof GroupMemberValidationError ||
          error instanceof GroupMemberAlreadyExistsError
        ) {
          throw error;
        }
        throw new GroupMemberOperationError("create", error);
      }
    });
  }

  /**
   * Delete a group member by ID
   * @param id The membership ID
   * @returns True if deletion was successful
   * @throws {GroupMemberNotFoundError} If member not found
   * @throws {LastAdminError} If trying to delete the last admin
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async (client) => {
      try {
        // Get the member first to check if they were approved and their role
        const query = `
          SELECT ${this.columns.join(", ")}
          FROM ${this.tableName}
          WHERE id = $1
          LIMIT 1
        `;

        const result = await this.executeQuery(query, [id], client);

        if (result.rows.length === 0) {
          throw new GroupMemberNotFoundError(id);
        }

        const member = this.mapResultToModel(result.rows[0]);
        const wasApproved = member.isApproved();
        const { groupId } = member;

        // Check if deleting an admin and is the last admin
        if (member.isAdmin() && wasApproved) {
          const adminCount = await this.countAdmins(groupId);
          if (adminCount <= 1) {
            throw new LastAdminError(groupId, member.userId);
          }
        }

        // Delete the member
        const deleteQuery = `
          DELETE FROM ${this.tableName}
          WHERE id = $1
          RETURNING id
        `;

        const deleteResult = await this.executeQuery(deleteQuery, [id], client);

        if (deleteResult.rowCount === 0) {
          throw new GroupMemberNotFoundError(id);
        }

        // Update group member count if the deleted member was approved
        if (wasApproved) {
          await client.query(
            `
            UPDATE groups
            SET member_count = GREATEST(member_count - 1, 0),
                updated_at = NOW()
            WHERE id = $1
          `,
            [groupId]
          );
        }

        return true;
      } catch (error) {
        if (
          error instanceof GroupMemberNotFoundError ||
          error instanceof LastAdminError
        ) {
          throw error;
        }
        throw new GroupMemberOperationError("delete", error);
      }
    });
  }

  /**
   * Remove a user from a group
   * @param groupId The group ID
   * @param userId The user ID
   * @returns True if removal was successful
   * @throws {GroupMemberNotFoundError} If member not found
   * @throws {LastAdminError} If trying to remove the last admin
   * @throws {GroupMemberOperationError} If an error occurs during the operation
   */
  async removeFromGroup(groupId: string, userId: string): Promise<boolean> {
    return this.withTransaction(async (client) => {
      try {
        // Get the member first to check if they were approved and their role
        const member = await this.findByGroupAndUserIdOrThrow(groupId, userId);
        const wasApproved = member.isApproved();

        // Check if removing an admin and is the last admin
        if (member.isAdmin() && wasApproved) {
          const adminCount = await this.countAdmins(groupId);
          if (adminCount <= 1) {
            throw new LastAdminError(groupId, userId);
          }
        }

        // Delete the member
        const deleteQuery = `
          DELETE FROM ${this.tableName}
          WHERE group_id = $1 AND user_id = $2
          RETURNING id
        `;

        const result = await this.executeQuery(
          deleteQuery,
          [groupId, userId],
          client
        );

        if (result.rowCount === 0) {
          throw new GroupMemberNotFoundError(undefined, groupId, userId);
        }

        // Update group member count if the deleted member was approved
        if (wasApproved) {
          await client.query(
            `
            UPDATE groups
            SET member_count = GREATEST(member_count - 1, 0),
                updated_at = NOW()
            WHERE id = $1
          `,
            [groupId]
          );
        }

        return true;
      } catch (error) {
        if (
          error instanceof GroupMemberNotFoundError ||
          error instanceof LastAdminError
        ) {
          throw error;
        }
        throw new GroupMemberOperationError("removeFromGroup", error);
      }
    });
  }

  /**
   * Maps a database result to a GroupMember model
   * @param row Database result row
   * @returns GroupMember instance
   */
  protected mapResultToModel(row: Record<string, unknown>): GroupMember {
    if (!row) return null as unknown as GroupMember;

    return new GroupMember({
      id: row.id as string,
      groupId: row.groupId as string,
      userId: row.userId as string,
      role: row.role as GroupMemberRole,
      status: row.status as MembershipStatus,
      notificationSettings: row.notificationSettings as Record<string, boolean>,
      lastActivity: row.lastActivity as Date,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    });
  }

  /**
   * Execute a SQL query
   * @param query The SQL query string
   * @param params The query parameters
   * @param client Optional database client for transactions
   * @returns The query result
   */
  protected async executeQuery<T extends QueryResultRow>(
    query: string,
    params: unknown[] = [],
    client?: PoolClient
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      if (client) {
        const result = await client.query<T>(query, params);
        return { rows: result.rows, rowCount: result.rowCount ?? 0 };
      }
      const result = await this.databaseService.query<T>(query, params);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (error) {
      throw new GroupMemberOperationError("executeQuery", error);
    }
  }
}
