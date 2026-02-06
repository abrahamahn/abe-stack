// packages/shared/src/domain/compliance/index.ts

export { getEffectiveConsent, isConsentGranted, needsReacceptance } from './compliance.logic';

export {
  CONSENT_TYPES,
  consentLogSchema,
  createConsentLogSchema,
  createLegalDocumentSchema,
  createUserAgreementSchema,
  DOCUMENT_TYPES,
  legalDocumentSchema,
  updateLegalDocumentSchema,
  userAgreementSchema,
  type ConsentLog,
  type ConsentType,
  type CreateConsentLog,
  type CreateLegalDocument,
  type CreateUserAgreement,
  type DocumentType,
  type LegalDocument,
  type UpdateLegalDocument,
  type UserAgreement,
} from './compliance.schemas';
