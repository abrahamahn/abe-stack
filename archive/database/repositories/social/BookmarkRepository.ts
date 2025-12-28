import { injectable, inject } from "inversify";

import { BaseModelInterface } from "@/server/database/models/BaseModel";
import {
  Bookmark,
  BookmarkAttributes,
  EntityType,
} from "@/server/database/models/social/Bookmark";
import { BaseRepository } from "@/server/database/repositories/BaseRepository";
import { IDatabaseServer } from "@/server/infrastructure";
import TYPES from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";
import { PaginationOptions } from "@/server/shared/types/types";

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

@injectable()
export class BookmarkRepository extends BaseRepository<BookmarkWithIndex> {
  protected tableName = "bookmarks";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseService) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "Bookmark");
  }

  /**
   * Create a new bookmark
   */
  async create(
    data: Omit<BookmarkAttributes, "id" | "createdAt" | "updatedAt">
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

      const { rows } = await this.databaseService.query(query, params);
      return this.mapResultToModel(rows[0]);
    } catch (error) {
      throw new BookmarkError(
        `Failed to create bookmark: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find bookmarks by user ID with pagination
   */
  async findByUserId(
    userId: string,
    options: PaginationOptions
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
        options.page && options.limit ? (options.page - 1) * options.limit : 0,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new BookmarkError(
        `Failed to find bookmarks: ${error instanceof Error ? error.message : String(error)}`
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

      const { rows } = await this.databaseService.query(query, [id]);
      if (rows.length === 0) return null;

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      throw new BookmarkError(
        `Failed to find bookmark: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find bookmark by entity
   */
  async findByEntity(
    userId: string,
    entityId: string,
    entityType: EntityType
  ): Promise<Bookmark | null> {
    try {
      const query = `
				SELECT ${this.columns.join(", ")}
				FROM ${this.tableName}
				WHERE user_id = $1 AND entity_id = $2 AND entity_type = $3
			`;

      const { rows } = await this.databaseService.query(query, [
        userId,
        entityId,
        entityType,
      ]);
      if (rows.length === 0) return null;

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      throw new BookmarkError(
        `Failed to find bookmark by entity: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update bookmark notes
   */
  async updateNotes(
    id: string,
    userId: string,
    notes: string | null
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

      const { rows } = await this.databaseService.query(query, [
        notes,
        id,
        userId,
      ]);
      if (rows.length === 0) {
        throw new BookmarkNotFoundError(id);
      }

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      throw new BookmarkError(
        `Failed to update bookmark notes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Move bookmark to collection
   */
  async moveToCollection(
    id: string,
    userId: string,
    collectionId: string | null
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

      const { rows } = await this.databaseService.query(query, [
        collectionId,
        id,
        userId,
      ]);
      if (rows.length === 0) {
        throw new BookmarkNotFoundError(id);
      }

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      throw new BookmarkError(
        `Failed to move bookmark to collection: ${error instanceof Error ? error.message : String(error)}`
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

      const { rowCount } = await this.databaseService.query(query, [
        id,
        userId,
      ]);
      return (rowCount ?? 0) > 0;
    } catch (error) {
      throw new BookmarkError(
        `Failed to delete bookmark: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find a bookmark by user and post IDs
   */
  async findByUserAndPost(
    userId: string,
    postId: string
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
      throw new BookmarkError(
        `Failed to find bookmark: ${error instanceof Error ? error.message : String(error)}`
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
      throw new BookmarkError(
        `Failed to count bookmarks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find bookmarks by user and multiple post IDs
   */
  async findByUserAndPosts(
    userId: string,
    postIds: string[]
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
      throw new BookmarkError(
        `Failed to find bookmarks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Count bookmarks for multiple posts
   */
  async countByPosts(
    postIds: string[]
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
        [postIds, EntityType.POST]
      );
      return result.rows.map((row) => ({
        postId: row.postId,
        count: parseInt(row.count, 10),
      }));
    } catch (error) {
      throw new BookmarkError(
        `Failed to count bookmarks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  protected async executeQuery<T = any>(
    query: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.databaseService.query<T>(query, params);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      throw new BookmarkError(
        `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  protected mapResultToModel(row: Record<string, unknown>): BookmarkWithIndex {
    if (!row) return null as unknown as BookmarkWithIndex;

    return {
      id: String(row.id || ""),
      userId: String(row.userId || row.user_id || ""),
      targetId: String(row.targetId || row.target_id || ""),
      targetType: String(row.targetType || row.target_type) as EntityType,
      createdAt: new Date(String(row.createdAt || row.created_at)),
      updatedAt: new Date(String(row.updatedAt || row.updated_at)),
    } as BookmarkWithIndex;
  }
}

// Export a singleton instance
export const bookmarkRepository = new BookmarkRepository();
