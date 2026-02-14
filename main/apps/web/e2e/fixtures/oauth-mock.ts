// main/apps/web/e2e/fixtures/oauth-mock.ts
import { test as base } from '@playwright/test';

export interface OAuthMockFixtures {
  mockOAuth: (provider: string) => Promise<void>;
}

/**
 * Playwright fixture to mock OAuth provider interactions.
 */
export const test = base.extend<OAuthMockFixtures>({
  mockOAuth: async ({ page }, use) => {
    const mockOAuthHandler = async (provider: string) => {
      // Intercept the redirect to the OAuth provider
      await page.route(`**/auth/oauth/${provider}*`, async (route) => {
        // Instead of redirecting to Google/GitHub, redirect back to our callback
        const callbackUrl = `/api/auth/oauth/${provider}/callback?code=mock-code&state=mock-state`;
        await route.fulfill({
          status: 302,
          headers: { location: callbackUrl },
        });
      });
    };

    await use(mockOAuthHandler);
  },
});
