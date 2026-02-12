// src/server/db/src/repositories/billing/invoices.ts
/**
 * Invoices Repository
 *
 * Data access layer for billing invoices table.
 */

import { and, eq, or, select, insert, update } from '../../builder/index';
import {
  type Invoice,
  type InvoiceStatus,
  type NewInvoice,
  type UpdateInvoice,
  INVOICE_COLUMNS,
  INVOICES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';
import { buildCursorCondition, buildCursorResult, combineConditions } from '../../utils/pagination';

import type { RawDb } from '../../client';
import type { CursorPaginatedResult, CursorPaginationOptions } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Invoice filters for queries
 */
export interface InvoiceFilters {
  userId?: string;
  subscriptionId?: string;
  status?: InvoiceStatus | InvoiceStatus[];
  provider?: 'stripe' | 'paypal';
}

// ============================================================================
// Invoice Repository Interface
// ============================================================================

export interface InvoiceRepository {
  /** Find invoice by ID */
  findById(id: string): Promise<Invoice | null>;

  /** Find invoice by provider invoice ID */
  findByProviderInvoiceId(
    provider: 'stripe' | 'paypal',
    providerInvoiceId: string,
  ): Promise<Invoice | null>;

  /** List invoices for a user */
  findByUserId(
    userId: string,
    options?: Partial<CursorPaginationOptions>,
  ): Promise<CursorPaginatedResult<Invoice>>;

  /** List invoices with filters */
  list(
    filters?: InvoiceFilters,
    options?: Partial<CursorPaginationOptions>,
  ): Promise<CursorPaginatedResult<Invoice>>;

  /** Create a new invoice */
  create(invoice: NewInvoice): Promise<Invoice>;

  /** Update an invoice */
  update(id: string, data: UpdateInvoice): Promise<Invoice | null>;

  /** Update invoice by provider invoice ID */
  updateByProviderInvoiceId(
    provider: 'stripe' | 'paypal',
    providerInvoiceId: string,
    data: UpdateInvoice,
  ): Promise<Invoice | null>;

  /** Upsert invoice (create or update by provider invoice ID) */
  upsert(invoice: NewInvoice): Promise<Invoice>;
}

// ============================================================================
// Invoice Repository Implementation
// ============================================================================

/**
 * Create an invoice repository
 */
export function createInvoiceRepository(db: RawDb): InvoiceRepository {
  return {
    async findById(id: string): Promise<Invoice | null> {
      const result = await db.queryOne(select(INVOICES_TABLE).where(eq('id', id)).toSql());
      return result !== null ? toCamelCase<Invoice>(result, INVOICE_COLUMNS) : null;
    },

    async findByProviderInvoiceId(
      provider: 'stripe' | 'paypal',
      providerInvoiceId: string,
    ): Promise<Invoice | null> {
      const result = await db.queryOne(
        select(INVOICES_TABLE)
          .where(and(eq('provider', provider), eq('provider_invoice_id', providerInvoiceId)))
          .toSql(),
      );
      return result !== null ? toCamelCase<Invoice>(result, INVOICE_COLUMNS) : null;
    },

    async findByUserId(
      userId: string,
      options: Partial<CursorPaginationOptions> = {},
    ): Promise<CursorPaginatedResult<Invoice>> {
      return this.list({ userId }, options);
    },

    async list(
      filters: InvoiceFilters = {},
      options: Partial<CursorPaginationOptions> = {},
    ): Promise<CursorPaginatedResult<Invoice>> {
      const { limit = 20, cursor, sortOrder = 'desc' } = options;
      const conditions = [];

      // Apply filters
      if (filters.userId !== undefined && filters.userId !== '') {
        conditions.push(eq('user_id', filters.userId));
      }
      if (filters.subscriptionId !== undefined && filters.subscriptionId !== '') {
        conditions.push(eq('subscription_id', filters.subscriptionId));
      }
      if (filters.status !== undefined) {
        if (Array.isArray(filters.status)) {
          conditions.push(or(...filters.status.map((s) => eq('status', s))));
        } else {
          conditions.push(eq('status', filters.status));
        }
      }
      if (filters.provider !== undefined) {
        conditions.push(eq('provider', filters.provider));
      }

      // Cursor condition
      const cursorCondition = buildCursorCondition(cursor, sortOrder);
      if (cursorCondition !== null) {
        conditions.push(cursorCondition);
      }

      // Build query
      let query = select(INVOICES_TABLE);
      const where = combineConditions(conditions);
      if (where !== null) {
        query = query.where(where);
      }

      query = query
        .orderBy('created_at', sortOrder)
        .orderBy('id', sortOrder)
        .limit(limit + 1);

      const results = await db.query(query.toSql());
      const data: Invoice[] = results.map((row) => toCamelCase<Invoice>(row, INVOICE_COLUMNS));

      return buildCursorResult(data, limit, sortOrder);
    },

    async create(invoice: NewInvoice): Promise<Invoice> {
      const snakeData = toSnakeCase(invoice as unknown as Record<string, unknown>, INVOICE_COLUMNS);
      const result = await db.queryOne(
        insert(INVOICES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create invoice');
      }
      return toCamelCase<Invoice>(result, INVOICE_COLUMNS);
    },

    async update(id: string, data: UpdateInvoice): Promise<Invoice | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, INVOICE_COLUMNS);
      const result = await db.queryOne(
        update(INVOICES_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? toCamelCase<Invoice>(result, INVOICE_COLUMNS) : null;
    },

    async updateByProviderInvoiceId(
      provider: 'stripe' | 'paypal',
      providerInvoiceId: string,
      data: UpdateInvoice,
    ): Promise<Invoice | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, INVOICE_COLUMNS);
      const result = await db.queryOne(
        update(INVOICES_TABLE)
          .set(snakeData)
          .where(and(eq('provider', provider), eq('provider_invoice_id', providerInvoiceId)))
          .returningAll()
          .toSql(),
      );
      return result !== null ? toCamelCase<Invoice>(result, INVOICE_COLUMNS) : null;
    },

    async upsert(invoice: NewInvoice): Promise<Invoice> {
      // Check if invoice exists
      const existing = await this.findByProviderInvoiceId(
        invoice.provider,
        invoice.providerInvoiceId,
      );

      if (existing !== null) {
        // Update existing invoice - conditionally set optional fields
        const updateData: UpdateInvoice = {
          status: invoice.status,
          amountDue: invoice.amountDue,
        };
        if (invoice.amountPaid !== undefined) {
          updateData.amountPaid = invoice.amountPaid;
        }
        if (invoice.paidAt !== undefined) {
          updateData.paidAt = invoice.paidAt;
        }
        if (invoice.invoicePdfUrl !== undefined) {
          updateData.invoicePdfUrl = invoice.invoicePdfUrl;
        }
        const updated = await this.update(existing.id, updateData);
        return updated ?? existing;
      }

      // Create new invoice
      return this.create(invoice);
    },
  };
}
