// src/server/realtime/src/records/index.ts
/**
 * Record Management
 *
 * Re-exports record-related functions from the service module.
 * This module provides a logical grouping for record CRUD operations.
 */

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
} from '../service';
