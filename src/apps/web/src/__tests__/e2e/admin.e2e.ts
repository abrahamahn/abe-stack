// src/apps/web/src/__tests__/e2e/admin.e2e.ts
/**
 * Admin Pages E2E Tests
 *
 * Verifies admin page behavior when unauthenticated.
 * AdminLayout checks auth and redirects to /login if not authenticated.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Pages — Unauthenticated Redirects', () => {
  test('admin index redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('admin/users redirects to login', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('admin/security redirects to login', async ({ page }) => {
    await page.goto('/admin/security');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('admin/jobs redirects to login', async ({ page }) => {
    await page.goto('/admin/jobs');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('admin/routes redirects to login', async ({ page }) => {
    await page.goto('/admin/routes');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('admin/audit redirects to login', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('admin/feature-flags redirects to login', async ({ page }) => {
    await page.goto('/admin/feature-flags');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('admin/billing/plans redirects to login', async ({ page }) => {
    await page.goto('/admin/billing/plans');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });
});
