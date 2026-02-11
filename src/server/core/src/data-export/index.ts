// src/server/core/src/data-export/index.ts
/**
 * Data Export Package
 *
 * Business logic, HTTP handlers, and route definitions for
 * GDPR data export request management and processing.
 */

// Service
export {
  requestDataExport,
  getExportStatus,
  processDataExport,
  DataExportAlreadyPendingError,
  DataExportNotFoundError,
} from './service';

// Handlers
export { handleRequestExport, handleGetExportStatus } from './handlers';

// Routes
export { dataExportRoutes } from './routes';

// Types
export type { DataExportAppContext, DataExportRequest, UserDataExport } from './types';
