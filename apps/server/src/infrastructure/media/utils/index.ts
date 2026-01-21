// apps/server/src/infrastructure/media/utils/index.ts
/**
 * Media Utilities
 *
 * File detection, security scanning, and streaming utilities.
 */

export {
  detectFileType,
  detectFileTypeFromPath,
  detectFileTypeFromFile,
  isAllowedFileType,
  getExtensionFromMime,
  type FileTypeResult,
} from './file-type';

export {
  MediaSecurityScanner,
  type SecurityScanResult,
  type ContentModerationResult,
} from './security';

export { StreamingMediaProcessor, type StreamingOptions } from './streaming';
