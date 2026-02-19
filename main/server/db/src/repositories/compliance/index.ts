// main/server/db/src/repositories/compliance/index.ts
/**
 * Compliance Repositories Barrel
 */

// Legal Documents
export { createLegalDocumentRepository, type LegalDocumentRepository } from './legal-documents';

// Consent Records (replaces UserAgreementRepository + ConsentLogRepository)
export { createConsentRecordRepository, type ConsentRecordRepository } from './consent-records';

// Data Export Requests
export {
  createDataExportRequestRepository,
  type DataExportRequestRepository,
} from './data-export-requests';
