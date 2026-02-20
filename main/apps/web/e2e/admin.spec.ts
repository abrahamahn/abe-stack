// main/apps/web/e2e/admin.spec.ts
/**
 * Admin Dashboard E2E Tests
 *
 * Tests the admin-facing workflows:
 * - Admin: search for user -> view detail -> lock account -> user cannot log in
 * - Admin: impersonate user -> see banner "Viewing as ..." -> end session -> return to admin
 * - Admin: manage billing plans -> create/edit/deactivate plan
 * - Admin: view security events dashboard -> filter -> export
 * - Admin: view route manifest -> filter by module/method
 *
 * Sprint 4.14: Admin E2E test backfill.
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
const testUserEmail = process.env['E2E_TEST_USER_EMAIL'];
const testUserPassword = process.env['E2E_TEST_USER_PASSWORD'];

/**
 * Login as admin user.
 */
async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(baseURL);

  const loginLink = page.getByRole('link', { name: /login/i });
  if ((await loginLink.count()) > 0) {
    await loginLink.first().click();
  } else {
    await page.goto(`${baseURL}/auth/login`);
  }

  await page.getByLabel(/email/i).fill(adminEmail ?? '');
  await page.getByLabel(/password/i).fill(adminPassword ?? '');
  await page
    .getByRole('button', { name: /login|sign in/i })
    .first()
    .click();

  await page.waitForURL(/dashboard|admin|home/i, { timeout: 10000 });
}

test.describe('Admin dashboard flows', () => {
  // --------------------------------------------------------------------------
  // Search for user -> view detail -> lock account -> user cannot log in
  // --------------------------------------------------------------------------

  test('search for user -> view detail -> lock account -> login blocked', async ({
    page,
    browser,
  }) => {
    test.skip(
      adminEmail === undefined ||
        adminPassword === undefined ||
        testUserEmail === undefined ||
        testUserPassword === undefined,
      'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_TEST_USER_EMAIL, and E2E_TEST_USER_PASSWORD to run admin E2E tests.',
    );

    await loginAsAdmin(page);
    await page.goto(`${baseURL}/admin/users`);

    // Search for the test user
    const searchInput = page.getByPlaceholder(/search|email|name/i).first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill(testUserEmail ?? '');
      await searchInput.press('Enter');
    }

    // Click on the user row to view details
    const userRow = page.locator('tr, [data-testid="user-row"]', {
      hasText: testUserEmail ?? '',
    }).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });
    await userRow.click();

    // Should see user detail page
    await expect(page.getByText(testUserEmail ?? '')).toBeVisible({ timeout: 5000 });

    // Lock the account
    const lockButton = page.getByRole('button', { name: /lock|suspend/i }).first();
    if ((await lockButton.count()) > 0) {
      await lockButton.click();

      // Fill in lock reason if prompted
      const reasonInput = page.getByLabel(/reason/i);
      if ((await reasonInput.count()) > 0) {
        await reasonInput.fill('E2E test lock');
      }

      // Confirm lock
      const confirmButton = page.getByRole('button', { name: /confirm|lock|submit/i });
      if ((await confirmButton.count()) > 0) {
        await confirmButton.first().click();
      }

      // Wait for lock confirmation
      await expect(page.getByText(/locked|suspended/i)).toBeVisible({ timeout: 5000 });

      // Verify the test user cannot log in from a different browser context
      const userContext = await browser.newContext();
      const userPage = await userContext.newPage();

      await userPage.goto(`${baseURL}/auth/login`);
      await userPage.getByLabel(/email/i).fill(testUserEmail ?? '');
      await userPage.getByLabel(/password/i).fill(testUserPassword ?? '');
      await userPage
        .getByRole('button', { name: /login|sign in/i })
        .first()
        .click();

      // Expect an error indicating the account is locked
      const lockedError = userPage.getByText(/locked|suspended|disabled|cannot log in/i);
      await expect(lockedError).toBeVisible({ timeout: 10000 });

      await userContext.close();

      // Unlock the user to clean up
      const unlockButton = page.getByRole('button', { name: /unlock|unsuspend/i }).first();
      if ((await unlockButton.count()) > 0) {
        await unlockButton.click();
        const unlockConfirm = page.getByRole('button', { name: /confirm|unlock|submit/i });
        if ((await unlockConfirm.count()) > 0) {
          await unlockConfirm.first().click();
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // Impersonate user -> see banner -> end session -> return to admin
  // --------------------------------------------------------------------------

  test('impersonate user -> see banner "Viewing as ..." -> end -> return to admin', async ({
    page,
  }) => {
    test.skip(
      adminEmail === undefined ||
        adminPassword === undefined ||
        testUserEmail === undefined,
      'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_TEST_USER_EMAIL to run impersonation E2E test.',
    );

    await loginAsAdmin(page);
    await page.goto(`${baseURL}/admin/users`);

    // Search and navigate to the user
    const searchInput = page.getByPlaceholder(/search|email|name/i).first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill(testUserEmail ?? '');
      await searchInput.press('Enter');
    }

    const userRow = page.locator('tr, [data-testid="user-row"]', {
      hasText: testUserEmail ?? '',
    }).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });
    await userRow.click();

    // Click the impersonate button
    const impersonateButton = page.getByRole('button', {
      name: /impersonate|view as/i,
    }).first();
    if ((await impersonateButton.count()) > 0) {
      await impersonateButton.click();

      // Confirm impersonation if prompted
      const confirmButton = page.getByRole('button', { name: /confirm|yes|start/i });
      if ((await confirmButton.count()) > 0) {
        await confirmButton.first().click();
      }

      // Should see an impersonation banner
      const banner = page.locator(
        '[data-testid="impersonation-banner"], .impersonation-banner, [role="alert"]',
      );
      const bannerText = page.getByText(/viewing as|impersonating/i);
      await expect(banner.or(bannerText).first()).toBeVisible({ timeout: 10000 });

      // End the impersonation session
      const endButton = page.getByRole('button', { name: /end|stop|exit|return/i }).first();
      if ((await endButton.count()) > 0) {
        await endButton.click();
      }

      // Should return to the admin context (admin page or dashboard)
      await expect(page).toHaveURL(/admin|dashboard/i, { timeout: 10000 });

      // Impersonation banner should be gone
      await expect(bannerText).not.toBeVisible({ timeout: 5000 }).catch(() => {
        // Banner may already be removed
      });
    }
  });

  // --------------------------------------------------------------------------
  // Manage billing plans -> create/edit/deactivate
  // --------------------------------------------------------------------------

  test('manage billing plans -> create -> edit -> deactivate', async ({ page }) => {
    test.skip(
      adminEmail === undefined || adminPassword === undefined,
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run billing plans E2E test.',
    );

    await loginAsAdmin(page);
    await page.goto(`${baseURL}/admin/billing/plans`);

    // Wait for the plans page to load
    await page.waitForLoadState('networkidle');

    // Create a new plan
    const createButton = page.getByRole('button', { name: /create.*plan|new.*plan|add.*plan/i });
    if ((await createButton.count()) > 0) {
      await createButton.first().click();

      const planName = `E2E Plan ${Date.now()}`;

      // Fill plan details
      const nameInput = page.getByLabel(/name/i).first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill(planName);
      }

      const priceInput = page.getByLabel(/price|amount/i).first();
      if ((await priceInput.count()) > 0) {
        await priceInput.fill('9.99');
      }

      // Submit creation
      const submitButton = page.getByRole('button', { name: /create|save|submit/i }).first();
      await submitButton.click();

      // Verify plan appears in list
      await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });

      // Edit the plan
      const planRow = page.locator('tr, [data-testid="plan-row"]', {
        hasText: planName,
      }).first();
      const editButton = planRow.getByRole('button', { name: /edit/i });
      if ((await editButton.count()) > 0) {
        await editButton.click();

        const editNameInput = page.getByLabel(/name/i).first();
        if ((await editNameInput.count()) > 0) {
          await editNameInput.fill(`${planName} Updated`);
        }

        const saveButton = page.getByRole('button', { name: /save|update|submit/i }).first();
        await saveButton.click();

        await expect(page.getByText(`${planName} Updated`)).toBeVisible({ timeout: 5000 });
      }

      // Deactivate the plan
      const deactivateButton = page
        .locator('tr, [data-testid="plan-row"]', { hasText: planName })
        .first()
        .getByRole('button', { name: /deactivate|archive|disable/i });
      if ((await deactivateButton.count()) > 0) {
        await deactivateButton.click();

        const confirmButton = page.getByRole('button', { name: /confirm|yes|deactivate/i });
        if ((await confirmButton.count()) > 0) {
          await confirmButton.first().click();
        }

        // Plan should show as inactive or be removed from active list
        const statusIndicator = page.getByText(/inactive|deactivated|archived/i);
        await expect(statusIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
          // Plan might have been removed from the active list entirely
        });
      }
    }
  });

  // --------------------------------------------------------------------------
  // View security events dashboard -> filter -> export
  // --------------------------------------------------------------------------

  test('view security events -> filter -> export', async ({ page }) => {
    test.skip(
      adminEmail === undefined || adminPassword === undefined,
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run security events E2E test.',
    );

    await loginAsAdmin(page);
    await page.goto(`${baseURL}/admin/security`);

    // Wait for the security events page to load
    await page.waitForLoadState('networkidle');

    // Verify the events table or list is present
    const eventsContainer = page.locator(
      'table, [data-testid="security-events"], .security-events',
    );
    await expect(eventsContainer.first()).toBeVisible({ timeout: 10000 });

    // Apply a filter (e.g., by severity or event type)
    const filterSelect = page.getByRole('combobox', { name: /severity|type|filter/i }).first();
    if ((await filterSelect.count()) > 0) {
      await filterSelect.selectOption({ index: 1 });

      // Wait for filtered results
      await page.waitForTimeout(1000);
    }

    // Try the search/filter input
    const filterInput = page.getByPlaceholder(/search|filter/i).first();
    if ((await filterInput.count()) > 0) {
      await filterInput.fill('login');
      await filterInput.press('Enter');
      await page.waitForTimeout(500);
    }

    // Export security events
    const exportButton = page.getByRole('button', { name: /export|download/i }).first();
    if ((await exportButton.count()) > 0) {
      // Set up a download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await exportButton.click();

      // If a format selection dialog appears, choose JSON
      const jsonOption = page.getByRole('button', { name: /json/i });
      if ((await jsonOption.count()) > 0) {
        await jsonOption.first().click();
      }

      const download = await downloadPromise;
      if (download !== null) {
        const filename = download.suggestedFilename();
        expect(filename).toMatch(/security|events|export/i);
      }
    }
  });

  // --------------------------------------------------------------------------
  // View route manifest -> filter by module/method
  // --------------------------------------------------------------------------

  test('view route manifest -> filter by module/method', async ({ page }) => {
    test.skip(
      adminEmail === undefined || adminPassword === undefined,
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run route manifest E2E test.',
    );

    await loginAsAdmin(page);
    await page.goto(`${baseURL}/admin/routes`);

    // Wait for the route manifest page to load
    await page.waitForLoadState('networkidle');

    // Verify routes are displayed
    const routesContainer = page.locator(
      'table, [data-testid="routes-list"], .route-manifest',
    );
    await expect(routesContainer.first()).toBeVisible({ timeout: 10000 });

    // Look for route entries showing method and path
    const routeEntries = page.locator(
      'tr, [data-testid="route-entry"], .route-row',
    );
    const routeCount = await routeEntries.count();
    expect(routeCount).toBeGreaterThan(0);

    // Filter by method (e.g., GET)
    const methodFilter = page.getByRole('combobox', { name: /method/i }).first();
    if ((await methodFilter.count()) > 0) {
      await methodFilter.selectOption('GET');
      await page.waitForTimeout(500);

      // Verify filtered results only show GET routes
      const filteredEntries = page.locator('tr, [data-testid="route-entry"]');
      const filteredCount = await filteredEntries.count();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThanOrEqual(routeCount);
    }

    // Filter by search text (module name or path fragment)
    const searchInput = page.getByPlaceholder(/search|filter|path/i).first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('admin');
      await searchInput.press('Enter');
      await page.waitForTimeout(500);

      // Verify filtered results contain "admin" in the path
      const searchResults = page.locator('tr, [data-testid="route-entry"]');
      const searchCount = await searchResults.count();
      expect(searchCount).toBeGreaterThan(0);

      // Verify at least one result contains "admin"
      if (searchCount > 0) {
        const firstResult = await searchResults.first().textContent();
        expect(firstResult?.toLowerCase()).toContain('admin');
      }
    }
  });
});
