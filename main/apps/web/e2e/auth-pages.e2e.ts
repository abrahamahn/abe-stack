// main/apps/web/e2e/auth-pages.e2e.ts
/**
 * Auth Pages E2E Tests
 *
 * Verifies that auth pages render correctly and navigation between
 * auth modes works as expected.
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Page Rendering', () => {
  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/auth?mode=login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('register page renders with form fields', async ({ page }) => {
    await page.goto('/auth?mode=register');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('forgot-password page renders', async ({ page }) => {
    await page.goto('/auth?mode=forgot-password');
    await expect(page.getByText(/reset password/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe('Auth Page Navigation', () => {
  test('login page has link to register', async ({ page }) => {
    await page.goto('/auth?mode=login');
    const signUpLink = page.getByText('Sign up');
    await expect(signUpLink).toBeVisible();
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/auth?mode=register');
    const signInLink = page.getByText('Sign in');
    await expect(signInLink).toBeVisible();
  });

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/auth?mode=login');
    const forgotLink = page.getByText(/forgot.*password/i);
    await expect(forgotLink).toBeVisible();
  });

  test('forgot-password page has sign in link', async ({ page }) => {
    await page.goto('/auth?mode=forgot-password');
    const signInLink = page.getByText('Sign in');
    await expect(signInLink).toBeVisible();
  });
});

test.describe('Standalone Auth Routes', () => {
  test('/login renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('/register renders register form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('/auth/reset-password renders without crash', async ({ page }) => {
    await page.goto('/auth/reset-password');
    // Reset password page should render — may show "invalid token" state
    await expect(page.locator('main')).toBeVisible();
  });

  test('/auth/confirm-email renders without crash', async ({ page }) => {
    await page.goto('/auth/confirm-email');
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Protected Route Redirects', () => {
  test('dashboard redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('activities redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/activities');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('settings/accounts redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/settings/accounts');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('settings/billing redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/settings/billing');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('workspaces redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('billing/success redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/billing/success');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });

  test('billing/cancel redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/billing/cancel');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 5000 });
  });
});
