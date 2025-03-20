/**
 * Shared enum for entity types across the application
 */
export enum EntityType {
  USER = "user",
  POST = "post",
  COMMENT = "comment",
  MEDIA = "media",
  GROUP = "group",
  MESSAGE = "message",
}

/**
 * Shared enum for content status across the application
 */
export enum ContentStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
  DELETED = "deleted",
  PENDING_REVIEW = "pending_review",
}
