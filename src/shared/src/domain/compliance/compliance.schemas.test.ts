// src/shared/src/domain/compliance/compliance.schemas.test.ts

/**
 * @file Compliance Schemas Unit Tests
 * @description Comprehensive tests for legal documents, user agreements, and consent log schemas.
 * @module Domain/Compliance/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  consentLogSchema,
  createConsentLogSchema,
  createLegalDocumentSchema,
  createUserAgreementSchema,
  legalDocumentSchema,
  updateLegalDocumentSchema,
  userAgreementSchema,
} from './compliance.schemas';

import type { ConsentLogId, LegalDocumentId, UserAgreementId, UserId } from '../../types/ids';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const VALID_USER_ID = '00000000-0000-0000-0000-000000000001' as UserId;
const VALID_LEGAL_DOC_ID = '00000000-0000-0000-0000-000000000002' as LegalDocumentId;
const VALID_USER_AGREEMENT_ID = '00000000-0000-0000-0000-000000000003' as UserAgreementId;
const VALID_CONSENT_LOG_ID = '00000000-0000-0000-0000-000000000004' as ConsentLogId;

const VALID_DATE_ISO = '2024-01-01T00:00:00Z';
const VALID_IP_ADDRESS = '192.168.1.1';
const VALID_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ============================================================================
// Legal Document Schemas
// ============================================================================

describe('legalDocumentSchema', () => {
  describe('when given valid input', () => {
    it('should parse complete legal document with all required fields', () => {
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        version: 1,
        effectiveAt: VALID_DATE_ISO,
        createdAt: VALID_DATE_ISO,
      };

      const result = legalDocumentSchema.parse(input);

      expect(result).toEqual({
        id: VALID_LEGAL_DOC_ID,
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        version: 1,
        effectiveAt: new Date(VALID_DATE_ISO),
        createdAt: new Date(VALID_DATE_ISO),
      });
    });

    it('should parse dates from Date objects', () => {
      const dateObj = new Date('2024-06-15T10:30:00Z');
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'privacy_policy',
        title: 'Privacy Policy',
        content: 'Privacy content...',
        version: 2,
        effectiveAt: dateObj,
        createdAt: dateObj,
      };

      const result = legalDocumentSchema.parse(input);

      expect(result.effectiveAt).toEqual(dateObj);
      expect(result.createdAt).toEqual(dateObj);
    });

    it('should parse dates from timestamps', () => {
      const timestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'cookie_policy',
        title: 'Cookie Policy',
        content: 'Cookie content...',
        version: 1,
        effectiveAt: timestamp,
        createdAt: timestamp,
      };

      const result = legalDocumentSchema.parse(input);

      expect(result.effectiveAt).toEqual(new Date(timestamp));
      expect(result.createdAt).toEqual(new Date(timestamp));
    });
  });

  describe('when given invalid input', () => {
    it('should reject non-integer version', () => {
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'dpa',
        title: 'Data Processing Agreement',
        content: 'DPA content...',
        version: 1.5,
        effectiveAt: VALID_DATE_ISO,
        createdAt: VALID_DATE_ISO,
      };

      expect(() => legalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject version less than 1', () => {
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        version: 0,
        effectiveAt: VALID_DATE_ISO,
        createdAt: VALID_DATE_ISO,
      };

      expect(() => legalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject empty type string', () => {
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: '',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        version: 1,
        effectiveAt: VALID_DATE_ISO,
        createdAt: VALID_DATE_ISO,
      };

      expect(() => legalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject empty title string', () => {
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'terms_of_service',
        title: '',
        content: 'Legal terms content...',
        version: 1,
        effectiveAt: VALID_DATE_ISO,
        createdAt: VALID_DATE_ISO,
      };

      expect(() => legalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject empty content string', () => {
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: '',
        version: 1,
        effectiveAt: VALID_DATE_ISO,
        createdAt: VALID_DATE_ISO,
      };

      expect(() => legalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject missing required fields', () => {
      const input = {
        id: VALID_LEGAL_DOC_ID,
        type: 'terms_of_service',
      };

      expect(() => legalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject invalid UUID for id', () => {
      const input = {
        id: 'not-a-uuid',
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        version: 1,
        effectiveAt: VALID_DATE_ISO,
        createdAt: VALID_DATE_ISO,
      };

      expect(() => legalDocumentSchema.parse(input)).toThrow();
    });
  });
});

describe('createLegalDocumentSchema', () => {
  describe('when given valid input', () => {
    it('should parse input without version (optional field)', () => {
      const input = {
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        effectiveAt: VALID_DATE_ISO,
      };

      const result = createLegalDocumentSchema.parse(input);

      expect(result).toEqual({
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        version: undefined,
        effectiveAt: new Date(VALID_DATE_ISO),
      });
    });

    it('should parse input with version provided', () => {
      const input = {
        type: 'privacy_policy',
        title: 'Privacy Policy',
        content: 'Privacy content...',
        version: 3,
        effectiveAt: VALID_DATE_ISO,
      };

      const result = createLegalDocumentSchema.parse(input);

      expect(result.version).toBe(3);
    });

    it('should parse with Date object for effectiveAt', () => {
      const dateObj = new Date('2024-12-31T23:59:59Z');
      const input = {
        type: 'cookie_policy',
        title: 'Cookie Policy',
        content: 'Cookie content...',
        effectiveAt: dateObj,
      };

      const result = createLegalDocumentSchema.parse(input);

      expect(result.effectiveAt).toEqual(dateObj);
    });
  });

  describe('when given invalid input', () => {
    it('should reject non-integer version when provided', () => {
      const input = {
        type: 'dpa',
        title: 'Data Processing Agreement',
        content: 'DPA content...',
        version: 2.7,
        effectiveAt: VALID_DATE_ISO,
      };

      expect(() => createLegalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject version less than 1 when provided', () => {
      const input = {
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        version: -1,
        effectiveAt: VALID_DATE_ISO,
      };

      expect(() => createLegalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject empty required fields', () => {
      const input = {
        type: '',
        title: 'Terms of Service',
        content: 'Legal terms content...',
        effectiveAt: VALID_DATE_ISO,
      };

      expect(() => createLegalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject missing effectiveAt', () => {
      const input = {
        type: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Legal terms content...',
      };

      expect(() => createLegalDocumentSchema.parse(input)).toThrow();
    });
  });
});

describe('updateLegalDocumentSchema', () => {
  describe('when given valid input', () => {
    it('should accept all-undefined (empty update)', () => {
      const input = {};

      const result = updateLegalDocumentSchema.parse(input);

      expect(result).toEqual({
        title: undefined,
        content: undefined,
        effectiveAt: undefined,
      });
    });

    it('should accept partial update with only title', () => {
      const input = {
        title: 'Updated Terms of Service',
      };

      const result = updateLegalDocumentSchema.parse(input);

      expect(result.title).toBe('Updated Terms of Service');
      expect(result.content).toBeUndefined();
      expect(result.effectiveAt).toBeUndefined();
    });

    it('should accept partial update with only content', () => {
      const input = {
        content: 'Updated legal content...',
      };

      const result = updateLegalDocumentSchema.parse(input);

      expect(result.content).toBe('Updated legal content...');
      expect(result.title).toBeUndefined();
      expect(result.effectiveAt).toBeUndefined();
    });

    it('should accept partial update with only effectiveAt', () => {
      const newDate = '2025-06-01T00:00:00Z';
      const input = {
        effectiveAt: newDate,
      };

      const result = updateLegalDocumentSchema.parse(input);

      expect(result.effectiveAt).toEqual(new Date(newDate));
      expect(result.title).toBeUndefined();
      expect(result.content).toBeUndefined();
    });

    it('should accept multiple fields in update', () => {
      const input = {
        title: 'New Title',
        content: 'New content...',
        effectiveAt: VALID_DATE_ISO,
      };

      const result = updateLegalDocumentSchema.parse(input);

      expect(result.title).toBe('New Title');
      expect(result.content).toBe('New content...');
      expect(result.effectiveAt).toEqual(new Date(VALID_DATE_ISO));
    });
  });

  describe('when given invalid input', () => {
    it('should reject empty title when provided', () => {
      const input = {
        title: '',
      };

      expect(() => updateLegalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject empty content when provided', () => {
      const input = {
        content: '',
      };

      expect(() => updateLegalDocumentSchema.parse(input)).toThrow();
    });

    it('should reject invalid date for effectiveAt', () => {
      const input = {
        effectiveAt: 'not-a-date',
      };

      expect(() => updateLegalDocumentSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// User Agreement Schemas
// ============================================================================

describe('userAgreementSchema', () => {
  describe('when given valid input', () => {
    it('should parse complete user agreement with ipAddress', () => {
      const input = {
        id: VALID_USER_AGREEMENT_ID,
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        agreedAt: VALID_DATE_ISO,
        ipAddress: VALID_IP_ADDRESS,
      };

      const result = userAgreementSchema.parse(input);

      expect(result).toEqual({
        id: VALID_USER_AGREEMENT_ID,
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        agreedAt: new Date(VALID_DATE_ISO),
        ipAddress: VALID_IP_ADDRESS,
      });
    });

    it('should parse with null ipAddress', () => {
      const input = {
        id: VALID_USER_AGREEMENT_ID,
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        agreedAt: VALID_DATE_ISO,
        ipAddress: null,
      };

      const result = userAgreementSchema.parse(input);

      expect(result.ipAddress).toBeNull();
    });

    it('should parse agreedAt from Date object', () => {
      const dateObj = new Date('2024-03-15T14:30:00Z');
      const input = {
        id: VALID_USER_AGREEMENT_ID,
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        agreedAt: dateObj,
        ipAddress: VALID_IP_ADDRESS,
      };

      const result = userAgreementSchema.parse(input);

      expect(result.agreedAt).toEqual(dateObj);
    });
  });

  describe('when given invalid input', () => {
    it('should reject invalid userId UUID', () => {
      const input = {
        id: VALID_USER_AGREEMENT_ID,
        userId: 'invalid-uuid',
        documentId: VALID_LEGAL_DOC_ID,
        agreedAt: VALID_DATE_ISO,
        ipAddress: VALID_IP_ADDRESS,
      };

      expect(() => userAgreementSchema.parse(input)).toThrow();
    });

    it('should reject invalid documentId UUID', () => {
      const input = {
        id: VALID_USER_AGREEMENT_ID,
        userId: VALID_USER_ID,
        documentId: 'invalid-uuid',
        agreedAt: VALID_DATE_ISO,
        ipAddress: VALID_IP_ADDRESS,
      };

      expect(() => userAgreementSchema.parse(input)).toThrow();
    });

    it('should reject missing required fields', () => {
      const input = {
        id: VALID_USER_AGREEMENT_ID,
      };

      expect(() => userAgreementSchema.parse(input)).toThrow();
    });
  });
});

describe('createUserAgreementSchema', () => {
  describe('when given valid input', () => {
    it('should parse with ipAddress as string', () => {
      const input = {
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        ipAddress: VALID_IP_ADDRESS,
      };

      const result = createUserAgreementSchema.parse(input);

      expect(result).toEqual({
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        ipAddress: VALID_IP_ADDRESS,
      });
    });

    it('should parse with ipAddress as null', () => {
      const input = {
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        ipAddress: null,
      };

      const result = createUserAgreementSchema.parse(input);

      expect(result.ipAddress).toBeNull();
    });

    it('should parse with ipAddress as undefined (omitted)', () => {
      const input = {
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
        ipAddress: undefined,
      };

      const result = createUserAgreementSchema.parse(input);

      expect(result.ipAddress).toBeUndefined();
    });

    it('should parse without ipAddress key present', () => {
      const input = {
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
      };

      const result = createUserAgreementSchema.parse(input);

      expect(result.ipAddress).toBeUndefined();
    });
  });

  describe('when given invalid input', () => {
    it('should reject invalid userId', () => {
      const input = {
        userId: 'not-a-uuid',
        documentId: VALID_LEGAL_DOC_ID,
        ipAddress: VALID_IP_ADDRESS,
      };

      expect(() => createUserAgreementSchema.parse(input)).toThrow();
    });

    it('should reject missing required userId', () => {
      const input = {
        documentId: VALID_LEGAL_DOC_ID,
        ipAddress: VALID_IP_ADDRESS,
      };

      expect(() => createUserAgreementSchema.parse(input)).toThrow();
    });

    it('should reject missing required documentId', () => {
      const input = {
        userId: VALID_USER_ID,
        ipAddress: VALID_IP_ADDRESS,
      };

      expect(() => createUserAgreementSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// Consent Log Schemas
// ============================================================================

describe('consentLogSchema', () => {
  describe('when given valid input', () => {
    it('should parse complete consent log with all fields', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: true,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { source: 'web', version: '1.0' },
        createdAt: VALID_DATE_ISO,
      };

      const result = consentLogSchema.parse(input);

      expect(result).toEqual({
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: true,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { source: 'web', version: '1.0' },
        createdAt: new Date(VALID_DATE_ISO),
      });
    });

    it('should parse with granted false', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'analytics',
        granted: false,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      const result = consentLogSchema.parse(input);

      expect(result.granted).toBe(false);
    });

    it('should parse with null ipAddress and userAgent', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'third_party_sharing',
        granted: true,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      const result = consentLogSchema.parse(input);

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });

    it('should parse with empty metadata object', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'profiling',
        granted: true,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      const result = consentLogSchema.parse(input);

      expect(result.metadata).toEqual({});
    });
  });

  describe('when given invalid input', () => {
    it('should reject non-record metadata', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: true,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: 'not-a-record',
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentLogSchema.parse(input)).toThrow();
    });

    it('should reject array as metadata', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'analytics',
        granted: true,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: ['array', 'values'],
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentLogSchema.parse(input)).toThrow();
    });

    it('should reject empty consentType string', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: '',
        granted: true,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentLogSchema.parse(input)).toThrow();
    });

    it('should reject non-boolean granted', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: 'yes',
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentLogSchema.parse(input)).toThrow();
    });

    it('should reject missing required fields', () => {
      const input = {
        id: VALID_CONSENT_LOG_ID,
        userId: VALID_USER_ID,
      };

      expect(() => consentLogSchema.parse(input)).toThrow();
    });
  });
});

describe('createConsentLogSchema', () => {
  describe('when given valid input', () => {
    it('should parse minimal required input', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: true,
      };

      const result = createConsentLogSchema.parse(input);

      expect(result).toEqual({
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: true,
        ipAddress: undefined,
        userAgent: undefined,
        metadata: undefined,
      });
    });

    it('should parse with all optional fields provided', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'analytics',
        granted: false,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { campaign: 'summer2024' },
      };

      const result = createConsentLogSchema.parse(input);

      expect(result).toEqual({
        userId: VALID_USER_ID,
        consentType: 'analytics',
        granted: false,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { campaign: 'summer2024' },
      });
    });

    it('should parse with ipAddress null', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'third_party_sharing',
        granted: true,
        ipAddress: null,
      };

      const result = createConsentLogSchema.parse(input);

      expect(result.ipAddress).toBeNull();
    });

    it('should parse with userAgent null', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'profiling',
        granted: false,
        userAgent: null,
      };

      const result = createConsentLogSchema.parse(input);

      expect(result.userAgent).toBeNull();
    });

    it('should parse with empty metadata object', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: true,
        metadata: {},
      };

      const result = createConsentLogSchema.parse(input);

      expect(result.metadata).toEqual({});
    });
  });

  describe('when given invalid input', () => {
    it('should reject missing required userId', () => {
      const input = {
        consentType: 'marketing_email',
        granted: true,
      };

      expect(() => createConsentLogSchema.parse(input)).toThrow();
    });

    it('should reject missing required consentType', () => {
      const input = {
        userId: VALID_USER_ID,
        granted: true,
      };

      expect(() => createConsentLogSchema.parse(input)).toThrow();
    });

    it('should reject missing required granted', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
      };

      expect(() => createConsentLogSchema.parse(input)).toThrow();
    });

    it('should reject empty consentType', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: '',
        granted: true,
      };

      expect(() => createConsentLogSchema.parse(input)).toThrow();
    });

    it('should reject invalid metadata type', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'analytics',
        granted: true,
        metadata: 'invalid',
      };

      expect(() => createConsentLogSchema.parse(input)).toThrow();
    });

    it('should reject array as metadata', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'analytics',
        granted: true,
        metadata: [{ key: 'value' }],
      };

      expect(() => createConsentLogSchema.parse(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle granted false with all optional fields', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'marketing_email',
        granted: false,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { reason: 'user_declined' },
      };

      const result = createConsentLogSchema.parse(input);

      expect(result.granted).toBe(false);
      expect(result.metadata).toEqual({ reason: 'user_declined' });
    });

    it('should handle complex metadata structures', () => {
      const input = {
        userId: VALID_USER_ID,
        consentType: 'profiling',
        granted: true,
        metadata: {
          source: 'web',
          page: '/settings',
          timestamp: 1704067200000,
          userPreferences: {
            language: 'en',
            region: 'US',
          },
        },
      };

      const result = createConsentLogSchema.parse(input);

      expect(result.metadata).toEqual({
        source: 'web',
        page: '/settings',
        timestamp: 1704067200000,
        userPreferences: {
          language: 'en',
          region: 'US',
        },
      });
    });
  });
});
