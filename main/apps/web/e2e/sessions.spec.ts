// main/apps/web/e2e/sessions.spec.ts
/**
 * Sessions & Device Security E2E Tests
 *
 * Validates the active-sessions list, single-session revocation,
 * "log out all other devices" flow, and human-readable device labels.
 *
 * Requires E2E_BASE_URL to point at a running instance of the app.
 */

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register and log in a fresh user, returning the credentials used. */
async function registerAndLogin(page: Page): Promise<{ email: string; password: string }> {
  const email = `sess-${String(Date.now())}-${String(Math.random()).slice(2, 6)}@example.com`;
  const password = 'Passw0rd!Secure';

  await page.goto(`${baseURL}/login`);

  // Attempt registration first; fall back to login-only forms
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  const nameInput = page.getByLabel(/name/i);
  if ((await nameInput.count()) > 0) {
    await nameInput.fill('Session Tester');
  }

  const registerButton = page.getByRole('button', { name: /register/i });
  if ((await registerButton.count()) > 0) {
    await registerButton.click();
  } else {
    await page.getByRole('button', { name: /login/i }).click();
  }

  await page.waitForURL(/dashboard/i);

  return { email, password };
}

/** Log in with existing credentials. */
async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${baseURL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await page.waitForURL(/dashboard/i);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Sessions & Device Security', () => {
  test('login and navigate to settings to see active sessions list with "This device" indicator', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await registerAndLogin(page);

    // Navigate to settings / sessions page
    await page.goto(`${baseURL}/settings`);

    // Look for a sessions section or link
    const sessionsLink = page.getByRole('link', { name: /sessions/i });
    if ((await sessionsLink.count()) > 0) {
      await sessionsLink.click();
    }

    // Expect to see at least one active session entry
    const sessionsList = page.getByText(/active session/i).or(page.getByText(/this device/i));
    await expect(sessionsList.first()).toBeVisible();

    // The current session should be labeled as "This device" or "Current session"
    const currentIndicator = page
      .getByText(/this device/i)
      .or(page.getByText(/current session/i));
    await expect(currentIndicator.first()).toBeVisible();
  });

  test('login from two sessions, revoke one, verify revoked session is logged out', async ({
    browser,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    // Session A: register and login
    const contextA: BrowserContext = await browser.newContext();
    const pageA: Page = await contextA.newPage();
    const { email, password } = await registerAndLogin(pageA);

    // Session B: login with same credentials in a different browser context
    const contextB: BrowserContext = await browser.newContext();
    const pageB: Page = await contextB.newPage();
    await login(pageB, email, password);

    // Go to sessions settings in Session A
    await pageA.goto(`${baseURL}/settings`);
    const sessionsLink = pageA.getByRole('link', { name: /sessions/i });
    if ((await sessionsLink.count()) > 0) {
      await sessionsLink.click();
    }

    // There should be at least 2 sessions visible
    await pageA.waitForTimeout(1000);

    // Revoke the other session (not the current one)
    const revokeButton = pageA
      .getByRole('button', { name: /revoke|end session|log out/i })
      .first();
    if ((await revokeButton.count()) > 0) {
      await revokeButton.click();

      // Confirm revocation if a confirmation dialog appears
      const confirmButton = pageA.getByRole('button', { name: /confirm|yes/i });
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click();
      }
    }

    // Session B should be logged out: navigating to dashboard should redirect to login
    await pageB.goto(`${baseURL}/dashboard`);
    await pageB.waitForTimeout(2000);

    // The revoked session should either show a login page or an error
    const currentUrl = pageB.url();
    const isLoggedOut =
      currentUrl.includes('login') ||
      currentUrl.includes('signin') ||
      (await pageB.getByText(/session.*expired|logged out|sign in/i).count()) > 0;
    expect(isLoggedOut).toBeTruthy();

    await contextA.close();
    await contextB.close();
  });

  test('"Log out all other devices" leaves only current session active', async ({ browser }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    // Session A: register and login
    const contextA: BrowserContext = await browser.newContext();
    const pageA: Page = await contextA.newPage();
    const { email, password } = await registerAndLogin(pageA);

    // Session B: login with same credentials
    const contextB: BrowserContext = await browser.newContext();
    const pageB: Page = await contextB.newPage();
    await login(pageB, email, password);

    // Session C: login with same credentials
    const contextC: BrowserContext = await browser.newContext();
    const pageC: Page = await contextC.newPage();
    await login(pageC, email, password);

    // From Session A, revoke all other devices
    await pageA.goto(`${baseURL}/settings`);
    const sessionsLink = pageA.getByRole('link', { name: /sessions/i });
    if ((await sessionsLink.count()) > 0) {
      await sessionsLink.click();
    }

    const revokeAllButton = pageA.getByRole('button', {
      name: /log out all|revoke all|end all other/i,
    });
    if ((await revokeAllButton.count()) > 0) {
      await revokeAllButton.click();

      // Confirm if needed
      const confirmButton = pageA.getByRole('button', { name: /confirm|yes/i });
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click();
      }
    }

    // Session A should still be active
    await pageA.goto(`${baseURL}/dashboard`);
    await expect(pageA).toHaveURL(/dashboard/i);

    // Session B should be logged out
    await pageB.goto(`${baseURL}/dashboard`);
    await pageB.waitForTimeout(2000);
    const bLoggedOut =
      pageB.url().includes('login') ||
      (await pageB.getByText(/session.*expired|logged out|sign in/i).count()) > 0;
    expect(bLoggedOut).toBeTruthy();

    // Session C should be logged out
    await pageC.goto(`${baseURL}/dashboard`);
    await pageC.waitForTimeout(2000);
    const cLoggedOut =
      pageC.url().includes('login') ||
      (await pageC.getByText(/session.*expired|logged out|sign in/i).count()) > 0;
    expect(cLoggedOut).toBeTruthy();

    await contextA.close();
    await contextB.close();
    await contextC.close();
  });

  test('session shows human-readable device label instead of raw UA string', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await registerAndLogin(page);

    // Navigate to sessions settings
    await page.goto(`${baseURL}/settings`);
    const sessionsLink = page.getByRole('link', { name: /sessions/i });
    if ((await sessionsLink.count()) > 0) {
      await sessionsLink.click();
    }

    // Wait for the session list to render
    await page.waitForTimeout(1000);

    // The UI should show a human-readable device label like "Chrome on Windows"
    // or "Safari on macOS", NOT the raw user agent string like "Mozilla/5.0 ..."
    const rawUaPattern = page.getByText(/^Mozilla\/5\.0/);
    const rawUaCount = await rawUaPattern.count();
    expect(rawUaCount).toBe(0);

    // Instead, expect a readable label containing a browser name
    const browserLabels = [/chrome/i, /firefox/i, /safari/i, /edge/i, /opera/i];
    const osLabels = [/windows/i, /macos/i, /linux/i, /ios/i, /android/i];

    let foundBrowserLabel = false;
    for (const pattern of browserLabels) {
      if ((await page.getByText(pattern).count()) > 0) {
        foundBrowserLabel = true;
        break;
      }
    }

    let foundOsLabel = false;
    for (const pattern of osLabels) {
      if ((await page.getByText(pattern).count()) > 0) {
        foundOsLabel = true;
        break;
      }
    }

    // At least a browser or OS label should be visible as part of the device description
    expect(foundBrowserLabel || foundOsLabel).toBeTruthy();
  });
});
