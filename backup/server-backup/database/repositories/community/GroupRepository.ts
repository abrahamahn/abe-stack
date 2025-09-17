import { injectable, inject } from "inversify";
import { QueryResultRow } from "pg";

import {
  Group,
  GroupAttributes,
  GroupStatus,
  GroupVisibility,
} from "@/server/database/models/community/Group";
import TYPES from "@/server/infrastructure/di/types";
import {
  GroupNotFoundError,
  GroupValidationError,
  GroupOperationError,
  GroupAlreadyExistsError,
} from "@/server/infrastructure/errors/domain/community/GroupError";

import { BaseRepository } from "../BaseRepository";

import type { IDatabaseServer } from "@/server/infrastructure/database";
import type { ILoggerService } from "@/server/infrastructure/logging";

@injectable()
export class GroupRepository extends BaseRepository<Group> {
  protected tableName = "groups";
  protected columns = [
    "id",
    "name",
    "description",
    "slug",
    "image_url as imageUrl",
    "banner_url as bannerUrl",
    "owner_id as ownerId",
    "visibility",
    "status",
    "member_count as memberCount",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor(
    @inject(TYPES.LoggerService) protected logger: ILoggerService,
    @inject(TYPES.DatabaseService) protected databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "Group");
  }

  /**
   * Find group by primary key
   * @param id Group ID
   * @returns The group or null if not found
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async findByPk(id: string): Promise<Group | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new GroupOperationError("findByPk", error);
    }
  }

  /**
   * Find group by primary key and throw if not found
   * @param id Group ID
   * @returns The group
   * @throws {GroupNotFoundError} If group not found
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async findByPkOrThrow(id: string): Promise<Group> {
    const group = await this.findByPk(id);

    if (!group) {
      throw new GroupNotFoundError(id);
    }

    return group;
  }

  /**
   * Find group by slug
   * @param slug Group slug
   * @returns The group or null if not found
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async findBySlug(slug: string): Promise<Group | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE slug = $1
      `;

      const result = await this.executeQuery(query, [slug]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new GroupOperationError("findBySlug", error);
    }
  }

  /**
   * Find groups by owner ID
   * @param ownerId User ID of the owner
   * @param limit Maximum number of groups to return
   * @param offset Number of groups to skip
   * @returns Array of groups owned by the user
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async findByOwnerId(
    ownerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Group[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE owner_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [ownerId, limit, offset]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new GroupOperationError("findByOwnerId", error);
    }
  }

  /**
   * Find public groups
   * @param limit Maximum number of groups to return
   * @param offset Number of groups to skip
   * @returns Array of public groups
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async findPublic(limit: number = 20, offset: number = 0): Promise<Group[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE visibility = $1 AND status = $2
        ORDER BY member_count DESC, created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery(query, [
        GroupVisibility.PUBLIC,
        GroupStatus.ACTIVE,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new GroupOperationError("findPublic", error);
    }
  }

  /**
   * Search groups by name
   * @param searchTerm Search term to match against name or description
   * @param limit Maximum number of groups to return
   * @param offset Number of groups to skip
   * @returns Array of matching groups
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async searchByName(
    searchTerm: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Group[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE (name ILIKE $1 OR description ILIKE $1) AND visibility = $2 AND status = $3
        ORDER BY member_count DESC, created_at DESC
        LIMIT $4 OFFSET $5
      `;

      const result = await this.executeQuery(query, [
        `%${searchTerm}%`,
        GroupVisibility.PUBLIC,
        GroupStatus.ACTIVE,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new GroupOperationError("searchByName", error);
    }
  }

  /**
   * Create a new group
   * @param data Group data
   * @returns The created group
   * @throws {GroupValidationError} If validation fails
   * @throws {GroupAlreadyExistsError} If a group with the same slug already exists
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async create(
    data: Omit<GroupAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<Group> {
    try {
      // Create a group instance for validation
      const group = new Group(data as GroupAttributes);

      // Validate group data
      const validationErrors = group.validate();
      if (validationErrors.length > 0) {
        throw new GroupValidationError(validationErrors);
      }

      // Check if group with same slug exists
      if (group.slug) {
        const existingGroup = await this.findBySlug(group.slug);
        if (existingGroup) {
          throw new GroupAlreadyExistsError(group.name, group.slug);
        }
      }

      // Convert camelCase to snake_case for database columns
      const insertData: Record<string, unknown> = {
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        image_url: group.imageUrl,
        banner_url: group.bannerUrl,
        owner_id: group.ownerId,
        visibility: group.visibility,
        status: group.status,
        member_count: group.memberCount,
      };

      const insertColumns = Object.keys(insertData);
      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`);
      const values = Object.values(insertData);

      const query = `
        INSERT INTO ${this.tableName} (${insertColumns.join(", ")}, created_at, updated_at)
        VALUES (${placeholders.join(", ")}, NOW(), NOW())
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (
        error instanceof GroupValidationError ||
        error instanceof GroupAlreadyExistsError
      ) {
        throw error;
      }

      throw new GroupOperationError("create", error);
    }
  }

  /**
   * Update a group
   * @param id Group ID
   * @param data Group data to update
   * @returns The updated group or null if not found
   * @throws {GroupNotFoundError} If group not found
   * @throws {GroupValidationError} If validation fails
   * @throws {GroupAlreadyExistsError} If a group with the same slug already exists
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async update(id: string, data: Partial<GroupAttributes>): Promise<Group> {
    try {
      // Check if group exists
      const existingGroup = await this.findByPkOrThrow(id);

      // Prepare update data
      const updateData = { ...data };
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.ownerId; // Owner cannot be changed

      if (Object.keys(updateData).length === 0) {
        return existingGroup;
      }

      // Create a new group instance with updated data
      const updatedGroup = new Group({
        ...existingGroup,
        ...updateData,
      });

      // Validate updated group
      const validationErrors = updatedGroup.validate();
      if (validationErrors.length > 0) {
        throw new GroupValidationError(validationErrors);
      }

      // If slug changed, check if it conflicts with existing group
      if (updateData.slug && updateData.slug !== existingGroup.slug) {
        const conflictingGroup = await this.findBySlug(updateData.slug);
        if (conflictingGroup && conflictingGroup.id !== id) {
          throw new GroupAlreadyExistsError(
            updatedGroup.name,
            updatedGroup.slug
          );
        }
      }

      // Convert camelCase to snake_case for database columns
      const updateColumns: Record<string, unknown> = {};
      Object.entries(updateData).forEach(([key, value]) => {
        updateColumns[this.snakeCase(key)] = value;
      });

      const updates = Object.keys(updateColumns).map(
        (key, idx) => `${key} = $${idx + 2}`
      );
      const values = [id, ...Object.values(updateColumns)];

      const query = `
        UPDATE ${this.tableName}
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);

      if (result.rows.length === 0) {
        throw new GroupNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (
        error instanceof GroupNotFoundError ||
        error instanceof GroupValidationError ||
        error instanceof GroupAlreadyExistsError
      ) {
        throw error;
      }

      throw new GroupOperationError("update", error);
    }
  }

  /**
   * Increment member count
   * @param id Group ID
   * @param count Number to increment by
   * @returns The updated group
   * @throws {GroupNotFoundError} If group not found
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async incrementMemberCount(id: string, count: number = 1): Promise<Group> {
    try {
      // Check if group exists
      await this.findByPkOrThrow(id);

      const query = `
        UPDATE ${this.tableName}
        SET member_count = member_count + $2, updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [id, count]);

      if (result.rows.length === 0) {
        throw new GroupNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof GroupNotFoundError) {
        throw error;
      }

      throw new GroupOperationError("incrementMemberCount", error);
    }
  }

  /**
   * Decrement member count
   * @param id Group ID
   * @param count Number to decrement by
   * @returns The updated group
   * @throws {GroupNotFoundError} If group not found
   * @throws {GroupOperationError} If an error occurs during the operation
   */
  async decrementMemberCount(id: string, count: number = 1): Promise<Group> {
    try {
      // Check if group exists
      await this.findByPkOrThrow(id);

      const query = `
        UPDATE ${this.tableName}
        SET member_count = GREATEST(0, member_count - $2), updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [id, count]);

      if (result.rows.length === 0) {
        throw new GroupNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof GroupNotFoundError) {
        throw error;
      }

      throw new GroupOperationError("decrementMemberCount", error);
    }
  }

  /**
   * Maps a database result to a Group model
   * @param row Database result row
   * @returns Group instance
   */
  protected mapResultToModel(row: Record<string, unknown>): Group {
    if (!row) return null as unknown as Group;

    return new Group({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | null,
      imageUrl: row.imageUrl as string | null,
      bannerUrl: row.bannerUrl as string | null,
      ownerId: row.ownerId as string,
      visibility: row.visibility as GroupVisibility,
      status: row.status as GroupStatus,
      memberCount: row.memberCount as number,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    });
  }

  /**
   * Execute a SQL query
   * @param query The SQL query string
   * @param params The query parameters
   * @returns The query result
   */
  protected async executeQuery<T extends QueryResultRow>(
    query: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.databaseService.query<T>(query, params);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (error) {
      throw new GroupOperationError("executeQuery", error);
    }
  }

  /**
   * Convert a camelCase string to snake_case
   * @param str The camelCase string
   * @returns The string in snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
