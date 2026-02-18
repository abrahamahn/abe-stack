// main/apps/server/src/__tests__/integration/seed-helpers.ts
/**
 * Test Seed Helpers
 *
 * Provides functions to seed isolated test databases with required data.
 */

import { hashPassword } from '@bslt/core/auth';
import { createDbClient, USERS_TABLE } from '@bslt/db';
import { canonicalizeEmail } from '@bslt/shared';

/**
 * Seed a test user into the provided database.
 */
export async function seedTestUser(
  connectionString: string,
  overrides: { email: string; password?: string; role?: string },
): Promise<void> {
  const db = createDbClient(connectionString);
  const { email, password = 'TestPassword123!', role = 'user' } = overrides;

  try {
    const passwordHash = await hashPassword(password);
    const canonical = canonicalizeEmail(email);
    const username = email.split('@')[0];

    await db.execute({
      text: `
        INSERT INTO ${USERS_TABLE} (email, canonical_email, password_hash, username, role, email_verified, email_verified_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
      `,
      values: [email, canonical, passwordHash, username, role],
    });
  } finally {
    await db.close();
  }
}
