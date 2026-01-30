// packages/realtime/src/index.ts
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
  handleGetRecords,
  handleWrite,
  RecordNotFoundError,
  VersionConflictError,
} from './handlers';

// Service (business logic)
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

// WebSocket
export {
  getWebSocketStats,
  registerWebSocket,
  type PubSubWebSocket,
  type SubscriptionKey,
  type TokenVerifier,
  type WebSocketRegistrationOptions,
  type WebSocketStats,
} from './websocket';

// Types
export { ERROR_MESSAGES } from './types';

export type {
  AllowedTable,
  ApplyOperationsResult,
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
  VersionConflict,
  WriteResult,
} from './types';
