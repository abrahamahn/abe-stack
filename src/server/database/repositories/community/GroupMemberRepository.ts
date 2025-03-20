import { Logger } from "../../../services/dev/logger/LoggerService";
import { GroupMemberRole } from "../../models/community/Group";
import {
  GroupMember,
  GroupMemberAttributes,
  MembershipStatus,
} from "../../models/community/GroupMember";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling GroupMember database operations.
 * This class is responsible for:
 * 1. All database operations related to group members
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for group memberships
 * 4. NOT implementing business logic - that belongs in the GroupMember model
 */
export class GroupMemberRepository extends BaseRepository<GroupMember> {
  protected logger = new Logger("GroupMemberRepository");
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

  constructor() {
    super();
  }

  /**
   * Find members of a group
   * @param groupId The group ID
   * @param limit Maximum number of members to return
   * @param offset Number of members to skip
   * @param status The membership status to filter by
   * @returns Array of GroupMember instances
   */
  async findByGroupId(
    groupId: string,
    limit = 50,
    offset = 0,
    status = MembershipStatus.APPROVED,
  ): Promise<GroupMember[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE group_id = $1 AND status = $2
      ORDER BY role, created_at ASC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.executeQuery<GroupMemberAttributes>(query, [
      groupId,
      status,
      limit,
      offset,
    ]);

    return this.mapResultRows(
      result.rows,
      (result) => new GroupMember(result as unknown as GroupMemberAttributes),
    );
  }

  /**
   * Find groups that a user is a member of
   * @param userId The user ID
   * @param limit Maximum number of memberships to return
   * @param offset Number of memberships to skip
   * @param status The membership status to filter by
   * @returns Array of GroupMember instances
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    status = MembershipStatus.APPROVED,
  ): Promise<GroupMember[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE user_id = $1 AND status = $2
      ORDER BY last_activity DESC NULLS LAST, created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.executeQuery<GroupMemberAttributes>(query, [
      userId,
      status,
      limit,
      offset,
    ]);

    return this.mapResultRows(
      result.rows,
      (result) => new GroupMember(result as unknown as GroupMemberAttributes),
    );
  }

  /**
   * Find membership record by group and user IDs
   * @param groupId The group ID
   * @param userId The user ID
   * @returns The GroupMember instance or null if not found
   */
  async findByGroupAndUserId(
    groupId: string,
    userId: string,
  ): Promise<GroupMember | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE group_id = $1 AND user_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery<GroupMemberAttributes>(query, [
      groupId,
      userId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return new GroupMember(result.rows[0] as unknown as GroupMemberAttributes);
  }

  /**
   * Find members by role
   * @param groupId The group ID
   * @param role The role to filter by
   * @param limit Maximum number of members to return
   * @param offset Number of members to skip
   * @returns Array of GroupMember instances
   */
  async findByRole(
    groupId: string,
    role: GroupMemberRole,
    limit = 20,
    offset = 0,
  ): Promise<GroupMember[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE group_id = $1 AND role = $2 AND status = $3
      ORDER BY created_at ASC
      LIMIT $4 OFFSET $5
    `;

    const result = await this.executeQuery<GroupMemberAttributes>(query, [
      groupId,
      role,
      MembershipStatus.APPROVED,
      limit,
      offset,
    ]);

    return this.mapResultRows(
      result.rows,
      (result) => new GroupMember(result as unknown as GroupMemberAttributes),
    );
  }

  /**
   * Find members by status
   * @param groupId The group ID
   * @param status The status to filter by
   * @param limit Maximum number of members to return
   * @param offset Number of members to skip
   * @returns Array of GroupMember instances
   */
  async findByStatus(
    groupId: string,
    status: MembershipStatus,
    limit = 20,
    offset = 0,
  ): Promise<GroupMember[]> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE group_id = $1 AND status = $2
      ORDER BY created_at ASC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.executeQuery<GroupMemberAttributes>(query, [
      groupId,
      status,
      limit,
      offset,
    ]);

    return this.mapResultRows(
      result.rows,
      (result) => new GroupMember(result as unknown as GroupMemberAttributes),
    );
  }

  /**
   * Count members by status
   * @param groupId The group ID
   * @param status The status to count
   * @returns The count of members with the specified status
   */
  async countByStatus(
    groupId: string,
    status: MembershipStatus,
  ): Promise<number> {
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
  }

  /**
   * Update member role
   * @param groupId The group ID
   * @param userId The user ID
   * @param role The new role
   * @returns The updated GroupMember instance or null if not found
   */
  async updateRole(
    groupId: string,
    userId: string,
    role: GroupMemberRole,
  ): Promise<GroupMember | null> {
    const query = `
      UPDATE ${this.tableName}
      SET role = $3,
          updated_at = NOW()
      WHERE group_id = $1 AND user_id = $2
      RETURNING ${this.columns.join(", ")}
    `;

    const result = await this.executeQuery<GroupMemberAttributes>(query, [
      groupId,
      userId,
      role,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return new GroupMember(result.rows[0] as unknown as GroupMemberAttributes);
  }

  /**
   * Update member status
   * @param groupId The group ID
   * @param userId The user ID
   * @param status The new status
   * @returns The updated GroupMember instance or null if not found
   */
  async updateStatus(
    groupId: string,
    userId: string,
    status: MembershipStatus,
  ): Promise<GroupMember | null> {
    return this.withTransaction(async (client) => {
      try {
        const query = `
          UPDATE ${this.tableName}
          SET status = $3,
              updated_at = NOW()
          WHERE group_id = $1 AND user_id = $2
          RETURNING ${this.columns.join(", ")}
        `;

        const { rows } = await client.query(query, [groupId, userId, status]);

        if (rows.length === 0) {
          return null;
        }

        const previousStatus = (rows[0] as { status: MembershipStatus }).status;

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
            [groupId],
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
            [groupId],
          );
        }

        return new GroupMember(rows[0] as unknown as GroupMemberAttributes);
      } catch (error) {
        this.logger.error("Error updating member status", {
          groupId,
          userId,
          status,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Update last activity timestamp
   * @param groupId The group ID
   * @param userId The user ID
   * @returns True if the update was successful
   */
  async updateLastActivity(groupId: string, userId: string): Promise<boolean> {
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

    return result.rows.length > 0;
  }

  /**
   * Update notification settings
   * @param id The membership ID
   * @param settings The notification settings to update
   * @returns The updated GroupMember instance or null if not found
   */
  async updateNotificationSettings(
    id: string,
    settings: Record<string, boolean>,
  ): Promise<GroupMember | null> {
    const query = `
      UPDATE ${this.tableName}
      SET notification_settings = notification_settings || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING ${this.columns.join(", ")}
    `;

    const result = await this.executeQuery<GroupMemberAttributes>(query, [
      id,
      JSON.stringify(settings),
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return new GroupMember(result.rows[0] as unknown as GroupMemberAttributes);
  }

  /**
   * Create a new group member
   * @param data The group member data
   * @returns The created GroupMember instance
   */
  async create(
    data: Omit<GroupMemberAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<GroupMember> {
    return this.withTransaction(async (client) => {
      try {
        // Create the group member instance and validate it
        const groupMember = new GroupMember(data as GroupMemberAttributes);
        groupMember.validate();

        // Check if membership already exists
        const existingQuery = `
          SELECT ${this.columns.join(", ")}
          FROM ${this.tableName}
          WHERE group_id = $1 AND user_id = $2
          LIMIT 1
        `;

        const { rows: existingRows } = await client.query(existingQuery, [
          data.groupId,
          data.userId,
        ]);

        if (existingRows.length > 0) {
          // If the membership exists but is not approved, update it
          if (
            (existingRows[0] as { status: MembershipStatus }).status !==
              MembershipStatus.APPROVED &&
            data.status === MembershipStatus.APPROVED
          ) {
            const updateQuery = `
              UPDATE ${this.tableName}
              SET status = $3, role = $4, updated_at = NOW()
              WHERE group_id = $1 AND user_id = $2
              RETURNING ${this.columns.join(", ")}
            `;

            const { rows } = await client.query(updateQuery, [
              data.groupId,
              data.userId,
              data.status,
              data.role,
            ]);

            // Update group member count if status changed to APPROVED
            if (data.status === MembershipStatus.APPROVED) {
              await client.query(
                `
                UPDATE groups
                SET member_count = member_count + 1,
                    updated_at = NOW()
                WHERE id = $1
              `,
                [data.groupId],
              );
            }

            return new GroupMember(rows[0] as unknown as GroupMemberAttributes);
          }

          return new GroupMember(
            existingRows[0] as unknown as GroupMemberAttributes,
          );
        }

        // Create a new membership
        const result = await super.create(groupMember);

        // Update group member count if new member is approved
        if (data.status === MembershipStatus.APPROVED) {
          await client.query(
            `
            UPDATE groups
            SET member_count = member_count + 1,
                updated_at = NOW()
            WHERE id = $1
          `,
            [data.groupId],
          );
        }

        return new GroupMember(result as unknown as GroupMemberAttributes);
      } catch (error) {
        this.logger.error("Error creating group member", {
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Delete a group member by ID
   * @param id The membership ID
   * @returns True if deletion was successful
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async (client) => {
      try {
        // Get the member first to check if they were approved
        const getQuery = `
          SELECT ${this.columns.join(", ")}
          FROM ${this.tableName}
          WHERE id = $1
          LIMIT 1
        `;

        const { rows } = await client.query(getQuery, [id]);

        if (rows.length === 0) {
          return false;
        }

        const wasApproved =
          (rows[0] as { status: MembershipStatus }).status ===
          MembershipStatus.APPROVED;
        const groupId = (rows[0] as { groupId: string }).groupId;

        // Delete the member
        const deleteQuery = `
          DELETE FROM ${this.tableName}
          WHERE id = $1
          RETURNING id
        `;

        const result = await client.query(deleteQuery, [id]);
        const isDeleted = result.rowCount !== null && result.rowCount > 0;

        // Update group member count if the deleted member was approved
        if (isDeleted && wasApproved) {
          await client.query(
            `
            UPDATE groups
            SET member_count = GREATEST(member_count - 1, 0),
                updated_at = NOW()
            WHERE id = $1
          `,
            [groupId],
          );
        }

        return isDeleted;
      } catch (error) {
        this.logger.error("Error deleting group member", {
          id,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Remove a user from a group
   * @param groupId The group ID
   * @param userId The user ID
   * @returns True if removal was successful
   */
  async removeFromGroup(groupId: string, userId: string): Promise<boolean> {
    return this.withTransaction(async (client) => {
      try {
        // Get the member first to check if they were approved
        const getQuery = `
          SELECT ${this.columns.join(", ")}
          FROM ${this.tableName}
          WHERE group_id = $1 AND user_id = $2
          LIMIT 1
        `;

        const { rows } = await client.query(getQuery, [groupId, userId]);

        if (rows.length === 0) {
          return false;
        }

        const wasApproved =
          (rows[0] as { status: MembershipStatus }).status ===
          MembershipStatus.APPROVED;

        // Delete the member
        const deleteQuery = `
          DELETE FROM ${this.tableName}
          WHERE group_id = $1 AND user_id = $2
          RETURNING id
        `;

        const result = await client.query(deleteQuery, [groupId, userId]);
        const isDeleted = result.rowCount !== null && result.rowCount > 0;

        // Update group member count if the deleted member was approved
        if (isDeleted && wasApproved) {
          await client.query(
            `
            UPDATE groups
            SET member_count = GREATEST(member_count - 1, 0),
                updated_at = NOW()
            WHERE id = $1
          `,
            [groupId],
          );
        }

        return isDeleted;
      } catch (error) {
        this.logger.error("Error removing user from group", {
          groupId,
          userId,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Convert camelCase to snake_case
   * @param str The string to convert
   * @returns The converted string
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  protected mapResultToModel(row: Record<string, unknown>): GroupMember {
    if (!row) return null as unknown as GroupMember;

    return new GroupMember({
      id: row.id as string,
      groupId: row.group_id as string,
      userId: row.user_id as string,
      role: row.role as GroupMemberRole,
      status: row.status as MembershipStatus,
      notificationSettings: row.notification_settings as Record<
        string,
        boolean
      >,
      lastActivity: row.last_activity as Date,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }
}

// Export a singleton instance
export const groupMemberRepository = new GroupMemberRepository();
