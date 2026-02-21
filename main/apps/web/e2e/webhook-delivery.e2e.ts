// main/apps/web/e2e/webhook-delivery.e2e.ts
/**
 * Webhook Delivery E2E
 *
 * Flow:
 * 1) Admin logs in
 * 2) Opens webhook list and creates a webhook
 * 3) Opens webhook detail
 * 4) Triggers an app event (optional env-configured endpoint)
 * 5) Verifies delivery log updates
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
const webhookUrl = process.env['E2E_WEBHOOK_URL'] ?? 'https://example.com/webhooks/e2e';
const triggerPath = process.env['E2E_WEBHOOK_TRIGGER_PATH'];
const triggerBody = process.env['E2E_WEBHOOK_TRIGGER_BODY'] ?? '{}';

test.describe('Webhook delivery flow', () => {
  test('admin create webhook -> trigger event -> delivery visible', async ({ page }) => {
    test.skip(
      adminEmail === undefined || adminPassword === undefined || triggerPath === undefined,
      'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_WEBHOOK_TRIGGER_PATH to run webhook delivery E2E.',
    );

    await page.goto(baseURL);
    await page.goto(`${baseURL}/auth/login`);

    await page.getByLabel(/email/i).fill(adminEmail ?? '');
    await page.getByLabel(/password/i).fill(adminPassword ?? '');
    await page
      .getByRole('button', { name: /login|sign in/i })
      .first()
      .click();

    await page.goto(`${baseURL}/#/admin/webhooks`);
    await expect(page.getByRole('heading', { name: /webhooks/i })).toBeVisible();

    await page.getByRole('button', { name: /create webhook/i }).click();
    await page.getByPlaceholder(/https:\/\/example.com\/webhooks/i).fill(webhookUrl);
    await page.getByRole('button', { name: /select all/i }).click();
    await page.getByRole('button', { name: /^create webhook$/i }).click();

    const row = page.locator('tr', { hasText: webhookUrl }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /view/i }).click();

    await expect(page.getByRole('heading', { name: /webhook detail/i })).toBeVisible();

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

    await page.getByRole('button', { name: /^refresh$/i }).click();
    await expect(page.getByText(/delivered|failed|pending|dead letter/i).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
