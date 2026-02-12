// src/apps/web/src/__tests__/e2e/api-keys.e2e.ts
/**
 * API Keys E2E Flow
 *
 * Validates settings flow: create key, copy key, call API with key, revoke key,
 * then verify key is rejected.
 *
 * Requires live backend credentials and an API-key protected endpoint configured
 * in E2E_API_KEY_USE_PATH (example: /api/test/api-keys/read).
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];
const apiKeyUsePath = process.env['E2E_API_KEY_USE_PATH'];

test.describe('API keys flow', () => {
  test('settings create -> use -> revoke -> rejected', async ({ page, request }) => {
    test.skip(
      email === undefined || password === undefined || apiKeyUsePath === undefined,
      'Set E2E_EMAIL, E2E_PASSWORD, and E2E_API_KEY_USE_PATH to run API-key lifecycle E2E.',
    );

    await page.goto(baseURL);

    const loginLink = page.getByRole('link', { name: /login/i });
    if ((await loginLink.count()) > 0) {
      await loginLink.first().click();
    } else {
      await page.goto(`${baseURL}/auth/login`);
    }

    await page.getByLabel(/email/i).fill(email ?? '');
    await page.getByLabel(/password/i).fill(password ?? '');
    await page.getByRole('button', { name: /login|sign in/i }).first().click();

    await page.goto(`${baseURL}/settings`);
    await page.getByRole('tab', { name: /security/i }).click();

    await page.getByRole('button', { name: /^create key$/i }).click();

    const keyName = `e2e-key-${Date.now()}`;
    await page.getByPlaceholder(/ci\/cd pipeline/i).fill(keyName);
    await page.getByRole('button', { name: /^create$/i }).click();

    const plaintextInput = page.locator('input.font-mono').first();
    await expect(plaintextInput).toBeVisible();
    const plaintext = await plaintextInput.inputValue();
    expect(plaintext.length).toBeGreaterThan(20);

    const createUrl = new URL(baseURL);
    const apiUrl = `${createUrl.origin}${apiKeyUsePath ?? ''}`;

    const allowedResponse = await request.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${plaintext}`,
      },
    });

    expect(allowedResponse.ok()).toBe(true);

    const row = page.locator('tr', { hasText: keyName }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /revoke/i }).click();

    const revokedResponse = await request.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${plaintext}`,
      },
    });

    expect(revokedResponse.status()).toBe(401);
  });
});
