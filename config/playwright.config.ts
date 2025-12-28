import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
const DB_PATH = `db/data-${String(Math.round(Math.random() * 1e10))}.json`;

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: '../apps/web/e2e',
  testMatch: /.*\.e2e\.(ts|tsx)/,
  reporter: [['list'], ['html', { open: CI ? 'never' : 'on-failure' }], CI ? ['github'] : ['line']],
  fullyParallel: !CI, // Enable parallel execution in development
  forbidOnly: CI,

  retries: CI ? 2 : 0, // Retry failed tests in CI

  expect: {
    timeout: CI ? 10000 : 5000,
  },
  timeout: CI ? 30000 : 15000,

  use: {
    headless: CI, // Run headless in CI, headful in development

    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://localhost:8080',

    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Configure projects for major browsers.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run your local dev server before starting the tests.
  webServer: {
    command: `DB_PATH='${DB_PATH}' npm start`,
    url: 'http://localhost:8080',
    // reuseExistingServer: !CI,
  },
});
