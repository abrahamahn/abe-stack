// main/shared/src/core/compliance/index.ts

/**
 * @file Compliance Module Index
 * @description Barrel exports for compliance domain: legal documents, consent, deletion.
 * @module Core/Compliance
 */

// --- compliance.logic ---
export { getEffectiveConsent, isConsentGranted, needsReacceptance } from './compliance.logic';

// --- compliance.schemas ---
export {
  complianceActionResponseSchema,
  CONSENT_TYPES,
  consentLogSchema,
  consentPreferencesResponseSchema,
  createConsentLogSchema,
  createDataExportRequestSchema,
  createLegalDocumentSchema,
  createUserAgreementSchema,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  dataExportRequestedResponseSchema,
  dataExportRequestSchema,
  DOCUMENT_TYPES,
  legalDocumentSchema,
  updateConsentPreferencesRequestSchema,
  updateLegalDocumentSchema,
  userAgreementSchema,
} from './compliance.schemas';

export type {
  ComplianceActionResponse,
  ConsentLog,
  ConsentPreferencesResponse,
  ConsentType,
  CreateConsentLog,
  CreateDataExportRequest,
  CreateLegalDocument,
  CreateUserAgreement,
  DataExportRequest,
  DataExportRequestedResponse,
  DataExportStatus,
  DataExportType,
  DocumentType,
  LegalDocument,
  UpdateConsentPreferencesRequest,
  UpdateLegalDocument,
  UserAgreement,
} from './compliance.schemas';

// --- deletion.logic ---
export {
  calculateHardDeleteDate,
  DEFAULT_GRACE_PERIOD_DAYS,
  isSoftDeleted,
  isWithinGracePeriod,
} from './deletion.logic';

// --- deletion.schemas ---
export {
  DEFAULT_DELETION_CONFIG,
  DELETION_STATES,
  deletionRequestSchema,
} from './deletion.schemas';

export type {
  DeletionConfig,
  DeletionJob,
  DeletionRequest,
  DeletionServiceContract,
  DeletionState,
  SoftDeletable,
} from './deletion.schemas';
