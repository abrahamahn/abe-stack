// apps/server/src/scripts/seed.ts
/**
 * Database Seed Script
 *
 * Seeds the database with test data for development.
 * Run with: pnpm db:seed
 *
 * Environment variables are loaded via Node's native --env-file flag in package.json scripts.
 *
 * Default test users:
 * - admin@example.com / password123 (admin role)
 * - user@example.com / password123 (user role)
 * - demo@example.com / password123 (user role)
 */

import { loadConfig } from '../config';
import { buildConnectionString, createDbClient, users } from '../infra/database';
import { hashPassword } from '../modules/auth/utils/password';

interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
}

const TEST_USERS: SeedUser[] = [
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

async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  // Load configuration to get Argon2 options
  const config = loadConfig(process.env);

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  console.log('📦 Seeding users...');

  for (const user of TEST_USERS) {
    const passwordHash = await hashPassword(user.password, config.auth.argon2);

    try {
      await db
        .insert(users)
        .values({
          email: user.email,
          passwordHash,
          name: user.name,
          role: user.role,
        })
        .onConflictDoNothing({ target: users.email });

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

seed().catch((error: unknown) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
