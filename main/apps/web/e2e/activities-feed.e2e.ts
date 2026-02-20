// main/apps/web/e2e/activities-feed.e2e.ts
/**
 * Activities Feed E2E
 *
 * Flow:
 * 1) Login
 * 2) Trigger a user action (env-configured API endpoint)
 * 3) Open activities page
 * 4) Verify activity entry is visible
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];
const triggerPath = process.env['E2E_ACTIVITY_TRIGGER_PATH'];
const triggerBody = process.env['E2E_ACTIVITY_TRIGGER_BODY'] ?? '{}';
const expectedText = process.env['E2E_ACTIVITY_EXPECT_TEXT'];

async function login(page: import('@playwright/test').Page, userEmail: string, userPassword: string) {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel(/email/i).fill(userEmail);
  await page.getByLabel(/password/i).fill(userPassword);
  await page.getByRole('button', { name: /login|sign in/i }).first().click();
}

test.describe('Activity feed flow', () => {
  test('perform action -> see it in activity feed', async ({ page }) => {
    test.skip(
      email === undefined ||
        password === undefined ||
        triggerPath === undefined ||
        expectedText === undefined,
      'Set E2E_EMAIL, E2E_PASSWORD, E2E_ACTIVITY_TRIGGER_PATH, and E2E_ACTIVITY_EXPECT_TEXT.',
    );

    await login(page, email ?? '', password ?? '');

    const triggerResponse = await page.evaluate(
      async ({ path, body }) => {
        const payload = JSON.parse(body) as unknown;
        const response = await fetch(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        return { ok: response.ok, status: response.status };
      },
      { path: triggerPath ?? '', body: triggerBody },
    );
    expect(triggerResponse.status).toBeLessThan(500);

    await page.goto(`${baseURL}/activities`);
    await expect(page.getByRole('heading', { name: /activity/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(expectedText ?? '').first()).toBeVisible({ timeout: 15000 });
  });
});
