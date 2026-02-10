// src/apps/web/src/__tests__/e2e/auth-pages.e2e.ts
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

test.describe('Protected Route Redirects', () => {
  test('dashboard redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(auth|login)/);
  });

  test('settings redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/(auth|login)/);
  });
});
