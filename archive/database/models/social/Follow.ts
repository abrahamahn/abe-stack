import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";
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
   * @returns Array of validation error details, empty if valid
   */
  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!this.followerId) {
      errors.push({
        field: "followerId",
        message: "Follower ID is required",
      });
    }

    if (!this.followingId) {
      errors.push({
        field: "followingId",
        message: "Following ID is required",
      });
    }

    if (this.followerId === this.followingId) {
      errors.push({
        field: "followingId",
        message: "User cannot follow themselves",
      });
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

  /**
   * String representation of the follow relationship
   */
  toString(): string {
    return `Follow(${this.id}, follower: ${this.followerId}, following: ${this.followingId})`;
  }
}

export default Follow;
