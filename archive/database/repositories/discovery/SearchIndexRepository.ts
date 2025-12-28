import {
  IndexedContentType,
  IndexStatus,
  SearchIndex,
  SearchIndexAttributes,
  SearchWeights,
} from "@/server/database/models/discovery/SearchIndex";
import {
  SearchError,
  SearchOperationError,
  SearchValidationError,
  InvalidSearchQueryError,
  SearchIndexNotReadyError,
} from "@/server/infrastructure/errors/domain/discovery/SearchError";

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
  protected tableName = "search_indices";
  protected columns = [
    "id",
    "entity_id as entityId",
    "entity_type as entityType",
    "content",
    "metadata",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("SearchIndex");
  }

  /**
   * Find a search index item by ID
   *
   * @param id The search index item ID
   * @returns The search index item or null if not found
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async findById(id: string): Promise<SearchIndex | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) return null;
      return this.mapResultToModel(result);
    } catch (error) {
      throw new SearchOperationError("findById", error);
    }
  }

  /**
   * Find a search index item by content ID and type
   *
   * @param contentId The ID of the indexed content
   * @param contentType The type of the indexed content
   * @returns The search index item or null if not found
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async findByContentId(
    contentId: string,
    contentType: IndexedContentType
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
      throw new SearchOperationError("findByContentId", error);
    }
  }

  /**
   * Find items that need to be indexed
   *
   * @param limit Maximum number of items to return
   * @returns Array of search index items
   * @throws {SearchOperationError} If there's an error during the operation
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
      throw new SearchOperationError("findPendingIndexItems", error);
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
   * @throws {InvalidSearchQueryError} If the search query is invalid
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async search(
    searchTerm: string,
    contentTypes?: IndexedContentType[],
    tags?: string[],
    ownerId?: string,
    languages?: string[],
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchIndex[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new InvalidSearchQueryError(
          searchTerm,
          "Search term cannot be empty"
        );
      }

      let formattedQuery;
      try {
        formattedQuery = this.formatSearchQuery(searchTerm);
      } catch (error) {
        throw new InvalidSearchQueryError(
          searchTerm,
          "Invalid search query format"
        );
      }

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

      const queryParams: unknown[] = [formattedQuery, IndexStatus.INDEXED];
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
      if (error instanceof InvalidSearchQueryError) {
        throw error;
      }
      throw new SearchOperationError("search", error);
    }
  }

  /**
   * Formats a search query string for PostgreSQL ts_query
   *
   * @param query The original query string
   * @returns The formatted query string
   * @throws {InvalidSearchQueryError} If the query format is invalid
   */
  private formatSearchQuery(query: string): string {
    try {
      // Remove special characters and format for ts_query
      const formatted = query
        .trim()
        .replace(/[!@#$%^&*(),.?":{}|<>]/g, " ")
        .replace(/\s+/g, " ")
        .split(" ")
        .filter((term) => term.length > 0)
        .map((term) => term + ":*")
        .join(" & ");

      if (formatted.length === 0) {
        throw new InvalidSearchQueryError(
          query,
          "Empty search query after formatting"
        );
      }

      return formatted;
    } catch (error) {
      if (error instanceof InvalidSearchQueryError) {
        throw error;
      }
      throw new InvalidSearchQueryError(query, "Failed to format search query");
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
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async findByTag(
    tag: string,
    contentTypes?: IndexedContentType[],
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchIndex[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1 AND $2 = ANY(tags)
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
        queryParams
      );

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      throw new SearchOperationError("findByTag", error);
    }
  }

  /**
   * Find by owner
   *
   * @param ownerId The ID of the content owner
   * @param contentTypes Optional types of content to filter by
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip
   * @returns Array of search index items
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async findByOwner(
    ownerId: string,
    contentTypes?: IndexedContentType[],
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchIndex[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1 AND owner_id = $2
      `;

      const queryParams: unknown[] = [IndexStatus.INDEXED, ownerId];
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
        queryParams
      );

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      throw new SearchOperationError("findByOwner", error);
    }
  }

  /**
   * Find recent items
   *
   * @param contentTypes Optional types of content to filter by
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip
   * @returns Array of search index items
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async findRecent(
    contentTypes?: IndexedContentType[],
    limit: number = 20,
    offset: number = 0
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
        queryParams
      );

      return result.rows.map((row) => new SearchIndex(row));
    } catch (error) {
      throw new SearchOperationError("findRecent", error);
    }
  }

  /**
   * Upsert (insert or update) a search index item
   *
   * @param data The search index data to upsert
   * @returns The created or updated search index item
   * @throws {SearchValidationError} If validation fails
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async upsert(
    data: Partial<SearchIndexAttributes> & {
      contentId: string;
      contentType: IndexedContentType;
    }
  ): Promise<SearchIndex> {
    try {
      // Validate the minimum required fields
      if (!data.contentId || !data.contentType) {
        throw new SearchValidationError([
          { field: "contentId", message: "Content ID is required" },
          { field: "contentType", message: "Content type is required" },
        ]);
      }

      // Check if the item already exists
      const existing = await this.findByContentId(
        data.contentId,
        data.contentType
      );

      if (existing) {
        // Update existing record
        return (await this.update(existing.id, {
          ...data,
          status: data.status || IndexStatus.PENDING,
        })) as SearchIndex;
      } else {
        // Create new record
        return await this.create({
          ...data,
          status: data.status || IndexStatus.PENDING,
        });
      }
    } catch (error) {
      if (error instanceof SearchValidationError) {
        throw error;
      }
      throw new SearchOperationError("upsert", error);
    }
  }

  /**
   * Create a new search index item
   *
   * @param data The search index data to create
   * @returns The created search index item
   * @throws {SearchValidationError} If validation fails
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async create(
    data: Partial<SearchIndexAttributes> | SearchIndex
  ): Promise<SearchIndex> {
    try {
      const searchIndex =
        data instanceof SearchIndex
          ? data
          : new SearchIndex(data as SearchIndexAttributes);

      // Validate
      const validationErrors = searchIndex.validate();
      if (validationErrors.length > 0) {
        throw new SearchValidationError(validationErrors);
      }

      const result = await super.create(searchIndex);
      return new SearchIndex(result as SearchIndexAttributes);
    } catch (error) {
      if (error instanceof SearchValidationError) {
        throw error;
      }
      throw new SearchOperationError("create", error);
    }
  }

  /**
   * Update a search index item
   *
   * @param id The ID of the search index item to update
   * @param data The search index data to update
   * @returns The updated search index item or null if not found
   * @throws {SearchValidationError} If validation fails
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async update(
    id: string,
    data: Partial<SearchIndexAttributes> | SearchIndex
  ): Promise<SearchIndex | null> {
    try {
      // Get existing record
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      // Create updated model
      const searchIndex =
        data instanceof SearchIndex
          ? data
          : new SearchIndex({ ...existing, ...data });

      // Validate
      const validationErrors = searchIndex.validate();
      if (validationErrors.length > 0) {
        throw new SearchValidationError(validationErrors);
      }

      const result = await super.update(id, searchIndex);
      if (!result) return null;

      return new SearchIndex(result as SearchIndexAttributes);
    } catch (error) {
      if (error instanceof SearchValidationError) {
        throw error;
      }
      throw new SearchOperationError("update", error);
    }
  }

  /**
   * Mark a search index item as indexed
   *
   * @param id The ID of the search index item
   * @returns The updated search index item or null if not found
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async markAsIndexed(id: string): Promise<SearchIndex | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET status = $1,
            indexed_at = NOW(),
            updated_at = NOW(),
            error_message = NULL
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
      throw new SearchOperationError("markAsIndexed", error);
    }
  }

  /**
   * Mark a search index item as failed
   *
   * @param id The ID of the search index item
   * @param errorMessage Optional error message
   * @returns The updated search index item or null if not found
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async markAsFailed(
    id: string,
    errorMessage?: string
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
        errorMessage || "Indexing failed",
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new SearchIndex(result.rows[0]);
    } catch (error) {
      throw new SearchOperationError("markAsFailed", error);
    }
  }

  /**
   * Mark a search index item as deleted
   *
   * @param contentId The ID of the indexed content
   * @param contentType The type of the indexed content
   * @returns The updated search index item or null if not found
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async markAsDeleted(
    contentId: string,
    contentType: IndexedContentType
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
      throw new SearchOperationError("markAsDeleted", error);
    }
  }

  /**
   * Update the weights for a search index item
   *
   * @param id The ID of the search index item
   * @param weights The weights to update
   * @returns The updated search index item or null if not found
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async updateWeights(
    id: string,
    weights: Partial<SearchWeights>
  ): Promise<SearchIndex | null> {
    try {
      // Get existing weights
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      // Merge with existing weights
      const mergedWeights = {
        ...existing.weights,
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
        JSON.stringify(mergedWeights),
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new SearchIndex(result.rows[0]);
    } catch (error) {
      throw new SearchOperationError("updateWeights", error);
    }
  }

  /**
   * Delete a search index item
   *
   * @param id The ID of the search index item
   * @returns Whether the deletion was successful
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async delete(id: string): Promise<boolean> {
    try {
      return await super.delete(id);
    } catch (error) {
      throw new SearchOperationError("delete", error);
    }
  }

  /**
   * Delete a search index item by content ID and type
   *
   * @param contentId The ID of the indexed content
   * @param contentType The type of the indexed content
   * @returns Whether the deletion was successful
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async deleteContent(
    contentId: string,
    contentType: IndexedContentType
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
      throw new SearchOperationError("deleteContent", error);
    }
  }

  /**
   * Bulk update the status of multiple search index items
   *
   * @param fromStatus The current status to match
   * @param toStatus The new status to set
   * @param olderThanDays Optional days threshold for filtering by age
   * @returns The number of updated items
   * @throws {SearchOperationError} If there's an error during the operation
   */
  async bulkUpdateStatuses(
    fromStatus: IndexStatus,
    toStatus: IndexStatus,
    olderThanDays?: number
  ): Promise<number> {
    try {
      let query = `
        UPDATE ${this.tableName}
        SET status = $1,
            updated_at = NOW()
        WHERE status = $2
      `;

      const params: unknown[] = [toStatus, fromStatus];

      if (olderThanDays) {
        query += ` AND updated_at < NOW() - INTERVAL '${olderThanDays} days'`;
      }

      const result = await this.executeQuery(query, params);
      return result.rowCount || 0;
    } catch (error) {
      throw new SearchOperationError("bulkUpdateStatuses", error);
    }
  }

  /**
   * Convert camelCase to snake_case
   *
   * @param str The string to convert
   * @returns The converted string
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export const searchIndexRepository = new SearchIndexRepository();
