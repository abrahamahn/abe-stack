// main/apps/web/e2e/public-pages.e2e.ts
/**
 * Public Pages E2E Tests
 *
 * Verifies that public (unauthenticated) pages render correctly:
 * Home page, UI Library, Pricing page.
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('renders with doc content', async ({ page }) => {
    await page.goto('/');
    // The home page renders a doc viewer — wait for content to appear
    await expect(page.locator('main')).toBeVisible();
  });

  test('loads specific doc via query param', async ({ page }) => {
    await page.goto('/?doc=readme');
    await expect(page.locator('main')).toBeVisible();
  });

  test('renders app shell with navigation', async ({ page }) => {
    await page.goto('/');
    // The AppLayout shell should render a header/top bar
    await expect(page.locator('header').first()).toBeVisible();
  });
});

test.describe('UI Library Page', () => {
  test('renders with category buttons', async ({ page }) => {
    await page.goto('/ui-library');
    // UI Library has category tabs (Elements, Components, etc.)
    await expect(page.getByRole('button', { name: /elements/i })).toBeVisible();
  });

  test('shows component count text', async ({ page }) => {
    await page.goto('/ui-library');
    // Should show "N components" text
    await expect(page.getByText(/component/i)).toBeVisible();
  });

  test('category buttons are clickable', async ({ page }) => {
    await page.goto('/ui-library');
    const elementsBtn = page.getByRole('button', { name: /elements/i });
    await expect(elementsBtn).toBeVisible();
    await elementsBtn.click();
    // After click, the button should still be visible (active state)
    await expect(elementsBtn).toBeVisible();
  });
});

test.describe('Pricing Page', () => {
  test('renders without error', async ({ page }) => {
    await page.goto('/pricing');
    // Pricing page should not 404 — it should render within the app shell
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Clean Route', () => {
  test('renders same as home page', async ({ page }) => {
    await page.goto('/clean');
    await expect(page.locator('main')).toBeVisible();
  });
});
