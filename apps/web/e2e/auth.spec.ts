import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Auth happy path', () => {
  test('user can sign up, land on dashboard, and logout', async ({ page }) => {
    test.skip(!process.env.E2E_BASE_URL, 'Set E2E_BASE_URL to run this test against a live app');

    const email = `user${String(Date.now())}@example.com`;
    const password = 'Passw0rd!';

    await page.goto(baseURL);

    // Navigate to login/register page
    await page.getByRole('link', { name: /login/i }).click();

    // Fill and submit register form (assumes combined auth page pattern)
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.count()) {
      await nameInput.fill('Playwright User');
    }
    const registerButton = page.getByRole('button', { name: /register/i });
    if (await registerButton.count()) {
      await registerButton.click();
    } else {
      await page.getByRole('button', { name: /login/i }).click();
    }

    // Expect to land on dashboard and see user indicator
    await expect(page).toHaveURL(/dashboard/i);
    await expect(page.getByText(/dashboard/i)).toBeVisible();

    // Logout if available
    const logoutButton = page.getByRole('button', { name: /logout/i });
    if (await logoutButton.count()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/login/i);
    }
  });
});
