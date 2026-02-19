// main/server/db/src/schema/compliance.test.ts
import { describe, expect, test } from 'vitest';

import {
  CONSENT_RECORD_COLUMNS,
  CONSENT_RECORDS_TABLE,
  type ConsentRecord,
  type ConsentRecordType,
  DATA_EXPORT_REQUEST_COLUMNS,
  DATA_EXPORT_REQUESTS_TABLE,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  type DataExportRequest,
  type DataExportStatus,
  type DataExportType,
  LEGAL_DOCUMENT_COLUMNS,
  LEGAL_DOCUMENTS_TABLE,
  type LegalDocument,
  type NewConsentRecord,
  type NewDataExportRequest,
  type NewLegalDocument,
  type UpdateDataExportRequest,
  type UpdateLegalDocument,
} from './compliance';

describe('Compliance Schema - Table Names', () => {
  test('should have correct table name for legal_documents', () => {
    expect(LEGAL_DOCUMENTS_TABLE).toBe('legal_documents');
  });

  test('should have correct table name for consent_records', () => {
    expect(CONSENT_RECORDS_TABLE).toBe('consent_records');
  });

  test('should have correct table name for data_export_requests', () => {
    expect(DATA_EXPORT_REQUESTS_TABLE).toBe('data_export_requests');
  });

  test('table names should be unique', () => {
    const tableNames = [LEGAL_DOCUMENTS_TABLE, CONSENT_RECORDS_TABLE, DATA_EXPORT_REQUESTS_TABLE];

    const uniqueNames = new Set(tableNames);
    expect(uniqueNames.size).toBe(tableNames.length);
  });

  test('table names should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;

    expect(LEGAL_DOCUMENTS_TABLE).toMatch(snakeCasePattern);
    expect(CONSENT_RECORDS_TABLE).toMatch(snakeCasePattern);
    expect(DATA_EXPORT_REQUESTS_TABLE).toMatch(snakeCasePattern);
  });
});

describe('Compliance Schema - Legal Document Columns', () => {
  test('should have correct column mappings', () => {
    expect(LEGAL_DOCUMENT_COLUMNS).toEqual({
      id: 'id',
      type: 'type',
      title: 'title',
      content: 'content',
      version: 'version',
      effectiveAt: 'effective_at',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(LEGAL_DOCUMENT_COLUMNS.effectiveAt).toBe('effective_at');
    expect(LEGAL_DOCUMENT_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'type',
      'title',
      'content',
      'version',
      'effectiveAt',
      'createdAt',
    ];
    const actualColumns = Object.keys(LEGAL_DOCUMENT_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(LEGAL_DOCUMENT_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    const columns = LEGAL_DOCUMENT_COLUMNS;

    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBeGreaterThan(0);

    type IsReadonly = typeof columns extends { readonly id: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

describe('Compliance Schema - Consent Record Columns', () => {
  test('should have correct column mappings', () => {
    expect(CONSENT_RECORD_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      recordType: 'record_type',
      documentId: 'document_id',
      consentType: 'consent_type',
      granted: 'granted',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      metadata: 'metadata',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(CONSENT_RECORD_COLUMNS.userId).toBe('user_id');
    expect(CONSENT_RECORD_COLUMNS.recordType).toBe('record_type');
    expect(CONSENT_RECORD_COLUMNS.documentId).toBe('document_id');
    expect(CONSENT_RECORD_COLUMNS.consentType).toBe('consent_type');
    expect(CONSENT_RECORD_COLUMNS.ipAddress).toBe('ip_address');
    expect(CONSENT_RECORD_COLUMNS.userAgent).toBe('user_agent');
    expect(CONSENT_RECORD_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'userId',
      'recordType',
      'documentId',
      'consentType',
      'granted',
      'ipAddress',
      'userAgent',
      'metadata',
      'createdAt',
    ];
    const actualColumns = Object.keys(CONSENT_RECORD_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(CONSENT_RECORD_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

describe('Compliance Schema - LegalDocument Type', () => {
  test('should accept valid legal document object', () => {
    const validDoc: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: 'Terms of Service',
      content: 'Full terms content...',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date(),
    };

    expect(validDoc).toBeDefined();
    expect(validDoc.id).toBe('doc-123');
    expect(validDoc.type).toBe('terms_of_service');
    expect(validDoc.version).toBe(1);
  });

  test('should accept multiple versions of same document type', () => {
    const v1: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: 'Terms of Service v1',
      content: 'Version 1 content',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    const v2: LegalDocument = {
      id: 'doc-456',
      type: 'terms_of_service',
      title: 'Terms of Service v2',
      content: 'Version 2 content',
      version: 2,
      effectiveAt: new Date('2024-06-01'),
      createdAt: new Date('2024-06-01'),
    };

    expect(v1.type).toBe(v2.type);
    expect(v2.version).toBeGreaterThan(v1.version);
  });

  test('should accept different document types', () => {
    const tos: LegalDocument = {
      id: 'doc-1',
      type: 'terms_of_service',
      title: 'Terms of Service',
      content: 'ToS content',
      version: 1,
      effectiveAt: new Date(),
      createdAt: new Date(),
    };

    const privacy: LegalDocument = {
      id: 'doc-2',
      type: 'privacy_policy',
      title: 'Privacy Policy',
      content: 'Privacy content',
      version: 1,
      effectiveAt: new Date(),
      createdAt: new Date(),
    };

    expect(tos.type).not.toBe(privacy.type);
  });

  test('should handle future effective dates', () => {
    const futureDoc: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: 'Future Terms',
      content: 'New terms',
      version: 2,
      effectiveAt: new Date('2099-12-31'),
      createdAt: new Date(),
    };

    expect(futureDoc.effectiveAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('should handle version numbers correctly', () => {
    const versions = [1, 2, 10, 100];

    versions.forEach((version, index) => {
      const doc: LegalDocument = {
        id: `doc-${String(index)}`,
        type: 'terms_of_service',
        title: `Terms v${String(version)}`,
        content: 'Content',
        version,
        effectiveAt: new Date(),
        createdAt: new Date(),
      };

      expect(doc.version).toBe(version);
      expect(doc.version).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Compliance Schema - NewLegalDocument Type', () => {
  test('should accept minimal new legal document', () => {
    const newDoc: NewLegalDocument = {
      type: 'terms_of_service',
      title: 'Terms of Service',
      content: 'Full terms content...',
      effectiveAt: new Date('2024-01-01'),
    };

    expect(newDoc.type).toBe('terms_of_service');
    expect(newDoc.title).toBe('Terms of Service');
    expect(newDoc.effectiveAt).toBeInstanceOf(Date);
  });

  test('should accept new legal document with all optional fields', () => {
    const newDoc: NewLegalDocument = {
      id: 'doc-123',
      type: 'privacy_policy',
      title: 'Privacy Policy',
      content: 'Privacy content',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date(),
    };

    expect(newDoc.id).toBe('doc-123');
    expect(newDoc.version).toBe(1);
    expect(newDoc.createdAt).toBeInstanceOf(Date);
  });

  test('should accept new legal document with custom version', () => {
    const newDoc: NewLegalDocument = {
      type: 'terms_of_service',
      title: 'Terms v5',
      content: 'Content',
      version: 5,
      effectiveAt: new Date(),
    };

    expect(newDoc.version).toBe(5);
  });
});

describe('Compliance Schema - UpdateLegalDocument Type', () => {
  test('should accept partial updates', () => {
    const update1: UpdateLegalDocument = {
      title: 'Updated Title',
    };

    const update2: UpdateLegalDocument = {
      content: 'Updated content',
    };

    const update3: UpdateLegalDocument = {
      effectiveAt: new Date('2025-01-01'),
    };

    expect(update1.title).toBeDefined();
    expect(update2.content).toBeDefined();
    expect(update3.effectiveAt).toBeDefined();
  });

  test('should accept multiple fields in update', () => {
    const update: UpdateLegalDocument = {
      title: 'New Title',
      content: 'New content',
      effectiveAt: new Date('2025-01-01'),
    };

    expect(update.title).toBe('New Title');
    expect(update.content).toBe('New content');
    expect(update.effectiveAt).toBeInstanceOf(Date);
  });

  test('should accept empty update object', () => {
    const update: UpdateLegalDocument = {};

    expect(Object.keys(update).length).toBe(0);
  });

  test('should not include type or version fields', () => {
    const update: UpdateLegalDocument = {
      title: 'Updated',
    };

    expect('type' in update).toBe(false);
    expect('version' in update).toBe(false);
  });
});

describe('Compliance Schema - ConsentRecord Type (legal_document)', () => {
  test('should accept valid legal document acceptance record', () => {
    const record: ConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'legal_document',
      documentId: 'doc-789',
      consentType: null,
      granted: null,
      ipAddress: '192.168.1.1',
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(record.recordType).toBe('legal_document');
    expect(record.documentId).toBe('doc-789');
    expect(record.consentType).toBeNull();
    expect(record.granted).toBeNull();
  });

  test('should handle null ipAddress', () => {
    const record: ConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'legal_document',
      documentId: 'doc-789',
      consentType: null,
      granted: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(record.ipAddress).toBeNull();
  });

  test('should accept IPv4 addresses', () => {
    const ipv4Addresses = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8'];

    ipv4Addresses.forEach((ipAddress, index) => {
      const record: ConsentRecord = {
        id: `cr-${String(index)}`,
        userId: 'user-456',
        recordType: 'legal_document',
        documentId: 'doc-789',
        consentType: null,
        granted: null,
        ipAddress,
        userAgent: null,
        metadata: {},
        createdAt: new Date(),
      };

      expect(record.ipAddress).toBe(ipAddress);
    });
  });

  test('should track creation timestamp', () => {
    const timestamp = new Date('2024-06-15T10:30:00Z');
    const record: ConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'legal_document',
      documentId: 'doc-789',
      consentType: null,
      granted: null,
      ipAddress: '192.168.1.1',
      userAgent: null,
      metadata: {},
      createdAt: timestamp,
    };

    expect(record.createdAt).toEqual(timestamp);
  });
});

describe('Compliance Schema - ConsentRecord Type (consent_preference)', () => {
  test('should accept valid consent grant', () => {
    const record: ConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'marketing_emails',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'settings_page' },
      createdAt: new Date(),
    };

    expect(record.recordType).toBe('consent_preference');
    expect(record.granted).toBe(true);
    expect(record.consentType).toBe('marketing_emails');
    expect(record.documentId).toBeNull();
  });

  test('should accept valid consent revocation', () => {
    const record: ConsentRecord = {
      id: 'cr-456',
      userId: 'user-456',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'marketing_emails',
      granted: false,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { reason: 'user_requested' },
      createdAt: new Date(),
    };

    expect(record.granted).toBe(false);
  });

  test('should handle null values for optional fields', () => {
    const record: ConsentRecord = {
      id: 'cr-789',
      userId: 'user-456',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'analytics',
      granted: true,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(record.ipAddress).toBeNull();
    expect(record.userAgent).toBeNull();
  });

  test('should accept various consent types', () => {
    const consentTypes = [
      'marketing_emails',
      'analytics',
      'third_party_cookies',
      'data_processing',
    ];

    consentTypes.forEach((consentType, index) => {
      const record: ConsentRecord = {
        id: `cr-${String(index)}`,
        userId: 'user-456',
        recordType: 'consent_preference',
        documentId: null,
        consentType,
        granted: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
        createdAt: new Date(),
      };

      expect(record.consentType).toBe(consentType);
    });
  });

  test('should accept metadata as JSONB object', () => {
    const metadata = {
      source: 'cookie_banner',
      page: '/home',
      button: 'accept_all',
      timestamp: '2024-01-15T10:30:00Z',
    };

    const record: ConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'third_party_cookies',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120.0',
      metadata,
      createdAt: new Date(),
    };

    expect(record.metadata).toEqual(metadata);
    expect(typeof record.metadata).toBe('object');
  });
});

describe('Compliance Schema - NewConsentRecord Type', () => {
  test('should accept minimal new legal_document record', () => {
    const newRecord: NewConsentRecord = {
      userId: 'user-456',
      recordType: 'legal_document',
      documentId: 'doc-789',
    };

    expect(newRecord.userId).toBe('user-456');
    expect(newRecord.recordType).toBe('legal_document');
    expect(newRecord.documentId).toBe('doc-789');
  });

  test('should accept minimal new consent_preference record', () => {
    const newRecord: NewConsentRecord = {
      userId: 'user-456',
      recordType: 'consent_preference',
      consentType: 'marketing_emails',
      granted: true,
    };

    expect(newRecord.recordType).toBe('consent_preference');
    expect(newRecord.granted).toBe(true);
  });

  test('should accept new consent record with all optional fields', () => {
    const newRecord: NewConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'analytics',
      granted: false,
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120.0',
      metadata: { source: 'cookie_banner' },
      createdAt: new Date(),
    };

    expect(newRecord.id).toBe('cr-123');
    expect(newRecord.ipAddress).toBe('192.168.1.1');
    expect(newRecord.metadata).toEqual({ source: 'cookie_banner' });
    expect(newRecord.createdAt).toBeInstanceOf(Date);
  });

  test('should accept explicit null values', () => {
    const newRecord: NewConsentRecord = {
      userId: 'user-456',
      recordType: 'consent_preference',
      consentType: 'analytics',
      granted: true,
      ipAddress: null,
      userAgent: null,
    };

    expect(newRecord.ipAddress).toBeNull();
    expect(newRecord.userAgent).toBeNull();
  });
});

describe('Compliance Schema - ConsentRecordType discriminator', () => {
  test('should accept both valid record types', () => {
    const types: ConsentRecordType[] = ['legal_document', 'consent_preference'];

    types.forEach((recordType) => {
      const record: Pick<ConsentRecord, 'recordType'> = { recordType };
      expect(record.recordType).toBe(recordType);
    });
  });

  test('legal_document records have documentId set and consentType/granted null', () => {
    const agreementRecord: ConsentRecord = {
      id: 'cr-1',
      userId: 'u-1',
      recordType: 'legal_document',
      documentId: 'doc-1',
      consentType: null,
      granted: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(agreementRecord.documentId).toBeDefined();
    expect(agreementRecord.consentType).toBeNull();
    expect(agreementRecord.granted).toBeNull();
  });

  test('consent_preference records have consentType/granted set and documentId null', () => {
    const preferenceRecord: ConsentRecord = {
      id: 'cr-2',
      userId: 'u-1',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'analytics',
      granted: false,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(preferenceRecord.documentId).toBeNull();
    expect(preferenceRecord.consentType).toBeDefined();
    expect(preferenceRecord.granted).toBe(false);
  });
});

describe('Compliance Schema - Type Consistency', () => {
  test('New* types should be compatible with their base types', () => {
    const newDoc: NewLegalDocument = {
      type: 'terms_of_service',
      title: 'Terms',
      content: 'Content',
      effectiveAt: new Date(),
    };

    const fullDoc: LegalDocument = {
      id: 'doc-123',
      version: 1,
      createdAt: new Date(),
      ...newDoc,
    };

    expect(fullDoc.type).toBe(newDoc.type);
    expect(fullDoc.title).toBe(newDoc.title);
    expect(fullDoc.content).toBe(newDoc.content);
  });

  test('Column constants should cover all type properties', () => {
    const legalDoc: LegalDocument = {
      id: 'id',
      type: 'type',
      title: 'title',
      content: 'content',
      version: 1,
      effectiveAt: new Date(),
      createdAt: new Date(),
    };

    const legalDocKeys = Object.keys(legalDoc);
    const columnKeys = Object.keys(LEGAL_DOCUMENT_COLUMNS);

    expect(columnKeys.sort()).toEqual(legalDocKeys.sort());
  });

  test('Date fields should be consistently named', () => {
    expect(LEGAL_DOCUMENT_COLUMNS.effectiveAt).toMatch(/_at$/);
    expect(LEGAL_DOCUMENT_COLUMNS.createdAt).toMatch(/_at$/);
    expect(CONSENT_RECORD_COLUMNS.createdAt).toMatch(/_at$/);
  });

  test('All tables should have id field', () => {
    expect(LEGAL_DOCUMENT_COLUMNS).toHaveProperty('id');
    expect(CONSENT_RECORD_COLUMNS).toHaveProperty('id');
  });

  test('Consent records are append-only (no Update type)', () => {
    // TypeScript enforces this at compile time
    // Verify New types exist for append-only table
    type HasNewConsentRecord = NewConsentRecord extends object ? true : false;
    const hasNewConsentRecord: HasNewConsentRecord = true;
    expect(hasNewConsentRecord).toBe(true);
  });
});

describe('Compliance Schema - Edge Cases', () => {
  test('should handle empty string values', () => {
    const doc: LegalDocument = {
      id: '',
      type: '',
      title: '',
      content: '',
      version: 1,
      effectiveAt: new Date(),
      createdAt: new Date(),
    };

    expect(doc.id).toBe('');
    expect(doc.type).toBe('');
    expect(doc.title).toBe('');
    expect(doc.content).toBe('');
  });

  test('should handle very long string values', () => {
    const longString = 'a'.repeat(10000);
    const doc: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: longString,
      content: longString.repeat(10),
      version: 1,
      effectiveAt: new Date(),
      createdAt: new Date(),
    };

    expect(doc.title).toHaveLength(10000);
    expect(doc.content).toHaveLength(100000);
  });

  test('should handle special characters in strings', () => {
    const specialChars = "'; DROP TABLE legal_documents; --";
    const doc: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: `Title with ${specialChars}`,
      content: specialChars,
      version: 1,
      effectiveAt: new Date(),
      createdAt: new Date(),
    };

    expect(doc.content).toBe(specialChars);
  });

  test('should handle large version numbers', () => {
    const doc: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: 'Terms',
      content: 'Content',
      version: Number.MAX_SAFE_INTEGER,
      effectiveAt: new Date(),
      createdAt: new Date(),
    };

    expect(doc.version).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('should handle future dates', () => {
    const futureDate = new Date('2099-12-31');
    const doc: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: 'Terms',
      content: 'Content',
      version: 1,
      effectiveAt: futureDate,
      createdAt: new Date(),
    };

    expect(doc.effectiveAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('should handle past dates', () => {
    const pastDate = new Date('2000-01-01');
    const doc: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: 'Terms',
      content: 'Content',
      version: 1,
      effectiveAt: pastDate,
      createdAt: pastDate,
    };

    expect(doc.effectiveAt.getTime()).toBeLessThan(Date.now());
  });

  test('should handle IPv6 addresses', () => {
    const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const record: ConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'legal_document',
      documentId: 'doc-789',
      consentType: null,
      granted: null,
      ipAddress: ipv6Address,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(record.ipAddress).toBe(ipv6Address);
  });

  test('should handle various user agent strings', () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'curl/7.68.0',
      'PostmanRuntime/7.26.8',
      'Mobile Safari/604.1',
    ];

    userAgents.forEach((userAgent, index) => {
      const record: ConsentRecord = {
        id: `cr-${String(index)}`,
        userId: 'user-456',
        recordType: 'consent_preference',
        documentId: null,
        consentType: 'analytics',
        granted: true,
        ipAddress: '192.168.1.1',
        userAgent,
        metadata: {},
        createdAt: new Date(),
      };

      expect(record.userAgent).toBe(userAgent);
    });
  });

  test('should handle complex metadata objects', () => {
    const metadata = {
      source: 'cookie_banner',
      preferences: {
        marketing: true,
        analytics: false,
        functional: true,
      },
      history: [
        { date: '2024-01-01', action: 'accepted' },
        { date: '2024-06-01', action: 'updated' },
      ],
    };

    const record: ConsentRecord = {
      id: 'cr-123',
      userId: 'user-456',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'cookie_preferences',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata,
      createdAt: new Date(),
    };

    expect(record.metadata).toEqual(metadata);
  });

  test('killer test — unauthorized ToS acceptance attempt with SQL injection payload', () => {
    const maliciousPayload = "'; DROP TABLE consent_records; --";
    const record: ConsentRecord = {
      id: 'cr-999',
      userId: maliciousPayload,
      recordType: 'legal_document',
      documentId: maliciousPayload,
      consentType: null,
      granted: null,
      ipAddress: maliciousPayload,
      userAgent: maliciousPayload,
      metadata: { note: maliciousPayload },
      createdAt: new Date('2000-01-01'), // past date
    };

    // The type system accepts these strings — the DB layer is responsible for parameterization
    expect(record.userId).toBe(maliciousPayload);
    expect(record.metadata['note']).toBe(maliciousPayload);
  });
});

describe('Compliance Schema - Integration Scenarios', () => {
  test('should support ToS acceptance workflow', () => {
    // Create ToS document
    const tos: LegalDocument = {
      id: 'doc-123',
      type: 'terms_of_service',
      title: 'Terms of Service v1',
      content: 'Full ToS content...',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    // User accepts ToS — creates a legal_document consent record
    const acceptance: ConsentRecord = {
      id: 'cr-456',
      userId: 'user-789',
      recordType: 'legal_document',
      documentId: tos.id,
      consentType: null,
      granted: null,
      ipAddress: '192.168.1.1',
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(acceptance.documentId).toBe(tos.id);
    expect(acceptance.recordType).toBe('legal_document');
    expect(acceptance.createdAt.getTime()).toBeGreaterThanOrEqual(tos.effectiveAt.getTime());
  });

  test('should support ToS version upgrade workflow', () => {
    const tosV1: LegalDocument = {
      id: 'doc-1',
      type: 'terms_of_service',
      title: 'Terms of Service v1',
      content: 'Version 1 content',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    const acceptanceV1: ConsentRecord = {
      id: 'cr-1',
      userId: 'user-123',
      recordType: 'legal_document',
      documentId: tosV1.id,
      consentType: null,
      granted: null,
      ipAddress: '192.168.1.1',
      userAgent: null,
      metadata: {},
      createdAt: new Date('2024-01-15'),
    };

    const tosV2: LegalDocument = {
      id: 'doc-2',
      type: 'terms_of_service',
      title: 'Terms of Service v2',
      content: 'Version 2 content',
      version: 2,
      effectiveAt: new Date('2024-06-01'),
      createdAt: new Date('2024-06-01'),
    };

    const acceptanceV2: ConsentRecord = {
      id: 'cr-2',
      userId: 'user-123',
      recordType: 'legal_document',
      documentId: tosV2.id,
      consentType: null,
      granted: null,
      ipAddress: '192.168.1.1',
      userAgent: null,
      metadata: {},
      createdAt: new Date('2024-06-15'),
    };

    expect(tosV2.version).toBeGreaterThan(tosV1.version);
    expect(acceptanceV2.createdAt.getTime()).toBeGreaterThan(acceptanceV1.createdAt.getTime());
    expect(acceptanceV2.userId).toBe(acceptanceV1.userId);
  });

  test('should support GDPR consent workflow', () => {
    // User grants marketing consent — consent_preference record
    const grant: ConsentRecord = {
      id: 'cr-1',
      userId: 'user-123',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'marketing_emails',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'cookie_banner', action: 'accept_all' },
      createdAt: new Date('2024-01-15T10:30:00Z'),
    };

    // User later revokes consent — another consent_preference record
    const revoke: ConsentRecord = {
      id: 'cr-2',
      userId: 'user-123',
      recordType: 'consent_preference',
      documentId: null,
      consentType: 'marketing_emails',
      granted: false,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'settings_page', reason: 'user_requested' },
      createdAt: new Date('2024-06-15T14:20:00Z'),
    };

    expect(grant.granted).toBe(true);
    expect(revoke.granted).toBe(false);
    expect(grant.userId).toBe(revoke.userId);
    expect(grant.consentType).toBe(revoke.consentType);
    expect(revoke.createdAt.getTime()).toBeGreaterThan(grant.createdAt.getTime());
  });

  test('should support multi-document acceptance workflow', () => {
    const tos: LegalDocument = {
      id: 'doc-1',
      type: 'terms_of_service',
      title: 'Terms of Service',
      content: 'ToS content',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    const privacy: LegalDocument = {
      id: 'doc-2',
      type: 'privacy_policy',
      title: 'Privacy Policy',
      content: 'Privacy content',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    // User accepts both documents — two separate legal_document records
    const tosAcceptance: ConsentRecord = {
      id: 'cr-1',
      userId: 'user-123',
      recordType: 'legal_document',
      documentId: tos.id,
      consentType: null,
      granted: null,
      ipAddress: '192.168.1.1',
      userAgent: null,
      metadata: {},
      createdAt: new Date('2024-01-15T10:30:00Z'),
    };

    const privacyAcceptance: ConsentRecord = {
      id: 'cr-2',
      userId: 'user-123',
      recordType: 'legal_document',
      documentId: privacy.id,
      consentType: null,
      granted: null,
      ipAddress: '192.168.1.1',
      userAgent: null,
      metadata: {},
      createdAt: new Date('2024-01-15T10:30:01Z'),
    };

    expect(tosAcceptance.userId).toBe(privacyAcceptance.userId);
    expect(tosAcceptance.documentId).not.toBe(privacyAcceptance.documentId);
  });

  test('should support granular consent preferences', () => {
    const consentTypes = ['marketing_emails', 'analytics', 'third_party_cookies', 'data_sharing'];
    const userId = 'user-123';

    // User grants some consents and denies others — all consent_preference records
    const records: ConsentRecord[] = consentTypes.map((consentType, index) => ({
      id: `cr-${String(index)}`,
      userId,
      recordType: 'consent_preference' as ConsentRecordType,
      documentId: null,
      consentType,
      granted: index % 2 === 0, // Grant even indices, deny odd
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'cookie_banner' },
      createdAt: new Date(`2024-01-15T10:30:${String(index).padStart(2, '0')}Z`),
    }));

    const grantedConsents = records.filter((r) => r.granted === true);
    const deniedConsents = records.filter((r) => r.granted === false);

    expect(grantedConsents.length).toBe(2);
    expect(deniedConsents.length).toBe(2);
    expect(records.every((r) => r.userId === userId)).toBe(true);
  });
});

// ============================================================================
// Data Export Request Tests
// ============================================================================

describe('Compliance Schema - Data Export Enums', () => {
  test('should have correct export types', () => {
    expect(DATA_EXPORT_TYPES).toEqual(['export', 'deletion']);
  });

  test('should have correct export statuses', () => {
    expect(DATA_EXPORT_STATUSES).toEqual([
      'pending',
      'processing',
      'completed',
      'failed',
      'canceled',
    ]);
  });

  test('should have exactly 2 export types', () => {
    expect(DATA_EXPORT_TYPES.length).toBe(2);
  });

  test('should have exactly 5 export statuses', () => {
    expect(DATA_EXPORT_STATUSES.length).toBe(5);
  });

  test('enum values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;

    DATA_EXPORT_TYPES.forEach((type) => {
      expect(type).toMatch(snakeCasePattern);
    });

    DATA_EXPORT_STATUSES.forEach((status) => {
      expect(status).toMatch(snakeCasePattern);
    });
  });
});

describe('Compliance Schema - Data Export Request Columns', () => {
  test('should have correct column mappings', () => {
    expect(DATA_EXPORT_REQUEST_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      type: 'type',
      status: 'status',
      format: 'format',
      downloadUrl: 'download_url',
      expiresAt: 'expires_at',
      completedAt: 'completed_at',
      errorMessage: 'error_message',
      metadata: 'metadata',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(DATA_EXPORT_REQUEST_COLUMNS.userId).toBe('user_id');
    expect(DATA_EXPORT_REQUEST_COLUMNS.downloadUrl).toBe('download_url');
    expect(DATA_EXPORT_REQUEST_COLUMNS.expiresAt).toBe('expires_at');
    expect(DATA_EXPORT_REQUEST_COLUMNS.completedAt).toBe('completed_at');
    expect(DATA_EXPORT_REQUEST_COLUMNS.errorMessage).toBe('error_message');
    expect(DATA_EXPORT_REQUEST_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'userId',
      'type',
      'status',
      'format',
      'downloadUrl',
      'expiresAt',
      'completedAt',
      'errorMessage',
      'metadata',
      'createdAt',
    ];
    const actualColumns = Object.keys(DATA_EXPORT_REQUEST_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(DATA_EXPORT_REQUEST_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

describe('Compliance Schema - DataExportRequest Type', () => {
  test('should accept valid pending export request', () => {
    const request: DataExportRequest = {
      id: 'der-123',
      userId: 'user-456',
      type: 'export',
      status: 'pending',
      format: 'json',
      downloadUrl: null,
      expiresAt: null,
      completedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(request.type).toBe('export');
    expect(request.status).toBe('pending');
    expect(request.downloadUrl).toBeNull();
    expect(request.completedAt).toBeNull();
  });

  test('should accept completed export request with download URL', () => {
    const request: DataExportRequest = {
      id: 'der-123',
      userId: 'user-456',
      type: 'export',
      status: 'completed',
      format: 'json',
      downloadUrl: 'https://storage.example.com/exports/der-123.zip',
      expiresAt: new Date(Date.now() + 86400000),
      completedAt: new Date(),
      errorMessage: null,
      metadata: { fileSize: 1024, recordCount: 42 },
      createdAt: new Date(Date.now() - 3600000),
    };

    expect(request.status).toBe('completed');
    expect(request.downloadUrl).toBeDefined();
    expect(request.completedAt).toBeInstanceOf(Date);
  });

  test('should accept failed export request with error', () => {
    const request: DataExportRequest = {
      id: 'der-456',
      userId: 'user-456',
      type: 'export',
      status: 'failed',
      format: 'json',
      downloadUrl: null,
      expiresAt: null,
      completedAt: null,
      errorMessage: 'Storage quota exceeded',
      metadata: { attemptCount: 3 },
      createdAt: new Date(),
    };

    expect(request.status).toBe('failed');
    expect(request.errorMessage).toBe('Storage quota exceeded');
  });

  test('should accept deletion request', () => {
    const request: DataExportRequest = {
      id: 'der-789',
      userId: 'user-456',
      type: 'deletion',
      status: 'processing',
      format: 'json',
      downloadUrl: null,
      expiresAt: null,
      completedAt: null,
      errorMessage: null,
      metadata: { reason: 'user_requested', gdprArticle: '17' },
      createdAt: new Date(),
    };

    expect(request.type).toBe('deletion');
    expect(request.status).toBe('processing');
  });

  test('should accept all valid data export types', () => {
    const types: DataExportType[] = ['export', 'deletion'];

    types.forEach((type, index) => {
      const request: DataExportRequest = {
        id: `der-${String(index)}`,
        userId: 'user-456',
        type,
        status: 'pending',
        format: 'json',
        downloadUrl: null,
        expiresAt: null,
        completedAt: null,
        errorMessage: null,
        metadata: {},
        createdAt: new Date(),
      };

      expect(request.type).toBe(type);
    });
  });

  test('should accept all valid data export statuses', () => {
    const statuses: DataExportStatus[] = [
      'pending',
      'processing',
      'completed',
      'failed',
      'canceled',
    ];

    statuses.forEach((status, index) => {
      const request: DataExportRequest = {
        id: `der-${String(index)}`,
        userId: 'user-456',
        type: 'export',
        status,
        format: 'json',
        downloadUrl: null,
        expiresAt: null,
        completedAt: null,
        errorMessage: null,
        metadata: {},
        createdAt: new Date(),
      };

      expect(request.status).toBe(status);
    });
  });
});

describe('Compliance Schema - NewDataExportRequest Type', () => {
  test('should accept minimal new data export request', () => {
    const newRequest: NewDataExportRequest = {
      userId: 'user-456',
      type: 'export',
    };

    expect(newRequest.userId).toBe('user-456');
    expect(newRequest.type).toBe('export');
  });

  test('should accept new request with all optional fields', () => {
    const newRequest: NewDataExportRequest = {
      id: 'der-123',
      userId: 'user-456',
      type: 'deletion',
      status: 'pending',
      format: 'csv',
      downloadUrl: null,
      expiresAt: null,
      completedAt: null,
      errorMessage: null,
      metadata: { reason: 'user_requested' },
      createdAt: new Date(),
    };

    expect(newRequest.id).toBe('der-123');
    expect(newRequest.format).toBe('csv');
    expect(newRequest.metadata).toEqual({ reason: 'user_requested' });
  });

  test('should accept new request with custom format', () => {
    const newRequest: NewDataExportRequest = {
      userId: 'user-456',
      type: 'export',
      format: 'csv',
    };

    expect(newRequest.format).toBe('csv');
  });
});

describe('Compliance Schema - UpdateDataExportRequest Type', () => {
  test('should accept partial updates', () => {
    const update1: UpdateDataExportRequest = { status: 'processing' };
    const update2: UpdateDataExportRequest = { downloadUrl: 'https://example.com/file.zip' };
    const update3: UpdateDataExportRequest = { errorMessage: 'Failed' };

    expect(update1.status).toBeDefined();
    expect(update2.downloadUrl).toBeDefined();
    expect(update3.errorMessage).toBeDefined();
  });

  test('should accept completion update', () => {
    const update: UpdateDataExportRequest = {
      status: 'completed',
      downloadUrl: 'https://storage.example.com/exports/der-123.zip',
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    };

    expect(update.status).toBe('completed');
    expect(update.downloadUrl).toBeDefined();
    expect(update.completedAt).toBeInstanceOf(Date);
    expect(update.expiresAt).toBeInstanceOf(Date);
  });

  test('should accept failure update', () => {
    const update: UpdateDataExportRequest = {
      status: 'failed',
      errorMessage: 'Internal server error',
    };

    expect(update.status).toBe('failed');
    expect(update.errorMessage).toBe('Internal server error');
  });

  test('should accept empty update object', () => {
    const update: UpdateDataExportRequest = {};

    expect(Object.keys(update).length).toBe(0);
  });

  test('should not include immutable fields', () => {
    const update: UpdateDataExportRequest = { status: 'completed' };

    expect('id' in update).toBe(false);
    expect('userId' in update).toBe(false);
    expect('type' in update).toBe(false);
    expect('createdAt' in update).toBe(false);
  });
});

describe('Compliance Schema - Data Export Integration Scenarios', () => {
  test('should support GDPR data export workflow', () => {
    const pendingRequest: DataExportRequest = {
      id: 'der-123',
      userId: 'user-456',
      type: 'export',
      status: 'pending',
      format: 'json',
      downloadUrl: null,
      expiresAt: null,
      completedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    const processingRequest: DataExportRequest = {
      ...pendingRequest,
      status: 'processing',
    };

    const completedRequest: DataExportRequest = {
      ...processingRequest,
      status: 'completed',
      downloadUrl: 'https://storage.example.com/exports/der-123.zip',
      expiresAt: new Date(Date.now() + 86400000 * 7),
      completedAt: new Date(),
      metadata: { fileSize: 2048, recordCount: 150 },
    };

    expect(pendingRequest.status).toBe('pending');
    expect(processingRequest.status).toBe('processing');
    expect(completedRequest.status).toBe('completed');
    expect(completedRequest.downloadUrl).toBeDefined();
    expect(completedRequest.completedAt).toBeInstanceOf(Date);
  });

  test('should support GDPR right to deletion workflow', () => {
    const deletionRequest: DataExportRequest = {
      id: 'der-456',
      userId: 'user-789',
      type: 'deletion',
      status: 'completed',
      format: 'json',
      downloadUrl: null,
      expiresAt: null,
      completedAt: new Date(),
      errorMessage: null,
      metadata: {
        tablesProcessed: ['users', 'sessions', 'notifications'],
        recordsDeleted: 47,
      },
      createdAt: new Date(Date.now() - 3600000),
    };

    expect(deletionRequest.type).toBe('deletion');
    expect(deletionRequest.status).toBe('completed');
    expect(deletionRequest.downloadUrl).toBeNull();
  });

  test('should support canceled request workflow', () => {
    const canceledRequest: DataExportRequest = {
      id: 'der-789',
      userId: 'user-456',
      type: 'export',
      status: 'canceled',
      format: 'json',
      downloadUrl: null,
      expiresAt: null,
      completedAt: null,
      errorMessage: null,
      metadata: { canceledBy: 'user', canceledAt: new Date().toISOString() },
      createdAt: new Date(Date.now() - 1800000),
    };

    expect(canceledRequest.status).toBe('canceled');
    expect(canceledRequest.completedAt).toBeNull();
  });
});
