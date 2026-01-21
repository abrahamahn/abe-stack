// apps/server/src/infrastructure/data/database/schema/magic-link.ts
/**
 * Magic Link Tokens Schema
 *
 * Stores magic link tokens for passwordless authentication.
 * Tokens are hashed before storage for security.
 */

import { index, inet, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Magic link tokens for passwordless authentication
 *
 * Security considerations:
 * - Token is hashed (SHA-256) before storage
 * - Short expiry (15 minutes)
 * - Single-use (marked as used after verification)
 * - Rate limited at application level (3 requests per email per hour)
 */
export const magicLinkTokens = pgTable(
  'magic_link_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => [
    // Index for finding tokens by email and checking expiry
    index('magic_link_tokens_email_expires_at_idx').on(table.email, table.expiresAt),
    // Index for cleanup queries
    index('magic_link_tokens_created_at_idx').on(table.createdAt),
  ],
);

// Inferred types
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type NewMagicLinkToken = typeof magicLinkTokens.$inferInsert;
