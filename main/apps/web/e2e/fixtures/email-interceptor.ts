// main/apps/web/e2e/fixtures/email-interceptor.ts
import { test as base } from '@playwright/test';

export interface EmailInterceptorFixtures {
  emails: {
    get: (to: string) => Promise<any[]>;
    clear: () => Promise<void>;
  };
}

/**
 * Playwright fixture to intercept and query sent emails during E2E tests.
 * This assumes the backend has a test endpoint or uses a shared memory store for emails.
 */
export const test = base.extend<EmailInterceptorFixtures>({
  emails: async ({ request }, use) => {
    await use({
      get: async (to: string) => {
        // In a real implementation, call a test API endpoint
        const response = await request.get(`/api/test/emails?to=${to}`);
        return response.json();
      },
      clear: async () => {
        await request.delete('/api/test/emails');
      },
    });
  },
});
