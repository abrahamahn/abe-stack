// main/apps/web/e2e/settings.e2e.ts
/**
 * Settings Page E2E Tests
 *
 * Verifies settings page behavior when unauthenticated.
 * The settings page is not behind ProtectedRoute — it handles
 * its own auth state and shows an error/login prompt.
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Page — Unauthenticated', () => {
  test('renders without crashing', async ({ page }) => {
    await page.goto('/settings');
    // Settings page should render (it's not a protected route, it handles auth internally)
    await expect(page.locator('main')).toBeVisible();
  });

  test('shows error state or login prompt when not authenticated', async ({ page }) => {
    await page.goto('/settings');
    // When not authenticated, the SettingsPage shows an error card
    // with either "Session Expired" or "Unable to Load Settings"
    const errorCard = page.getByText(/session expired|unable to load|not authenticated/i);
    await expect(errorCard).toBeVisible({ timeout: 5000 });
  });

  test('has action button (Go to Login or Try Again)', async ({ page }) => {
    await page.goto('/settings');
    // Should show a "Go to Login" or "Try Again" button
    const actionButton = page.getByRole('button', { name: /go to login|try again/i });
    await expect(actionButton).toBeVisible({ timeout: 5000 });
  });
});
