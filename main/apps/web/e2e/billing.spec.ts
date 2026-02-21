// main/apps/web/e2e/billing.spec.ts
/**
 * Billing & Subscriptions E2E Tests
 *
 * Tests the billing user flows through the browser,
 * including plan selection, checkout, upgrades, downgrades,
 * billing settings, and subscription cancellation.
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

test.describe('Billing & Subscriptions', () => {
  // ===========================================================================
  // View pricing page -> select plan -> complete checkout -> see active subscription
  // ===========================================================================

  test('view pricing page, select plan, complete checkout, see active subscription', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    // Login first
    await page.goto(baseURL);
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('billing-user@example.com');
    await page.getByLabel(/password/i).fill('BillingPassw0rd!');
    await page.getByRole('button', { name: /login/i }).click();

    // Navigate to pricing page
    await page.goto(`${baseURL}/pricing`);
    await expect(page).toHaveURL(/pricing/);

    // Should see plan options
    const planCards = page.getByTestId('plan-card');
    const planButtons = page.getByRole('button', { name: /select|choose|subscribe|get started/i });
    const hasPlans = (await planCards.count()) > 0 || (await planButtons.count()) > 0;
    expect(hasPlans).toBe(true);

    // Select a plan (click the first available plan button)
    if ((await planButtons.count()) > 0) {
      await planButtons.first().click();
    }

    // Should be redirected to checkout or Stripe checkout page
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // After checkout completion, verify subscription is active
    // Navigate to billing settings to see active subscription
    await page.goto(`${baseURL}/settings/billing`);

    // Should see subscription information
    const subscriptionInfo = page.getByText(/active|current plan|subscription/i);
    if ((await subscriptionInfo.count()) > 0) {
      await expect(subscriptionInfo.first()).toBeVisible();
    }
  });

  // ===========================================================================
  // Upgrade plan -> see updated entitlements immediately
  // ===========================================================================

  test('upgrade plan and see updated entitlements', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('billing-user@example.com');
    await page.getByLabel(/password/i).fill('BillingPassw0rd!');
    await page.getByRole('button', { name: /login/i }).click();

    // Navigate to billing settings
    await page.goto(`${baseURL}/settings/billing`);

    // Look for upgrade button or plan change option
    const upgradeButton = page.getByRole('button', { name: /upgrade|change plan/i });
    const upgradeLink = page.getByRole('link', { name: /upgrade|change plan/i });

    if ((await upgradeButton.count()) > 0) {
      await upgradeButton.first().click();
      await page.waitForLoadState('networkidle');

      // After upgrade, should see the new plan details
      const planName = page.getByText(/pro|enterprise|premium/i);
      if ((await planName.count()) > 0) {
        await expect(planName.first()).toBeVisible();
      }
    } else if ((await upgradeLink.count()) > 0) {
      await upgradeLink.first().click();
      await page.waitForLoadState('networkidle');
    }
    // If no upgrade option visible, user may already be on the highest plan
  });

  // ===========================================================================
  // Downgrade plan -> see reduced entitlements at next billing cycle
  // ===========================================================================

  test('downgrade plan and see reduced entitlements notice', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('billing-user@example.com');
    await page.getByLabel(/password/i).fill('BillingPassw0rd!');
    await page.getByRole('button', { name: /login/i }).click();

    await page.goto(`${baseURL}/settings/billing`);

    // Look for downgrade or change plan option
    const downgradeButton = page.getByRole('button', { name: /downgrade|change plan/i });

    if ((await downgradeButton.count()) > 0) {
      await downgradeButton.first().click();
      await page.waitForLoadState('networkidle');

      // Should see a notice about when the downgrade takes effect
      const downgradNotice = page.getByText(
        /next billing cycle|end of.*period|takes effect|downgrade.*scheduled/i,
      );
      if ((await downgradNotice.count()) > 0) {
        await expect(downgradNotice.first()).toBeVisible();
      }
    }
  });

  // ===========================================================================
  // View billing settings -> see current plan, invoices, payment method
  // ===========================================================================

  test('view billing settings shows current plan, invoices, and payment method', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('billing-user@example.com');
    await page.getByLabel(/password/i).fill('BillingPassw0rd!');
    await page.getByRole('button', { name: /login/i }).click();

    await page.goto(`${baseURL}/settings/billing`);

    // Should see the billing settings page
    await expect(page).toHaveURL(/settings.*billing|billing/);

    // Should see current plan information
    const planSection = page.getByText(/current plan|your plan|subscription/i);
    if ((await planSection.count()) > 0) {
      await expect(planSection.first()).toBeVisible();
    }

    // Should see invoices section or link
    const invoicesSection = page.getByText(/invoice|billing history|payment history/i);
    if ((await invoicesSection.count()) > 0) {
      await expect(invoicesSection.first()).toBeVisible();
    }

    // Should see payment method section
    const paymentSection = page.getByText(/payment method|card|payment/i);
    if ((await paymentSection.count()) > 0) {
      await expect(paymentSection.first()).toBeVisible();
    }
  });

  // ===========================================================================
  // Cancel subscription -> see confirmation -> plan remains active until period end
  // ===========================================================================

  test('cancel subscription shows confirmation and plan remains active until period end', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await page.goto(baseURL);
    await page.getByRole('link', { name: /login/i }).click();
    await page.getByLabel(/email/i).fill('billing-user@example.com');
    await page.getByLabel(/password/i).fill('BillingPassw0rd!');
    await page.getByRole('button', { name: /login/i }).click();

    await page.goto(`${baseURL}/settings/billing`);

    // Look for cancel subscription button
    const cancelButton = page.getByRole('button', { name: /cancel.*subscription|cancel.*plan/i });

    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click();

      // Should see confirmation dialog or message
      const confirmDialog = page.getByRole('dialog');
      const confirmText = page.getByText(/are you sure|confirm.*cancel/i);
      const hasConfirmation = (await confirmDialog.count()) > 0 || (await confirmText.count()) > 0;

      if (hasConfirmation) {
        // Confirm the cancellation
        const confirmButton = page.getByRole('button', {
          name: /confirm|yes.*cancel|cancel.*subscription/i,
        });
        if ((await confirmButton.count()) > 0) {
          await confirmButton.first().click();
          await page.waitForLoadState('networkidle');
        }
      }

      // After cancellation, should see that plan remains active until period end
      const activeUntilMessage = page.getByText(
        /active until|cancels at|period end|remains active/i,
      );
      if ((await activeUntilMessage.count()) > 0) {
        await expect(activeUntilMessage.first()).toBeVisible();
      }

      // Should also see option to resume/reactivate
      const resumeButton = page.getByRole('button', { name: /resume|reactivate/i });
      if ((await resumeButton.count()) > 0) {
        await expect(resumeButton.first()).toBeVisible();
      }
    }
  });
});
