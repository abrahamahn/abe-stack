// main/shared/src/core/compliance/compliance.schemas.test.ts

/**
 * @file Compliance Schemas Unit Tests
 * @description Comprehensive tests for legal documents, consent records, and data export schemas.
 * @module Core/Compliance/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  complianceActionResponseSchema,
  consentPreferencesResponseSchema,
  consentRecordSchema,
  createConsentRecordSchema,
  createLegalDocumentSchema,
  dataExportRequestedResponseSchema,
  legalDocumentSchema,
  updateLegalDocumentSchema,
} from './compliance.schemas';

import type {
  ComplianceActionResponse,
  ConsentPreferencesResponse,
  DataExportRequestedResponse,
} from './compliance.schemas';
import type { ConsentRecordId, LegalDocumentId, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const VALID_USER_ID = '12345678-1234-4abc-8abc-123456789001' as UserId;
const VALID_LEGAL_DOC_ID = '12345678-1234-4abc-8abc-123456789002' as LegalDocumentId;
const VALID_CONSENT_RECORD_ID = '12345678-1234-4abc-8abc-123456789003' as ConsentRecordId;

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
// Consent Record Schemas (unified replacement for UserAgreement + ConsentLog)
// ============================================================================

describe('consentRecordSchema', () => {
  describe('legal_document records', () => {
    it('should parse a legal_document agreement record', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'legal_document',
        documentId: VALID_LEGAL_DOC_ID,
        consentType: null,
        granted: null,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      const result = consentRecordSchema.parse(input);

      expect(result.id).toBe(VALID_CONSENT_RECORD_ID);
      expect(result.userId).toBe(VALID_USER_ID);
      expect(result.recordType).toBe('legal_document');
      expect(result.documentId).toBe(VALID_LEGAL_DOC_ID);
      expect(result.consentType).toBeNull();
      expect(result.granted).toBeNull();
      expect(result.ipAddress).toBe(VALID_IP_ADDRESS);
      expect(result.createdAt).toEqual(new Date(VALID_DATE_ISO));
    });

    it('should parse with all nullable fields set to null', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'legal_document',
        documentId: VALID_LEGAL_DOC_ID,
        consentType: null,
        granted: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      const result = consentRecordSchema.parse(input);

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });
  });

  describe('consent_preference records', () => {
    it('should parse a consent_preference grant record', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        documentId: null,
        consentType: 'marketing_email',
        granted: true,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { source: 'settings-page' },
        createdAt: VALID_DATE_ISO,
      };

      const result = consentRecordSchema.parse(input);

      expect(result.recordType).toBe('consent_preference');
      expect(result.consentType).toBe('marketing_email');
      expect(result.granted).toBe(true);
      expect(result.documentId).toBeNull();
      expect(result.metadata).toEqual({ source: 'settings-page' });
    });

    it('should parse a consent_preference revocation (granted false)', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        documentId: null,
        consentType: 'analytics',
        granted: false,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      const result = consentRecordSchema.parse(input);

      expect(result.granted).toBe(false);
    });
  });

  describe('when given invalid input', () => {
    it('should reject invalid recordType', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'invalid_type',
        documentId: null,
        consentType: null,
        granted: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject missing recordType', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        documentId: null,
        consentType: null,
        granted: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject invalid userId UUID', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: 'not-a-uuid',
        recordType: 'legal_document',
        documentId: VALID_LEGAL_DOC_ID,
        consentType: null,
        granted: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject invalid documentId UUID when provided', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'legal_document',
        documentId: 'not-a-uuid',
        consentType: null,
        granted: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject non-boolean granted when provided', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        documentId: null,
        consentType: 'analytics',
        granted: 'yes',
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject non-record metadata', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        documentId: null,
        consentType: 'analytics',
        granted: true,
        ipAddress: null,
        userAgent: null,
        metadata: 'not-an-object',
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject array as metadata', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        documentId: null,
        consentType: 'analytics',
        granted: true,
        ipAddress: null,
        userAgent: null,
        metadata: ['invalid'],
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject empty consentType when non-null', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        documentId: null,
        consentType: '',
        granted: true,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: VALID_DATE_ISO,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });

    it('should reject missing required fields', () => {
      const input = {
        id: VALID_CONSENT_RECORD_ID,
        userId: VALID_USER_ID,
      };

      expect(() => consentRecordSchema.parse(input)).toThrow();
    });
  });
});

describe('createConsentRecordSchema', () => {
  describe('when given valid input', () => {
    it('should parse minimal input (userId + recordType only)', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'legal_document',
      };

      const result = createConsentRecordSchema.parse(input);

      expect(result.userId).toBe(VALID_USER_ID);
      expect(result.recordType).toBe('legal_document');
      expect(result.documentId).toBeUndefined();
      expect(result.consentType).toBeUndefined();
      expect(result.granted).toBeUndefined();
      expect(result.ipAddress).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should parse legal_document record with documentId', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'legal_document',
        documentId: VALID_LEGAL_DOC_ID,
        ipAddress: VALID_IP_ADDRESS,
      };

      const result = createConsentRecordSchema.parse(input);

      expect(result.documentId).toBe(VALID_LEGAL_DOC_ID);
      expect(result.ipAddress).toBe(VALID_IP_ADDRESS);
    });

    it('should parse consent_preference record with consentType and granted', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        consentType: 'analytics',
        granted: false,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { campaign: 'onboarding' },
      };

      const result = createConsentRecordSchema.parse(input);

      expect(result.consentType).toBe('analytics');
      expect(result.granted).toBe(false);
      expect(result.metadata).toEqual({ campaign: 'onboarding' });
    });

    it('should parse with documentId as null', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        documentId: null,
        consentType: 'marketing_email',
        granted: true,
      };

      const result = createConsentRecordSchema.parse(input);

      expect(result.documentId).toBeNull();
    });

    it('should parse with ipAddress as null', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'legal_document',
        ipAddress: null,
      };

      const result = createConsentRecordSchema.parse(input);

      expect(result.ipAddress).toBeNull();
    });

    it('should parse with empty metadata object', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        consentType: 'profiling',
        granted: true,
        metadata: {},
      };

      const result = createConsentRecordSchema.parse(input);

      expect(result.metadata).toEqual({});
    });
  });

  describe('when given invalid input', () => {
    it('should reject missing userId', () => {
      const input = {
        recordType: 'legal_document',
        documentId: VALID_LEGAL_DOC_ID,
      };

      expect(() => createConsentRecordSchema.parse(input)).toThrow();
    });

    it('should reject missing recordType', () => {
      const input = {
        userId: VALID_USER_ID,
        documentId: VALID_LEGAL_DOC_ID,
      };

      expect(() => createConsentRecordSchema.parse(input)).toThrow();
    });

    it('should reject invalid recordType value', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'user_agreement',
      };

      expect(() => createConsentRecordSchema.parse(input)).toThrow();
    });

    it('should reject invalid userId UUID', () => {
      const input = {
        userId: 'not-a-uuid',
        recordType: 'legal_document',
      };

      expect(() => createConsentRecordSchema.parse(input)).toThrow();
    });

    it('should reject invalid metadata type', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        consentType: 'analytics',
        granted: true,
        metadata: 'invalid',
      };

      expect(() => createConsentRecordSchema.parse(input)).toThrow();
    });

    it('should reject array as metadata', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        consentType: 'analytics',
        granted: true,
        metadata: [{ key: 'value' }],
      };

      expect(() => createConsentRecordSchema.parse(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle granted false with all optional fields', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
        consentType: 'marketing_email',
        granted: false,
        ipAddress: VALID_IP_ADDRESS,
        userAgent: VALID_USER_AGENT,
        metadata: { reason: 'user_declined' },
      };

      const result = createConsentRecordSchema.parse(input);

      expect(result.granted).toBe(false);
      expect(result.metadata).toEqual({ reason: 'user_declined' });
    });

    it('should handle complex metadata structures', () => {
      const input = {
        userId: VALID_USER_ID,
        recordType: 'consent_preference',
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

      const result = createConsentRecordSchema.parse(input);

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

    it('killer test: invalid userId + invalid recordType + array metadata', () => {
      // Combines multiple failure conditions to verify schema validates all fields
      const input = {
        userId: 'bad-uuid',
        recordType: 'not_a_type',
        metadata: [1, 2, 3],
      };

      expect(() => createConsentRecordSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// consentPreferencesResponseSchema Tests
// ============================================================================

describe('consentPreferencesResponseSchema', () => {
  function createValidPreferences(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      analytics: true,
      marketing_email: false,
      third_party_sharing: false,
      profiling: true,
      ...overrides,
    };
  }

  describe('when given valid input', () => {
    it('should parse response with all fields true', () => {
      const result: ConsentPreferencesResponse = consentPreferencesResponseSchema.parse(
        createValidPreferences({
          analytics: true,
          marketing_email: true,
          third_party_sharing: true,
          profiling: true,
        }),
      );

      expect(result.analytics).toBe(true);
      expect(result.marketing_email).toBe(true);
      expect(result.third_party_sharing).toBe(true);
      expect(result.profiling).toBe(true);
    });

    it('should parse response with all fields false', () => {
      const result: ConsentPreferencesResponse = consentPreferencesResponseSchema.parse(
        createValidPreferences({
          analytics: false,
          marketing_email: false,
          third_party_sharing: false,
          profiling: false,
        }),
      );

      expect(result.analytics).toBe(false);
      expect(result.marketing_email).toBe(false);
      expect(result.third_party_sharing).toBe(false);
      expect(result.profiling).toBe(false);
    });

    it('should parse mixed preferences', () => {
      const result: ConsentPreferencesResponse =
        consentPreferencesResponseSchema.parse(createValidPreferences());

      expect(result.analytics).toBe(true);
      expect(result.marketing_email).toBe(false);
      expect(result.profiling).toBe(true);
    });
  });

  describe('when given invalid input', () => {
    it('should throw when analytics is missing', () => {
      const { analytics: _a, ...input } = createValidPreferences();
      expect(() => consentPreferencesResponseSchema.parse(input)).toThrow(
        'analytics must be a boolean',
      );
    });

    it('should throw when marketing_email is not a boolean', () => {
      expect(() =>
        consentPreferencesResponseSchema.parse(createValidPreferences({ marketing_email: 'yes' })),
      ).toThrow('marketing_email must be a boolean');
    });

    it('should throw when third_party_sharing is null', () => {
      expect(() =>
        consentPreferencesResponseSchema.parse(
          createValidPreferences({ third_party_sharing: null }),
        ),
      ).toThrow('third_party_sharing must be a boolean');
    });

    it('should throw when profiling is a number', () => {
      expect(() =>
        consentPreferencesResponseSchema.parse(createValidPreferences({ profiling: 1 })),
      ).toThrow('profiling must be a boolean');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => consentPreferencesResponseSchema.parse(null)).toThrow();
    });

    it('should throw for empty object', () => {
      expect(() => consentPreferencesResponseSchema.parse({})).toThrow(
        'analytics must be a boolean',
      );
    });
  });
});

// ============================================================================
// dataExportRequestedResponseSchema Tests
// ============================================================================

describe('dataExportRequestedResponseSchema', () => {
  function createValidExportResponse(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      message: 'Data export request submitted',
      requestId: 'req_abc123',
      estimatedCompletionAt: '2026-02-20T12:00:00.000Z',
      ...overrides,
    };
  }

  describe('when given valid input', () => {
    it('should parse valid data export response', () => {
      const result: DataExportRequestedResponse = dataExportRequestedResponseSchema.parse(
        createValidExportResponse(),
      );

      expect(result.message).toBe('Data export request submitted');
      expect(result.requestId).toBe('req_abc123');
      expect(result.estimatedCompletionAt).toBe('2026-02-20T12:00:00.000Z');
    });

    it('should parse response with different requestId format', () => {
      const result: DataExportRequestedResponse = dataExportRequestedResponseSchema.parse(
        createValidExportResponse({ requestId: '12345678-1234-4abc-8abc-123456789001' }),
      );

      expect(result.requestId).toBe('12345678-1234-4abc-8abc-123456789001');
    });
  });

  describe('when given invalid input', () => {
    it('should throw when message is missing', () => {
      const { message: _m, ...input } = createValidExportResponse();
      expect(() => dataExportRequestedResponseSchema.parse(input)).toThrow(
        'message must be a string',
      );
    });

    it('should throw when requestId is missing', () => {
      const { requestId: _r, ...input } = createValidExportResponse();
      expect(() => dataExportRequestedResponseSchema.parse(input)).toThrow(
        'requestId must be a string',
      );
    });

    it('should throw when estimatedCompletionAt is missing', () => {
      const { estimatedCompletionAt: _e, ...input } = createValidExportResponse();
      expect(() => dataExportRequestedResponseSchema.parse(input)).toThrow(
        'estimatedCompletionAt must be a string',
      );
    });

    it('should throw when message is null', () => {
      expect(() =>
        dataExportRequestedResponseSchema.parse(createValidExportResponse({ message: null })),
      ).toThrow('message must be a string');
    });

    it('should throw when requestId is a number', () => {
      expect(() =>
        dataExportRequestedResponseSchema.parse(createValidExportResponse({ requestId: 42 })),
      ).toThrow('requestId must be a string');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => dataExportRequestedResponseSchema.parse(null)).toThrow();
    });

    it('should throw for empty object', () => {
      expect(() => dataExportRequestedResponseSchema.parse({})).toThrow('message must be a string');
    });
  });
});

// ============================================================================
// complianceActionResponseSchema Tests
// ============================================================================

describe('complianceActionResponseSchema', () => {
  describe('when given valid input', () => {
    it('should parse valid compliance action response', () => {
      const result: ComplianceActionResponse = complianceActionResponseSchema.parse({
        message: 'Consent preferences updated',
      });

      expect(result.message).toBe('Consent preferences updated');
    });

    it('should parse response with empty message', () => {
      const result: ComplianceActionResponse = complianceActionResponseSchema.parse({
        message: '',
      });

      expect(result.message).toBe('');
    });

    it('should parse response with deletion confirmation message', () => {
      const result: ComplianceActionResponse = complianceActionResponseSchema.parse({
        message: 'Account deletion request submitted. Your data will be deleted within 30 days.',
      });

      expect(result.message).toContain('deletion request submitted');
    });
  });

  describe('when given invalid input', () => {
    it('should throw when message is missing', () => {
      expect(() => complianceActionResponseSchema.parse({})).toThrow('message must be a string');
    });

    it('should throw when message is null', () => {
      expect(() => complianceActionResponseSchema.parse({ message: null })).toThrow(
        'message must be a string',
      );
    });

    it('should throw when message is a boolean', () => {
      expect(() => complianceActionResponseSchema.parse({ message: false })).toThrow(
        'message must be a string',
      );
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => complianceActionResponseSchema.parse(null)).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => complianceActionResponseSchema.parse('ok')).toThrow('message must be a string');
    });
  });
});
