// apps/server/src/modules/realtime/index.ts
/**
 * Realtime Module
 *
 * REST API endpoints for realtime record operations.
 * Supports optimistic locking with version-based conflict detection.
 */

// Handlers
export {
  handleGetRecords,
  handleWrite,
  RecordNotFoundError,
  VersionConflictError,
  type ConflictResult,
  type GetRecordsResult,
  type WriteResult,
} from './handlers';

// Routes
export { realtimeRoutes } from './routes';

// Service
export {
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  getOperationPointers,
  isFieldMutable,
  isTableAllowed,
  loadRecords,
  registerRealtimeTable,
  saveRecords,
} from './service';

// Types
export type {
  AllowedTable,
  ApplyOperationsResult,
  LoadRecordsOptions,
  PermissionContext,
  PermissionResult,
  RealtimeRecord,
  TableConfig,
  VersionConflict,
} from './types';
