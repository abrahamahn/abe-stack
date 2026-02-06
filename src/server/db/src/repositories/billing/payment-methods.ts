// backend/db/src/repositories/billing/payment-methods.ts
/**
 * Payment Methods Repository
 *
 * Data access layer for billing payment_methods table.
 */

import { and, eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type CardDetails,
  type NewPaymentMethod,
  type PaymentMethod,
  type UpdatePaymentMethod,
  PAYMENT_METHOD_COLUMNS,
  PAYMENT_METHODS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase, parseJsonb } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Payment Method Repository Interface
// ============================================================================

export interface PaymentMethodRepository {
  /** Find payment method by ID */
  findById(id: string): Promise<PaymentMethod | null>;

  /** Find payment method by provider payment method ID */
  findByProviderPaymentMethodId(
    provider: 'stripe' | 'paypal',
    providerPaymentMethodId: string,
  ): Promise<PaymentMethod | null>;

  /** List payment methods for a user */
  findByUserId(userId: string): Promise<PaymentMethod[]>;

  /** Get default payment method for user */
  findDefaultByUserId(userId: string): Promise<PaymentMethod | null>;

  /** Create a new payment method */
  create(paymentMethod: NewPaymentMethod): Promise<PaymentMethod>;

  /** Update a payment method */
  update(id: string, data: UpdatePaymentMethod): Promise<PaymentMethod | null>;

  /** Delete a payment method */
  delete(id: string): Promise<boolean>;

  /** Delete by provider payment method ID */
  deleteByProviderPaymentMethodId(
    provider: 'stripe' | 'paypal',
    providerPaymentMethodId: string,
  ): Promise<boolean>;

  /** Set payment method as default (and unset others) */
  setAsDefault(userId: string, paymentMethodId: string): Promise<PaymentMethod | null>;

  /** Clear default flag from all user's payment methods */
  clearDefaultForUser(userId: string): Promise<void>;
}

// ============================================================================
// Payment Method Repository Implementation
// ============================================================================

/**
 * Transform raw database row to PaymentMethod type
 */
function transformPaymentMethod(row: Record<string, unknown>): PaymentMethod {
  const pm = toCamelCase<PaymentMethod>(row, PAYMENT_METHOD_COLUMNS);
  // Parse JSONB card details
  pm.cardDetails = parseJsonb(row['card_details'] as string | null) as CardDetails | null;
  return pm;
}

/**
 * Create a payment method repository
 */
export function createPaymentMethodRepository(db: RawDb): PaymentMethodRepository {
  return {
    async findById(id: string): Promise<PaymentMethod | null> {
      const result = await db.queryOne(select(PAYMENT_METHODS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformPaymentMethod(result) : null;
    },

    async findByProviderPaymentMethodId(
      provider: 'stripe' | 'paypal',
      providerPaymentMethodId: string,
    ): Promise<PaymentMethod | null> {
      const result = await db.queryOne(
        select(PAYMENT_METHODS_TABLE)
          .where(
            and(
              eq('provider', provider),
              eq('provider_payment_method_id', providerPaymentMethodId),
            ),
          )
          .toSql(),
      );
      return result !== null ? transformPaymentMethod(result) : null;
    },

    async findByUserId(userId: string): Promise<PaymentMethod[]> {
      const results = await db.query(
        select(PAYMENT_METHODS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('is_default', 'desc')
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformPaymentMethod);
    },

    async findDefaultByUserId(userId: string): Promise<PaymentMethod | null> {
      const result = await db.queryOne(
        select(PAYMENT_METHODS_TABLE)
          .where(and(eq('user_id', userId), eq('is_default', true)))
          .limit(1)
          .toSql(),
      );
      return result !== null ? transformPaymentMethod(result) : null;
    },

    async create(paymentMethod: NewPaymentMethod): Promise<PaymentMethod> {
      const snakeData = toSnakeCase(
        paymentMethod as unknown as Record<string, unknown>,
        PAYMENT_METHOD_COLUMNS,
      );
      // Ensure card details is JSON stringified
      if (paymentMethod.cardDetails !== undefined) {
        snakeData['card_details'] = JSON.stringify(paymentMethod.cardDetails);
      }
      const result = await db.queryOne(
        insert(PAYMENT_METHODS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create payment method');
      }
      return transformPaymentMethod(result);
    },

    async update(id: string, data: UpdatePaymentMethod): Promise<PaymentMethod | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        PAYMENT_METHOD_COLUMNS,
      );
      // Ensure card details is JSON stringified
      if (data.cardDetails !== undefined) {
        snakeData['card_details'] = JSON.stringify(data.cardDetails);
      }
      const result = await db.queryOne(
        update(PAYMENT_METHODS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformPaymentMethod(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(PAYMENT_METHODS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async deleteByProviderPaymentMethodId(
      provider: 'stripe' | 'paypal',
      providerPaymentMethodId: string,
    ): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(PAYMENT_METHODS_TABLE)
          .where(
            and(
              eq('provider', provider),
              eq('provider_payment_method_id', providerPaymentMethodId),
            ),
          )
          .toSql(),
      );
      return count > 0;
    },

    async setAsDefault(userId: string, paymentMethodId: string): Promise<PaymentMethod | null> {
      // First, unset all defaults for user
      await this.clearDefaultForUser(userId);

      // Then set the specified payment method as default
      const result = await db.queryOne(
        update(PAYMENT_METHODS_TABLE)
          .set({ ['is_default']: true })
          .where(and(eq('id', paymentMethodId), eq('user_id', userId)))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformPaymentMethod(result) : null;
    },

    async clearDefaultForUser(userId: string): Promise<void> {
      await db.execute(
        update(PAYMENT_METHODS_TABLE)
          .set({ ['is_default']: false })
          .where(eq('user_id', userId))
          .toSql(),
      );
    },
  };
}
