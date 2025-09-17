import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

import { BaseModel } from "../BaseModel";

export enum CollectionType {
  GALLERY = "gallery",
  FOLDER = "folder",
}

export enum CollectionPrivacy {
  PUBLIC = "public",
  PRIVATE = "private",
}

export interface MediaCollectionAttributes {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: CollectionType;
  privacy: CollectionPrivacy;
  coverMediaId: string | null;
  mediaIds: string[];
  sortOrder?: string | null;
  metadata?: Record<string, unknown> | null;
  isOfficial?: boolean;
  itemCount: number;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MediaCollection
  extends BaseModel
  implements MediaCollectionAttributes
{
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: CollectionType;
  privacy: CollectionPrivacy;
  coverMediaId: string | null;
  mediaIds: string[];
  sortOrder: string | null;
  metadata: Record<string, unknown> | null;
  isOfficial: boolean;
  itemCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    data: Partial<MediaCollectionAttributes> & {
      userId: string;
      title: string;
      type: CollectionType;
    }
  ) {
    super();
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.title = data.title;
    this.description = data.description || null;
    this.type = data.type;
    this.privacy = data.privacy || CollectionPrivacy.PRIVATE;
    this.coverMediaId = data.coverMediaId || null;
    this.mediaIds = data.mediaIds || [];
    this.sortOrder = data.sortOrder || null;
    this.metadata = data.metadata || null;
    this.isOfficial = data.isOfficial || false;
    this.itemCount =
      data.itemCount !== undefined ? data.itemCount : this.mediaIds.length;
    this.isDeleted = data.isDeleted || false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Convert object to JSON representation
   */
  toJSON(): MediaCollectionAttributes {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      type: this.type,
      privacy: this.privacy,
      coverMediaId: this.coverMediaId,
      mediaIds: this.mediaIds,
      sortOrder: this.sortOrder,
      metadata: this.metadata,
      isOfficial: this.isOfficial,
      itemCount: this.itemCount,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates the collection data before saving
   * @returns Array of validation errors (empty if valid)
   */
  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    if (!this.userId) {
      errors.push({
        field: "userId",
        message: "User ID is required",
      });
    }

    if (!this.title) {
      errors.push({
        field: "title",
        message: "Title is required",
      });
    } else {
      if (this.title.length < 2) {
        errors.push({
          field: "title",
          message: "Title must be at least 2 characters long",
        });
      }

      if (this.title.length > 100) {
        errors.push({
          field: "title",
          message: "Title cannot exceed 100 characters",
        });
      }
    }

    if (!Object.values(CollectionType).includes(this.type)) {
      errors.push({
        field: "type",
        message: "Invalid collection type",
      });
    }

    if (!Object.values(CollectionPrivacy).includes(this.privacy)) {
      errors.push({
        field: "privacy",
        message: "Invalid privacy setting",
      });
    }

    // Validate media IDs are unique
    const uniqueMediaIds = [...new Set(this.mediaIds)];
    if (uniqueMediaIds.length !== this.mediaIds.length) {
      this.mediaIds = uniqueMediaIds;
      // This is just a warning, not an error that prevents saving
    }

    if (this.coverMediaId && !this.mediaIds.includes(this.coverMediaId)) {
      errors.push({
        field: "coverMediaId",
        message: "Cover media must be part of the collection",
      });
    }

    return errors;
  }

  /**
   * Check if the collection is empty
   */
  isEmpty(): boolean {
    return this.mediaIds.length === 0;
  }

  /**
   * Add a media item to the collection
   */
  addMedia(mediaId: string): void {
    if (!this.mediaIds.includes(mediaId)) {
      this.mediaIds.push(mediaId);
      this.itemCount = this.mediaIds.length;
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove a media item from the collection
   */
  removeMedia(mediaId: string): void {
    const initialLength = this.mediaIds.length;
    this.mediaIds = this.mediaIds.filter((id) => id !== mediaId);

    if (this.mediaIds.length !== initialLength) {
      this.itemCount = this.mediaIds.length;
      this.updatedAt = new Date();

      // If removed media was cover, reset cover
      if (this.coverMediaId === mediaId) {
        this.coverMediaId = this.mediaIds.length > 0 ? this.mediaIds[0] : null;
      }
    }
  }

  /**
   * Set the cover media
   */
  setCoverMedia(mediaId: string | null): void {
    if (mediaId && !this.mediaIds.includes(mediaId)) {
      throw new Error("Cover media must be part of the collection");
    }
    this.coverMediaId = mediaId;
    this.updatedAt = new Date();
  }

  /**
   * Update collection privacy
   */
  setPrivacy(privacy: CollectionPrivacy): void {
    this.privacy = privacy;
    this.updatedAt = new Date();
  }

  /**
   * Mark collection as deleted
   */
  markAsDeleted(): void {
    this.isDeleted = true;
    this.updatedAt = new Date();
  }

  /**
   * Restore deleted collection
   */
  restore(): void {
    this.isDeleted = false;
    this.updatedAt = new Date();
  }

  /**
   * Update the sort order of media items
   */
  updateSortOrder(sortOrder: string): void {
    this.sortOrder = sortOrder;
    this.updatedAt = new Date();
  }

  /**
   * String representation of the collection
   */
  toString(): string {
    return `MediaCollection(id=${this.id}, title=${this.title}, mediaCount=${this.mediaIds.length})`;
  }
}
