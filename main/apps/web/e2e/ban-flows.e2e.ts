// main/apps/web/e2e/ban-flows.e2e.ts
/**
 * Admin Ban Flows E2E
 *
 * Flow:
 * 1) Admin login
 * 2) Lock target user account with reason
 * 3) Target user login shows lock reason
 * 4) Admin hard-bans target user (sudo) and receives grace-period response
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
const adminSudoToken = process.env['E2E_ADMIN_SUDO_TOKEN'];
const targetUserId = process.env['E2E_BAN_TARGET_USER_ID'];
const targetEmail = process.env['E2E_BAN_TARGET_EMAIL'];
const targetPassword = process.env['E2E_BAN_TARGET_PASSWORD'];

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page
    .getByRole('button', { name: /login|sign in/i })
    .first()
    .click();
}

test.describe('Admin lock + hard-ban flow', () => {
  test('admin locks user, user sees reason, admin hard-bans user', async ({ browser, page }) => {
    test.skip(
      adminEmail === undefined ||
        adminPassword === undefined ||
        adminSudoToken === undefined ||
        targetUserId === undefined ||
        targetEmail === undefined ||
        targetPassword === undefined,
      'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_SUDO_TOKEN, E2E_BAN_TARGET_USER_ID, E2E_BAN_TARGET_EMAIL, and E2E_BAN_TARGET_PASSWORD.',
    );

    await login(page, adminEmail ?? '', adminPassword ?? '');

    const lockResult = await page.evaluate(
      async ({ userId }) => {
        const response = await fetch(`/api/admin/users/${userId}/lock`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason: 'E2E lock reason', durationMinutes: 60 }),
        });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return { status: response.status, body };
      },
      { userId: targetUserId ?? '' },
    );
    expect(lockResult.status).toBe(200);

    const targetContext = await browser.newContext();
    const targetPage = await targetContext.newPage();
    await login(targetPage, targetEmail ?? '', targetPassword ?? '');
    await expect(targetPage.getByText(/suspended|locked|reason/i).first()).toBeVisible({
      timeout: 15000,
    });
    await targetContext.close();

    const hardBanResult = await page.evaluate(
      async ({ userId, sudoToken }) => {
        const response = await fetch(`/api/admin/users/${userId}/hard-ban`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-sudo-token': sudoToken,
          },
          credentials: 'include',
          body: JSON.stringify({ reason: 'E2E hard ban validation' }),
        });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return { status: response.status, body };
      },
      { userId: targetUserId ?? '', sudoToken: adminSudoToken ?? '' },
    );

    expect(hardBanResult.status).toBe(200);
    expect(typeof hardBanResult.body['gracePeriodEnds']).toBe('string');
  });
});
