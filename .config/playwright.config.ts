import { defineConfig, devices } from '@playwright/test';
// @ts-ignore - Resolving from monorepo source without build
import { initEnv } from '../shared/core/src/config/env.loader';

// Initialize environment variables using the custom monorepo loader
initEnv();

const CI = Boolean(process.env.CI);
const PORT = 5173;
// const API_PORT = 8080; // Uncomment if your E2E tests require the live backend

export default defineConfig({
  testDir: '../apps/web/src/__tests__/e2e',
  testMatch: /.*\.e2e\.(ts|tsx)/,
  reporter: CI
    ? [['github'], ['blob']]
    : [['list'], ['html', { open: 'on-failure' }]],
  fullyParallel: !CI,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: [
    {
      command: CI ? 'pnpm --filter @abe-stack/web preview' : 'pnpm dev:web',
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    /* Uncomment if your E2E tests require the live backend
    {
      command: 'pnpm --filter @abe-stack/server dev',
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !CI,
    }
    */
  ],
});
