// main/server/realtime/src/index.ts
/**
 * Realtime Package
 *
 * Provides real-time record operations with optimistic locking and
 * WebSocket-based subscription support.
 *
 * Extracted from:
 * - apps/server/src/modules/realtime/ (handlers, routes, service, types)
 * - apps/server/src/infrastructure/messaging/websocket/ (lifecycle, stats)
 *
 * @module @abe-stack/realtime
 */

// Routes (for auto-registration)
export { realtimeRoutes } from './routes';

// Handlers
export {
  RecordNotFoundError,
  VersionConflictError,
  handleGetRecords,
  handleWrite,
} from './handlers';

// Service — server-specific (DB operations, table registry)
export {
  isTableAllowed,
  loadRecords,
  registerRealtimeTable,
  resolveTableName,
  saveRecords,
} from './service';

// Service — re-exported from @abe-stack/shared (pure operation logic)
export {
  PROTECTED_FIELDS,
  REALTIME_ERRORS,
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  getOperationPointers,
  isFieldMutable,
  type ApplyOperationsResult,
  type VersionConflict,
} from '@abe-stack/shared';

// WebSocket
export {
  getWebSocketStats,
  registerWebSocket,
  type PubSubWebSocket,
  type SubscriptionKey,
  type TokenVerifier,
  type WebSocketRegistrationOptions,
  type WebSocketStats,
} from '@abe-stack/websocket';

// Types — server-specific
export type {
  AllowedTable,
  ConflictResult,
  GetRecordsResult,
  LoadRecordsOptions,
  PermissionContext,
  PermissionResult,
  RealtimeLogger,
  RealtimeModuleDeps,
  RealtimeRecord,
  RealtimeRequest,
  TableConfig,
  WriteResult,
} from './types';
