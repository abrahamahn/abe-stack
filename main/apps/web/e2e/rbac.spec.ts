// main/apps/web/e2e/rbac.spec.ts
/**
 * RBAC & Authorization E2E Tests
 *
 * Tests role-based access control through the browser,
 * verifying that UI correctly reflects and enforces role boundaries.
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

test.describe('RBAC & Authorization', () => {
  // ===========================================================================
  // Admin User — can access admin dashboard and manage users
  // ===========================================================================

  test.describe('admin user', () => {
    test('can access admin dashboard', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);

      // Login as admin user
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('AdminPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      // Navigate to admin dashboard
      await page.goto(`${baseURL}/admin`);

      // Admin should see the admin dashboard (not redirected, not 403)
      await expect(page).toHaveURL(/admin/);
      await expect(page.getByText(/admin/i)).toBeVisible();
    });

    test('can manage users from admin panel', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('AdminPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      // Navigate to user management section
      await page.goto(`${baseURL}/admin/users`);

      // Should see user management UI elements
      await expect(page.getByText(/users/i)).toBeVisible();
      // Should see a user list or table
      const userTable = page.getByRole('table');
      const userList = page.getByRole('list');
      const hasUserDisplay = (await userTable.count()) > 0 || (await userList.count()) > 0;
      expect(hasUserDisplay).toBe(true);
    });
  });

  // ===========================================================================
  // Regular User — admin routes return 403 or redirect to dashboard
  // ===========================================================================

  test.describe('regular user', () => {
    test('admin routes redirect to dashboard or show 403', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('user@example.com');
      await page.getByLabel(/password/i).fill('UserPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      // Try to navigate to admin dashboard
      await page.goto(`${baseURL}/admin`);

      // Regular user should either be redirected to dashboard or see a 403 page
      const url = page.url();
      const isRedirected = /dashboard/i.test(url);
      const hasForbiddenMessage = await page.getByText(/forbidden|not authorized|access denied/i).isVisible().catch(() => false);

      expect(isRedirected || hasForbiddenMessage).toBe(true);
    });

    test('admin user management route is inaccessible', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('user@example.com');
      await page.getByLabel(/password/i).fill('UserPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      await page.goto(`${baseURL}/admin/users`);

      // Should not see admin user management content
      const url = page.url();
      const isRedirected = /dashboard/i.test(url);
      const hasForbiddenMessage = await page.getByText(/forbidden|not authorized|access denied/i).isVisible().catch(() => false);

      expect(isRedirected || hasForbiddenMessage).toBe(true);
    });
  });

  // ===========================================================================
  // Workspace Viewer — cannot create/edit resources; sees read-only UI
  // ===========================================================================

  test.describe('workspace viewer', () => {
    test('cannot create or edit workspace resources', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('viewer@example.com');
      await page.getByLabel(/password/i).fill('ViewerPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      // Navigate to workspace settings or resource page
      await page.goto(`${baseURL}/dashboard`);

      // Viewer should not see create/edit buttons or they should be disabled
      const createButton = page.getByRole('button', { name: /create|new|add/i });
      const editButton = page.getByRole('button', { name: /edit|update|save/i });

      if ((await createButton.count()) > 0) {
        // Button exists but should be disabled or hidden for viewers
        const isDisabled = await createButton.first().isDisabled().catch(() => false);
        const isHidden = await createButton.first().isHidden().catch(() => true);
        expect(isDisabled || isHidden).toBe(true);
      }

      if ((await editButton.count()) > 0) {
        const isDisabled = await editButton.first().isDisabled().catch(() => false);
        const isHidden = await editButton.first().isHidden().catch(() => true);
        expect(isDisabled || isHidden).toBe(true);
      }
    });

    test('sees read-only workspace content', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('viewer@example.com');
      await page.getByLabel(/password/i).fill('ViewerPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      await page.goto(`${baseURL}/dashboard`);

      // Viewer should be able to see the dashboard (read-only access)
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    });
  });

  // ===========================================================================
  // Workspace Admin — can manage members but cannot transfer ownership
  // ===========================================================================

  test.describe('workspace admin', () => {
    test('can manage workspace members', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('ws-admin@example.com');
      await page.getByLabel(/password/i).fill('WsAdminPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      // Navigate to workspace member management
      await page.goto(`${baseURL}/settings/members`);

      // Workspace admin should see member management controls
      const inviteButton = page.getByRole('button', { name: /invite|add member/i });
      if ((await inviteButton.count()) > 0) {
        await expect(inviteButton.first()).toBeEnabled();
      }

      // Should be able to see role selectors or change role controls
      const roleSelector = page.getByRole('combobox');
      const roleButton = page.getByRole('button', { name: /role|change role/i });
      const hasRoleControls = (await roleSelector.count()) > 0 || (await roleButton.count()) > 0;
      // Admin should have some role management controls available
      expect(hasRoleControls || (await inviteButton.count()) > 0).toBe(true);
    });

    test('cannot transfer workspace ownership', async ({ page }) => {
      test.skip(
        process.env['E2E_BASE_URL'] === undefined,
        'Set E2E_BASE_URL to run this test against a live app',
      );

      await page.goto(baseURL);
      await page.getByRole('link', { name: /login/i }).click();
      await page.getByLabel(/email/i).fill('ws-admin@example.com');
      await page.getByLabel(/password/i).fill('WsAdminPassw0rd!');
      await page.getByRole('button', { name: /login/i }).click();

      // Navigate to workspace settings
      await page.goto(`${baseURL}/settings`);

      // Transfer ownership button/option should not be visible or should be disabled for admin
      const transferButton = page.getByRole('button', { name: /transfer ownership/i });
      const transferLink = page.getByRole('link', { name: /transfer ownership/i });

      if ((await transferButton.count()) > 0) {
        const isDisabled = await transferButton.first().isDisabled().catch(() => false);
        const isHidden = await transferButton.first().isHidden().catch(() => true);
        expect(isDisabled || isHidden).toBe(true);
      } else if ((await transferLink.count()) > 0) {
        // Transfer ownership link should not be visible to workspace admins
        await expect(transferLink.first()).toBeHidden();
      }
      // If neither element exists, that's correct — admin shouldn't see transfer option
    });
  });
});
