import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

import { BaseModel } from "../BaseModel";

/**
 * Defines the visibility level of a group
 */
export enum GroupVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

/**
 * Defines the role of a member within a group
 */
export enum GroupMemberRole {
  MEMBER = "member",
  MODERATOR = "moderator",
  ADMIN = "admin",
}

/**
 * Defines the current status of a group
 */
export enum GroupStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  SUSPENDED = "suspended",
}

/**
 * Interface defining the structure of a Group
 */
export interface GroupAttributes {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  ownerId: string;
  visibility: GroupVisibility;
  status: GroupStatus;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Group model representing a community group.
 * This class handles:
 * 1. Group data structure
 * 2. Validation of group data
 * 3. Business logic related to groups
 * 4. NOT database operations - those belong in GroupRepository
 */
export class Group extends BaseModel implements GroupAttributes {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  ownerId: string;
  visibility: GroupVisibility;
  status: GroupStatus;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Creates a new Group instance
   * @param data The group data
   */
  constructor(
    data: Partial<GroupAttributes> & { name: string; ownerId: string }
  ) {
    super();
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.slug = data.slug || this.generateSlug(data.name);
    this.description = data.description || null;
    this.imageUrl = data.imageUrl || null;
    this.bannerUrl = data.bannerUrl || null;
    this.ownerId = data.ownerId;
    this.visibility = data.visibility || GroupVisibility.PRIVATE;
    this.status = data.status || GroupStatus.ACTIVE;
    this.memberCount = data.memberCount || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Converts the group to a JSON object
   * @returns A plain object representation of the group
   */
  toJSON(): GroupAttributes {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      imageUrl: this.imageUrl,
      bannerUrl: this.bannerUrl,
      ownerId: this.ownerId,
      visibility: this.visibility,
      status: this.status,
      memberCount: this.memberCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates the group data
   * @returns Array of validation error details if validation fails
   */
  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push({
        field: "name",
        message: "Group name is required",
      });
    }

    if (this.name && this.name.length > 100) {
      errors.push({
        field: "name",
        message: "Group name cannot exceed 100 characters",
      });
    }

    if (!this.ownerId) {
      errors.push({
        field: "ownerId",
        message: "Owner ID is required",
      });
    }

    if (this.description && this.description.length > 1000) {
      errors.push({
        field: "description",
        message: "Group description cannot exceed 1000 characters",
      });
    }

    return errors;
  }

  /**
   * Generates a URL-friendly slug from the group name
   * @param name The group name
   * @returns A slug string
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Updates the group name and regenerates the slug
   * @param name The new group name
   */
  updateName(name: string): void {
    this.name = name;
    this.slug = this.generateSlug(name);
    this.updatedAt = new Date();
  }

  /**
   * Updates the group description
   * @param description The new group description
   */
  updateDescription(description: string | null): void {
    this.description = description;
    this.updatedAt = new Date();
  }

  /**
   * Updates the group profile image URL
   * @param imageUrl The new image URL
   */
  updateImageUrl(imageUrl: string | null): void {
    this.imageUrl = imageUrl;
    this.updatedAt = new Date();
  }

  /**
   * Updates the group banner image URL
   * @param bannerUrl The new banner URL
   */
  updateBannerUrl(bannerUrl: string | null): void {
    this.bannerUrl = bannerUrl;
    this.updatedAt = new Date();
  }

  /**
   * Updates the group visibility
   * @param visibility The new visibility
   */
  updateVisibility(visibility: GroupVisibility): void {
    this.visibility = visibility;
    this.updatedAt = new Date();
  }

  /**
   * Updates the group status
   * @param status The new status
   */
  updateStatus(status: GroupStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Increments the member count
   * @param count The number to increment by
   */
  incrementMemberCount(count = 1): void {
    this.memberCount += count;
    this.updatedAt = new Date();
  }

  /**
   * Decrements the member count
   * @param count The number to decrement by
   */
  decrementMemberCount(count = 1): void {
    this.memberCount = Math.max(0, this.memberCount - count);
    this.updatedAt = new Date();
  }

  /**
   * Checks if the group is public
   * @returns True if the group is public
   */
  isPublic(): boolean {
    return this.visibility === GroupVisibility.PUBLIC;
  }

  /**
   * Checks if the group is private
   * @returns True if the group is private
   */
  isPrivate(): boolean {
    return this.visibility === GroupVisibility.PRIVATE;
  }

  /**
   * Checks if the group is active
   * @returns True if the group is active
   */
  isActive(): boolean {
    return this.status === GroupStatus.ACTIVE;
  }

  /**
   * Checks if the group is archived
   * @returns True if the group is archived
   */
  isArchived(): boolean {
    return this.status === GroupStatus.ARCHIVED;
  }

  /**
   * Checks if the group is suspended
   * @returns True if the group is suspended
   */
  isSuspended(): boolean {
    return this.status === GroupStatus.SUSPENDED;
  }
}
