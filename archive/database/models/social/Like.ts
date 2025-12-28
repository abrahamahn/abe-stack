import { likeRepository } from "../../repositories/social/LikeRepository";
import { BaseModel } from "../BaseModel";

/**
 * Enum for different types of like targets
 */
export enum LikeTargetType {
  POST = "post",
  COMMENT = "comment",
  MEDIA = "media",
  ARTICLE = "article",
}

/**
 * Interface for like attributes
 */
export interface LikeAttributes extends BaseModel {
  userId: string;
  targetId: string;
  targetType: LikeTargetType;
}

/**
 * Like model representing a user's like on a piece of content
 */
export class Like
  extends BaseModel
  implements Omit<LikeAttributes, keyof BaseModel>
{
  id: string;
  userId: string;
  targetId: string;
  targetType: LikeTargetType;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor for Like
   */
  constructor(
    data: Partial<LikeAttributes> & {
      userId: string;
      targetId: string;
      targetType: LikeTargetType;
    },
  ) {
    super();
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.targetId = data.targetId;
    this.targetType = data.targetType;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  /**
   * Validates the like data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.userId) {
      throw new Error("User ID is required");
    }

    if (!this.targetId) {
      throw new Error("Target ID is required");
    }

    if (!this.targetType) {
      throw new Error("Target type is required");
    }

    if (!Object.values(LikeTargetType).includes(this.targetType)) {
      throw new Error(`Invalid target type: ${this.targetType}`);
    }
  }

  // Static methods that use the repository
  static async findByPk(id: string): Promise<Like | null> {
    const like = await likeRepository.findById(id);
    return like ? new Like(like) : null;
  }

  static async findByUserAndPost(
    userId: string,
    postId: string,
  ): Promise<Like | null> {
    const like = await likeRepository.findByUserAndTarget(
      userId,
      postId,
      LikeTargetType.POST,
    );
    return like ? new Like(like) : null;
  }

  static async findByUserAndPosts(
    _userId: string,
    postIds: string[],
  ): Promise<Like[]> {
    const likes = await Promise.all(
      postIds.map((id) =>
        likeRepository.getLikesForTarget(id, LikeTargetType.POST),
      ),
    );
    return likes.flat().map((like: LikeAttributes) => new Like(like));
  }

  static async create(
    data: Omit<LikeAttributes, "id" | "createdAt">,
  ): Promise<Like> {
    const like = await likeRepository.create(data);
    return new Like(like);
  }

  async delete(): Promise<boolean> {
    return likeRepository.delete(this.id);
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Omit<LikeAttributes, "generateId" | "createdAt" | "updatedAt"> & {
    id: string;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.id,
      userId: this.userId,
      targetId: this.targetId,
      targetType: this.targetType,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export default Like;
