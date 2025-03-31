// index.ts - Export all storage components

// Core interfaces and types
export * from "./StorageTypes";
export * from "./IStorageProvider";
export * from "./StorageService";
export * from "./ContentTypes";

// Implementations
export { LocalStorageProvider } from "./LocalStorageProvider";
export type { StorageConfig } from "./LocalStorageProvider";
export { FileUtils } from "./FileUtils";
export { MediaProcessor } from "./processor/MediaProcessor";

// Note: These processors are exported for convenience but defined elsewhere
export { ImageProcessor } from "@/server/infrastructure/processor/ImageProcessor";
export type {
  ImageOptions,
  ImageMetadata,
} from "@/server/infrastructure/processor/ImageProcessor";
export type {
  MediaOptions,
  MediaProcessingResult,
} from "@/server/infrastructure/processor/MediaProcessor";
export { StreamProcessor } from "@/server/infrastructure/processor/StreamProcessor";
export type { StreamStats } from "@/server/infrastructure/processor/StreamProcessor";
