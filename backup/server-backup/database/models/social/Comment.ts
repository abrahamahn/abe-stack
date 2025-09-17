import { BaseModel } from "../BaseModel";
import { ContentStatus } from "../shared/EntityTypes";

export enum CommentTargetType {
  POST = "POST",
  MEDIA = "MEDIA",
  ARTICLE = "ARTICLE",
}

export interface CommentAttributes {
  id: string;
  userId: string;
  postId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentJSON {
  id: string;
  userId: string;
  postId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

export class Comment extends BaseModel implements CommentAttributes {
  id: string;
  userId: string;
  postId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<CommentAttributes>) {
    super();
    this.id = data.id || this.generateId();
    this.userId = data.userId || "";
    this.postId = data.postId || "";
    this.parentId = data.parentId || null;
    this.content = data.content || "";
    this.likesCount = data.likesCount || 0;
    this.status = data.status || ContentStatus.DRAFT;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validate comment data
   * @returns Array of validation error messages
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.userId) {
      errors.push("User ID is required");
    }

    if (!this.postId) {
      errors.push("Post ID is required");
    }

    if (!this.content) {
      errors.push("Content is required");
    }

    if (this.content && this.content.length > 2000) {
      errors.push("Content exceeds maximum length of 2000 characters");
    }

    return errors;
  }

  /**
   * Increment the like count for this comment
   */
  incrementLikeCount(): void {
    this.likesCount++;
    this.updatedAt = new Date();
  }

  /**
   * Decrement the like count for this comment
   */
  decrementLikeCount(): void {
    this.likesCount = Math.max(0, this.likesCount - 1);
    this.updatedAt = new Date();
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Omit<CommentJSON, "generateId"> {
    return {
      id: this.id,
      userId: this.userId,
      postId: this.postId,
      parentId: this.parentId,
      content: this.content,
      likesCount: this.likesCount,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export default Comment;
