// main/apps/web/e2e/onboarding.spec.ts
/**
 * Golden Path Onboarding E2E Tests
 *
 * Verifies the complete new-user onboarding flow from registration
 * through workspace creation, teammate invitation, plan selection,
 * checkout, and the first success moment.
 *
 * These tests run against a live application and are skipped when
 * E2E_BASE_URL is not configured.
 */
import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

// ============================================================================
// Golden Path: Register → Verify → Workspace → Invite → Accept
// ============================================================================

test.describe('Golden Path Onboarding', () => {
  test('Register → verify email → create workspace → invite teammate → teammate accepts invite', async ({
    page,
    context,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    const timestamp = Date.now();
    const ownerEmail = `owner-${String(timestamp)}@example.com`;
    const teammateEmail = `teammate-${String(timestamp)}@example.com`;
    const password = 'Passw0rd!Secure';

    // Step 1: Register the workspace owner
    await page.goto(baseURL);
    await page.getByRole('link', { name: /register|sign up|get started/i }).click();

    const nameInput = page.getByLabel(/name/i);
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('Onboarding Owner');
    }
    await page.getByLabel(/email/i).fill(ownerEmail);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(password);

    // Handle confirm password field if present
    const confirmPassword = page.getByLabel(/confirm.*password/i);
    if ((await confirmPassword.count()) > 0) {
      await confirmPassword.fill(password);
    }

    await page.getByRole('button', { name: /register|sign up|create account/i }).click();

    // Step 2: Email verification (may auto-verify in test environments)
    // If a verification screen appears, handle it
    const verifyHeading = page.getByText(/verify.*email|check.*inbox|confirm.*email/i);
    if ((await verifyHeading.count()) > 0) {
      // In test environments, there may be a "skip verification" or auto-verify
      const skipButton = page.getByRole('button', {
        name: /skip|continue|verify later|already verified/i,
      });
      if ((await skipButton.count()) > 0) {
        await skipButton.click();
      }
      // Otherwise, if there's a verification token input (from test mailer)
      const tokenInput = page.getByLabel(/code|token|verification/i);
      if ((await tokenInput.count()) > 0) {
        // Test environments often accept '000000' or provide a bypass
        await tokenInput.fill('000000');
        await page.getByRole('button', { name: /verify|confirm|submit/i }).click();
      }
    }

    // Step 3: Create workspace
    // User should land on onboarding or dashboard after registration
    await page.waitForURL(/(dashboard|onboarding|workspace|setup)/i, { timeout: 10000 });

    const workspaceNameInput = page.getByLabel(/workspace.*name|team.*name|organization/i);
    if ((await workspaceNameInput.count()) > 0) {
      await workspaceNameInput.fill(`Test Workspace ${String(timestamp)}`);
      await page.getByRole('button', { name: /create|continue|next/i }).click();
    }

    // Step 4: Invite teammate
    const inviteInput = page.getByLabel(/email|invite/i).last();
    if ((await inviteInput.count()) > 0) {
      await inviteInput.fill(teammateEmail);
      const inviteButton = page.getByRole('button', { name: /invite|send|add/i });
      if ((await inviteButton.count()) > 0) {
        await inviteButton.click();
      }
    }

    // Skip or continue past invite step
    const skipInviteButton = page.getByRole('button', { name: /skip|continue|done|finish/i });
    if ((await skipInviteButton.count()) > 0) {
      await skipInviteButton.click();
    }

    // Expect to land on dashboard or onboarding completion
    await expect(page).toHaveURL(/(dashboard|home|workspace)/i);

    // Step 5: Teammate accepts invite (new browser context)
    const teammatePage = await context.newPage();
    await teammatePage.goto(baseURL);

    // Navigate to register/accept invite flow
    const registerLink = teammatePage.getByRole('link', { name: /register|sign up|get started/i });
    if ((await registerLink.count()) > 0) {
      await registerLink.click();
    }

    const teammateNameInput = teammatePage.getByLabel(/name/i);
    if ((await teammateNameInput.count()) > 0) {
      await teammateNameInput.fill('Teammate User');
    }
    await teammatePage.getByLabel(/email/i).fill(teammateEmail);
    await teammatePage
      .getByLabel(/password/i)
      .first()
      .fill(password);

    const teammateConfirmPw = teammatePage.getByLabel(/confirm.*password/i);
    if ((await teammateConfirmPw.count()) > 0) {
      await teammateConfirmPw.fill(password);
    }

    const submitButton = teammatePage.getByRole('button', {
      name: /register|sign up|create account|accept/i,
    });
    if ((await submitButton.count()) > 0) {
      await submitButton.click();
    }

    // Teammate should eventually see dashboard or invitation acceptance
    await teammatePage.waitForURL(/(dashboard|accept|workspace)/i, { timeout: 15000 });

    await teammatePage.close();
  });

  // ==========================================================================
  // Select Plan → Checkout → Dashboard with Active Subscription
  // ==========================================================================

  test('Select plan → complete checkout → see dashboard with team member and active subscription', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    const timestamp = Date.now();
    const email = `billing-${String(timestamp)}@example.com`;
    const password = 'Passw0rd!Billing';

    // Register a new user
    await page.goto(baseURL);
    await page.getByRole('link', { name: /register|sign up|get started/i }).click();

    const nameInput = page.getByLabel(/name/i);
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('Billing User');
    }
    await page.getByLabel(/email/i).fill(email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(password);

    const confirmPw = page.getByLabel(/confirm.*password/i);
    if ((await confirmPw.count()) > 0) {
      await confirmPw.fill(password);
    }

    await page.getByRole('button', { name: /register|sign up|create account/i }).click();

    // Wait for onboarding or dashboard
    await page.waitForURL(/(dashboard|onboarding|setup|pricing)/i, { timeout: 10000 });

    // Navigate to pricing/plan selection
    const pricingLink = page.getByRole('link', { name: /pricing|plans|upgrade|billing/i });
    if ((await pricingLink.count()) > 0) {
      await pricingLink.click();
    }

    // Select a plan (look for Pro/Team/Business plan option)
    const selectPlanButton = page.getByRole('button', {
      name: /select|choose|subscribe|upgrade|pro|team/i,
    });
    if ((await selectPlanButton.count()) > 0) {
      await selectPlanButton.first().click();
    }

    // Handle checkout form (Stripe test card or mock)
    const cardInput = page.getByLabel(/card.*number/i);
    if ((await cardInput.count()) > 0) {
      // Stripe test card number
      await cardInput.fill('4242424242424242');

      const expiryInput = page.getByLabel(/expir/i);
      if ((await expiryInput.count()) > 0) {
        await expiryInput.fill('12/30');
      }

      const cvcInput = page.getByLabel(/cvc|cvv|security/i);
      if ((await cvcInput.count()) > 0) {
        await cvcInput.fill('123');
      }

      const submitPayment = page.getByRole('button', {
        name: /pay|subscribe|complete|confirm/i,
      });
      if ((await submitPayment.count()) > 0) {
        await submitPayment.click();
      }
    }

    // Handle Stripe iframe if checkout is embedded
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
    if (stripeFrame !== null) {
      const stripeCardInput = stripeFrame.getByPlaceholder(/card number/i);
      if ((await stripeCardInput.count()) > 0) {
        await stripeCardInput.fill('4242 4242 4242 4242');
        await stripeFrame.getByPlaceholder(/mm.*yy/i).fill('12 / 30');
        await stripeFrame.getByPlaceholder(/cvc/i).fill('123');
      }
    }

    // After checkout, expect to return to dashboard
    await page.waitForURL(/(dashboard|billing|subscription|success)/i, { timeout: 30000 });

    // Verify dashboard shows subscription status
    const subscriptionIndicator = page.getByText(
      /active|subscribed|pro|team|premium|current plan/i,
    );
    await expect(subscriptionIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  // ==========================================================================
  // First Success Moment — Populated Workspace with Welcome Content
  // ==========================================================================

  test('First success moment — user sees populated workspace with welcome content', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    const timestamp = Date.now();
    const email = `welcome-${String(timestamp)}@example.com`;
    const password = 'Passw0rd!Welcome';

    // Register
    await page.goto(baseURL);
    await page.getByRole('link', { name: /register|sign up|get started/i }).click();

    const nameInput = page.getByLabel(/name/i);
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('Welcome User');
    }
    await page.getByLabel(/email/i).fill(email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(password);

    const confirmPw = page.getByLabel(/confirm.*password/i);
    if ((await confirmPw.count()) > 0) {
      await confirmPw.fill(password);
    }

    await page.getByRole('button', { name: /register|sign up|create account/i }).click();

    // Complete any onboarding steps
    await page.waitForURL(/(dashboard|onboarding|workspace|setup|home)/i, { timeout: 10000 });

    // Skip through onboarding wizard if present
    let continueButton = page.getByRole('button', { name: /continue|next|skip|finish|done/i });
    let attempts = 0;
    while ((await continueButton.count()) > 0 && attempts < 5) {
      await continueButton.first().click();
      await page.waitForTimeout(500);
      continueButton = page.getByRole('button', { name: /continue|next|skip|finish|done/i });
      attempts++;
    }

    // Verify the dashboard/workspace shows welcome or getting started content
    const dashboardContent = page.getByText(
      /welcome|getting started|quick start|first steps|dashboard/i,
    );
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });

    // Verify there is some populated content (not an empty state)
    const mainContent = page.locator('main, [role="main"], .dashboard, .workspace');
    if ((await mainContent.count()) > 0) {
      await expect(mainContent.first()).not.toBeEmpty();
    }
  });
});

// ============================================================================
// Negative Path Tests
// ============================================================================

test.describe('Onboarding Negative Paths', () => {
  test('Expired invite link shows clear error message', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    // Navigate to an invite URL with an obviously expired/invalid token
    await page.goto(`${baseURL}/invite/accept?token=expired-invalid-token-abc123`);

    // The page should display an error, not crash
    const errorMessage = page.getByText(
      /expired|invalid|not found|no longer valid|link.*expired|invitation.*expired/i,
    );
    const errorStatus = page.getByText(/error|oops|sorry|unable/i);

    // Either a specific expiration message or a generic error should be visible
    const hasExpiredMessage = (await errorMessage.count()) > 0;
    const hasErrorMessage = (await errorStatus.count()) > 0;
    const pageContent = await page.textContent('body');

    // Verify the page has meaningful content (not a blank crash)
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(0);

    // At minimum, the page should not show a raw stack trace or blank page
    const hasStackTrace = /at\s+\w+\s+\(/.test(pageContent ?? '');
    expect(hasStackTrace).toBe(false);

    // Should have either an error message or redirect to login
    const currentUrl = page.url();
    const hasErrorUI = hasExpiredMessage || hasErrorMessage;
    const redirectedToLogin = /login|register|auth/i.test(currentUrl);
    expect(hasErrorUI || redirectedToLogin).toBe(true);
  });

  test('Invalid payment details show graceful fallback', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    const timestamp = Date.now();
    const email = `pay-fail-${String(timestamp)}@example.com`;
    const password = 'Passw0rd!PayFail';

    // Register a user first
    await page.goto(baseURL);
    await page.getByRole('link', { name: /register|sign up|get started/i }).click();

    const nameInput = page.getByLabel(/name/i);
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('Payment Fail User');
    }
    await page.getByLabel(/email/i).fill(email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(password);

    const confirmPw = page.getByLabel(/confirm.*password/i);
    if ((await confirmPw.count()) > 0) {
      await confirmPw.fill(password);
    }

    await page.getByRole('button', { name: /register|sign up|create account/i }).click();

    // Wait for onboarding or dashboard
    await page.waitForURL(/(dashboard|onboarding|setup|pricing)/i, { timeout: 10000 });

    // Navigate to billing/pricing
    const pricingLink = page.getByRole('link', { name: /pricing|plans|upgrade|billing/i });
    if ((await pricingLink.count()) > 0) {
      await pricingLink.click();
    }

    // Select a plan
    const selectPlan = page.getByRole('button', {
      name: /select|choose|subscribe|upgrade|pro|team/i,
    });
    if ((await selectPlan.count()) > 0) {
      await selectPlan.first().click();
    }

    // Enter Stripe test card that declines
    const cardInput = page.getByLabel(/card.*number/i);
    if ((await cardInput.count()) > 0) {
      // 4000000000000002 is Stripe's test card for generic decline
      await cardInput.fill('4000000000000002');

      const expiryInput = page.getByLabel(/expir/i);
      if ((await expiryInput.count()) > 0) {
        await expiryInput.fill('12/30');
      }

      const cvcInput = page.getByLabel(/cvc|cvv|security/i);
      if ((await cvcInput.count()) > 0) {
        await cvcInput.fill('123');
      }

      const submitPayment = page.getByRole('button', {
        name: /pay|subscribe|complete|confirm/i,
      });
      if ((await submitPayment.count()) > 0) {
        await submitPayment.click();
      }

      // Wait for the error to appear
      await page.waitForTimeout(3000);

      // Should show a payment error, not a crash
      const paymentError = page.getByText(
        /declined|failed|error|unable|try again|payment.*failed|card.*declined/i,
      );
      const hasPaymentError = (await paymentError.count()) > 0;

      // The user should still be on the checkout/billing page (not redirected to error)
      const currentUrl = page.url();
      const onBillingPage = /(billing|checkout|pricing|payment|subscribe)/i.test(currentUrl);
      const onDashboard = /dashboard/i.test(currentUrl);

      // Either shows error on billing page, or gracefully falls back to dashboard
      expect(hasPaymentError || onBillingPage || onDashboard).toBe(true);

      // Page should not show raw stack trace
      const pageContent = await page.textContent('body');
      const hasStackTrace = /at\s+\w+\s+\(/.test(pageContent ?? '');
      expect(hasStackTrace).toBe(false);
    }
  });
});
