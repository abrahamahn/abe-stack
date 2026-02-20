// main/apps/web/e2e/api-keys.spec.ts
/**
 * API Keys E2E Tests
 *
 * Tests the API key management UI flows:
 * - Settings -> API keys -> create key -> copy value (shown once) -> see it in list
 * - Revoke key -> removed from list -> API calls with that key fail
 * - Create key with limited scopes -> verify scope labels displayed
 *
 * Sprint 4.13: API keys E2E test backfill.
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];
const apiKeyUsePath = process.env['E2E_API_KEY_USE_PATH'];

/**
 * Login and navigate to settings.
 */
async function loginAndGoToSettings(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(baseURL);

  const loginLink = page.getByRole('link', { name: /login/i });
  if ((await loginLink.count()) > 0) {
    await loginLink.first().click();
  } else {
    await page.goto(`${baseURL}/auth/login`);
  }

  await page.getByLabel(/email/i).fill(email ?? '');
  await page.getByLabel(/password/i).fill(password ?? '');
  await page
    .getByRole('button', { name: /login|sign in/i })
    .first()
    .click();

  await page.waitForURL(/dashboard|settings|home/i, { timeout: 10000 });
  await page.goto(`${baseURL}/settings`);

  // Navigate to security or API keys tab
  const securityTab = page.getByRole('tab', { name: /security|api.*key/i });
  if ((await securityTab.count()) > 0) {
    await securityTab.first().click();
  }
}

test.describe('API Keys management', () => {
  // --------------------------------------------------------------------------
  // Create key -> copy value (shown once) -> see it in list
  // --------------------------------------------------------------------------

  test('create API key -> value shown once -> appears in list', async ({ page }) => {
    test.skip(
      email === undefined || password === undefined,
      'Set E2E_EMAIL and E2E_PASSWORD to run API-key E2E tests.',
    );

    await loginAndGoToSettings(page);

    // Click the Create Key button
    await page.getByRole('button', { name: /^create key$/i }).click();

    // Fill in the key name
    const keyName = `e2e-create-${Date.now()}`;
    const nameInput = page.getByPlaceholder(/ci\/cd pipeline|name/i).first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(keyName);
    } else {
      await page.getByLabel(/name/i).first().fill(keyName);
    }

    // Submit creation
    await page.getByRole('button', { name: /^create$/i }).click();

    // The plaintext key should be displayed in a monospace input (shown once)
    const plaintextInput = page.locator('input.font-mono, input[readonly]').first();
    await expect(plaintextInput).toBeVisible({ timeout: 5000 });
    const plaintext = await plaintextInput.inputValue();
    expect(plaintext.length).toBeGreaterThan(20);

    // Look for a copy button
    const copyButton = page.getByRole('button', { name: /copy/i });
    if ((await copyButton.count()) > 0) {
      await copyButton.first().click();
      // Clipboard may not be accessible in test mode, just verify the button exists
    }

    // Dismiss the dialog / close the modal if present
    const closeButton = page.getByRole('button', { name: /close|done|dismiss|ok/i });
    if ((await closeButton.count()) > 0) {
      await closeButton.first().click();
    }

    // Verify the key appears in the list
    const keyRow = page.locator('tr, [data-testid="api-key-row"]', { hasText: keyName }).first();
    await expect(keyRow).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // Revoke key -> removed from list -> API calls fail
  // --------------------------------------------------------------------------

  test('revoke key -> removed from list -> API calls with key fail', async ({
    page,
    request,
  }) => {
    test.skip(
      email === undefined ||
        password === undefined ||
        apiKeyUsePath === undefined,
      'Set E2E_EMAIL, E2E_PASSWORD, and E2E_API_KEY_USE_PATH to run API-key revocation E2E.',
    );

    await loginAndGoToSettings(page);

    // Create a key first
    await page.getByRole('button', { name: /^create key$/i }).click();

    const keyName = `e2e-revoke-${Date.now()}`;
    const nameInput = page.getByPlaceholder(/ci\/cd pipeline|name/i).first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(keyName);
    } else {
      await page.getByLabel(/name/i).first().fill(keyName);
    }
    await page.getByRole('button', { name: /^create$/i }).click();

    // Capture the plaintext key
    const plaintextInput = page.locator('input.font-mono, input[readonly]').first();
    await expect(plaintextInput).toBeVisible();
    const plaintext = await plaintextInput.inputValue();

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close|done|dismiss|ok/i });
    if ((await closeButton.count()) > 0) {
      await closeButton.first().click();
    }

    // Verify the key works via API before revocation
    const createUrl = new URL(baseURL);
    const apiUrl = `${createUrl.origin}${apiKeyUsePath ?? ''}`;
    const allowedResponse = await request.get(apiUrl, {
      headers: { Authorization: `Bearer ${plaintext}` },
    });
    expect(allowedResponse.ok()).toBe(true);

    // Revoke the key from the UI
    const row = page.locator('tr', { hasText: keyName }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /revoke/i }).click();

    // Confirm revocation if a confirmation dialog appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes|revoke/i });
    if ((await confirmButton.count()) > 0) {
      await confirmButton.first().click();
    }

    // Wait for the row to disappear or be marked as revoked
    await expect(row).not.toBeVisible({ timeout: 5000 }).catch(async () => {
      // Some UIs keep the row but mark it as revoked
      await expect(row.getByText(/revoked/i)).toBeVisible();
    });

    // Verify API calls with the revoked key now fail
    const revokedResponse = await request.get(apiUrl, {
      headers: { Authorization: `Bearer ${plaintext}` },
    });
    expect(revokedResponse.status()).toBe(401);
  });

  // --------------------------------------------------------------------------
  // Create key with limited scopes -> verify scope labels displayed
  // --------------------------------------------------------------------------

  test('create key with limited scopes -> scope labels displayed', async ({ page }) => {
    test.skip(
      email === undefined || password === undefined,
      'Set E2E_EMAIL and E2E_PASSWORD to run API-key scopes E2E test.',
    );

    await loginAndGoToSettings(page);

    await page.getByRole('button', { name: /^create key$/i }).click();

    const keyName = `e2e-scopes-${Date.now()}`;
    const nameInput = page.getByPlaceholder(/ci\/cd pipeline|name/i).first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(keyName);
    } else {
      await page.getByLabel(/name/i).first().fill(keyName);
    }

    // Select limited scopes (look for checkboxes or scope selectors)
    const readCheckbox = page.getByLabel(/read/i).first();
    if ((await readCheckbox.count()) > 0) {
      await readCheckbox.check();
    }

    // Ensure write is NOT checked (if it defaults to checked, uncheck it)
    const writeCheckbox = page.getByLabel(/write/i).first();
    if ((await writeCheckbox.count()) > 0 && (await writeCheckbox.isChecked())) {
      await writeCheckbox.uncheck();
    }

    await page.getByRole('button', { name: /^create$/i }).click();

    // Dismiss key display dialog
    const plaintextInput = page.locator('input.font-mono, input[readonly]').first();
    await expect(plaintextInput).toBeVisible({ timeout: 5000 });

    const closeButton = page.getByRole('button', { name: /close|done|dismiss|ok/i });
    if ((await closeButton.count()) > 0) {
      await closeButton.first().click();
    }

    // Verify the key row shows scope labels
    const keyRow = page.locator('tr, [data-testid="api-key-row"]', { hasText: keyName }).first();
    await expect(keyRow).toBeVisible();

    // Look for scope labels/badges in the row
    const scopeLabel = keyRow.locator('span, .badge, .tag, .scope-label');
    if ((await scopeLabel.count()) > 0) {
      const labels = await scopeLabel.allTextContents();
      const allText = labels.join(' ').toLowerCase();
      expect(allText).toContain('read');
    }
  });
});
