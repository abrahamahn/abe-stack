// src/server/core/src/legal/index.ts
/**
 * Legal Package
 *
 * Business logic, HTTP handlers, and route definitions for
 * legal document management and user agreement tracking.
 */

// Service
export { getCurrentLegalDocuments, getUserAgreements, publishLegalDocument } from './service';

// Handlers
export { handleGetCurrentLegal, handleGetUserAgreements, handlePublishLegal } from './handlers';

// Routes
export { legalRoutes } from './routes';

// Types
export type { LegalAppContext, LegalRequest } from './types';
