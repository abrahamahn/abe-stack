'use strict';
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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
/* eslint-disable no-console */
const argon2_1 = __importDefault(require('argon2'));
const client_1 = require('../src/client');
const users_1 = require('../src/schema/users');
// Argon2id configuration (OWASP recommended)
const ARGON2_OPTIONS = {
  type: argon2_1.default.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};
const TEST_USERS = [
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
async function hashPassword(password) {
  return argon2_1.default.hash(password, ARGON2_OPTIONS);
}
async function seed() {
  console.log('🌱 Starting database seed...\n');
  const connectionString = (0, client_1.buildConnectionString)();
  const db = (0, client_1.createDbClient)(connectionString);
  console.log('📦 Seeding users...');
  for (const user of TEST_USERS) {
    const passwordHash = await hashPassword(user.password);
    try {
      await db
        .insert(users_1.users)
        .values({
          email: user.email,
          passwordHash,
          name: user.name,
          role: user.role,
        })
        .onConflictDoNothing({ target: users_1.users.email });
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
seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
//# sourceMappingURL=seed.js.map
