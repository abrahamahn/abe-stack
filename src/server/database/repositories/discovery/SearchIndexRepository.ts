import { Logger } from "../../../services/dev/logger/LoggerService";
import {
  IndexedContentType,
  IndexStatus,
  SearchIndex,
  SearchIndexAttributes,
  SearchWeights,
} from "../../models/discovery/SearchIndex";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository for managing search indices
 *
 * This class is responsible for:
 * 1. All database operations related to search index
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for search functionality
 * 4. NOT implementing business logic - that belongs in the SearchIndex model
 */
export class SearchIndexRepository extends BaseRepository<SearchIndex> {
  protected logger = new Logger("SearchIndexRepository");
  protected tableName = "search_indices";
  protected columns = [
    "id",
    "content_id as contentId",
    "content_type as contentType",
    "title",
    "description",
    "search_text as searchText",
    "owner_id as ownerId",
    "status",
    "last_indexed_at as lastIndexedAt",
    "tags",
    "weights",
    "error_message as errorMessage",
    "language",
    "published_at as publishedAt",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  protected mapResultToModel(row: Record<string, unknown>): SearchIndex {
    if (!row) return null as unknown as SearchIndex;
    return new SearchIndex(row as unknown as SearchIndexAttributes);
  }

  constructor() {
    super();
  }

  /**
   * Find a search index item by ID
   *
   * @param id The search index item ID
   * @returns The search index item or null if not found
   */
  async findById(id: string): Promise<SearchIndex | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) return null;
      return this.mapResultToModel(result);
    } catch (error) {
      this.logger.error("Error finding search index by ID", {
        error: error instanceof Error ? error.message : error,
        id,
      });
      throw error;
    }
  }

  /**
   * Find a search index item by content ID and type
   *
   * @param contentId The ID of the indexed content
   * @param contentType The type of the indexed content
   * @returns The search index item or null if not found
   */
  async findByContentId(
    contentId: string,
    contentType: IndexedContentType,
  ): Promise<SearchIndex | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE content_id = $1 AND content_type = $2
        LIMIT 1
      `;

      const result = await this.executeQuery<SearchIndexAttributes>(query, [
        contentId,
        contentType,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new SearchIndex(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding search index by content ID", {
        error: error instanceof Error ? error.message : error,
        contentId,
        contentType,
      });
      throw error;
    }
  }

  /**
   * Find items that need to be indexed
   *
   * @param limit Maximum number of items to return
   * @returns Array of search index items
   */
  async findPendingIndexItems(limit: number = 50): Promise<SearchIndex[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
        ORDER BY updated_at ASC
        LIMIT $2
      `;

      const result = await this.executeQuery<SearchIndexAttributes>(query, [
        IndexStatus.PENDING,
        limit,
      ]);

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      this.logger.error("Error finding pending index items", {
        error: error instanceof Error ? error.message : error,
        limit,
      });
      throw error;
    }
  }

  /**
   * Search across the index
   *
   * @param searchTerm The search term
   * @param contentTypes Optional types of content to search for
   * @param tags Optional tags to filter by
   * @param ownerId Optional owner ID to filter by
   * @param languages Optional languages to filter by
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip
   * @returns Array of search index items
   */
  async search(
    searchTerm: string,
    contentTypes?: IndexedContentType[],
    tags?: string[],
    ownerId?: string,
    languages?: string[],
    limit: number = 20,
    offset: number = 0,
  ): Promise<SearchIndex[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")},
               ts_rank_cd(
                 to_tsvector('english', search_text),
                 to_tsquery('english', $1)
               ) AS search_rank
        FROM ${this.tableName}
        WHERE status = $2
          AND to_tsvector('english', search_text) @@ to_tsquery('english', $1)
      `;

      const queryParams: unknown[] = [
        this.formatSearchQuery(searchTerm),
        IndexStatus.INDEXED,
      ];
      let paramIndex = 3;

      if (contentTypes && contentTypes.length > 0) {
        query += ` AND content_type = ANY($${paramIndex})`;
        queryParams.push(contentTypes);
        paramIndex += 1;
      }

      if (tags && tags.length > 0) {
        query += ` AND tags && $${paramIndex}`;
        queryParams.push(tags);
        paramIndex += 1;
      }

      if (ownerId) {
        query += ` AND owner_id = $${paramIndex}`;
        queryParams.push(ownerId);
        paramIndex += 1;
      }

      if (languages && languages.length > 0) {
        query += ` AND language = ANY($${paramIndex})`;
        queryParams.push(languages);
        paramIndex += 1;
      }

      query += `
        ORDER BY 
          search_rank DESC,
          (weights->>'relevance')::float * 0.4 +
          COALESCE((weights->>'recency')::float, 0.5) * 0.3 +
          COALESCE((weights->>'popularity')::float, 0.5) * 0.2 +
          COALESCE((weights->>'quality')::float, 0.5) * 0.1 DESC,
          published_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await this.executeQuery<
        SearchIndexAttributes & { search_rank: number }
      >(query, queryParams);

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      this.logger.error("Error searching index", {
        error: error instanceof Error ? error.message : error,
        searchTerm,
        contentTypes,
        tags,
      });
      throw error;
    }
  }

  /**
   * Find by tag
   *
   * @param tag The tag to search for
   * @param contentTypes Optional types of content to filter by
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip
   * @returns Array of search index items
   */
  async findByTag(
    tag: string,
    contentTypes?: IndexedContentType[],
    limit: number = 20,
    offset: number = 0,
  ): Promise<SearchIndex[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
          AND $2 = ANY(tags)
      `;

      const queryParams: unknown[] = [IndexStatus.INDEXED, tag];
      let paramIndex = 3;

      if (contentTypes && contentTypes.length > 0) {
        query += ` AND content_type = ANY($${paramIndex})`;
        queryParams.push(contentTypes);
        paramIndex += 1;
      }

      query += `
        ORDER BY 
          (weights->>'relevance')::float * 0.4 +
          COALESCE((weights->>'recency')::float, 0.5) * 0.3 +
          COALESCE((weights->>'popularity')::float, 0.5) * 0.2 +
          COALESCE((weights->>'quality')::float, 0.5) * 0.1 DESC,
          published_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await this.executeQuery<SearchIndexAttributes>(
        query,
        queryParams,
      );

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      this.logger.error("Error finding by tag", {
        error: error instanceof Error ? error.message : error,
        tag,
        contentTypes,
      });
      throw error;
    }
  }

  /**
   * Find by owner (user)
   *
   * @param ownerId The owner ID
   * @param contentTypes Optional types of content to filter by
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip
   * @returns Array of search index items
   */
  async findByOwner(
    ownerId: string,
    contentTypes?: IndexedContentType[],
    limit: number = 20,
    offset: number = 0,
  ): Promise<SearchIndex[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
          AND owner_id = $2
      `;

      const queryParams: unknown[] = [IndexStatus.INDEXED, ownerId];
      let paramIndex = 3;

      if (contentTypes && contentTypes.length > 0) {
        query += ` AND content_type = ANY($${paramIndex})`;
        queryParams.push(contentTypes);
        paramIndex += 1;
      }

      query += `
        ORDER BY published_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await this.executeQuery<SearchIndexAttributes>(
        query,
        queryParams,
      );

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      this.logger.error("Error finding by owner", {
        error: error instanceof Error ? error.message : error,
        ownerId,
        contentTypes,
      });
      throw error;
    }
  }

  /**
   * Find recent content
   *
   * @param contentTypes Optional types of content to filter by
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip
   * @returns Array of search index items
   */
  async findRecent(
    contentTypes?: IndexedContentType[],
    limit: number = 20,
    offset: number = 0,
  ): Promise<SearchIndex[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
      `;

      const queryParams: unknown[] = [IndexStatus.INDEXED];
      let paramIndex = 2;

      if (contentTypes && contentTypes.length > 0) {
        query += ` AND content_type = ANY($${paramIndex})`;
        queryParams.push(contentTypes);
        paramIndex += 1;
      }

      query += `
        ORDER BY published_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await this.executeQuery<SearchIndexAttributes>(
        query,
        queryParams,
      );

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      this.logger.error("Error finding recent content", {
        error: error instanceof Error ? error.message : error,
        contentTypes,
      });
      throw error;
    }
  }

  /**
   * Create or update a search index item
   *
   * @param data The data to upsert
   * @returns The created or updated SearchIndex
   */
  async upsert(
    data: Partial<SearchIndexAttributes> & {
      contentId: string;
      contentType: IndexedContentType;
    },
  ): Promise<SearchIndex> {
    return this.withTransaction(async (client) => {
      try {
        // Check if the item already exists
        const existingQuery = `
          SELECT ${this.columns.join(", ")}
          FROM ${this.tableName}
          WHERE content_id = $1 AND content_type = $2
        `;

        const { rows } = await client.query(existingQuery, [
          data.contentId,
          data.contentType,
        ]);

        if (rows.length > 0) {
          // Update existing item
          const existingItem = new SearchIndex(rows[0]);

          // Merge existing data with new data
          const updatedData = {
            ...existingItem,
            ...data,
            status: data.status || existingItem.status,
            updatedAt: new Date(),
          };

          const searchIndex = new SearchIndex(updatedData);
          searchIndex.validate();

          const result = await this.update(existingItem.id, searchIndex);
          if (!result) {
            throw new Error(
              `Failed to update search index with ID ${existingItem.id}`,
            );
          }
          return new SearchIndex(result);
        } else {
          // Create new item with required title
          if (!data.title) {
            throw new Error("Title is required for new search index items");
          }
          const searchIndex = new SearchIndex(data as SearchIndexAttributes);
          searchIndex.validate();

          const result = await this.create(searchIndex);
          return new SearchIndex(result);
        }
      } catch (error) {
        this.logger.error("Error upserting search index", {
          error: error instanceof Error ? error.message : error,
          data,
        });
        throw error;
      }
    });
  }

  /**
   * Create a new search index item
   *
   * @param data The search index data or model instance
   * @returns The created search index
   */
  async create(
    data: Partial<SearchIndexAttributes> | SearchIndex,
  ): Promise<SearchIndex> {
    try {
      let searchIndex: SearchIndex;

      if (data instanceof SearchIndex) {
        searchIndex = data;
      } else {
        searchIndex = new SearchIndex(data as unknown as SearchIndexAttributes);
      }

      searchIndex.validate();

      // Set default values
      if (!searchIndex.searchText) {
        searchIndex.searchText =
          `${searchIndex.title} ${searchIndex.description || ""}`.toLowerCase();
      }

      const result = await super.create(searchIndex);
      return new SearchIndex(result);
    } catch (error) {
      this.logger.error("Error creating search index", {
        error: error instanceof Error ? error.message : error,
        data,
      });
      throw error;
    }
  }

  /**
   * Update a search index item
   *
   * @param id The search index ID
   * @param data The updated data or model instance
   * @returns The updated search index or null if not found
   */
  async update(
    id: string,
    data: Partial<SearchIndexAttributes> | SearchIndex,
  ): Promise<SearchIndex | null> {
    try {
      let searchIndex: SearchIndex;
      let partialData: Partial<SearchIndexAttributes>;

      if (data instanceof SearchIndex) {
        searchIndex = data;
        partialData = searchIndex.toJSON();
      } else {
        partialData = data;

        // Get the existing search index
        const existing = await this.findById(id);
        if (!existing) {
          throw new Error(`Search index with ID ${id} not found`);
        }

        // Merge existing data with new data
        searchIndex = new SearchIndex({
          ...existing,
          ...partialData,
        });
      }

      const result = await super.update(id, searchIndex);
      if (!result) return null;
      return new SearchIndex(result);
    } catch (error) {
      this.logger.error("Error updating search index", {
        error: error instanceof Error ? error.message : error,
        id,
        data,
      });
      throw error;
    }
  }

  /**
   * Mark a search index item as indexed
   *
   * @param id The search index ID
   * @returns The updated search index or null if not found
   */
  async markAsIndexed(id: string): Promise<SearchIndex | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET status = $1,
            last_indexed_at = NOW(),
            error_message = NULL,
            updated_at = NOW()
        WHERE id = $2
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery<SearchIndexAttributes>(query, [
        IndexStatus.INDEXED,
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new SearchIndex(result.rows[0]);
    } catch (error) {
      this.logger.error("Error marking search index as indexed", {
        error: error instanceof Error ? error.message : error,
        id,
      });
      throw error;
    }
  }

  /**
   * Mark a search index item as failed
   *
   * @param id The search index ID
   * @param errorMessage Optional error message
   * @returns The updated search index or null if not found
   */
  async markAsFailed(
    id: string,
    errorMessage?: string,
  ): Promise<SearchIndex | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET status = $1,
            error_message = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery<SearchIndexAttributes>(query, [
        IndexStatus.FAILED,
        errorMessage || null,
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new SearchIndex(result.rows[0]);
    } catch (error) {
      this.logger.error("Error marking search index as failed", {
        error: error instanceof Error ? error.message : error,
        id,
        errorMessage,
      });
      throw error;
    }
  }

  /**
   * Mark a search index item as deleted
   *
   * @param contentId The content ID
   * @param contentType The content type
   * @returns The updated search index or null if not found
   */
  async markAsDeleted(
    contentId: string,
    contentType: IndexedContentType,
  ): Promise<SearchIndex | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET status = $1,
            updated_at = NOW()
        WHERE content_id = $2 AND content_type = $3
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery<SearchIndexAttributes>(query, [
        IndexStatus.DELETED,
        contentId,
        contentType,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new SearchIndex(result.rows[0]);
    } catch (error) {
      this.logger.error("Error marking search index as deleted", {
        error: error instanceof Error ? error.message : error,
        contentId,
        contentType,
      });
      throw error;
    }
  }

  /**
   * Update the weights of a search index item
   *
   * @param id The search index ID
   * @param weights The weights to update
   * @returns The updated search index or null if not found
   */
  async updateWeights(
    id: string,
    weights: Partial<SearchWeights>,
  ): Promise<SearchIndex | null> {
    try {
      // Get current search index
      const current = await this.findById(id);
      if (!current) {
        return null;
      }

      // Merge current weights with new weights
      const updatedWeights = {
        ...current.weights,
        ...weights,
      };

      const query = `
        UPDATE ${this.tableName}
        SET weights = $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery<SearchIndexAttributes>(query, [
        JSON.stringify(updatedWeights),
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new SearchIndex(result.rows[0]);
    } catch (error) {
      this.logger.error("Error updating search index weights", {
        error: error instanceof Error ? error.message : error,
        id,
        weights,
      });
      throw error;
    }
  }

  /**
   * Delete a search index item
   *
   * @param id The search index ID
   * @returns True if the item was deleted
   */
  async delete(id: string): Promise<boolean> {
    try {
      return super.delete(id);
    } catch (error) {
      this.logger.error("Error deleting search index", {
        error: error instanceof Error ? error.message : error,
        id,
      });
      throw error;
    }
  }

  /**
   * Delete a search index item by content ID and type
   *
   * @param contentId The content ID
   * @param contentType The content type
   * @returns True if the item was deleted
   */
  async deleteContent(
    contentId: string,
    contentType: IndexedContentType,
  ): Promise<boolean> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE content_id = $1 AND content_type = $2
        RETURNING id
      `;

      const result = await this.executeQuery<{ id: string }>(query, [
        contentId,
        contentType,
      ]);
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error("Error deleting search index content", {
        error: error instanceof Error ? error.message : error,
        contentId,
        contentType,
      });
      throw error;
    }
  }

  /**
   * Bulk update search index item statuses
   *
   * @param fromStatus The current status
   * @param toStatus The new status
   * @param olderThanDays Only update items older than this many days
   * @returns The number of items updated
   */
  async bulkUpdateStatuses(
    fromStatus: IndexStatus,
    toStatus: IndexStatus,
    olderThanDays?: number,
  ): Promise<number> {
    try {
      let query = `
        UPDATE ${this.tableName}
        SET status = $1,
            updated_at = NOW()
        WHERE status = $2
      `;

      const params: unknown[] = [toStatus, fromStatus];

      if (olderThanDays !== undefined) {
        query += ` AND updated_at < NOW() - INTERVAL '$3 days'`;
        params.push(olderThanDays);
      }

      const result = await this.executeQuery(query, params);
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error("Error bulk updating search index statuses", {
        error: error instanceof Error ? error.message : error,
        fromStatus,
        toStatus,
        olderThanDays,
      });
      throw error;
    }
  }

  /**
   * Format a search query for PostgreSQL tsquery
   *
   * @param query The search query
   * @returns Formatted query for tsquery
   */
  private formatSearchQuery(query: string): string {
    // Remove special characters, replace spaces with & for AND logic
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => word + ":*")
      .join(" & ");
  }

  /**
   * Convert camelCase to snake_case
   *
   * @param str String to convert
   * @returns snake_case string
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export const searchIndexRepository = new SearchIndexRepository();
