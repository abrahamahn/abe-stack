// backend/db/src/repositories/compliance/legal-documents.ts
/**
 * Legal Documents Repository (Functional)
 *
 * Data access layer for the legal_documents table.
 * Manages versioned legal documents (ToS, Privacy Policy, etc.).
 *
 * @module
 */

import { eq, select, insert, update } from '../../builder/index';
import {
  type LegalDocument,
  type NewLegalDocument,
  type UpdateLegalDocument,
  LEGAL_DOCUMENT_COLUMNS,
  LEGAL_DOCUMENTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Legal Document Repository Interface
// ============================================================================

/**
 * Functional repository for legal document operations
 */
export interface LegalDocumentRepository {
  /**
   * Create a new legal document version
   * @param data - The document data to insert
   * @returns The created document
   * @throws Error if insert fails
   */
  create(data: NewLegalDocument): Promise<LegalDocument>;

  /**
   * Find a document by its ID
   * @param id - The document ID
   * @returns The document or null if not found
   */
  findById(id: string): Promise<LegalDocument | null>;

  /**
   * Find all versions of a document type
   * @param type - The document type (e.g., "terms_of_service")
   * @returns Array of documents, newest version first
   */
  findByType(type: string): Promise<LegalDocument[]>;

  /**
   * Find the latest version of a document type
   * @param type - The document type
   * @returns The latest version or null if no documents exist
   */
  findLatestByType(type: string): Promise<LegalDocument | null>;

  /**
   * Find all current (latest version of each type) documents
   * @returns Array of the latest version of each document type
   */
  findAllLatest(): Promise<LegalDocument[]>;

  /**
   * Update a legal document
   * @param id - The document ID
   * @param data - The fields to update
   * @returns The updated document or null if not found
   */
  update(id: string, data: UpdateLegalDocument): Promise<LegalDocument | null>;
}

// ============================================================================
// Legal Document Repository Implementation
// ============================================================================

/**
 * Transform raw database row to LegalDocument type
 * @param row - Raw database row with snake_case keys
 * @returns Typed LegalDocument object
 * @complexity O(n) where n is number of columns
 */
function transformDocument(row: Record<string, unknown>): LegalDocument {
  return toCamelCase<LegalDocument>(row, LEGAL_DOCUMENT_COLUMNS);
}

/**
 * Create a legal document repository bound to a database connection
 * @param db - The raw database client
 * @returns LegalDocumentRepository implementation
 */
export function createLegalDocumentRepository(db: RawDb): LegalDocumentRepository {
  return {
    async create(data: NewLegalDocument): Promise<LegalDocument> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        LEGAL_DOCUMENT_COLUMNS,
      );
      const result = await db.queryOne(
        insert(LEGAL_DOCUMENTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create legal document');
      }
      return transformDocument(result);
    },

    async findById(id: string): Promise<LegalDocument | null> {
      const result = await db.queryOne(select(LEGAL_DOCUMENTS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformDocument(result) : null;
    },

    async findByType(type: string): Promise<LegalDocument[]> {
      const results = await db.query(
        select(LEGAL_DOCUMENTS_TABLE).where(eq('type', type)).orderBy('version', 'desc').toSql(),
      );
      return results.map(transformDocument);
    },

    async findLatestByType(type: string): Promise<LegalDocument | null> {
      const result = await db.queryOne(
        select(LEGAL_DOCUMENTS_TABLE)
          .where(eq('type', type))
          .orderBy('version', 'desc')
          .limit(1)
          .toSql(),
      );
      return result !== null ? transformDocument(result) : null;
    },

    async findAllLatest(): Promise<LegalDocument[]> {
      // Use DISTINCT ON to get the latest version per type
      // PostgreSQL-specific: ORDER BY must match DISTINCT ON columns
      const results = await db.raw(
        `SELECT DISTINCT ON ("type") * FROM "${LEGAL_DOCUMENTS_TABLE}" ORDER BY "type", "version" DESC`,
      );
      return results.map(transformDocument);
    },

    async update(id: string, data: UpdateLegalDocument): Promise<LegalDocument | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        LEGAL_DOCUMENT_COLUMNS,
      );
      const result = await db.queryOne(
        update(LEGAL_DOCUMENTS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformDocument(result) : null;
    },
  };
}
