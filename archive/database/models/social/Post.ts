import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

import { BaseModel } from "../BaseModel";

/**
 * Enum for different types of posts
 */
export enum PostType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  LINK = "link",
  POLL = "POLL",
}

/**
 * Enum defining the visibility level of a post
 */
export enum PostVisibility {
  PUBLIC = "public",
  FOLLOWERS = "followers",
  PRIVATE = "private",
  UNLISTED = "unlisted",
}

/**
 * Enum for different post statuses
 */
export enum PostStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  SCHEDULED = "scheduled",
  ARCHIVED = "archived",
  DELETED = "deleted",
  PENDING_REVIEW = "pending_review",
}

/**
 * Interface for location data
 */
export interface PostLocation {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Interface for post metadata
 */
export interface PostMetadata {
  tags?: string[];
  mentions?: string[];
  pollOptions?: string[];
  pollEndsAt?: Date;
  pollResults?: Record<string, number>;
  originalAuthor?: string;
  topic?: string;
  mood?: string;
  [key: string]: unknown;
}

/**
 * Interface for post attributes - the data structure for database operations
 */
export interface PostAttributes {
  id: string;
  userId: string;
  type: PostType;
  content: string;
  status: PostStatus;
  visibility: PostVisibility;
  location: PostLocation | null;
  mediaIds: string[];
  metadata?: Record<string, unknown>;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  isEdited: boolean;
  isPinned: boolean;
  parentId: string | null;
  originalPostId: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for the JSON representation of a post
 */
export interface PostJSON
  extends Omit<
    PostAttributes,
    "createdAt" | "updatedAt" | "scheduledAt" | "publishedAt"
  > {
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  isLiked?: boolean;
}

/**
 * Post domain model representing a social media post
 *
 * Responsibilities:
 * 1. Encapsulate post data structure
 * 2. Provide business logic and validation
 * 3. Handle state changes and updates
 * 4. NOT handle persistence (that's the repository's job)
 */
export class Post extends BaseModel implements PostAttributes {
  declare id: string;
  userId!: string;
  type!: PostType;
  content!: string;
  status!: PostStatus;
  visibility!: PostVisibility;
  location!: PostLocation | null;
  mediaIds!: string[];
  metadata?: Record<string, unknown>;
  likeCount!: number;
  commentCount!: number;
  shareCount!: number;
  viewCount!: number;
  isEdited!: boolean;
  isPinned!: boolean;
  parentId!: string | null;
  originalPostId!: string | null;
  scheduledAt!: Date | null;
  publishedAt!: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(data: Partial<PostAttributes>) {
    super();
    Object.assign(this, data);
  }

  /**
   * Update post content and mark as edited
   */
  updateContent(content: string): void {
    if (content !== this.content) {
      this.content = content;
      this.updatedAt = new Date();
    }
  }

  /**
   * Update post type
   */
  updateType(type: PostType): void {
    if (type !== this.type) {
      this.type = type;
      this.updatedAt = new Date();
    }
  }

  /**
   * Validates the post data
   * @returns Array of validation errors, empty if valid
   */
  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!this.userId) {
      errors.push({
        field: "userId",
        message: "User ID is required",
      });
    }

    // Check content size using JSON serialization
    if (JSON.stringify(this.content).length > 10000) {
      errors.push({
        field: "content",
        message: "Content object is too large",
      });
    }

    if (!Object.values(PostType).includes(this.type)) {
      errors.push({
        field: "type",
        message: `Invalid post type: ${this.type}`,
      });
    }

    // Additional validations
    if (!this.status || !Object.values(PostStatus).includes(this.status)) {
      errors.push({
        field: "status",
        message: `Invalid post status: ${this.status}`,
      });
    }

    if (
      !this.visibility ||
      !Object.values(PostVisibility).includes(this.visibility)
    ) {
      errors.push({
        field: "visibility",
        message: `Invalid post visibility: ${this.visibility}`,
      });
    }

    if (
      this.location &&
      (typeof this.location !== "object" ||
        typeof this.location.latitude !== "number" ||
        typeof this.location.longitude !== "number" ||
        typeof this.location.name !== "string")
    ) {
      errors.push({
        field: "location",
        message: "Invalid location format",
      });
    }

    if (!Array.isArray(this.mediaIds)) {
      errors.push({
        field: "mediaIds",
        message: "Media IDs must be an array",
      });
    }

    return errors;
  }

  /**
   * Get attributes for repository operations
   */
  getAttributes(): PostAttributes {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      content: this.content,
      status: this.status,
      visibility: this.visibility,
      location: this.location,
      mediaIds: this.mediaIds,
      metadata: this.metadata,
      likeCount: this.likeCount,
      commentCount: this.commentCount,
      shareCount: this.shareCount,
      viewCount: this.viewCount,
      isEdited: this.isEdited,
      isPinned: this.isPinned,
      parentId: this.parentId,
      originalPostId: this.originalPostId,
      scheduledAt: this.scheduledAt,
      publishedAt: this.publishedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Convert post to JSON for API responses
   */
  toJSON(): PostJSON {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      content: this.content,
      status: this.status,
      visibility: this.visibility,
      location: this.location,
      mediaIds: this.mediaIds,
      metadata: this.metadata,
      likeCount: this.likeCount,
      commentCount: this.commentCount,
      shareCount: this.shareCount,
      viewCount: this.viewCount,
      isEdited: this.isEdited,
      isPinned: this.isPinned,
      parentId: this.parentId,
      originalPostId: this.originalPostId,
      scheduledAt: this.scheduledAt?.toISOString(),
      publishedAt: this.publishedAt?.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * String representation of the post
   */
  toString(): string {
    return `Post(${this.id}, type: ${this.type}, status: ${this.status}, visibility: ${this.visibility})`;
  }
}

export default Post;
