// apps/server/src/infra/database/schema/auth.ts
import { users } from '@schema/users';
import { boolean, index, inet, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';


/**
 * Refresh token families for reuse detection
 * When a refresh token is reused after rotation, we revoke the entire family
 */
export const refreshTokenFamilies = pgTable('refresh_token_families', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  revokeReason: text('revoke_reason'),
});

/**
 * Login attempts for rate limiting and account lockout
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    success: boolean('success').notNull(),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('login_attempts_email_idx').on(table.email),
    index('login_attempts_created_at_idx').on(table.createdAt),
    index('login_attempts_ip_address_idx').on(table.ipAddress),
  ],
);

/**
 * Password reset tokens
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('password_reset_tokens_user_id_idx').on(table.userId)],
);

/**
 * Email verification tokens
 */
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('email_verification_tokens_user_id_idx').on(table.userId)],
);

/**
 * Security events for audit trail and monitoring
 * Tracks critical security events like token reuse, account lockouts, etc.
 */
export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Nullable - some events may be for non-existent users
    email: text('email'), // Store email for user-less events
    eventType: text('event_type').notNull(), // 'token_reuse', 'account_locked', 'account_unlocked', etc.
    severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    metadata: text('metadata'), // JSON string for additional context
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('security_events_user_id_idx').on(table.userId),
    index('security_events_email_idx').on(table.email),
    index('security_events_event_type_idx').on(table.eventType),
    index('security_events_severity_idx').on(table.severity),
    index('security_events_created_at_idx').on(table.createdAt),
  ],
);

// Inferred types
export type RefreshTokenFamily = typeof refreshTokenFamilies.$inferSelect;
export type NewRefreshTokenFamily = typeof refreshTokenFamilies.$inferInsert;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;
