// packages/db/scripts/seed.ts
/**
 * Database Seed Script
 *
 * Seeds the database with test data for development.
 * Run with: pnpm db:seed
 *
 * Default test users:
 * - admin@example.com / password123 (admin role)
 * - user@example.com / password123 (user role)
 */

/* eslint-disable no-console */

import argon2 from 'argon2';

import { buildConnectionString, createDbClient } from '../src/client';
import { users } from '../src/schema/users';

// Argon2id configuration (OWASP recommended)
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

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

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  console.log('📦 Seeding users...');

  for (const user of TEST_USERS) {
    const passwordHash = await hashPassword(user.password);

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
