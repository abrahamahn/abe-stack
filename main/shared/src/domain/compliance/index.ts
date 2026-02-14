// main/shared/src/domain/compliance/index.ts

export { getEffectiveConsent, isConsentGranted, needsReacceptance } from './compliance.logic';

export {
  CONSENT_TYPES,
  consentLogSchema,
  createConsentLogSchema,
  createDataExportRequestSchema,
  createLegalDocumentSchema,
  createUserAgreementSchema,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  dataExportRequestSchema,
  DOCUMENT_TYPES,
  legalDocumentSchema,
  updateConsentPreferencesRequestSchema,
  updateLegalDocumentSchema,
  userAgreementSchema,
  type ConsentLog,
  type ConsentType,
  type CreateConsentLog,
  type CreateDataExportRequest,
  type CreateLegalDocument,
  type CreateUserAgreement,
  type DataExportRequest,
  type DataExportStatus,
  type DataExportType,
  type DocumentType,
  type LegalDocument,
  type UpdateConsentPreferencesRequest,
  type UpdateLegalDocument,
  type UserAgreement,
} from './compliance.schemas';

export {
  calculateHardDeleteDate,
  isWithinGracePeriod,
  isSoftDeleted,
  DEFAULT_GRACE_PERIOD_DAYS,
} from './deletion.logic';

export {
  DEFAULT_DELETION_CONFIG,
  DELETION_STATES,
  deletionRequestSchema,
  type DeletionConfig,
  type DeletionJob,
  type DeletionRequest,
  type DeletionServiceContract,
  type DeletionState,
  type SoftDeletable,
} from './deletion.schemas';
