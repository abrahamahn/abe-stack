// main/apps/web/e2e/compliance-data-rights.e2e.ts
/**
 * Compliance / Data Rights E2E
 *
 * Flow:
 * 1) Login
 * 2) Request data export
 * 3) Verify export status UI
 * 4) Toggle consent preference
 * 5) Accept ToS modal when presented
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];
const exportTriggerPath = process.env['E2E_EXPORT_TRIGGER_PATH'];
const exportTriggerBody = process.env['E2E_EXPORT_TRIGGER_BODY'] ?? '{}';
const exportExpectedText = process.env['E2E_EXPORT_EXPECT_TEXT'];
const settingsPath = process.env['E2E_COMPLIANCE_SETTINGS_PATH'] ?? '/settings';
const consentToggleLabel = process.env['E2E_CONSENT_TOGGLE_LABEL'] ?? 'Cookie Consent';
const tosModalText = process.env['E2E_TOS_MODAL_TEXT'] ?? 'Terms of Service';

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

test.describe('Compliance flow', () => {
  test('request export, accept ToS, toggle consent', async ({ page }) => {
    test.skip(
      email === undefined ||
        password === undefined ||
        exportTriggerPath === undefined ||
        exportExpectedText === undefined,
      'Set E2E_EMAIL, E2E_PASSWORD, E2E_EXPORT_TRIGGER_PATH, and E2E_EXPORT_EXPECT_TEXT.',
    );

    await login(page, email ?? '', password ?? '');

    const exportResult = await page.evaluate(
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
      { path: exportTriggerPath ?? '', body: exportTriggerBody },
    );
    expect(exportResult.status).toBeLessThan(500);

    await page.goto(`${baseURL}${settingsPath}`);
    await expect(page.getByText(exportExpectedText ?? '').first()).toBeVisible({ timeout: 15000 });

    const consentToggle = page.getByLabel(new RegExp(consentToggleLabel, 'i')).first();
    if ((await consentToggle.count()) > 0) {
      await consentToggle.click();
    }

    const tosDialog = page.getByText(new RegExp(tosModalText, 'i')).first();
    if ((await tosDialog.count()) > 0) {
      const acceptButton = page.getByRole('button', { name: /accept/i }).first();
      if ((await acceptButton.count()) > 0) {
        await acceptButton.click();
      }
    }
  });
});
