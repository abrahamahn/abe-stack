// main/apps/web/e2e/fixtures/user-factory.ts
import { expect } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

/**
 * Factory for creating test users in the database.
 * In a real implementation, this would call an internal API or directly access the test DB.
 * For now, we'll use a placeholder that assumes users might be seeded or created via registration.
 */
export async function createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
  const timestamp = Date.now();
  return {
    id: `user-${timestamp}`,
    email: `test-${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    password: 'TestPassword123!',
    ...overrides,
  };
}
