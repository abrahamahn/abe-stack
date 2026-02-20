// main/apps/web/e2e/device-detection.e2e.ts
/**
 * Device Detection E2E
 *
 * Flow:
 * 1) Login from a new device/browser context -> new-device banner appears
 * 2) Trust device in settings
 * 3) Logout and login again -> banner is no longer shown
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];

async function login(page: import('@playwright/test').Page, userEmail: string, userPassword: string) {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel(/email/i).fill(userEmail);
  await page.getByLabel(/password/i).fill(userPassword);
  await page
    .getByRole('button', { name: /login|sign in/i })
    .first()
    .click();
}

test.describe('Device detection flow', () => {
  test('login -> see new device banner -> trust device -> relogin without banner', async ({
    page,
    context,
  }) => {
    test.skip(
      email === undefined || password === undefined,
      'Set E2E_EMAIL and E2E_PASSWORD to run device detection E2E.',
    );

    await login(page, email ?? '', password ?? '');

    const bannerText = page.getByText(/new device or location/i).first();
    await expect(bannerText).toBeVisible({ timeout: 15000 });

    await page.goto(`${baseURL}/settings`);
    await page.getByRole('tab', { name: /security/i }).click();

    const trustButton = page.getByRole('button', { name: /^trust$/i }).first();
    if ((await trustButton.count()) > 0) {
      await trustButton.click();
    }

    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    });
    await context.clearCookies();

    await login(page, email ?? '', password ?? '');
    await expect(page.getByText(/new device or location/i)).toHaveCount(0);
  });
});

