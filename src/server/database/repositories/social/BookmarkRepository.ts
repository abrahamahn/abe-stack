import { Logger } from "../../../services/dev/logger/LoggerService";
import { PaginationOptions } from "../../../services/shared/types/validation";
import { DatabaseConnectionManager } from "../../config";
import { BaseModelInterface } from "../../models/BaseModel";
import {
  Bookmark,
  BookmarkAttributes,
  EntityType,
} from "../../models/social/Bookmark";
import { BaseRepository } from "../BaseRepository";

export interface BookmarkWithIndex extends Bookmark, BaseModelInterface {
  [key: string]: unknown;
}

export class BookmarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookmarkError";
  }
}

export class BookmarkNotFoundError extends BookmarkError {
  constructor(id: string) {
    super(`Bookmark with ID ${id} not found`);
    this.name = "BookmarkNotFoundError";
  }
}

export class BookmarkRepository extends BaseRepository<BookmarkWithIndex> {
  protected logger = new Logger("BookmarkRepository");
  protected tableName = "bookmarks";
  protected columns = [
    "id",
    "user_id as userId",
    "entity_id as entityId",
    "entity_type as entityType",
    "collection_id as collectionId",
    "notes",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  /**
   * Create a new bookmark
   */
  async create(
    data: Omit<BookmarkAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Bookmark> {
    try {
      const bookmark = new Bookmark({
        ...data,
        id: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      bookmark.validate();

      const query = `
				INSERT INTO ${this.tableName} (
					user_id, entity_id, entity_type, collection_id, notes,
					created_at, updated_at
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				RETURNING ${this.columns.join(", ")}
			`;

      const params = [
        bookmark.userId,
        bookmark.entityId,
        bookmark.entityType,
        bookmark.collectionId,
        bookmark.notes,
        bookmark.createdAt,
        bookmark.updatedAt,
      ];

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return this.mapResultToModel(rows[0]);
    } catch (error) {
      this.logger.error("Error creating bookmark", error);
      throw new BookmarkError(
        `Failed to create bookmark: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find bookmarks by user ID with pagination
   */
  async findByUserId(
    userId: string,
    options: PaginationOptions,
  ): Promise<Bookmark[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        options.limit,
        options.offset || 0,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding bookmarks by user ID", error);
      throw new BookmarkError(
        `Failed to find bookmarks: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find bookmark by ID
   */
  async findById(id: string): Promise<Bookmark | null> {
    try {
      const query = `
				SELECT ${this.columns.join(", ")}
				FROM ${this.tableName}
				WHERE id = $1
			`;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        id,
      ]);
      if (rows.length === 0) return null;

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      this.logger.error("Error finding bookmark", error);
      throw new BookmarkError(
        `Failed to find bookmark: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find bookmark by entity
   */
  async findByEntity(
    userId: string,
    entityId: string,
    entityType: EntityType,
  ): Promise<Bookmark | null> {
    try {
      const query = `
				SELECT ${this.columns.join(", ")}
				FROM ${this.tableName}
				WHERE user_id = $1 AND entity_id = $2 AND entity_type = $3
			`;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        userId,
        entityId,
        entityType,
      ]);
      if (rows.length === 0) return null;

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      this.logger.error("Error finding bookmark by entity", error);
      throw new BookmarkError(
        `Failed to find bookmark by entity: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update bookmark notes
   */
  async updateNotes(
    id: string,
    userId: string,
    notes: string | null,
  ): Promise<Bookmark> {
    try {
      const bookmark = await this.findById(id);
      if (!bookmark) {
        throw new BookmarkNotFoundError(id);
      }

      if (!bookmark.belongsToUser(userId)) {
        throw new BookmarkError("User does not own this bookmark");
      }

      bookmark.updateNotes(notes);
      bookmark.validate();

      const query = `
				UPDATE ${this.tableName}
				SET notes = $1, updated_at = NOW()
				WHERE id = $2 AND user_id = $3
				RETURNING ${this.columns.join(", ")}
			`;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        notes,
        id,
        userId,
      ]);
      if (rows.length === 0) {
        throw new BookmarkNotFoundError(id);
      }

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      this.logger.error("Error updating bookmark notes", error);
      throw new BookmarkError(
        `Failed to update bookmark notes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Move bookmark to collection
   */
  async moveToCollection(
    id: string,
    userId: string,
    collectionId: string | null,
  ): Promise<Bookmark> {
    try {
      const bookmark = await this.findById(id);
      if (!bookmark) {
        throw new BookmarkNotFoundError(id);
      }

      if (!bookmark.belongsToUser(userId)) {
        throw new BookmarkError("User does not own this bookmark");
      }

      bookmark.moveToCollection(collectionId);
      bookmark.validate();

      const query = `
				UPDATE ${this.tableName}
				SET collection_id = $1, updated_at = NOW()
				WHERE id = $2 AND user_id = $3
				RETURNING ${this.columns.join(", ")}
			`;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        collectionId,
        id,
        userId,
      ]);
      if (rows.length === 0) {
        throw new BookmarkNotFoundError(id);
      }

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      this.logger.error("Error moving bookmark to collection", error);
      throw new BookmarkError(
        `Failed to move bookmark to collection: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete bookmark
   */
  async deleteBookmark(id: string, userId: string): Promise<boolean> {
    try {
      const bookmark = await this.findById(id);
      if (!bookmark) {
        return false;
      }

      if (!bookmark.belongsToUser(userId)) {
        throw new BookmarkError("User does not own this bookmark");
      }

      const query = `
				DELETE FROM ${this.tableName}
				WHERE id = $1 AND user_id = $2
				RETURNING id
			`;

      const { rowCount } = await DatabaseConnectionManager.getPool().query(
        query,
        [id, userId],
      );
      return (rowCount ?? 0) > 0;
    } catch (error) {
      this.logger.error("Error deleting bookmark", error);
      throw new BookmarkError(
        `Failed to delete bookmark: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find a bookmark by user and post IDs
   */
  async findByUserAndPost(
    userId: string,
    postId: string,
  ): Promise<Bookmark | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1 AND post_id = $2
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        postId,
      ]);
      return result.rows.length ? this.mapResultToModel(result.rows[0]) : null;
    } catch (error) {
      this.logger.error("Error finding bookmark by user and post", error);
      throw new BookmarkError(
        `Failed to find bookmark: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count bookmarks for a post
   */
  async countByPost(postId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*)
        FROM ${this.tableName}
        WHERE entity_id = $1 AND entity_type = $2
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        postId,
        EntityType.POST,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting bookmarks by post", error);
      throw new BookmarkError(
        `Failed to count bookmarks: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find bookmarks by user and multiple post IDs
   */
  async findByUserAndPosts(
    userId: string,
    postIds: string[],
  ): Promise<Bookmark[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1 AND entity_id = ANY($2) AND entity_type = $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        postIds,
        EntityType.POST,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding bookmarks by user and posts", error);
      throw new BookmarkError(
        `Failed to find bookmarks: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count bookmarks for multiple posts
   */
  async countByPosts(
    postIds: string[],
  ): Promise<Array<{ postId: string; count: number }>> {
    try {
      const query = `
        SELECT entity_id as "postId", COUNT(*) as count
        FROM ${this.tableName}
        WHERE entity_id = ANY($1) AND entity_type = $2
        GROUP BY entity_id
      `;

      const result = await this.executeQuery<{ postId: string; count: string }>(
        query,
        [postIds, EntityType.POST],
      );
      return result.rows.map((row) => ({
        postId: row.postId,
        count: parseInt(row.count, 10),
      }));
    } catch (error) {
      this.logger.error("Error counting bookmarks by posts", error);
      throw new BookmarkError(
        `Failed to count bookmarks: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map database result to Bookmark model
   */
  protected mapResultToModel(row: Record<string, unknown>): Bookmark {
    if (!row) return null as unknown as Bookmark;

    return new Bookmark({
      id: String(row.id || ""),
      userId: String(row.userId || row.user_id || ""),
      entityId: String(row.entityId || row.entity_id || ""),
      entityType: String(row.entityType || row.entity_type) as EntityType,
      collectionId:
        row.collectionId || row.collection_id
          ? String(row.collectionId || row.collection_id)
          : null,
      notes: row.notes ? String(row.notes) : null,
      createdAt: new Date(String(row.createdAt || row.created_at)),
      updatedAt: new Date(String(row.updatedAt || row.updated_at)),
    });
  }
}

// Export a singleton instance
export const bookmarkRepository = new BookmarkRepository();
