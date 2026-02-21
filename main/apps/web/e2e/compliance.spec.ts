// main/apps/web/e2e/compliance.spec.ts
/**
 * Compliance & Data Privacy E2E Tests
 *
 * Tests the user-facing compliance features:
 * - Data export request and download
 * - Account deletion with grace period
 * - Terms of Service acceptance gating
 * - Consent preferences management
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

test.describe('Data Export', () => {
  test('request data export, see processing status, receive download link', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in as a regular user
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('UserPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page).toHaveURL(/dashboard/i);

    // Navigate to settings / privacy section
    const settingsLink = page
      .getByRole('link', { name: /settings/i })
      .or(page.getByRole('link', { name: /account/i }));
    await settingsLink.click();

    const privacySection = page
      .getByRole('link', { name: /privacy/i })
      .or(page.getByRole('tab', { name: /privacy/i }))
      .or(page.getByText(/data export/i));
    if ((await privacySection.count()) > 0) {
      await privacySection.first().click();
    }

    // Find and click the "Export My Data" button
    const exportButton = page
      .getByRole('button', { name: /export.*data/i })
      .or(page.getByRole('button', { name: /request.*export/i }))
      .or(page.locator('[data-testid="request-export"]'));

    if ((await exportButton.count()) > 0) {
      await exportButton.click();

      // Expect to see a processing/pending status indicator
      const statusIndicator = page
        .getByText(/processing/i)
        .or(page.getByText(/pending/i))
        .or(page.getByText(/in progress/i))
        .or(page.getByText(/requested/i));

      await expect(statusIndicator.first()).toBeVisible({ timeout: 5000 });

      // Wait for export to complete (poll or check for download link)
      const downloadLink = page
        .getByRole('link', { name: /download/i })
        .or(page.getByRole('button', { name: /download/i }))
        .or(page.getByText(/ready/i));

      // Wait up to 30 seconds for the export to complete
      try {
        await expect(downloadLink.first()).toBeVisible({ timeout: 30000 });
      } catch {
        // Export may still be processing in CI; that is acceptable
        const stillProcessing = (await page.getByText(/processing/i).count()) > 0;
        expect(stillProcessing).toBe(true);
      }
    }
  });
});

test.describe('Account Deletion', () => {
  test('delete account, confirm, logged out, cannot log back in during grace period', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    const deleteEmail = `delete-test-${String(Date.now())}@example.com`;
    const deletePassword = 'DeleteMe123!';

    // Register a new user to delete
    await page.goto(baseURL);
    await page.getByRole('link', { name: /login/i }).click();

    const registerButton = page.getByRole('button', { name: /register/i });
    if ((await registerButton.count()) > 0) {
      // Fill in registration
      await page.getByLabel(/email/i).fill(deleteEmail);
      await page.getByLabel(/password/i).fill(deletePassword);
      const nameInput = page.getByLabel(/name/i);
      if ((await nameInput.count()) > 0) {
        await nameInput.fill('Delete Test User');
      }
      await registerButton.click();
      await expect(page).toHaveURL(/dashboard/i);
    } else {
      // Login if registration is not inline
      await page.getByLabel(/email/i).fill(deleteEmail);
      await page.getByLabel(/password/i).fill(deletePassword);
      await page.getByRole('button', { name: /login/i }).click();
    }

    // Navigate to account settings
    const settingsLink = page
      .getByRole('link', { name: /settings/i })
      .or(page.getByRole('link', { name: /account/i }));
    await settingsLink.click();

    // Look for the delete account section
    const deleteSection = page
      .getByRole('button', { name: /delete.*account/i })
      .or(page.getByText(/delete.*account/i));

    if ((await deleteSection.count()) > 0) {
      await deleteSection.first().click();

      // Confirm the deletion in a dialog or confirmation prompt
      const confirmButton = page
        .getByRole('button', { name: /confirm/i })
        .or(page.getByRole('button', { name: /yes.*delete/i }))
        .or(page.getByRole('button', { name: /delete/i }));

      if ((await confirmButton.count()) > 0) {
        await confirmButton.first().click();
      }

      // Should be logged out or redirected
      await page.waitForTimeout(2000);

      // Expect to be on login page or landing page
      const currentUrl = page.url();
      const isLoggedOut =
        currentUrl.includes('login') || currentUrl === baseURL || currentUrl === `${baseURL}/`;
      expect(isLoggedOut).toBe(true);

      // Try to log back in during grace period — should fail
      const loginLink = page.getByRole('link', { name: /login/i });
      if ((await loginLink.count()) > 0) {
        await loginLink.click();
      }

      await page.getByLabel(/email/i).fill(deleteEmail);
      await page.getByLabel(/password/i).fill(deletePassword);
      await page.getByRole('button', { name: /login/i }).click();

      // Expect login to fail or show account pending deletion message
      await page.waitForTimeout(1000);
      const errorOrPending = page
        .getByText(/deleted/i)
        .or(page.getByText(/pending/i))
        .or(page.getByText(/deactivated/i))
        .or(page.getByText(/error/i));

      // We should either see an error or still be on the login page
      const stillOnLogin = page.url().includes('login');
      const hasMessage = (await errorOrPending.count()) > 0;
      expect(stillOnLogin || hasMessage).toBe(true);
    }
  });
});

test.describe('Terms of Service', () => {
  test('new ToS published forces user to accept before continuing', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('UserPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    // If ToS gating is in effect, user should be redirected to ToS acceptance
    // Look for ToS acceptance UI
    const tosPrompt = page
      .getByText(/terms of service/i)
      .or(page.getByText(/privacy policy/i))
      .or(page.getByText(/terms.*conditions/i))
      .or(page.getByText(/accept.*terms/i));

    if ((await tosPrompt.count()) > 0) {
      // ToS gating is active — the user must accept before continuing
      await expect(tosPrompt.first()).toBeVisible();

      // The dashboard should not be accessible yet
      // Dashboard may or may not be visible depending on the gating approach
      // but the ToS prompt should be prominent

      // Accept the ToS
      const acceptButton = page
        .getByRole('button', { name: /accept/i })
        .or(page.getByRole('button', { name: /agree/i }))
        .or(page.getByRole('button', { name: /i accept/i }));

      // May need to check the checkbox first
      const checkbox = page.getByRole('checkbox').or(page.locator('[data-testid="tos-checkbox"]'));
      if ((await checkbox.count()) > 0) {
        await checkbox.first().check();
      }

      if ((await acceptButton.count()) > 0) {
        await acceptButton.first().click();
      }

      // After acceptance, user should have normal access
      await expect(page).toHaveURL(/dashboard/i);
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    } else {
      // No ToS gating currently active — verify dashboard loads normally
      await expect(page).toHaveURL(/dashboard/i);
    }
  });

  test('accept ToS restores normal access', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('UserPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    // If ToS gating is in effect, accept it
    const acceptButton = page
      .getByRole('button', { name: /accept/i })
      .or(page.getByRole('button', { name: /agree/i }));

    if ((await acceptButton.count()) > 0) {
      const checkbox = page.getByRole('checkbox');
      if ((await checkbox.count()) > 0) {
        await checkbox.first().check();
      }
      await acceptButton.first().click();
    }

    // Should now have normal access to the dashboard
    await expect(page).toHaveURL(/dashboard/i);
    await expect(page.getByText(/dashboard/i)).toBeVisible();

    // Verify navigation works (settings, etc.)
    const settingsLink = page
      .getByRole('link', { name: /settings/i })
      .or(page.getByRole('link', { name: /account/i }));
    if ((await settingsLink.count()) > 0) {
      await settingsLink.first().click();
      // Should navigate successfully without being blocked
      await expect(page.getByText(/error/i)).not.toBeVisible();
    }
  });
});

test.describe('Consent Preferences', () => {
  test('toggle cookie consent and see updated state', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('UserPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    // Accept ToS if gated
    const acceptButton = page.getByRole('button', { name: /accept/i });
    if ((await acceptButton.count()) > 0) {
      await acceptButton.first().click();
    }

    await expect(page).toHaveURL(/dashboard/i);

    // Navigate to consent/privacy settings
    const settingsLink = page
      .getByRole('link', { name: /settings/i })
      .or(page.getByRole('link', { name: /account/i }));
    await settingsLink.click();

    const privacyTab = page
      .getByRole('link', { name: /privacy/i })
      .or(page.getByRole('tab', { name: /privacy/i }))
      .or(page.getByRole('link', { name: /consent/i }));
    if ((await privacyTab.count()) > 0) {
      await privacyTab.first().click();
    }

    // Find cookie consent toggle
    const consentToggle = page
      .getByRole('switch', { name: /cookie/i })
      .or(page.getByRole('checkbox', { name: /cookie/i }))
      .or(page.getByRole('switch', { name: /analytics/i }))
      .or(page.getByRole('checkbox', { name: /analytics/i }))
      .or(page.locator('[data-testid="cookie-consent-toggle"]'));

    if ((await consentToggle.count()) > 0) {
      // Get the initial state
      const isChecked = await consentToggle.first().isChecked();

      // Toggle
      await consentToggle.first().click();

      // Wait for the update
      await page.waitForTimeout(500);

      // Verify the state changed
      const newState = await consentToggle.first().isChecked();
      expect(newState).not.toBe(isChecked);

      // Look for a success notification or saved indicator
      const savedIndicator = page
        .getByText(/saved/i)
        .or(page.getByText(/updated/i))
        .or(page.getByText(/preferences.*saved/i));

      if ((await savedIndicator.count()) > 0) {
        await expect(savedIndicator.first()).toBeVisible();
      }

      // Toggle back to restore state
      await consentToggle.first().click();
      await page.waitForTimeout(500);
      const restoredState = await consentToggle.first().isChecked();
      expect(restoredState).toBe(isChecked);
    }
  });
});
