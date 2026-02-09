// src/server/db/src/repositories/email/email-templates.ts
/**
 * Email Templates Repository (Functional)
 *
 * Data access layer for the email_templates table.
 * Manages transactional email templates with TEXT primary key.
 *
 * @module
 */

import { eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type EmailTemplate,
  type NewEmailTemplate,
  type UpdateEmailTemplate,
  EMAIL_TEMPLATE_COLUMNS,
  EMAIL_TEMPLATES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Email Template Repository Interface
// ============================================================================

/**
 * Functional repository for email template operations.
 */
export interface EmailTemplateRepository {
  /**
   * Find a template by its key.
   *
   * @param key - Template key (e.g., "auth.welcome")
   * @returns Template or null if not found
   * @complexity O(1)
   */
  findByKey(key: string): Promise<EmailTemplate | null>;

  /**
   * Find all templates.
   *
   * @returns Array of all email templates
   * @complexity O(n) where n is total template count
   */
  findAll(): Promise<EmailTemplate[]>;

  /**
   * Find all active templates.
   *
   * @returns Array of active email templates
   * @complexity O(n) where n is active template count
   */
  findActive(): Promise<EmailTemplate[]>;

  /**
   * Create a new email template.
   *
   * @param data - Template data
   * @returns Created template
   * @throws Error if insert fails (e.g., duplicate key)
   * @complexity O(1)
   */
  create(data: NewEmailTemplate): Promise<EmailTemplate>;

  /**
   * Update an existing email template.
   *
   * @param key - Template key
   * @param data - Fields to update
   * @returns Updated template or null if not found
   * @complexity O(1)
   */
  update(key: string, data: UpdateEmailTemplate): Promise<EmailTemplate | null>;

  /**
   * Delete a template by key.
   *
   * @param key - Template key
   * @returns True if a template was deleted
   * @complexity O(1)
   */
  delete(key: string): Promise<boolean>;
}

// ============================================================================
// Email Template Repository Implementation
// ============================================================================

/**
 * Transform raw database row to EmailTemplate type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed EmailTemplate object
 * @complexity O(n) where n is number of columns
 */
function transformTemplate(row: Record<string, unknown>): EmailTemplate {
  return toCamelCase<EmailTemplate>(row, EMAIL_TEMPLATE_COLUMNS);
}

/**
 * Create an email template repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns EmailTemplateRepository implementation
 */
export function createEmailTemplateRepository(db: RawDb): EmailTemplateRepository {
  return {
    async findByKey(key: string): Promise<EmailTemplate | null> {
      const result = await db.queryOne(select(EMAIL_TEMPLATES_TABLE).where(eq('key', key)).toSql());
      return result !== null ? transformTemplate(result) : null;
    },

    async findAll(): Promise<EmailTemplate[]> {
      const results = await db.query(select(EMAIL_TEMPLATES_TABLE).orderBy('key', 'asc').toSql());
      return results.map(transformTemplate);
    },

    async findActive(): Promise<EmailTemplate[]> {
      const results = await db.query(
        select(EMAIL_TEMPLATES_TABLE).where(eq('is_active', true)).orderBy('key', 'asc').toSql(),
      );
      return results.map(transformTemplate);
    },

    async create(data: NewEmailTemplate): Promise<EmailTemplate> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        EMAIL_TEMPLATE_COLUMNS,
      );
      const result = await db.queryOne(
        insert(EMAIL_TEMPLATES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create email template');
      }
      return transformTemplate(result);
    },

    async update(key: string, data: UpdateEmailTemplate): Promise<EmailTemplate | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        EMAIL_TEMPLATE_COLUMNS,
      );
      const result = await db.queryOne(
        update(EMAIL_TEMPLATES_TABLE).set(snakeData).where(eq('key', key)).returningAll().toSql(),
      );
      return result !== null ? transformTemplate(result) : null;
    },

    async delete(key: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(EMAIL_TEMPLATES_TABLE).where(eq('key', key)).toSql(),
      );
      return count > 0;
    },
  };
}
