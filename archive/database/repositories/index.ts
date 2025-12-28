// Base repository
export { BaseRepository } from "./BaseRepository";

// Export all repositories from subdirectories

// Auth repositories
export * from "./auth";

// Social repositories
export * from "./social";

// Media repositories
export * from "./media";

// Analytics repositories
export * from "./analytics";

// Community repositories
export * from "./community";

// Discovery repositories
export * from "./discovery";

// Moderation repositories
export * from "./moderation";

// Messaging repositories
export * from "./messaging";

// These interface exports are already included in the subdirectory exports above
// Keeping them commented as documentation
// export { type NotificationRepository } from "./NotificationRepository";
// export {
//   type ChatRoomRepository,
//   type ChatMessageRepository,
// } from "./ChatRoomRepository";
// export { type ConnectionRepository } from "./UserConnectionRepository";
