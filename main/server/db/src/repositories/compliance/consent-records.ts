// main/server/db/src/repositories/compliance/consent-records.ts
/**
 * Consent Records Repository (Functional)
 *
 * Unified data access layer for the consent_records table.
 * Replaces the separate user_agreements and consent_logs repositories.
 * Append-only: records are never updated or deleted.
 *
 * Two record types are managed via `record_type` discriminator:
 * - `legal_document`: user accepted a legal document (ToS, Privacy Policy)
 * - `consent_preference`: GDPR consent grant or revocation
 *
 * @module
 */

import { and, eq, select, insert } from '../../builder/index';
import {
  type ConsentRecord,
  type NewConsentRecord,
  CONSENT_RECORD_COLUMNS,
  CONSENT_RECORDS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Consent Record Repository Interface
// ============================================================================

/**
 * Functional repository for consent record operations (append-only).
 * All writes create new rows; history is never mutated.
 */
export interface ConsentRecordRepository {
  // ── Legal document acceptance (replaces UserAgreementRepository) ──────────

  /**
   * Record that a user accepted a legal document.
   * @param data - userId, documentId, and optional context (IP, UA)
   * @returns The created consent record
   * @throws Error if insert fails
   */
  recordAgreement(data: {
    userId: string;
    documentId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<ConsentRecord>;

  /**
   * Find all legal document acceptance records for a user, most recent first.
   * @param userId - The user ID
   * @returns Array of legal_document consent records
   */
  findAgreementsByUserId(userId: string): Promise<ConsentRecord[]>;

  /**
   * Find the acceptance record for a specific user + document combination.
   * @param userId - The user ID
   * @param documentId - The legal document ID
   * @returns The first matching record or null if not found
   */
  findAgreementByUserAndDocument(userId: string, documentId: string): Promise<ConsentRecord | null>;

  // ── Consent preferences (replaces ConsentLogRepository) ──────────────────

  /**
   * Record a GDPR consent grant or revocation.
   * @param data - userId, consentType, granted flag, and optional context
   * @returns The created consent record
   * @throws Error if insert fails
   */
  recordConsent(data: {
    userId: string;
    consentType: string;
    granted: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<ConsentRecord>;

  /**
   * Find all consent preference records for a user, most recent first.
   * @param userId - The user ID
   * @returns Array of consent_preference records
   */
  findConsentsByUserId(userId: string): Promise<ConsentRecord[]>;

  /**
   * Find the latest consent preference for a user and consent type.
   * Used to determine the current effective consent state (last-write-wins).
   * @param userId - The user ID
   * @param consentType - The consent category (e.g. "marketing", "analytics")
   * @returns The most recent record or null if never set
   */
  findLatestConsentByUserAndType(
    userId: string,
    consentType: string,
  ): Promise<ConsentRecord | null>;
}

// ============================================================================
// Consent Record Repository Implementation
// ============================================================================

/**
 * Transform raw database row to ConsentRecord type
 * @param row - Raw database row with snake_case keys
 * @returns Typed ConsentRecord object
 * @complexity O(n) where n is number of columns
 */
function transformRecord(row: Record<string, unknown>): ConsentRecord {
  return toCamelCase<ConsentRecord>(row, CONSENT_RECORD_COLUMNS);
}

/**
 * Create a consent record repository bound to a database connection
 * @param db - The raw database client
 * @returns ConsentRecordRepository implementation
 */
export function createConsentRecordRepository(db: RawDb): ConsentRecordRepository {
  return {
    async recordAgreement(data: {
      userId: string;
      documentId: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown>;
    }): Promise<ConsentRecord> {
      const newRecord: NewConsentRecord = {
        userId: data.userId,
        recordType: 'legal_document',
        documentId: data.documentId,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      };
      const snakeData = toSnakeCase(
        newRecord as unknown as Record<string, unknown>,
        CONSENT_RECORD_COLUMNS,
      );
      const result = await db.queryOne(
        insert(CONSENT_RECORDS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to record user agreement');
      }
      return transformRecord(result);
    },

    async findAgreementsByUserId(userId: string): Promise<ConsentRecord[]> {
      const results = await db.query(
        select(CONSENT_RECORDS_TABLE)
          .where(and(eq('user_id', userId), eq('record_type', 'legal_document')))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformRecord);
    },

    async findAgreementByUserAndDocument(
      userId: string,
      documentId: string,
    ): Promise<ConsentRecord | null> {
      const result = await db.queryOne(
        select(CONSENT_RECORDS_TABLE)
          .where(
            and(
              eq('user_id', userId),
              eq('record_type', 'legal_document'),
              eq('document_id', documentId),
            ),
          )
          .toSql(),
      );
      return result !== null ? transformRecord(result) : null;
    },

    async recordConsent(data: {
      userId: string;
      consentType: string;
      granted: boolean;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown>;
    }): Promise<ConsentRecord> {
      const newRecord: NewConsentRecord = {
        userId: data.userId,
        recordType: 'consent_preference',
        consentType: data.consentType,
        granted: data.granted,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      };
      const snakeData = toSnakeCase(
        newRecord as unknown as Record<string, unknown>,
        CONSENT_RECORD_COLUMNS,
      );
      const result = await db.queryOne(
        insert(CONSENT_RECORDS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to record consent preference');
      }
      return transformRecord(result);
    },

    async findConsentsByUserId(userId: string): Promise<ConsentRecord[]> {
      const results = await db.query(
        select(CONSENT_RECORDS_TABLE)
          .where(and(eq('user_id', userId), eq('record_type', 'consent_preference')))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformRecord);
    },

    async findLatestConsentByUserAndType(
      userId: string,
      consentType: string,
    ): Promise<ConsentRecord | null> {
      const result = await db.queryOne(
        select(CONSENT_RECORDS_TABLE)
          .where(
            and(
              eq('user_id', userId),
              eq('record_type', 'consent_preference'),
              eq('consent_type', consentType),
            ),
          )
          .orderBy('created_at', 'desc')
          .limit(1)
          .toSql(),
      );
      return result !== null ? transformRecord(result) : null;
    },
  };
}
