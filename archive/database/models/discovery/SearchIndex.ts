import { BaseModel } from "../BaseModel";

/**
 * Types of content that can be indexed
 */
export enum IndexedContentType {
  USER = "user",
  POST = "post",
  MEDIA = "media",
  GROUP = "group",
  COMMENT = "comment",
  TAG = "tag",
}

/**
 * Status of an indexed item
 */
export enum IndexStatus {
  PENDING = "pending",
  INDEXED = "indexed",
  FAILED = "failed",
  DELETED = "deleted",
}

/**
 * Interface for search weights for ranking results
 */
export interface SearchWeights {
  /**
   * Relevance score (0-1) - how relevant the content is to the query
   */
  relevance: number;

  /**
   * Recency score (0-1) - how recently the content was created/updated
   * Optional weight, defaulting to 0.5
   */
  recency?: number;

  /**
   * Popularity score (0-1) - how popular the content is
   * Optional weight, defaulting to 0.5
   */
  popularity?: number;

  /**
   * Quality score (0-1) - quality of the content (calculated from various factors)
   * Optional weight, defaulting to 0.5
   */
  quality?: number;
}

/**
 * Interface for indexed content in search
 */
export interface SearchIndexAttributes extends BaseModel {
  /**
   * ID of the indexed content
   */
  contentId: string;

  /**
   * Type of content indexed
   */
  contentType: IndexedContentType;

  /**
   * Primary text used for searching (e.g., post title, user name)
   */
  title: string;

  /**
   * Secondary text used for searching (e.g., post body, user bio)
   */
  description?: string;

  /**
   * Normalized text used for searching (lowercase, no special chars, etc.)
   */
  searchText: string;

  /**
   * User ID who owns this content (if applicable)
   */
  ownerId?: string;

  /**
   * Status of this item in the index
   */
  status: IndexStatus;

  /**
   * When the index was last updated
   */
  lastIndexedAt?: Date;

  /**
   * Tags and categories for this content
   */
  tags: string[];

  /**
   * Weight values for ranking
   */
  weights: SearchWeights;

  /**
   * Error message if indexing failed
   */
  errorMessage?: string;

  /**
   * Language of the content (ISO code)
   */
  language?: string;

  /**
   * When the content was published
   */
  publishedAt?: Date;
}

/**
 * SearchIndex class for content discovery
 *
 * This class is responsible for:
 * 1. Defining the structure of searchable content
 * 2. Generating search text from content
 * 3. Managing search-specific metadata
 * 4. Handling state transitions (indexed, deleted, etc.)
 * 5. NOT handling persistence - that belongs in SearchIndexRepository
 */
export class SearchIndex
  extends BaseModel
  implements Omit<SearchIndexAttributes, keyof BaseModel>
{
  contentId: string;
  contentType: IndexedContentType;
  title: string;
  description?: string;
  searchText: string;
  ownerId?: string;
  status: IndexStatus;
  lastIndexedAt?: Date;
  tags: string[];
  weights: SearchWeights;
  errorMessage?: string;
  language?: string;
  publishedAt?: Date;

  /**
   * Create a new SearchIndex instance
   *
   * @param data Partial data for the search index
   */
  constructor(
    data: Partial<SearchIndexAttributes> & {
      contentId: string;
      contentType: IndexedContentType;
      title: string;
    },
  ) {
    super();
    this.id = data.id || this.generateId();
    this.contentId = data.contentId;
    this.contentType = data.contentType;
    this.title = data.title;
    this.description = data.description;
    this.searchText = data.searchText || this.generateSearchText(data);
    this.ownerId = data.ownerId;
    this.status = data.status || IndexStatus.PENDING;
    this.lastIndexedAt = data.lastIndexedAt;
    this.tags = data.tags || [];
    this.weights = {
      relevance: data.weights?.relevance || 0.5,
      recency: data.weights?.recency || 0.5,
      popularity: data.weights?.popularity || 0.5,
      quality: data.weights?.quality || 0.5,
    };
    this.errorMessage = data.errorMessage;
    this.language = data.language || "en";
    this.publishedAt = data.publishedAt || data.createdAt || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Convert the model to a plain object for serialization
   *
   * @returns A plain object representation of the search index
   */
  toJSON(): Omit<SearchIndexAttributes, "generateId"> {
    return {
      id: this.id,
      contentId: this.contentId,
      contentType: this.contentType,
      title: this.title,
      description: this.description,
      searchText: this.searchText,
      ownerId: this.ownerId,
      status: this.status,
      lastIndexedAt: this.lastIndexedAt,
      tags: this.tags,
      weights: this.weights,
      errorMessage: this.errorMessage,
      language: this.language,
      publishedAt: this.publishedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validate the search index data
   *
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.contentId) {
      throw new Error("Content ID is required");
    }

    if (!this.contentType) {
      throw new Error("Content type is required");
    }

    if (!this.title) {
      throw new Error("Title is required");
    }

    if (!Object.values(IndexedContentType).includes(this.contentType)) {
      throw new Error("Invalid content type");
    }

    if (!Object.values(IndexStatus).includes(this.status)) {
      throw new Error("Invalid status");
    }

    if (this.weights.relevance < 0 || this.weights.relevance > 1) {
      throw new Error("Relevance weight must be between 0 and 1");
    }
  }

  /**
   * Generate search text from title, description, and tags
   * This normalizes the text for better searching
   *
   * @param data The data to generate search text from
   * @returns Normalized search text
   */
  private generateSearchText(data: Partial<SearchIndexAttributes>): string {
    const parts: string[] = [];

    if (data.title) {
      parts.push(data.title.toLowerCase());
    }

    if (data.description) {
      parts.push(data.description.toLowerCase());
    }

    if (data.tags && data.tags.length > 0) {
      parts.push(data.tags.join(" ").toLowerCase());
    }

    return parts
      .join(" ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Mark the item as indexed
   */
  markAsIndexed(): void {
    this.status = IndexStatus.INDEXED;
    this.lastIndexedAt = new Date();
    this.errorMessage = undefined;
    this.updatedAt = new Date();
  }

  /**
   * Mark the item as failed
   *
   * @param errorMessage Optional error message
   */
  markAsFailed(errorMessage?: string): void {
    this.status = IndexStatus.FAILED;
    this.errorMessage = errorMessage;
    this.updatedAt = new Date();
  }

  /**
   * Mark the item as deleted
   */
  markAsDeleted(): void {
    this.status = IndexStatus.DELETED;
    this.updatedAt = new Date();
  }

  /**
   * Update content metadata
   *
   * @param title Optional new title
   * @param description Optional new description
   */
  updateContent(title?: string, description?: string): void {
    let changed = false;

    if (title !== undefined && title !== this.title) {
      this.title = title;
      changed = true;
    }

    if (description !== undefined && description !== this.description) {
      this.description = description;
      changed = true;
    }

    if (changed) {
      this.searchText = this.generateSearchText(this);
      this.status = IndexStatus.PENDING;
      this.updatedAt = new Date();
    }
  }

  /**
   * Add tags to the index
   *
   * @param newTags Tags to add
   */
  addTags(newTags: string[]): void {
    if (!newTags.length) return;

    const uniqueNewTags = newTags.filter((tag) => !this.tags.includes(tag));

    if (uniqueNewTags.length > 0) {
      this.tags = [...this.tags, ...uniqueNewTags];
      this.searchText = this.generateSearchText(this);
      this.status = IndexStatus.PENDING;
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove tags from the index
   *
   * @param tagsToRemove Tags to remove
   */
  removeTags(tagsToRemove: string[]): void {
    if (!tagsToRemove.length) return;

    const initialLength = this.tags.length;
    this.tags = this.tags.filter((tag) => !tagsToRemove.includes(tag));

    if (this.tags.length !== initialLength) {
      this.searchText = this.generateSearchText(this);
      this.status = IndexStatus.PENDING;
      this.updatedAt = new Date();
    }
  }

  /**
   * Update relevance weight
   *
   * @param relevance New relevance score (0-1)
   */
  updateRelevance(relevance: number): void {
    this.weights.relevance = Math.max(0, Math.min(1, relevance));
    this.updatedAt = new Date();
  }

  /**
   * Update all weights at once
   *
   * @param weights New weights to apply
   */
  updateWeights(weights: Partial<SearchWeights>): void {
    if (weights.relevance !== undefined) {
      this.weights.relevance = Math.max(0, Math.min(1, weights.relevance));
    }

    if (weights.recency !== undefined) {
      this.weights.recency = Math.max(0, Math.min(1, weights.recency));
    }

    if (weights.popularity !== undefined) {
      this.weights.popularity = Math.max(0, Math.min(1, weights.popularity));
    }

    if (weights.quality !== undefined) {
      this.weights.quality = Math.max(0, Math.min(1, weights.quality));
    }

    this.updatedAt = new Date();
  }

  /**
   * Update the language
   *
   * @param language The ISO language code
   */
  updateLanguage(language: string): void {
    this.language = language;
    this.updatedAt = new Date();
  }

  /**
   * Check if the index is pending
   *
   * @returns True if the status is pending
   */
  isPending(): boolean {
    return this.status === IndexStatus.PENDING;
  }

  /**
   * Check if the index is indexed
   *
   * @returns True if the status is indexed
   */
  isIndexed(): boolean {
    return this.status === IndexStatus.INDEXED;
  }

  /**
   * Check if the index is deleted
   *
   * @returns True if the status is deleted
   */
  isDeleted(): boolean {
    return this.status === IndexStatus.DELETED;
  }

  /**
   * Check if the index failed
   *
   * @returns True if the status is failed
   */
  isFailed(): boolean {
    return this.status === IndexStatus.FAILED;
  }
}
