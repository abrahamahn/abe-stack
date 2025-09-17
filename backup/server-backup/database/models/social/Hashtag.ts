import { BaseModel } from "../BaseModel";

/**
 * Category for classifying hashtags
 */
export enum HashtagCategory {
  GENERAL = "general",
  TRENDING = "trending",
  CONTENT = "content",
}

/**
 * Interface for hashtag attributes
 */
export interface HashtagAttributes {
  id: string;
  /**
   * The tag text without the # symbol
   */
  tag: string;

  /**
   * Optional normalized version of the tag
   */
  normalizedTag: string;

  /**
   * Number of times the hashtag has been used
   */
  usageCount: number;

  /**
   * Category of the hashtag
   */
  category: HashtagCategory;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Hashtag class for social media tagging
 */
export class Hashtag extends BaseModel implements HashtagAttributes {
  id: string;
  tag: string;
  normalizedTag: string;
  usageCount: number;
  category: HashtagCategory;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor for Hashtag
   */
  constructor(data: Partial<HashtagAttributes> & { tag: string }) {
    super();
    this.id = data.id || this.generateId();
    this.tag = data.tag;
    this.normalizedTag = data.normalizedTag || this.normalizeTag(data.tag);
    this.usageCount = data.usageCount || 0;
    this.category = data.category || HashtagCategory.GENERAL;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validates the hashtag data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.tag) {
      throw new Error("Tag is required");
    }

    if (this.tag.length > 50) {
      throw new Error("Tag exceeds maximum length of 50 characters");
    }

    // Check if the tag contains invalid characters (only allow alphanumeric and underscores)
    const validTagRegex = /^[a-zA-Z0-9_]+$/;
    if (!validTagRegex.test(this.tag)) {
      throw new Error("Tag can only contain letters, numbers, and underscores");
    }

    if (!Object.values(HashtagCategory).includes(this.category)) {
      throw new Error(`Invalid hashtag category: ${this.category}`);
    }

    if (this.usageCount < 0) {
      throw new Error("Usage count cannot be negative");
    }
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Omit<HashtagAttributes, "generateId"> & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      tag: this.tag,
      normalizedTag: this.normalizedTag,
      usageCount: this.usageCount,
      category: this.category,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Get the hashtag with the # symbol
   */
  getFormattedTag(): string {
    return `#${this.tag}`;
  }

  /**
   * Normalize a tag for consistent lookups
   */
  private normalizeTag(tag: string): string {
    // Remove any # prefix if present
    const cleanTag = tag.startsWith("#") ? tag.substring(1) : tag;

    // Lowercase and trim any whitespace
    return cleanTag.toLowerCase().trim();
  }

  /**
   * Increment the usage count
   */
  incrementUsage(count: number = 1): void {
    this.usageCount += count;
    this.updatedAt = new Date();
  }

  /**
   * Update category
   */
  updateCategory(category: HashtagCategory): void {
    this.category = category;
    this.updatedAt = new Date();
  }
}
