// apps/server/src/infrastructure/data/database/schema/oauth.ts
/**
 * OAuth Connections Schema
 *
 * Stores OAuth provider connections linked to user accounts.
 * Supports multiple providers per user (Google, GitHub, Apple).
 */

import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

// ============================================================================
// Enums
// ============================================================================

/**
 * Supported OAuth providers
 */
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'github', 'apple']);

export type OAuthProvider = 'google' | 'github' | 'apple';

export const OAUTH_PROVIDERS = ['google', 'github', 'apple'] as const;

// ============================================================================
// OAuth Connections Table
// ============================================================================

/**
 * OAuth connections table
 * Links external OAuth provider accounts to users
 */
export const oauthConnections = pgTable(
  'oauth_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    providerEmail: text('provider_email'),
    // Tokens are stored encrypted (encryption happens at service layer)
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // User can only have one connection per provider
    unique('oauth_connections_user_provider_unique').on(table.userId, table.provider),
    // Provider user ID must be unique per provider (one OAuth account = one user)
    unique('oauth_connections_provider_user_id_unique').on(table.provider, table.providerUserId),
    // Index for finding user's connections
    index('oauth_connections_user_id_idx').on(table.userId),
    // Index for finding user by provider
    index('oauth_connections_provider_idx').on(table.provider, table.providerUserId),
  ],
);

// ============================================================================
// Inferred Types
// ============================================================================

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;
