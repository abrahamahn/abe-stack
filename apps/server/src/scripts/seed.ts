// apps/server/src/scripts/seed.ts
/* eslint-disable no-console */
// apps/server/src/scripts/seed.ts
/**
 * Database Seed Script
 *
 * Seeds the database with test data for development.
 * Run with: pnpm db:seed
 *
 * Environment variables are loaded via Node's native --env-file flag in package.json scripts.
 *
 * WARNING: This script is for DEVELOPMENT ONLY. It uses hardcoded test passwords
 * and will refuse to run in production environments.
 *
 * Default test users:
 * - admin@example.com / password123 (admin role)
 * - user@example.com / password123 (user role)
 * - demo@example.com / password123 (user role)
 */

import { buildConnectionString, createDbClient, insert, USERS_TABLE } from '@abe-stack/db';
import { hashPassword } from '@auth/utils/password';

import type { UserRole } from '@abe-stack/core';

import { loadConfig } from '@/config';

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

/**
 * WARNING: These are hardcoded test credentials for DEVELOPMENT ONLY.
 * Never use these passwords in production. The seed script will refuse
 * to run if NODE_ENV === 'production'.
 */
export const TEST_USERS: SeedUser[] = [
  {
    email: 'admin@example.com',
    password: 'password123',
    name: 'Admin User',
    role: 'admin',
  },
  {
    email: 'user@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'user',
  },
  {
    email: 'demo@example.com',
    password: 'password123',
    name: 'Demo User',
    role: 'user',
  },
];

export async function seed(): Promise<void> {
  // Safety check: refuse to seed in production
  if (process.env['NODE_ENV'] === 'production') {
    console.error('');
    console.error('ERROR: Cannot run seed script in production!');
    console.error('');
    console.error('This script uses hardcoded test passwords and is intended');
    console.error('for development environments only. Running this in production');
    console.error('would create accounts with known, insecure passwords.');
    console.error('');
    console.error('If you need to create initial users in production, use a');
    console.error('secure provisioning process with strong, unique passwords.');
    console.error('');
    process.exit(1);
  }

  console.log('🌱 Starting database seed...\n');

  // Load configuration to get Argon2 options
  const config = loadConfig(process.env);

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  console.log('📦 Seeding users...');

  for (const user of TEST_USERS) {
    const passwordHash = await hashPassword(user.password, config.auth.argon2);

    try {
      await db.execute(
        insert(USERS_TABLE)
          .values({
            email: user.email,
            password_hash: passwordHash,
            name: user.name,
            role: user.role,
          })
          .onConflictDoNothing('email')
          .toSql(),
      );

      console.log(`  ✓ ${user.email} (${user.role})`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique')) {
        console.log(`  ⊘ ${user.email} (already exists)`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Test credentials:');
  console.log('  Email: admin@example.com');
  console.log('  Password: password123');
  console.log('');

  process.exit(0);
}

// Only run when executed directly (not imported for testing)
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('seed') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  seed().catch((error: unknown) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
}
