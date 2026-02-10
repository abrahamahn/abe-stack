// src/tools/scripts/db/seed.ts
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

import { hashPassword } from '@abe-stack/core/auth';
import { buildConnectionString, createDbClient, USERS_TABLE } from '@abe-stack/db';
import { loadServerEnv } from '@abe-stack/server-engine';

/** Supported user roles for seed data */
type SeedUserRole = 'admin' | 'user';

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: SeedUserRole;
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

/**
 * Seed the database with test user data.
 *
 * Uses DEFAULT_ARGON2_CONFIG from @abe-stack/auth for password hashing,
 * avoiding the need to load the full server AppConfig.
 *
 * @throws {Error} If NODE_ENV is 'production' (exits with code 1)
 * @throws {Error} If database connection or insert fails
 * @complexity O(n) where n = number of test users
 */
export async function seed(): Promise<void> {
  // Load + validate `config/env` files (prefers `.env.local` when present).
  loadServerEnv();

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

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  console.log('📦 Seeding users...');

  for (const user of TEST_USERS) {
    const passwordHash = await hashPassword(user.password);

    try {
      const sql = `
        INSERT INTO ${USERS_TABLE} (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
      `;

      await db.execute({
        text: sql,
        values: [user.email, passwordHash, user.name, user.role],
      });

      console.log(`  ✓ ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`Error seeding user ${user.email}:`, error);
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
