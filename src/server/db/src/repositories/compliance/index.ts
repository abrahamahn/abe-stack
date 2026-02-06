// backend/db/src/repositories/compliance/index.ts
/**
 * Compliance Repositories Barrel
 */

// Legal Documents
export { createLegalDocumentRepository, type LegalDocumentRepository } from './legal-documents';

// User Agreements
export { createUserAgreementRepository, type UserAgreementRepository } from './user-agreements';

// Consent Logs
export { createConsentLogRepository, type ConsentLogRepository } from './consent-logs';
