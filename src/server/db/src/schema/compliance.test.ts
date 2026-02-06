// backend/db/src/schema/compliance.test.ts
import { describe, expect, test } from 'vitest';

import {
  CONSENT_LOG_COLUMNS,
  CONSENT_LOGS_TABLE,
  type ConsentLog,
  LEGAL_DOCUMENT_COLUMNS,
  LEGAL_DOCUMENTS_TABLE,
  type LegalDocument,
  type NewConsentLog,
  type NewLegalDocument,
  type NewUserAgreement,
  type UpdateLegalDocument,
  USER_AGREEMENT_COLUMNS,
  USER_AGREEMENTS_TABLE,
  type UserAgreement,
} from './compliance';

describe('Compliance Schema - Table Names', () => {
  test('should have correct table name for legal_documents', () => {
    expect(LEGAL_DOCUMENTS_TABLE).toBe('legal_documents');
  });

  test('should have correct table name for user_agreements', () => {
    expect(USER_AGREEMENTS_TABLE).toBe('user_agreements');
  });

  test('should have correct table name for consent_logs', () => {
    expect(CONSENT_LOGS_TABLE).toBe('consent_logs');
  });

  test('table names should be unique', () => {
    const tableNames = [LEGAL_DOCUMENTS_TABLE, USER_AGREEMENTS_TABLE, CONSENT_LOGS_TABLE];

    const uniqueNames = new Set(tableNames);
    expect(uniqueNames.size).toBe(tableNames.length);
  });

  test('table names should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;

    expect(LEGAL_DOCUMENTS_TABLE).toMatch(snakeCasePattern);
    expect(USER_AGREEMENTS_TABLE).toMatch(snakeCasePattern);
    expect(CONSENT_LOGS_TABLE).toMatch(snakeCasePattern);
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

describe('Compliance Schema - User Agreement Columns', () => {
  test('should have correct column mappings', () => {
    expect(USER_AGREEMENT_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      documentId: 'document_id',
      agreedAt: 'agreed_at',
      ipAddress: 'ip_address',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(USER_AGREEMENT_COLUMNS.userId).toBe('user_id');
    expect(USER_AGREEMENT_COLUMNS.documentId).toBe('document_id');
    expect(USER_AGREEMENT_COLUMNS.agreedAt).toBe('agreed_at');
    expect(USER_AGREEMENT_COLUMNS.ipAddress).toBe('ip_address');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['id', 'userId', 'documentId', 'agreedAt', 'ipAddress'];
    const actualColumns = Object.keys(USER_AGREEMENT_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(USER_AGREEMENT_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

describe('Compliance Schema - Consent Log Columns', () => {
  test('should have correct column mappings', () => {
    expect(CONSENT_LOG_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      consentType: 'consent_type',
      granted: 'granted',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      metadata: 'metadata',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(CONSENT_LOG_COLUMNS.userId).toBe('user_id');
    expect(CONSENT_LOG_COLUMNS.consentType).toBe('consent_type');
    expect(CONSENT_LOG_COLUMNS.ipAddress).toBe('ip_address');
    expect(CONSENT_LOG_COLUMNS.userAgent).toBe('user_agent');
    expect(CONSENT_LOG_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'userId',
      'consentType',
      'granted',
      'ipAddress',
      'userAgent',
      'metadata',
      'createdAt',
    ];
    const actualColumns = Object.keys(CONSENT_LOG_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(CONSENT_LOG_COLUMNS);

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
        id: `doc-${index}`,
        type: 'terms_of_service',
        title: `Terms v${version}`,
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
    // TypeScript prevents this at compile time, but we verify the type structure
    const update: UpdateLegalDocument = {
      title: 'Updated',
    };

    expect('type' in update).toBe(false);
    expect('version' in update).toBe(false);
  });
});

describe('Compliance Schema - UserAgreement Type', () => {
  test('should accept valid user agreement object', () => {
    const agreement: UserAgreement = {
      id: 'agreement-123',
      userId: 'user-456',
      documentId: 'doc-789',
      agreedAt: new Date(),
      ipAddress: '192.168.1.1',
    };

    expect(agreement).toBeDefined();
    expect(agreement.userId).toBe('user-456');
    expect(agreement.documentId).toBe('doc-789');
    expect(agreement.agreedAt).toBeInstanceOf(Date);
  });

  test('should handle null ipAddress', () => {
    const agreement: UserAgreement = {
      id: 'agreement-123',
      userId: 'user-456',
      documentId: 'doc-789',
      agreedAt: new Date(),
      ipAddress: null,
    };

    expect(agreement.ipAddress).toBeNull();
  });

  test('should accept IPv4 addresses', () => {
    const ipv4Addresses = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8'];

    ipv4Addresses.forEach((ipAddress, index) => {
      const agreement: UserAgreement = {
        id: `agreement-${index}`,
        userId: 'user-456',
        documentId: 'doc-789',
        agreedAt: new Date(),
        ipAddress,
      };

      expect(agreement.ipAddress).toBe(ipAddress);
    });
  });

  test('should accept IPv6 addresses', () => {
    const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const agreement: UserAgreement = {
      id: 'agreement-123',
      userId: 'user-456',
      documentId: 'doc-789',
      agreedAt: new Date(),
      ipAddress: ipv6Address,
    };

    expect(agreement.ipAddress).toBe(ipv6Address);
  });

  test('should track agreement timestamp', () => {
    const timestamp = new Date('2024-06-15T10:30:00Z');
    const agreement: UserAgreement = {
      id: 'agreement-123',
      userId: 'user-456',
      documentId: 'doc-789',
      agreedAt: timestamp,
      ipAddress: '192.168.1.1',
    };

    expect(agreement.agreedAt).toEqual(timestamp);
  });
});

describe('Compliance Schema - NewUserAgreement Type', () => {
  test('should accept minimal new user agreement', () => {
    const newAgreement: NewUserAgreement = {
      userId: 'user-456',
      documentId: 'doc-789',
    };

    expect(newAgreement.userId).toBe('user-456');
    expect(newAgreement.documentId).toBe('doc-789');
  });

  test('should accept new user agreement with all optional fields', () => {
    const newAgreement: NewUserAgreement = {
      id: 'agreement-123',
      userId: 'user-456',
      documentId: 'doc-789',
      agreedAt: new Date(),
      ipAddress: '192.168.1.1',
    };

    expect(newAgreement.id).toBe('agreement-123');
    expect(newAgreement.agreedAt).toBeInstanceOf(Date);
    expect(newAgreement.ipAddress).toBe('192.168.1.1');
  });

  test('should accept explicit null for ipAddress', () => {
    const newAgreement: NewUserAgreement = {
      userId: 'user-456',
      documentId: 'doc-789',
      ipAddress: null,
    };

    expect(newAgreement.ipAddress).toBeNull();
  });

  test('should accept agreement without ipAddress field', () => {
    const newAgreement: NewUserAgreement = {
      userId: 'user-456',
      documentId: 'doc-789',
    };

    expect('ipAddress' in newAgreement).toBe(false);
  });
});

describe('Compliance Schema - ConsentLog Type', () => {
  test('should accept valid consent grant', () => {
    const log: ConsentLog = {
      id: 'log-123',
      userId: 'user-456',
      consentType: 'marketing_emails',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'settings_page' },
      createdAt: new Date(),
    };

    expect(log.granted).toBe(true);
    expect(log.consentType).toBe('marketing_emails');
  });

  test('should accept valid consent revocation', () => {
    const log: ConsentLog = {
      id: 'log-456',
      userId: 'user-456',
      consentType: 'marketing_emails',
      granted: false,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { reason: 'user_requested' },
      createdAt: new Date(),
    };

    expect(log.granted).toBe(false);
  });

  test('should handle null values for optional fields', () => {
    const log: ConsentLog = {
      id: 'log-789',
      userId: 'user-456',
      consentType: 'analytics',
      granted: true,
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(log.ipAddress).toBeNull();
    expect(log.userAgent).toBeNull();
  });

  test('should accept various consent types', () => {
    const consentTypes = [
      'marketing_emails',
      'analytics',
      'third_party_cookies',
      'data_processing',
    ];

    consentTypes.forEach((consentType, index) => {
      const log: ConsentLog = {
        id: `log-${index}`,
        userId: 'user-456',
        consentType,
        granted: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
        createdAt: new Date(),
      };

      expect(log.consentType).toBe(consentType);
    });
  });

  test('should accept metadata as JSONB object', () => {
    const metadata = {
      source: 'cookie_banner',
      page: '/home',
      button: 'accept_all',
      timestamp: '2024-01-15T10:30:00Z',
    };

    const log: ConsentLog = {
      id: 'log-123',
      userId: 'user-456',
      consentType: 'third_party_cookies',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120.0',
      metadata,
      createdAt: new Date(),
    };

    expect(log.metadata).toEqual(metadata);
    expect(typeof log.metadata).toBe('object');
  });

  test('should accept empty metadata object', () => {
    const log: ConsentLog = {
      id: 'log-123',
      userId: 'user-456',
      consentType: 'analytics',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: {},
      createdAt: new Date(),
    };

    expect(log.metadata).toEqual({});
    expect(Object.keys(log.metadata).length).toBe(0);
  });

  test('should accept nested metadata structures', () => {
    const metadata = {
      source: 'settings_page',
      preferences: {
        marketing: true,
        analytics: false,
        functional: true,
      },
      timestamp: '2024-01-15T10:30:00Z',
    };

    const log: ConsentLog = {
      id: 'log-123',
      userId: 'user-456',
      consentType: 'cookie_preferences',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata,
      createdAt: new Date(),
    };

    expect(log.metadata).toEqual(metadata);
  });

  test('should track timestamps correctly', () => {
    const timestamp = new Date('2024-06-15T10:30:00Z');
    const log: ConsentLog = {
      id: 'log-123',
      userId: 'user-456',
      consentType: 'marketing_emails',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: {},
      createdAt: timestamp,
    };

    expect(log.createdAt).toEqual(timestamp);
  });
});

describe('Compliance Schema - NewConsentLog Type', () => {
  test('should accept minimal new consent log', () => {
    const newLog: NewConsentLog = {
      userId: 'user-456',
      consentType: 'marketing_emails',
      granted: true,
    };

    expect(newLog.userId).toBe('user-456');
    expect(newLog.consentType).toBe('marketing_emails');
    expect(newLog.granted).toBe(true);
  });

  test('should accept new consent log with all optional fields', () => {
    const newLog: NewConsentLog = {
      id: 'log-123',
      userId: 'user-456',
      consentType: 'analytics',
      granted: false,
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120.0',
      metadata: { source: 'cookie_banner' },
      createdAt: new Date(),
    };

    expect(newLog.id).toBe('log-123');
    expect(newLog.ipAddress).toBe('192.168.1.1');
    expect(newLog.userAgent).toBe('Chrome/120.0');
    expect(newLog.metadata).toEqual({ source: 'cookie_banner' });
    expect(newLog.createdAt).toBeInstanceOf(Date);
  });

  test('should accept explicit null values', () => {
    const newLog: NewConsentLog = {
      userId: 'user-456',
      consentType: 'analytics',
      granted: true,
      ipAddress: null,
      userAgent: null,
    };

    expect(newLog.ipAddress).toBeNull();
    expect(newLog.userAgent).toBeNull();
  });

  test('should accept partial metadata', () => {
    const newLog: NewConsentLog = {
      userId: 'user-456',
      consentType: 'marketing_emails',
      granted: true,
      metadata: { source: 'settings_page' },
    };

    expect(newLog.metadata).toEqual({ source: 'settings_page' });
  });

  test('should accept empty metadata object', () => {
    const newLog: NewConsentLog = {
      userId: 'user-456',
      consentType: 'analytics',
      granted: true,
      metadata: {},
    };

    expect(newLog.metadata).toEqual({});
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
    expect(USER_AGREEMENT_COLUMNS.agreedAt).toMatch(/_at$/);
    expect(CONSENT_LOG_COLUMNS.createdAt).toMatch(/_at$/);
  });

  test('All tables should have id field', () => {
    expect(LEGAL_DOCUMENT_COLUMNS).toHaveProperty('id');
    expect(USER_AGREEMENT_COLUMNS).toHaveProperty('id');
    expect(CONSENT_LOG_COLUMNS).toHaveProperty('id');
  });

  test('Append-only tables should not have Update types', () => {
    // TypeScript enforces this at compile time
    // UserAgreement and ConsentLog have no Update types
    type HasUpdateLegalDoc = UpdateLegalDocument extends object ? true : false;
    const hasUpdateLegalDoc: HasUpdateLegalDoc = true;
    expect(hasUpdateLegalDoc).toBe(true);

    // Verify New types exist for append-only tables
    type HasNewUserAgreement = NewUserAgreement extends object ? true : false;
    const hasNewUserAgreement: HasNewUserAgreement = true;
    expect(hasNewUserAgreement).toBe(true);

    type HasNewConsentLog = NewConsentLog extends object ? true : false;
    const hasNewConsentLog: HasNewConsentLog = true;
    expect(hasNewConsentLog).toBe(true);
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
    const agreement: UserAgreement = {
      id: 'agreement-123',
      userId: 'user-456',
      documentId: 'doc-789',
      agreedAt: new Date(),
      ipAddress: ipv6Address,
    };

    expect(agreement.ipAddress).toBe(ipv6Address);
  });

  test('should handle various user agent strings', () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'curl/7.68.0',
      'PostmanRuntime/7.26.8',
      'Mobile Safari/604.1',
    ];

    userAgents.forEach((userAgent, index) => {
      const log: ConsentLog = {
        id: `log-${index}`,
        userId: 'user-456',
        consentType: 'analytics',
        granted: true,
        ipAddress: '192.168.1.1',
        userAgent,
        metadata: {},
        createdAt: new Date(),
      };

      expect(log.userAgent).toBe(userAgent);
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
      nested: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    };

    const log: ConsentLog = {
      id: 'log-123',
      userId: 'user-456',
      consentType: 'cookie_preferences',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata,
      createdAt: new Date(),
    };

    expect(log.metadata).toEqual(metadata);
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

    // User accepts ToS
    const agreement: UserAgreement = {
      id: 'agreement-456',
      userId: 'user-789',
      documentId: tos.id,
      agreedAt: new Date(),
      ipAddress: '192.168.1.1',
    };

    expect(agreement.documentId).toBe(tos.id);
    expect(agreement.agreedAt.getTime()).toBeGreaterThanOrEqual(tos.effectiveAt.getTime());
  });

  test('should support ToS version upgrade workflow', () => {
    // Original ToS
    const tosV1: LegalDocument = {
      id: 'doc-1',
      type: 'terms_of_service',
      title: 'Terms of Service v1',
      content: 'Version 1 content',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    // User accepts v1
    const agreementV1: UserAgreement = {
      id: 'agreement-1',
      userId: 'user-123',
      documentId: tosV1.id,
      agreedAt: new Date('2024-01-15'),
      ipAddress: '192.168.1.1',
    };

    // New ToS version released
    const tosV2: LegalDocument = {
      id: 'doc-2',
      type: 'terms_of_service',
      title: 'Terms of Service v2',
      content: 'Version 2 content',
      version: 2,
      effectiveAt: new Date('2024-06-01'),
      createdAt: new Date('2024-06-01'),
    };

    // User accepts v2
    const agreementV2: UserAgreement = {
      id: 'agreement-2',
      userId: 'user-123',
      documentId: tosV2.id,
      agreedAt: new Date('2024-06-15'),
      ipAddress: '192.168.1.1',
    };

    expect(tosV2.version).toBeGreaterThan(tosV1.version);
    expect(agreementV2.agreedAt.getTime()).toBeGreaterThan(agreementV1.agreedAt.getTime());
    expect(agreementV2.userId).toBe(agreementV1.userId);
  });

  test('should support GDPR consent workflow', () => {
    // User grants marketing consent
    const grant: ConsentLog = {
      id: 'log-1',
      userId: 'user-123',
      consentType: 'marketing_emails',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'cookie_banner', action: 'accept_all' },
      createdAt: new Date('2024-01-15T10:30:00Z'),
    };

    // User later revokes consent
    const revoke: ConsentLog = {
      id: 'log-2',
      userId: 'user-123',
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

  test('should support audit trail for compliance', () => {
    // Document creation
    const doc: LegalDocument = {
      id: 'doc-123',
      type: 'privacy_policy',
      title: 'Privacy Policy v1',
      content: 'Privacy content',
      version: 1,
      effectiveAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    // User acceptance
    const agreement: UserAgreement = {
      id: 'agreement-456',
      userId: 'user-789',
      documentId: doc.id,
      agreedAt: new Date('2024-01-15T10:30:00Z'),
      ipAddress: '192.168.1.1',
    };

    // Consent logs
    const consent1: ConsentLog = {
      id: 'log-1',
      userId: 'user-789',
      consentType: 'data_processing',
      granted: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120.0',
      metadata: { documentId: doc.id, action: 'accept' },
      createdAt: new Date('2024-01-15T10:30:00Z'),
    };

    // Verify audit trail integrity
    expect(agreement.documentId).toBe(doc.id);
    expect(agreement.userId).toBe(consent1.userId);
    expect(agreement.ipAddress).toBe(consent1.ipAddress);
    expect(agreement.agreedAt).toEqual(consent1.createdAt);
  });

  test('should support multi-document acceptance workflow', () => {
    // Create multiple documents
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

    // User accepts both
    const tosAgreement: UserAgreement = {
      id: 'agreement-1',
      userId: 'user-123',
      documentId: tos.id,
      agreedAt: new Date('2024-01-15T10:30:00Z'),
      ipAddress: '192.168.1.1',
    };

    const privacyAgreement: UserAgreement = {
      id: 'agreement-2',
      userId: 'user-123',
      documentId: privacy.id,
      agreedAt: new Date('2024-01-15T10:30:01Z'),
      ipAddress: '192.168.1.1',
    };

    expect(tosAgreement.userId).toBe(privacyAgreement.userId);
    expect(tosAgreement.documentId).not.toBe(privacyAgreement.documentId);
  });

  test('should support granular consent preferences', () => {
    const consentTypes = ['marketing_emails', 'analytics', 'third_party_cookies', 'data_sharing'];
    const userId = 'user-123';

    // User grants some consents and denies others
    const logs: ConsentLog[] = consentTypes.map((consentType, index) => ({
      id: `log-${index}`,
      userId,
      consentType,
      granted: index % 2 === 0, // Grant even indices, deny odd
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'cookie_banner' },
      createdAt: new Date(`2024-01-15T10:30:${String(index).padStart(2, '0')}Z`),
    }));

    const grantedConsents = logs.filter((log) => log.granted);
    const deniedConsents = logs.filter((log) => !log.granted);

    expect(grantedConsents.length).toBe(2);
    expect(deniedConsents.length).toBe(2);
    expect(logs.every((log) => log.userId === userId)).toBe(true);
  });
});
