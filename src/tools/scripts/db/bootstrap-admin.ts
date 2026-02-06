// tools/scripts/db/bootstrap-admin.ts
/**
 * Production Admin Bootstrap Script
 *
 * Creates the initial admin user for first deployment.
 * Generates a secure random password that must be changed on first login.
 *
 * Usage:
 *   pnpm db:bootstrap:admin
 *
 * Environment variables:
 *   ADMIN_EMAIL - Admin email (default: admin@localhost)
 *   ADMIN_NAME  - Admin display name (default: Administrator)
 *
 * This script is SAFE for production:
 * - Generates cryptographically secure random password
 * - Will not overwrite existing admin user
 * - Outputs credentials only once (save them!)
 */

import { randomBytes } from 'node:crypto';

import {
  buildConnectionString,
  createDbClient,
  eq,
  insert,
  select,
  USERS_TABLE,
} from '@abe-stack/db';

import { hashPassword } from '@abe-stack/core/auth';

interface BootstrapResult {
  email: string;
  password: string;
  created: boolean;
}

/**
 * Generate a cryptographically secure random password
 *
 * @param length - Password length in characters
 * @returns A random password string using alphanumeric + special characters
 * @complexity O(n) where n = length
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
 * Bootstrap the initial admin user in the database.
 *
 * Uses DEFAULT_ARGON2_CONFIG from @abe-stack/auth for password hashing,
 * avoiding the need to load the full server AppConfig.
 *
 * @returns Bootstrap result with email, generated password, and creation status
 * @throws {Error} If database connection or query fails
 * @complexity O(1) — single DB read + conditional write
 */
export async function bootstrapAdmin(): Promise<BootstrapResult> {
  const envEmail = process.env['ADMIN_EMAIL'];
  const email = envEmail !== undefined && envEmail !== '' ? envEmail : 'admin@localhost';
  const envName = process.env['ADMIN_NAME'];
  const name = envName !== undefined && envName !== '' ? envName : 'Administrator';

  console.log('🔐 Production Admin Bootstrap\n');
  console.log('Creating initial admin user...\n');

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  // Check if admin already exists
  const existing = await db.query<Record<string, unknown>>(
    select(USERS_TABLE).where(eq('email', email)).limit(1).toSql(),
  );

  if (existing.length > 0) {
    console.log(`⚠️  Admin user already exists: ${email}`);
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

  console.log('✅ Admin user created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SAVE THESE CREDENTIALS - SHOWN ONLY ONCE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  Change this password immediately after first login!\n');

  return { email, password, created: true };
}

// Only run when executed directly
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('bootstrap-admin') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  bootstrapAdmin()
    .then((result) => {
      process.exit(result.created ? 0 : 1);
    })
    .catch((error: unknown) => {
      console.error('❌ Bootstrap failed:', error);
      process.exit(1);
    });
}
