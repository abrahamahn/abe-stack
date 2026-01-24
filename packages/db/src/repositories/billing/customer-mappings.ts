// packages/db/src/repositories/billing/customer-mappings.ts
/**
 * Customer Mappings Repository
 *
 * Data access layer for userId ↔ provider customerId mapping.
 */

import { and, eq, select, insert, deleteFrom } from '../../builder';
import {
  type CustomerMapping,
  type NewCustomerMapping,
  CUSTOMER_MAPPING_COLUMNS,
  CUSTOMER_MAPPINGS_TABLE,
} from '../../schema';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Customer Mapping Repository Interface
// ============================================================================

export interface CustomerMappingRepository {
  /** Find mapping by user ID and provider */
  findByUserIdAndProvider(
    userId: string,
    provider: 'stripe' | 'paypal',
  ): Promise<CustomerMapping | null>;

  /** Find mapping by provider customer ID */
  findByProviderCustomerId(
    provider: 'stripe' | 'paypal',
    providerCustomerId: string,
  ): Promise<CustomerMapping | null>;

  /** Find all mappings for a user */
  findByUserId(userId: string): Promise<CustomerMapping[]>;

  /** Create a new customer mapping */
  create(mapping: NewCustomerMapping): Promise<CustomerMapping>;

  /** Delete a customer mapping */
  delete(id: string): Promise<boolean>;

  /** Delete all mappings for a user */
  deleteByUserId(userId: string): Promise<number>;

  /** Get or create customer mapping for user */
  getOrCreate(
    userId: string,
    provider: 'stripe' | 'paypal',
    createCustomerId: () => Promise<string>,
  ): Promise<CustomerMapping>;
}

// ============================================================================
// Customer Mapping Repository Implementation
// ============================================================================

/**
 * Create a customer mapping repository
 */
export function createCustomerMappingRepository(db: RawDb): CustomerMappingRepository {
  return {
    async findByUserIdAndProvider(
      userId: string,
      provider: 'stripe' | 'paypal',
    ): Promise<CustomerMapping | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(CUSTOMER_MAPPINGS_TABLE)
          .where(and(eq('user_id', userId), eq('provider', provider)))
          .toSql(),
      );
      return result ? toCamelCase<CustomerMapping>(result, CUSTOMER_MAPPING_COLUMNS) : null;
    },

    async findByProviderCustomerId(
      provider: 'stripe' | 'paypal',
      providerCustomerId: string,
    ): Promise<CustomerMapping | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(CUSTOMER_MAPPINGS_TABLE)
          .where(and(eq('provider', provider), eq('provider_customer_id', providerCustomerId)))
          .toSql(),
      );
      return result ? toCamelCase<CustomerMapping>(result, CUSTOMER_MAPPING_COLUMNS) : null;
    },

    async findByUserId(userId: string): Promise<CustomerMapping[]> {
      const results = await db.query<Record<string, unknown>>(
        select(CUSTOMER_MAPPINGS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'asc')
          .toSql(),
      );
      return results.map((row) => toCamelCase<CustomerMapping>(row, CUSTOMER_MAPPING_COLUMNS));
    },

    async create(mapping: NewCustomerMapping): Promise<CustomerMapping> {
      const snakeData = toSnakeCase(
        mapping as unknown as Record<string, unknown>,
        CUSTOMER_MAPPING_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(CUSTOMER_MAPPINGS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (!result) {
        throw new Error('Failed to create customer mapping');
      }
      return toCamelCase<CustomerMapping>(result, CUSTOMER_MAPPING_COLUMNS);
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(CUSTOMER_MAPPINGS_TABLE).where(eq('id', id)).toSql(),
      );
      return count > 0;
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(CUSTOMER_MAPPINGS_TABLE).where(eq('user_id', userId)).toSql());
    },

    async getOrCreate(
      userId: string,
      provider: 'stripe' | 'paypal',
      createCustomerId: () => Promise<string>,
    ): Promise<CustomerMapping> {
      // Check for existing mapping
      const existing = await this.findByUserIdAndProvider(userId, provider);
      if (existing) {
        return existing;
      }

      // Create new customer in provider
      const providerCustomerId = await createCustomerId();

      // Store the mapping
      return this.create({
        userId,
        provider,
        providerCustomerId,
      });
    },
  };
}
