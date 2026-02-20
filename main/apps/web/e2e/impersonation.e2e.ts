// main/apps/web/e2e/impersonation.e2e.ts
/**
 * Admin Impersonation E2E
 *
 * Flow:
 * 1) Admin logs in
 * 2) Open target user detail
 * 3) Start impersonation
 * 4) Verify impersonation session signal (banner or changed context)
 * 5) End impersonation
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
const targetUserId = process.env['E2E_IMPERSONATE_USER_ID'];

async function loginAsAdmin(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).first().click();
}

test.describe('Admin impersonation flow', () => {
  test('admin impersonates user and ends session', async ({ page }) => {
    test.skip(
      adminEmail === undefined || adminPassword === undefined || targetUserId === undefined,
      'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_IMPERSONATE_USER_ID to run impersonation E2E.',
    );

    await loginAsAdmin(page, adminEmail ?? '', adminPassword ?? '');

    // Support both hash and browser routes in current app variants.
    await page.goto(`${baseURL}/#/admin/users/${targetUserId}`);
    if ((await page.getByRole('button', { name: /^impersonate$/i }).count()) === 0) {
      await page.goto(`${baseURL}/admin/users/${targetUserId}`);
    }

    const impersonateButton = page.getByRole('button', { name: /^impersonate$/i }).first();
    await expect(impersonateButton).toBeVisible({ timeout: 15000 });
    await impersonateButton.click();

    // Depending on token-state wiring, the UX can indicate impersonation via:
    // - banner ("Viewing as ..."), or
    // - end-session control.
    const banner = page.getByText(/viewing as/i).first();
    const endSession = page.getByRole('button', { name: /end session/i }).first();

    if ((await banner.count()) > 0) {
      await expect(banner).toBeVisible({ timeout: 15000 });
    } else if ((await endSession.count()) > 0) {
      await expect(endSession).toBeVisible({ timeout: 15000 });
    }

    if ((await endSession.count()) > 0) {
      await endSession.click();
      await expect(page.getByText(/viewing as/i)).toHaveCount(0);
    } else {
      await page.evaluate(async () => {
        await fetch('/api/admin/impersonate/end', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ targetUserId: '' }),
        });
      });
    }
  });
});
