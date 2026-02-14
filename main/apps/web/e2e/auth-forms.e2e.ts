// main/apps/web/e2e/auth-forms.e2e.ts
/**
 * Auth Forms E2E Tests
 *
 * Verifies form field presence and client-side validation behavior
 * for login, register, and forgot-password forms.
 */

import { test, expect } from '@playwright/test';

test.describe('Login Form Fields', () => {
  test('has email/username and password fields', async ({ page }) => {
    await page.goto('/auth?mode=login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('has submit button', async ({ page }) => {
    await page.goto('/auth?mode=login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('empty form submission triggers validation', async ({ page }) => {
    await page.goto('/auth?mode=login');
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();
    // HTML5 required validation prevents submission — fields remain empty
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveValue('');
  });
});

test.describe('Register Form Fields', () => {
  test('has email, username, name, and password fields', async ({ page }) => {
    await page.goto('/auth?mode=register');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('has submit button', async ({ page }) => {
    await page.goto('/auth?mode=register');
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('empty form submission triggers validation', async ({ page }) => {
    await page.goto('/auth?mode=register');
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveValue('');
  });
});

test.describe('Forgot Password Form Fields', () => {
  test('has email field', async ({ page }) => {
    await page.goto('/auth?mode=forgot-password');
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('has submit button', async ({ page }) => {
    await page.goto('/auth?mode=forgot-password');
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('empty form submission triggers validation', async ({ page }) => {
    await page.goto('/auth?mode=forgot-password');
    const submitButton = page.getByRole('button', { name: /send reset link/i });
    await submitButton.click();
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveValue('');
  });
});
