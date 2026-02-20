// main/server/system/src/scaling/index.ts
/**
 * Scaling & Horizontal Infrastructure
 *
 * Provides instance identity and graceful shutdown for horizontally-scaled
 * deployments. Each process gets a unique ID and clean shutdown behavior.
 *
 * @module @bslt/server-system/scaling
 */

// Instance identity
export { getInstanceId, getInstanceMetadata, type InstanceMetadata } from './instance';

// Graceful shutdown
export {
  registerGracefulShutdown,
  type CloseableResource,
  type GracefulShutdownOptions,
  type ShutdownHandle,
  type ShutdownLogger,
  type ShutdownMetrics,
} from './graceful.shutdown';
