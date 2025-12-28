import { BaseModel } from "../BaseModel";

export enum EntityType {
  POST = "post",
  COMMENT = "comment",
  ARTICLE = "article",
}

/**
 * Interface for bookmark attributes
 */
export interface BookmarkAttributes {
  id: string;
  userId: string;
  entityId: string;
  entityType: EntityType;
  collectionId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bookmark model representing a user's saved content
 */
export class Bookmark
  extends BaseModel
  implements Omit<BookmarkAttributes, keyof BaseModel>
{
  userId: string;
  entityId: string;
  entityType: EntityType;
  collectionId: string | null;
  notes: string | null;

  /**
   * Constructor for Bookmark
   */
  constructor(
    data: Partial<BookmarkAttributes> & {
      userId: string;
      entityId: string;
      entityType: EntityType;
    },
  ) {
    super();
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.entityId = data.entityId;
    this.entityType = data.entityType;
    this.collectionId = data.collectionId || null;
    this.notes = data.notes || null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  /**
   * Validates the bookmark data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.userId) {
      throw new Error("User ID is required");
    }

    if (!this.entityId) {
      throw new Error("Entity ID is required");
    }

    if (!this.entityType) {
      throw new Error("Entity type is required");
    }

    if (!Object.values(EntityType).includes(this.entityType)) {
      throw new Error(`Invalid entity type: ${this.entityType}`);
    }

    if (this.notes && this.notes.length > 1000) {
      throw new Error("Notes cannot exceed 1000 characters");
    }
  }

  /**
   * Update bookmark notes
   */
  updateNotes(notes: string | null): void {
    this.notes = notes;
    this.updatedAt = new Date();
  }

  /**
   * Move bookmark to a different collection
   */
  moveToCollection(collectionId: string | null): void {
    this.collectionId = collectionId;
    this.updatedAt = new Date();
  }

  /**
   * Check if bookmark belongs to a specific user
   */
  belongsToUser(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * Check if bookmark is for a specific entity
   */
  isForEntity(entityId: string, entityType: EntityType): boolean {
    return this.entityId === entityId && this.entityType === entityType;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Omit<BookmarkAttributes, "generateId"> {
    return {
      id: this.id,
      userId: this.userId,
      entityId: this.entityId,
      entityType: this.entityType,
      collectionId: this.collectionId,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
