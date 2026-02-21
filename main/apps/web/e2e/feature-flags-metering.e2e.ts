// main/apps/web/e2e/feature-flags-metering.e2e.ts
/**
 * Feature Flags + Usage Metering E2E
 *
 * Flow:
 * 1) Admin login
 * 2) Toggle a feature flag (env-configured endpoint)
 * 3) Trigger usage-producing action (env-configured endpoint)
 * 4) Verify feature state and usage text/bar on target page
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
const togglePath = process.env['E2E_FLAG_TOGGLE_PATH'];
const toggleBody = process.env['E2E_FLAG_TOGGLE_BODY'] ?? '{}';
const usageActionPath = process.env['E2E_USAGE_ACTION_PATH'];
const usageActionBody = process.env['E2E_USAGE_ACTION_BODY'] ?? '{}';
const verifyPagePath = process.env['E2E_USAGE_VERIFY_PAGE_PATH'] ?? '/settings/workspace';
const featureExpectedText = process.env['E2E_FEATURE_EXPECT_TEXT'];
const usageExpectedText = process.env['E2E_USAGE_EXPECT_TEXT'];

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page
    .getByRole('button', { name: /login|sign in/i })
    .first()
    .click();
}

test.describe('Feature flag + usage metering flow', () => {
  test('admin toggles flag and usage bar updates after action', async ({ page }) => {
    test.skip(
      adminEmail === undefined ||
        adminPassword === undefined ||
        togglePath === undefined ||
        usageActionPath === undefined ||
        featureExpectedText === undefined ||
        usageExpectedText === undefined,
      'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_FLAG_TOGGLE_PATH, E2E_USAGE_ACTION_PATH, E2E_FEATURE_EXPECT_TEXT, and E2E_USAGE_EXPECT_TEXT.',
    );

    await login(page, adminEmail ?? '', adminPassword ?? '');

    const toggleResult = await page.evaluate(
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
      { path: togglePath ?? '', body: toggleBody },
    );
    expect(toggleResult.status).toBeLessThan(500);

    const usageResult = await page.evaluate(
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
      { path: usageActionPath ?? '', body: usageActionBody },
    );
    expect(usageResult.status).toBeLessThan(500);

    await page.goto(`${baseURL}${verifyPagePath}`);
    await expect(page.getByText(featureExpectedText ?? '').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(usageExpectedText ?? '').first()).toBeVisible({ timeout: 15000 });
  });
});
