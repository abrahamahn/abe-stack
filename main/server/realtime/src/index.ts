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
 * @module @bslt/realtime
 */

// Routes (for auto-registration)
export { realtimeRoutes } from './routes';

// Handlers
export {
  handleGetRecords,
  handleWrite, RecordNotFoundError,
  VersionConflictError
} from './handlers';

// Service — server-specific (DB operations, table registry)
export {
  isTableAllowed,
  loadRecords,
  registerRealtimeTable,
  resolveTableName,
  saveRecords
} from './service';

// Service — re-exported from @bslt/shared (pure operation logic)
export {
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  getOperationPointers,
  isFieldMutable, PROTECTED_FIELDS,
  REALTIME_ERRORS, type ApplyOperationsResult,
  type VersionConflict
} from '@bslt/shared';

// WebSocket
export {
  getWebSocketStats,
  registerWebSocket,
  type PubSubWebSocket,
  type SubscriptionKey,
  type TokenVerifier,
  type WebSocketRegistrationOptions,
  type WebSocketStats
} from '@bslt/websocket';

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
  WriteResult
} from './types';

