import { Logger } from "../../../services/dev/logger/LoggerService";
import {
  Group,
  GroupAttributes,
  GroupStatus,
  GroupVisibility,
} from "../../models/community/Group";
import { BaseRepository } from "../BaseRepository";

export class GroupRepository extends BaseRepository<Group> {
  protected logger = new Logger("GroupRepository");
  protected tableName = "groups";
  protected columns = [
    "id",
    "name",
    "slug",
    "description",
    "image_url as imageUrl",
    "banner_url as bannerUrl",
    "owner_id as ownerId",
    "visibility",
    "status",
    "member_count as memberCount",
    "rules",
    "metadata",
    "is_verified as isVerified",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  protected mapResultToModel(row: Record<string, unknown>): Group {
    if (!row) return null as unknown as Group;
    return new Group(row as unknown as GroupAttributes);
  }

  /**
   * Find group by primary key
   */
  async findByPk(id: string): Promise<Group | null> {
    try {
      this.logger.info("Finding group by PK", { id });
      const group = await this.findById(id);
      if (!group) return null;

      return new Group(group as GroupAttributes);
    } catch (error) {
      this.logger.error("Error finding group by PK", {
        id,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find group by slug
   */
  async findBySlug(slug: string): Promise<Group | null> {
    try {
      this.logger.info("Finding group by slug", { slug });
      const group = await this.findOneByField("slug", slug);
      if (!group) return null;

      return new Group(group as unknown as GroupAttributes);
    } catch (error) {
      this.logger.error("Error finding group by slug", {
        slug,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find groups by owner ID
   */
  async findByOwnerId(
    ownerId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Group[]> {
    try {
      this.logger.info("Finding groups by owner ID", {
        ownerId,
        limit,
        offset,
      });
      const groups = await this.findAll({
        owner_id: ownerId,
        limit,
        offset,
        orderBy: "created_at DESC",
      });
      return groups.map(
        (group) => new Group(group as unknown as GroupAttributes),
      );
    } catch (error) {
      this.logger.error("Error finding groups by owner ID", {
        ownerId,
        limit,
        offset,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find public groups
   */
  async findPublic(limit: number = 20, offset: number = 0): Promise<Group[]> {
    try {
      this.logger.info("Finding public groups", { limit, offset });

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

      return result.rows.map(
        (group) => new Group(group as unknown as GroupAttributes),
      );
    } catch (error) {
      this.logger.error("Error finding public groups", {
        limit,
        offset,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Search groups by name
   */
  async searchByName(
    searchTerm: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Group[]> {
    try {
      this.logger.info("Searching groups by name", {
        searchTerm,
        limit,
        offset,
      });

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

      return result.rows.map(
        (group) => new Group(group as unknown as GroupAttributes),
      );
    } catch (error) {
      this.logger.error("Error searching groups by name", {
        searchTerm,
        limit,
        offset,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Create a new group
   */
  async create(
    data: Omit<GroupAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Group> {
    return this.withTransaction(async (client) => {
      try {
        // Convert camelCase to snake_case for database columns
        const insertData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          insertData[this.snakeCase(key)] = value;
        });

        const insertColumns = Object.keys(insertData);
        const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`);
        const values = Object.values(insertData);

        const query = `
          INSERT INTO ${this.tableName} (${insertColumns.join(", ")}, created_at, updated_at)
          VALUES (${placeholders.join(", ")}, NOW(), NOW())
          RETURNING ${this.columns.join(", ")}
        `;

        this.logger.info("Creating group", {
          data: {
            ...data,
            // Redact any sensitive fields if needed
          },
        });

        const { rows } = await client.query(query, values);
        return new Group(rows[0] as GroupAttributes);
      } catch (error) {
        this.logger.error("Error creating group", {
          data,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    });
  }

  /**
   * Update a group
   */
  async update(
    id: string,
    data: Partial<GroupAttributes>,
  ): Promise<Group | null> {
    return this.withTransaction(async (client) => {
      try {
        const updateData = { ...data };
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.ownerId; // Owner cannot be changed

        if (Object.keys(updateData).length === 0) {
          const group = await this.findById(id);
          return group ? new Group(group as GroupAttributes) : null;
        }

        // Convert camelCase to snake_case for database columns
        const updateColumns: Record<string, unknown> = {};
        Object.entries(updateData).forEach(([key, value]) => {
          updateColumns[this.snakeCase(key)] = value;
        });

        const updates = Object.keys(updateColumns).map(
          (key, idx) => `${key} = $${idx + 2}`,
        );
        const values = [id, ...Object.values(updateColumns)];

        const query = `
          UPDATE ${this.tableName}
          SET ${updates.join(", ")}, updated_at = NOW()
          WHERE id = $1
          RETURNING ${this.columns.join(", ")}
        `;

        this.logger.info("Updating group", {
          id,
          data: updateData,
        });

        const { rows } = await client.query(query, values);
        if (rows.length === 0) return null;

        return new Group(rows[0] as GroupAttributes);
      } catch (error) {
        this.logger.error("Error updating group", {
          id,
          data,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    });
  }

  /**
   * Increment member count
   */
  async incrementMemberCount(
    id: string,
    count: number = 1,
  ): Promise<Group | null> {
    try {
      this.logger.info("Incrementing group member count", { id, count });

      const query = `
        UPDATE ${this.tableName}
        SET member_count = member_count + $2, updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [id, count]);
      if (result.rows.length === 0) return null;

      return new Group(result.rows[0] as unknown as GroupAttributes);
    } catch (error) {
      this.logger.error("Error incrementing group member count", {
        id,
        count,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Decrement member count
   */
  async decrementMemberCount(
    id: string,
    count: number = 1,
  ): Promise<Group | null> {
    try {
      this.logger.info("Decrementing group member count", { id, count });

      const query = `
        UPDATE ${this.tableName}
        SET member_count = GREATEST(0, member_count - $2), updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [id, count]);
      if (result.rows.length === 0) return null;

      return new Group(result.rows[0] as unknown as GroupAttributes);
    } catch (error) {
      this.logger.error("Error decrementing group member count", {
        id,
        count,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Convert camelCase to snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

// Singleton instance
export const groupRepository = new GroupRepository();
