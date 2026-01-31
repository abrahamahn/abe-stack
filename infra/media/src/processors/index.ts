// infra/media/src/processors/index.ts
/**
 * Media Processors
 *
 * File type-specific processing implementations for audio, image, and video.
 */

export { AudioProcessor, type AudioProcessingOptions } from './audio';
export { ImageProcessor, type ImageProcessingOptions } from './image';
export { VideoProcessor, type VideoProcessingOptions } from './video';
