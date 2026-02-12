// src/apps/web/src/features/media/index.ts
/**
 * Media Feature
 *
 * Media upload and management components.
 */

// API
export { createMediaApi } from './api/mediaApi';
export type {
  MediaApi,
  MediaApiConfig,
  MediaMetadata,
  MediaStatusResponse,
  MediaUploadResponse,
} from './api/mediaApi';

// Hooks
export {
  useDeleteMedia,
  useMedia,
  useMediaStatus,
  useUploadMedia,
  type UseDeleteMediaResult,
  type UseMediaOptions,
  type UseMediaResult,
  type UseMediaStatusOptions,
  type UseMediaStatusResult,
  type UseUploadMediaResult,
} from './hooks/useMedia';

// Components
export { MediaGallery, type MediaGalleryProps } from './components/MediaGallery';
export {
  MediaStatusIndicator,
  type MediaStatusIndicatorProps,
} from './components/MediaStatusIndicator';
export { MediaUpload, type MediaUploadProps } from './components/MediaUpload';
