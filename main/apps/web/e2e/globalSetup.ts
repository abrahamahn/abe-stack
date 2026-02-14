// main/apps/web/e2e/globalSetup.ts
import { type FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright E2E tests.
 * Runs once before all test suites.
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  console.log(`Global setup starting for ${baseURL}...`);

  // 1. Check if backend is available
  // 2. Perform global seeding if needed
  // 3. Clear existing test data
}

export default globalSetup;
