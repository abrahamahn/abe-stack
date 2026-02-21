// main/apps/web/e2e/sms-2fa.e2e.ts
/**
 * SMS 2FA E2E
 *
 * Flow:
 * 1) Settings -> add phone -> verify phone
 * 2) Logout and login
 * 3) Complete SMS challenge at login
 *
 * This test is env-driven because SMS codes come from provider/test hooks.
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const email = process.env['E2E_SMS_EMAIL'] ?? process.env['E2E_EMAIL'];
const password = process.env['E2E_SMS_PASSWORD'] ?? process.env['E2E_PASSWORD'];
const phoneNumber = process.env['E2E_SMS_PHONE'];
const setupCode = process.env['E2E_SMS_SETUP_CODE'];
const loginCode = process.env['E2E_SMS_LOGIN_CODE'] ?? process.env['E2E_SMS_SETUP_CODE'];

async function login(
  page: import('@playwright/test').Page,
  userEmail: string,
  userPassword: string,
) {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel(/email/i).fill(userEmail);
  await page.getByLabel(/password/i).fill(userPassword);
  await page
    .getByRole('button', { name: /login|sign in/i })
    .first()
    .click();
}

test.describe('SMS 2FA flow', () => {
  test('settings add+verify phone -> login with SMS challenge', async ({ page, context }) => {
    test.skip(
      email === undefined ||
        password === undefined ||
        phoneNumber === undefined ||
        setupCode === undefined ||
        loginCode === undefined,
      'Set E2E_SMS_EMAIL/E2E_SMS_PASSWORD, E2E_SMS_PHONE, E2E_SMS_SETUP_CODE, and E2E_SMS_LOGIN_CODE.',
    );

    await login(page, email ?? '', password ?? '');

    const smsChallengeHeading = page.getByText(/sms verification/i).first();
    if ((await smsChallengeHeading.count()) === 0) {
      await page.goto(`${baseURL}/settings`);
      await page.getByRole('tab', { name: /security/i }).click();

      const verifiedBadge = page.getByText(/verified/i).first();
      if ((await verifiedBadge.count()) === 0) {
        await page.getByPlaceholder(/\+1 555 123 4567/i).fill(phoneNumber ?? '');
        await page.getByRole('button', { name: /send code/i }).click();
        await page.getByPlaceholder(/6-digit code/i).fill(setupCode ?? '');
        await page.getByRole('button', { name: /^verify$/i }).click();
        await expect(page.getByText(/phone number verified/i)).toBeVisible({ timeout: 15000 });
      }

      await page.evaluate(async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      });
      await context.clearCookies();
      await login(page, email ?? '', password ?? '');
    }

    await expect(page.getByText(/sms verification/i)).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/000000/i).fill(loginCode ?? '');
    await page.getByRole('button', { name: /^verify$/i }).click();

    await expect(page.getByText(/sms verification/i)).toHaveCount(0);
  });
});
