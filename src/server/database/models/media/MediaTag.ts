import { BaseModel } from "../BaseModel";

export interface MediaTagAttributes {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: string | null;
  isOfficial?: boolean;
  usageCount: number;
  parentTagId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MediaTag extends BaseModel implements MediaTagAttributes {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  isOfficial: boolean;
  usageCount: number;
  parentTagId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<MediaTagAttributes> & { name: string }) {
    super();
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.slug = data.slug || this.generateSlug(data.name);
    this.description = data.description || null;
    this.category = data.category || null;
    this.isOfficial = data.isOfficial || false;
    this.usageCount = data.usageCount || 0;
    this.parentTagId = data.parentTagId || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Convert object to JSON representation
   */
  toJSON(): MediaTagAttributes {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      category: this.category,
      isOfficial: this.isOfficial,
      usageCount: this.usageCount,
      parentTagId: this.parentTagId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates the tag data before saving
   * @throws {Error} If validation fails
   */
  validate(): void {
    if (!this.name) {
      throw new Error("Tag name is required");
    }
    if (this.name.length < 2) {
      throw new Error("Tag name must be at least 2 characters long");
    }
    if (this.name.length > 50) {
      throw new Error("Tag name cannot exceed 50 characters");
    }
    if (!this.slug) {
      throw new Error("Tag slug is required");
    }
    if (this.description && this.description.length > 500) {
      throw new Error("Tag description cannot exceed 500 characters");
    }
    if (this.usageCount < 0) {
      this.usageCount = 0; // Automatically correct negative usage counts
    }
  }

  /**
   * Generate a URL-friendly slug from the tag name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove non-word chars
      .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and hyphens with a single hyphen
      .replace(/^-+|-+$/g, ""); // Trim hyphens from both ends
  }

  /**
   * Increment usage count
   */
  incrementUsage(count: number = 1): void {
    this.usageCount += count;
    this.updatedAt = new Date();
  }

  /**
   * Decrement usage count
   */
  decrementUsage(count: number = 1): void {
    this.usageCount = Math.max(0, this.usageCount - count);
    this.updatedAt = new Date();
  }

  /**
   * Update tag name and regenerate slug
   */
  updateName(name: string): void {
    this.name = name;
    this.slug = this.generateSlug(name);
    this.updatedAt = new Date();
  }

  /**
   * Set tag category
   */
  setCategory(category: string): void {
    this.category = category;
    this.updatedAt = new Date();
  }

  /**
   * Set description for the tag
   */
  setDescription(description: string | null): void {
    this.description = description;
    this.updatedAt = new Date();
  }

  /**
   * Set official status for the tag
   */
  setOfficial(isOfficial: boolean): void {
    this.isOfficial = isOfficial;
    this.updatedAt = new Date();
  }

  /**
   * Set parent tag ID for hierarchical tagging
   */
  setParentTag(parentTagId: string | null): void {
    this.parentTagId = parentTagId;
    this.updatedAt = new Date();
  }

  /**
   * Check if tag is a parent tag
   */
  isParentTag(): boolean {
    return this.parentTagId === null;
  }

  /**
   * Check if tag is a child tag
   */
  isChildTag(): boolean {
    return this.parentTagId !== null;
  }
}
