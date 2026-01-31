// infra/db/src/scripts/bootstrap-admin.ts
/* eslint-disable no-console */
/**
 * Production Admin Bootstrap Script
 *
 * Creates the initial admin user for first deployment.
 * Generates a secure random password that must be changed on first login.
 *
 * Usage:
 *   pnpm db:bootstrap:admin
 *   node dist/scripts/bootstrap-admin.js
 *
 * Environment variables:
 *   ADMIN_EMAIL - Admin email (default: admin@localhost)
 *   ADMIN_NAME  - Admin display name (default: Administrator)
 *
 * This script is SAFE for production:
 * - Generates cryptographically secure random password
 * - Will not overwrite existing admin user
 * - Outputs credentials only once (save them!)
 *
 * @module
 */

import { randomBytes } from 'node:crypto';

import { eq, insert, select } from '../builder/index';
import { buildConnectionString, createDbClient } from '../client';
import { USERS_TABLE } from '../schema/index';

import type { PasswordHasher } from './seed';

/**
 * Result of the admin bootstrap operation.
 */
interface BootstrapResult {
  /** Admin email address */
  email: string;
  /** Generated password (empty string if user already existed) */
  password: string;
  /** Whether a new user was created */
  created: boolean;
}

/**
 * Generate a cryptographically secure random password.
 *
 * Uses `crypto.randomBytes` mapped onto a character set including
 * lowercase, uppercase, digits, and special characters.
 *
 * @param length - Password length (default: 24).
 * @returns Generated password string.
 * @complexity O(n) where n is the password length.
 */
function generateSecurePassword(length = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    const byteValue: number = bytes[i] ?? 0;
    const char: string = chars[byteValue % chars.length] ?? '';
    password += char;
  }

  return password;
}

/**
 * Bootstrap an admin user in the database.
 *
 * This function is framework-agnostic: the caller provides a `hashPassword`
 * callback so this module does not depend on argon2 or server configuration.
 *
 * If an admin user with the specified email already exists, no changes are made.
 *
 * @param hashPassword - Callback to hash plaintext passwords.
 * @returns Bootstrap result indicating whether a user was created.
 */
export async function bootstrapAdmin(hashPassword: PasswordHasher): Promise<BootstrapResult> {
  const envEmail = process.env['ADMIN_EMAIL'];
  const email = envEmail !== undefined && envEmail !== '' ? envEmail : 'admin@localhost';
  const envName = process.env['ADMIN_NAME'];
  const name = envName !== undefined && envName !== '' ? envName : 'Administrator';

  console.log('Production Admin Bootstrap\n');
  console.log('Creating initial admin user...\n');

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  // Check if admin already exists
  const existing = await db.query<Record<string, unknown>>(
    select(USERS_TABLE).where(eq('email', email)).limit(1).toSql(),
  );

  if (existing.length > 0) {
    console.log(`Admin user already exists: ${email}`);
    console.log('   No changes made. Use password reset if needed.\n');
    return { email, password: '', created: false };
  }

  // Generate secure random password
  const password = generateSecurePassword();
  const passwordHash = await hashPassword(password);

  // Create admin user
  await db.execute(
    insert(USERS_TABLE)
      .values({
        email,
        password_hash: passwordHash,
        name,
        role: 'admin',
        email_verified_at: new Date(),
      })
      .toSql(),
  );

  console.log('Admin user created successfully!\n');
  console.log('='.repeat(58));
  console.log('  SAVE THESE CREDENTIALS - SHOWN ONLY ONCE');
  console.log('='.repeat(58));
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('='.repeat(58) + '\n');
  console.log('Change this password immediately after first login!\n');

  return { email, password, created: true };
}
