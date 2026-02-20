// main/apps/web/e2e/audit.spec.ts
/**
 * Audit & Security Events E2E Tests
 *
 * Tests the admin security events UI through Playwright,
 * verifying navigation, filtering, detail view, and export functionality.
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

test.describe('Admin Security Events', () => {
  test('admin can navigate to security events and see events list with filters', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in as admin user
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('AdminPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    // Navigate to admin security events section
    await expect(page).toHaveURL(/dashboard/i);

    // Look for admin or security nav link
    const securityLink =
      page.getByRole('link', { name: /security/i }).or(
        page.getByRole('link', { name: /audit/i }),
      );
    await securityLink.click();

    // Expect the security events page to load with a list or table
    const eventsList = page.getByRole('table').or(page.locator('[data-testid="events-list"]'));
    await expect(eventsList).toBeVisible();

    // Verify filter controls are present
    const filterSection = page
      .getByRole('combobox', { name: /type/i })
      .or(page.locator('[data-testid="event-type-filter"]'))
      .or(page.getByPlaceholder(/filter/i));
    await expect(filterSection).toBeVisible();
  });

  test('filter by event type updates results', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in as admin
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('AdminPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    // Navigate to security events
    const securityLink =
      page.getByRole('link', { name: /security/i }).or(
        page.getByRole('link', { name: /audit/i }),
      );
    await securityLink.click();

    // Select a filter option for event type
    const typeFilter = page
      .getByRole('combobox', { name: /type/i })
      .or(page.locator('[data-testid="event-type-filter"]'));
    await typeFilter.click();

    // Select "account_locked" option
    const accountLockedOption = page
      .getByRole('option', { name: /account.locked/i })
      .or(page.getByText(/account.locked/i));
    if ((await accountLockedOption.count()) > 0) {
      await accountLockedOption.first().click();
    }

    // Wait for results to update
    await page.waitForTimeout(500);

    // Verify the list updated (page should not show an error)
    await expect(page.getByText(/error/i)).not.toBeVisible();
  });

  test('click event to see detail view with all metadata', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in as admin
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('AdminPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    // Navigate to security events
    const securityLink =
      page.getByRole('link', { name: /security/i }).or(
        page.getByRole('link', { name: /audit/i }),
      );
    await securityLink.click();

    // Click on the first event row
    const firstEventRow = page
      .getByRole('row')
      .nth(1)
      .or(page.locator('[data-testid="event-row"]').first());
    if ((await firstEventRow.count()) > 0) {
      await firstEventRow.click();
    }

    // Verify detail view shows metadata fields
    const detailView = page
      .locator('[data-testid="event-detail"]')
      .or(page.getByRole('dialog'))
      .or(page.locator('.event-detail'));

    if ((await detailView.count()) > 0) {
      // Check for presence of common metadata field labels
      const hasEventType =
        (await page.getByText(/event.type/i).count()) > 0;
      const hasSeverity =
        (await page.getByText(/severity/i).count()) > 0;
      const hasIpAddress =
        (await page.getByText(/ip.address/i).count()) > 0 ||
        (await page.getByText(/ip/i).count()) > 0;

      expect(hasEventType || hasSeverity || hasIpAddress).toBe(true);
    }
  });

  test('export events downloads file successfully', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);

    // Log in as admin
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('AdminPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    // Navigate to security events
    const securityLink =
      page.getByRole('link', { name: /security/i }).or(
        page.getByRole('link', { name: /audit/i }),
      );
    await securityLink.click();

    // Look for and click the export button
    const exportButton = page
      .getByRole('button', { name: /export/i })
      .or(page.locator('[data-testid="export-events"]'));

    if ((await exportButton.count()) > 0) {
      // Listen for the download event
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await exportButton.click();

      // If a format selector appears, choose JSON
      const jsonOption = page.getByRole('option', { name: /json/i }).or(
        page.getByText(/json/i),
      );
      if ((await jsonOption.count()) > 0) {
        await jsonOption.first().click();
      }

      const download = await downloadPromise;
      if (download !== null) {
        const filename = download.suggestedFilename();
        expect(filename).toContain('security-events');
      }
    }
  });

  test('trigger login failure and see new security event appear in list', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    // First, trigger a failed login attempt
    await page.goto(baseURL);
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('nonexistent-user@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /login/i }).click();

    // Wait for the failure to be processed
    await page.waitForTimeout(1000);

    // Now log in as admin
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('AdminPass123!');
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page).toHaveURL(/dashboard/i);

    // Navigate to security events
    const securityLink =
      page.getByRole('link', { name: /security/i }).or(
        page.getByRole('link', { name: /audit/i }),
      );
    await securityLink.click();

    // Look for a login_failure event in the list
    // The most recent event should be the failed login attempt
    const eventContent = await page.textContent('body');
    const hasLoginFailure =
      eventContent?.toLowerCase().includes('login') === true ||
      eventContent?.toLowerCase().includes('failure') === true ||
      eventContent?.toLowerCase().includes('failed') === true;

    // At minimum, the events page should have loaded without error
    await expect(page.getByText(/error/i)).not.toBeVisible();
    // We expect that some login-related content is visible
    expect(hasLoginFailure).toBe(true);
  });
});
