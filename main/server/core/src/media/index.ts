// main/server/core/src/media/index.ts
/**
 * Media Package
 *
 * HTTP endpoints for media upload, retrieval, deletion, and
 * processing status. Integrates with the storage layer and
 * optional media processing queue.
 */

// Service
export { deleteMedia, getMediaMetadata, getProcessingStatus, uploadMedia } from './service';

// Handlers
export {
  handleDeleteMedia,
  handleGetMedia,
  handleGetMediaStatus,
  handleUploadMedia,
} from './handlers';

// Routes
export { mediaRoutes } from './routes';

// Types
export type {
  MediaAppContext,
  MediaBaseRouteDefinition,
  MediaHttpMethod,
  MediaMetadataResponse,
  MediaProcessingQueuePort,
  MediaRepositories,
  MediaRequest,
  MediaRouteMap,
  MediaRouteResult,
  MediaStorageProvider,
  MediaUploadInput,
  MediaUploadResult,
  ProcessingStatus,
  ProcessingStatusResponse,
} from './types';
