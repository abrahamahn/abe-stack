// main/apps/web/src/features/media/index.ts
/**
 * Media Feature
 *
 * Media upload and management components.
 */

// API
export { createMediaApi } from './api';
export type {
  MediaApi,
  MediaApiConfig,
  MediaMetadata,
  MediaStatusResponse,
  MediaUploadResponse,
} from './api';

// Hooks
export { useDeleteMedia, useMedia, useMediaStatus, useUploadMedia } from './hooks';
export type {
  UseDeleteMediaResult,
  UseMediaOptions,
  UseMediaResult,
  UseMediaStatusOptions,
  UseMediaStatusResult,
  UseUploadMediaResult,
} from './hooks';

// Components
export { MediaGallery, MediaStatusIndicator, MediaUpload } from './components';
export type { MediaGalleryProps, MediaStatusIndicatorProps, MediaUploadProps } from './components';

// Pages
export { MediaLibraryPage } from './pages';
export type { MediaLibraryPageProps } from './pages';
