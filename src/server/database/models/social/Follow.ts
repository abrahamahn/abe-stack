import { v4 as uuidv4 } from "uuid";

export interface FollowAttributes {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

/**
 * Class representing a Follow relationship between users
 */
export class Follow {
  public id: string;
  public followerId: string;
  public followingId: string;
  public createdAt: Date;
  public updatedAt: Date;
  [key: string]: unknown;

  constructor(attributes: Partial<FollowAttributes> = {}) {
    this.id = attributes.id || uuidv4();
    this.followerId = attributes.followerId || "";
    this.followingId = attributes.followingId || "";
    this.createdAt = attributes.createdAt || new Date();
    this.updatedAt = attributes.updatedAt || new Date();
  }

  /**
   * Validate the follow data
   * @returns Array of validation error messages
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.followerId) {
      errors.push("Follower ID is required");
    }

    if (!this.followingId) {
      errors.push("Following ID is required");
    }

    if (this.followerId === this.followingId) {
      errors.push("User cannot follow themselves");
    }

    return errors;
  }

  /**
   * Convert the follow to a plain object for JSON serialization
   */
  toJSON(): Omit<FollowAttributes, "generateId"> {
    return {
      id: this.id,
      followerId: this.followerId,
      followingId: this.followingId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Follow;
