import { BaseModel } from "../BaseModel";

export interface CommentLikeAttributes extends BaseModel {
  userId: string;
  commentId: string;
}

export class CommentLike
  extends BaseModel
  implements Omit<CommentLikeAttributes, keyof BaseModel>
{
  userId: string;
  commentId: string;

  constructor(
    data: Partial<CommentLikeAttributes> & {
      userId: string;
      commentId: string;
    },
  ) {
    super();
    this.userId = data.userId;
    this.commentId = data.commentId;
  }

  /**
   * Validate comment like data
   * @returns Array of validation error messages
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.userId) {
      errors.push("User ID is required");
    }

    if (!this.commentId) {
      errors.push("Comment ID is required");
    }

    return errors;
  }

  toJSON(): Omit<CommentLikeAttributes, "generateId"> {
    return {
      id: this.id,
      userId: this.userId,
      commentId: this.commentId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default CommentLike;
