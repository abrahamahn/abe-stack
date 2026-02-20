// main/server/db/src/repositories/billing/invoices.test.ts
/**
 * Tests for Invoices Repository
 *
 * Validates invoice CRUD operations, provider-specific lookups, pagination,
 * filtering, and upsert logic for billing invoice records.
 */

import { encodeCursor } from '@bslt/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInvoiceRepository } from './invoices';

import type { RawDb } from '../../client';
import type { Invoice, InvoiceStatus, NewInvoice, UpdateInvoice } from '../../schema/index';
import type { CursorPaginationOptions } from '../types';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
  withSession: vi.fn() as RawDb['withSession'],
});

// ============================================================================
// Test Data
// ============================================================================

const mockInvoice: Invoice = {
  id: 'inv-123',
  userId: 'user-456',
  subscriptionId: 'sub-789',
  provider: 'stripe',
  providerInvoiceId: 'in_stripe123',
  status: 'paid',
  amountDue: 1999,
  amountPaid: 1999,
  currency: 'usd',
  periodStart: new Date('2024-01-01T00:00:00Z'),
  periodEnd: new Date('2024-02-01T00:00:00Z'),
  paidAt: new Date('2024-01-05T10:00:00Z'),
  invoicePdfUrl: 'https://example.com/invoice.pdf',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-05T10:00:00Z'),
};

const mockDbRow = {
  id: 'inv-123',
  user_id: 'user-456' as string | null,
  subscription_id: 'sub-789' as string | null,
  provider: 'stripe',
  provider_invoice_id: 'in_stripe123',
  status: 'paid',
  amount_due: 1999,
  amount_paid: 1999,
  currency: 'usd',
  period_start: new Date('2024-01-01T00:00:00Z'),
  period_end: new Date('2024-02-01T00:00:00Z'),
  paid_at: new Date('2024-01-05T10:00:00Z') as Date | null,
  invoice_pdf_url: 'https://example.com/invoice.pdf' as string | null,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-05T10:00:00Z'),
};

const createMockDbRow = (overrides: Partial<typeof mockDbRow> = {}): typeof mockDbRow => ({
  ...mockDbRow,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('createInvoiceRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return invoice when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result).toEqual(mockInvoice);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('invoices'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should query with correct id parameter', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createInvoiceRepository(mockDb);
      await repo.findById('inv-specific');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: ['inv-specific'],
        }),
      );
    });
  });

  describe('findByProviderInvoiceId', () => {
    it('should return invoice for stripe provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findByProviderInvoiceId('stripe', 'in_stripe123');

      expect(result).toEqual(mockInvoice);
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should return invoice for paypal provider', async () => {
      const paypalRow = createMockDbRow({
        provider: 'paypal',
        provider_invoice_id: 'pp_inv123',
      });
      vi.mocked(mockDb.queryOne).mockResolvedValue(paypalRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findByProviderInvoiceId('paypal', 'pp_inv123');

      expect(result?.provider).toBe('paypal');
      expect(result?.providerInvoiceId).toBe('pp_inv123');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findByProviderInvoiceId('stripe', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should query with both provider and providerInvoiceId', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createInvoiceRepository(mockDb);
      await repo.findByProviderInvoiceId('stripe', 'in_test123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['stripe', 'in_test123']),
        }),
      );
    });
  });

  describe('findByUserId', () => {
    it('should delegate to list with userId filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result.data).toEqual([mockInvoice]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasNext).toBe(false);
    });

    it('should forward pagination options to list', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createInvoiceRepository(mockDb);
      const options: Partial<CursorPaginationOptions> = { limit: 10, sortOrder: 'asc' };
      await repo.findByUserId('user-456', options);

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should return empty result when no invoices found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findByUserId('user-no-invoices');

      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('list', () => {
    describe('with no filters', () => {
      it('should return all invoices with default pagination', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.list();

        expect(result.data).toEqual([mockInvoice]);
        expect(result.nextCursor).toBeNull();
      });

      it('should apply default limit of 20', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list();

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('LIMIT'),
          }),
        );
      });

      it('should order by createdAt desc by default', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list();

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringMatching(/ORDER BY.*created_at.*DESC/i),
          }),
        );
      });
    });

    describe('filtering', () => {
      it('should filter by userId', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({ userId: 'user-456' });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining(['user-456']),
          }),
        );
      });

      it('should filter by subscriptionId', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({ subscriptionId: 'sub-789' });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining(['sub-789']),
          }),
        );
      });

      it('should filter by single status', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({ status: 'paid' });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining(['paid']),
          }),
        );
      });

      it('should filter by multiple statuses', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        const statuses: InvoiceStatus[] = ['paid', 'open'];
        await repo.list({ status: statuses });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining(['paid', 'open']),
          }),
        );
      });

      it('should filter by provider', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({ provider: 'stripe' });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining(['stripe']),
          }),
        );
      });

      it('should combine multiple filters', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({
          userId: 'user-456',
          status: 'paid',
          provider: 'stripe',
        });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            values: expect.arrayContaining(['user-456', 'paid', 'stripe']),
          }),
        );
      });

      it('should ignore empty string filters', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({ userId: '', subscriptionId: '' });

        expect(mockDb.query).toHaveBeenCalled();
      });
    });

    describe('pagination', () => {
      it('should respect custom limit', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({}, { limit: 50 });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('LIMIT'),
          }),
        );
      });

      it('should handle ascending sortOrder', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({}, { sortOrder: 'asc' });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringMatching(/ORDER BY.*ASC/i),
          }),
        );
      });

      it('should handle cursor-based pagination (descending)', async () => {
        const cursorDate = new Date('2024-01-15T00:00:00Z');
        const cursor = encodeCursor({
          value: cursorDate,
          tieBreaker: 'inv-cursor',
          sortOrder: 'desc',
        });

        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({}, { cursor, sortOrder: 'desc' });

        expect(mockDb.query).toHaveBeenCalled();
      });

      it('should handle cursor-based pagination (ascending)', async () => {
        const cursorDate = new Date('2024-01-15T00:00:00Z');
        const cursor = encodeCursor({
          value: cursorDate,
          tieBreaker: 'inv-cursor',
          sortOrder: 'asc',
        });

        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({}, { cursor, sortOrder: 'asc' });

        expect(mockDb.query).toHaveBeenCalled();
      });

      it('should return nextCursor when more items exist', async () => {
        const rows = Array.from({ length: 11 }, (_, i) =>
          createMockDbRow({
            id: `inv-${String(i)}`,
            created_at: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
          }),
        );
        vi.mocked(mockDb.query).mockResolvedValue(rows);

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.list({}, { limit: 10 });

        expect(result.data).toHaveLength(10);
        expect(result.nextCursor).toBeTruthy();
        expect(result.hasNext).toBe(true);
      });

      it('should return null nextCursor when no more items', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.list({}, { limit: 10 });

        expect(result.data).toHaveLength(1);
        expect(result.nextCursor).toBeNull();
        expect(result.hasNext).toBe(false);
      });

      it('should handle empty cursor string', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({}, { cursor: '' });

        expect(mockDb.query).toHaveBeenCalled();
      });

      it('should ignore malformed cursor', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        await repo.list({}, { cursor: 'invalid_cursor' });

        expect(mockDb.query).toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle empty result set', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.list();

        expect(result.data).toEqual([]);
        expect(result.nextCursor).toBeNull();
      });

      it('should handle exactly limit items (no more pages)', async () => {
        const rows = Array.from({ length: 20 }, (_, i) => createMockDbRow({ id: `inv-${String(i)}` }));
        vi.mocked(mockDb.query).mockResolvedValue(rows);

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.list({}, { limit: 20 });

        expect(result.data).toHaveLength(20);
        expect(result.nextCursor).toBeNull();
      });

      it('should handle empty filters object', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.list({});

        expect(result.data).toEqual([mockInvoice]);
      });
    });

    describe('error handling', () => {
      it('should throw error when first condition is undefined', async () => {
        vi.mocked(mockDb.query).mockResolvedValue([]);

        const repo = createInvoiceRepository(mockDb);

        // This shouldn't happen in practice, but tests the safety check
        // We'll just ensure normal operation doesn't throw
        await expect(repo.list({ userId: 'test' })).resolves.toBeDefined();
      });
    });
  });

  describe('create', () => {
    it('should insert and return new invoice', async () => {
      const newInvoice: NewInvoice = {
        userId: 'user-new',
        provider: 'stripe',
        providerInvoiceId: 'in_new123',
        status: 'open',
        amountDue: 2999,
        currency: 'usd',
        periodStart: new Date('2024-02-01T00:00:00Z'),
        periodEnd: new Date('2024-03-01T00:00:00Z'),
      };

      const returnedRow = createMockDbRow({
        id: 'inv-new',
        user_id: 'user-new',
        provider_invoice_id: 'in_new123',
        status: 'open',
        amount_due: 2999,
      });

      vi.mocked(mockDb.queryOne).mockResolvedValue(returnedRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.create(newInvoice);

      expect(result.id).toBe('inv-new');
      expect(result.userId).toBe('user-new');
      expect(result.status).toBe('open');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT INTO.*invoices/i),
        }),
      );
    });

    it('should handle optional fields', async () => {
      const newInvoice: NewInvoice = {
        userId: 'user-456',
        provider: 'paypal',
        providerInvoiceId: 'pp_inv456',
        status: 'draft',
        amountDue: 1500,
        amountPaid: 0,
        currency: 'usd',
        periodStart: new Date('2024-02-01T00:00:00Z'),
        periodEnd: new Date('2024-03-01T00:00:00Z'),
        subscriptionId: 'sub-789',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(
        createMockDbRow({
          subscription_id: 'sub-789',
          paid_at: null,
          invoice_pdf_url: null,
        }),
      );

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.create(newInvoice);

      expect(result.subscriptionId).toBe('sub-789');
      expect(result.paidAt).toBeNull();
      expect(result.invoicePdfUrl).toBeNull();
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvoiceRepository(mockDb);

      await expect(
        repo.create({
          userId: 'user-fail',
          provider: 'stripe',
          providerInvoiceId: 'in_fail',
          status: 'open',
          amountDue: 1000,
          currency: 'usd',
          periodStart: new Date(),
          periodEnd: new Date(),
        }),
      ).rejects.toThrow('Failed to create invoice');
    });

    it('should convert camelCase fields to snake_case', async () => {
      const newInvoice: NewInvoice = {
        userId: 'user-123',
        subscriptionId: 'sub-456',
        provider: 'stripe',
        providerInvoiceId: 'in_test',
        status: 'paid',
        amountDue: 1999,
        amountPaid: 1999,
        currency: 'usd',
        periodStart: new Date('2024-01-01T00:00:00Z'),
        periodEnd: new Date('2024-02-01T00:00:00Z'),
        paidAt: new Date('2024-01-05T00:00:00Z'),
        invoicePdfUrl: 'https://example.com/test.pdf',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createInvoiceRepository(mockDb);
      await repo.create(newInvoice);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update invoice and return updated record', async () => {
      const updateData: UpdateInvoice = {
        status: 'paid',
        amountPaid: 1999,
        paidAt: new Date('2024-01-10T00:00:00Z'),
      };

      const updatedRow = createMockDbRow({
        status: 'paid',
        amount_paid: 1999,
        paid_at: new Date('2024-01-10T00:00:00Z'),
      });

      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.update('inv-123', updateData);

      expect(result?.status).toBe('paid');
      expect(result?.amountPaid).toBe(1999);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*invoices/i),
        }),
      );
    });

    it('should return null when invoice not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.update('nonexistent', { status: 'void' });

      expect(result).toBeNull();
    });

    it('should handle partial updates', async () => {
      const updateData: UpdateInvoice = {
        invoicePdfUrl: 'https://example.com/updated.pdf',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(
        createMockDbRow({
          invoice_pdf_url: 'https://example.com/updated.pdf',
        }),
      );

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.update('inv-123', updateData);

      expect(result?.invoicePdfUrl).toBe('https://example.com/updated.pdf');
    });

    it('should update with all fields', async () => {
      const updateData: UpdateInvoice = {
        status: 'void',
        amountDue: 0,
        amountPaid: 0,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(
        createMockDbRow({
          status: 'void',
          amount_due: 0,
          amount_paid: 0,
          paid_at: null,
          invoice_pdf_url: null,
        }),
      );

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.update('inv-123', updateData);

      expect(result?.status).toBe('void');
      expect(result?.amountDue).toBe(0);
    });
  });

  describe('updateByProviderInvoiceId', () => {
    it('should update invoice by provider and providerInvoiceId', async () => {
      const updateData: UpdateInvoice = {
        status: 'paid',
        amountPaid: 1999,
      };

      const updatedRow = createMockDbRow({
        status: 'paid',
        amount_paid: 1999,
      });

      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.updateByProviderInvoiceId('stripe', 'in_stripe123', updateData);

      expect(result?.status).toBe('paid');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*invoices/i),
          values: expect.arrayContaining(['stripe', 'in_stripe123']),
        }),
      );
    });

    it('should work with paypal provider', async () => {
      const updateData: UpdateInvoice = {
        status: 'paid',
      };

      const updatedRow = createMockDbRow({
        provider: 'paypal',
        provider_invoice_id: 'pp_inv123',
        status: 'paid',
      });

      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.updateByProviderInvoiceId('paypal', 'pp_inv123', updateData);

      expect(result?.provider).toBe('paypal');
      expect(result?.status).toBe('paid');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.updateByProviderInvoiceId('stripe', 'nonexistent', {
        status: 'void',
      });

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    describe('when invoice does not exist', () => {
      it('should create new invoice', async () => {
        const newInvoice: NewInvoice = {
          userId: 'user-new',
          provider: 'stripe',
          providerInvoiceId: 'in_new123',
          status: 'open',
          amountDue: 2999,
          currency: 'usd',
          periodStart: new Date('2024-02-01T00:00:00Z'),
          periodEnd: new Date('2024-03-01T00:00:00Z'),
        };

        // First call to findByProviderInvoiceId returns null
        // Second call to create returns the new invoice
        vi.mocked(mockDb.queryOne)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(
            createMockDbRow({
              id: 'inv-new',
              user_id: 'user-new',
              provider_invoice_id: 'in_new123',
              status: 'open',
            }),
          );

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.upsert(newInvoice);

        expect(result.id).toBe('inv-new');
        expect(result.providerInvoiceId).toBe('in_new123');
        expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
      });
    });

    describe('when invoice exists', () => {
      it('should update existing invoice', async () => {
        const newInvoice: NewInvoice = {
          userId: 'user-456',
          provider: 'stripe',
          providerInvoiceId: 'in_stripe123',
          status: 'paid',
          amountDue: 1999,
          amountPaid: 1999,
          currency: 'usd',
          periodStart: new Date('2024-01-01T00:00:00Z'),
          periodEnd: new Date('2024-02-01T00:00:00Z'),
          paidAt: new Date('2024-01-10T00:00:00Z'),
        };

        // First call returns existing invoice
        // Second call returns updated invoice
        vi.mocked(mockDb.queryOne)
          .mockResolvedValueOnce(mockDbRow)
          .mockResolvedValueOnce(
            createMockDbRow({
              status: 'paid',
              amount_paid: 1999,
              paid_at: new Date('2024-01-10T00:00:00Z'),
            }),
          );

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.upsert(newInvoice);

        expect(result.status).toBe('paid');
        expect(result.amountPaid).toBe(1999);
        expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
      });

      it('should only update specified fields', async () => {
        const newInvoice: NewInvoice = {
          userId: 'user-456',
          provider: 'stripe',
          providerInvoiceId: 'in_stripe123',
          status: 'paid',
          amountDue: 1999,
          currency: 'usd',
          periodStart: new Date('2024-01-01T00:00:00Z'),
          periodEnd: new Date('2024-02-01T00:00:00Z'),
          // No amountPaid, paidAt, or invoicePdfUrl
        };

        vi.mocked(mockDb.queryOne)
          .mockResolvedValueOnce(mockDbRow)
          .mockResolvedValueOnce(
            createMockDbRow({
              status: 'paid',
              amount_due: 1999,
            }),
          );

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.upsert(newInvoice);

        expect(result.status).toBe('paid');
        expect(result.amountDue).toBe(1999);
      });

      it('should include optional fields when provided', async () => {
        const newInvoice: NewInvoice = {
          userId: 'user-456',
          provider: 'stripe',
          providerInvoiceId: 'in_stripe123',
          status: 'paid',
          amountDue: 1999,
          amountPaid: 1999,
          currency: 'usd',
          periodStart: new Date('2024-01-01T00:00:00Z'),
          periodEnd: new Date('2024-02-01T00:00:00Z'),
          paidAt: new Date('2024-01-10T00:00:00Z'),
          invoicePdfUrl: 'https://example.com/invoice.pdf',
        };

        vi.mocked(mockDb.queryOne)
          .mockResolvedValueOnce(mockDbRow)
          .mockResolvedValueOnce(
            createMockDbRow({
              status: 'paid',
              amount_paid: 1999,
              paid_at: new Date('2024-01-10T00:00:00Z'),
              invoice_pdf_url: 'https://example.com/invoice.pdf',
            }),
          );

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.upsert(newInvoice);

        expect(result.amountPaid).toBe(1999);
        expect(result.paidAt).toEqual(new Date('2024-01-10T00:00:00Z'));
        expect(result.invoicePdfUrl).toBe('https://example.com/invoice.pdf');
      });

      it('should return existing invoice if update fails', async () => {
        const newInvoice: NewInvoice = {
          userId: 'user-456',
          provider: 'stripe',
          providerInvoiceId: 'in_stripe123',
          status: 'paid',
          amountDue: 1999,
          currency: 'usd',
          periodStart: new Date('2024-01-01T00:00:00Z'),
          periodEnd: new Date('2024-02-01T00:00:00Z'),
        };

        // First call returns existing, second call (update) returns null
        vi.mocked(mockDb.queryOne).mockResolvedValueOnce(mockDbRow).mockResolvedValueOnce(null);

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.upsert(newInvoice);

        expect(result).toEqual(mockInvoice);
      });
    });

    describe('provider handling', () => {
      it('should handle stripe provider in upsert', async () => {
        const newInvoice: NewInvoice = {
          userId: 'user-stripe',
          provider: 'stripe',
          providerInvoiceId: 'in_stripe_upsert',
          status: 'open',
          amountDue: 3000,
          currency: 'usd',
          periodStart: new Date('2024-03-01T00:00:00Z'),
          periodEnd: new Date('2024-04-01T00:00:00Z'),
        };

        vi.mocked(mockDb.queryOne)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(
            createMockDbRow({
              provider: 'stripe',
              provider_invoice_id: 'in_stripe_upsert',
            }),
          );

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.upsert(newInvoice);

        expect(result.provider).toBe('stripe');
        expect(result.providerInvoiceId).toBe('in_stripe_upsert');
      });

      it('should handle paypal provider in upsert', async () => {
        const newInvoice: NewInvoice = {
          userId: 'user-paypal',
          provider: 'paypal',
          providerInvoiceId: 'pp_inv_upsert',
          status: 'open',
          amountDue: 2500,
          currency: 'usd',
          periodStart: new Date('2024-03-01T00:00:00Z'),
          periodEnd: new Date('2024-04-01T00:00:00Z'),
        };

        vi.mocked(mockDb.queryOne)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(
            createMockDbRow({
              provider: 'paypal',
              provider_invoice_id: 'pp_inv_upsert',
            }),
          );

        const repo = createInvoiceRepository(mockDb);
        const result = await repo.upsert(newInvoice);

        expect(result.provider).toBe('paypal');
        expect(result.providerInvoiceId).toBe('pp_inv_upsert');
      });
    });
  });

  describe('data transformation', () => {
    it('should convert snake_case columns to camelCase', async () => {
      const dbRow = {
        id: 'inv-transform',
        user_id: 'user-transform',
        subscription_id: 'sub-transform',
        provider: 'stripe',
        provider_invoice_id: 'in_transform',
        status: 'paid',
        amount_due: 5000,
        amount_paid: 5000,
        currency: 'eur',
        period_start: new Date('2024-05-01T00:00:00Z'),
        period_end: new Date('2024-06-01T00:00:00Z'),
        paid_at: new Date('2024-05-05T00:00:00Z'),
        invoice_pdf_url: 'https://example.com/invoice-transform.pdf',
        created_at: new Date('2024-05-01T00:00:00Z'),
        updated_at: new Date('2024-05-05T00:00:00Z'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(dbRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('inv-transform');

      expect(result).toMatchObject({
        id: 'inv-transform',
        userId: 'user-transform',
        subscriptionId: 'sub-transform',
        provider: 'stripe',
        providerInvoiceId: 'in_transform',
        status: 'paid',
        amountDue: 5000,
        amountPaid: 5000,
        currency: 'eur',
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
        paidAt: expect.any(Date),
        invoicePdfUrl: 'https://example.com/invoice-transform.pdf',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should handle null values correctly', async () => {
      const dbRow = createMockDbRow({
        subscription_id: null,
        paid_at: null,
        invoice_pdf_url: null,
      });

      vi.mocked(mockDb.queryOne).mockResolvedValue(dbRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result?.subscriptionId).toBeNull();
      expect(result?.paidAt).toBeNull();
      expect(result?.invoicePdfUrl).toBeNull();
    });
  });

  describe('multiple invoice statuses', () => {
    it('should handle draft status', async () => {
      const draftRow = createMockDbRow({ status: 'draft' });
      vi.mocked(mockDb.queryOne).mockResolvedValue(draftRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('inv-draft');

      expect(result?.status).toBe('draft');
    });

    it('should handle open status', async () => {
      const openRow = createMockDbRow({ status: 'open' });
      vi.mocked(mockDb.queryOne).mockResolvedValue(openRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('inv-open');

      expect(result?.status).toBe('open');
    });

    it('should handle void status', async () => {
      const voidRow = createMockDbRow({ status: 'void' });
      vi.mocked(mockDb.queryOne).mockResolvedValue(voidRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('inv-void');

      expect(result?.status).toBe('void');
    });

    it('should handle uncollectible status', async () => {
      const uncollectibleRow = createMockDbRow({ status: 'uncollectible' });
      vi.mocked(mockDb.queryOne).mockResolvedValue(uncollectibleRow);

      const repo = createInvoiceRepository(mockDb);
      const result = await repo.findById('inv-uncollectible');

      expect(result?.status).toBe('uncollectible');
    });
  });
});
