// main/apps/web/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';
import { createTestUser, type TestUser } from './user-factory';

export interface AuthFixtures {
  user: TestUser;
  authenticatedPage: void;
}

/**
 * Playwright fixture that ensures a user is logged in before running tests.
 */
export const test = base.extend<AuthFixtures>({
  // Create a new user for each test
  user: async ({}, use) => {
    const user = await createTestUser();
    await use(user);
  },

  // Perform login before the test
  authenticatedPage: async ({ page, user }, use) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    await use();
  },
});

export { expect } from '@playwright/test';
