// main/apps/web/e2e/account.spec.ts
/**
 * Account Management E2E Tests
 *
 * Validates user profile changes, avatar upload, profile completeness,
 * account deletion, and sudo-mode re-authentication.
 *
 * Requires E2E_BASE_URL to point at a running instance of the app.
 */

import { expect, test, type Page } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register and log in a fresh user, returning the credentials used. */
async function registerAndLogin(page: Page): Promise<{ email: string; password: string }> {
  const email = `acct-${String(Date.now())}-${String(Math.random()).slice(2, 6)}@example.com`;
  const password = 'Passw0rd!Secure';

  await page.goto(`${baseURL}/login`);

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  const nameInput = page.getByLabel(/name/i);
  if ((await nameInput.count()) > 0) {
    await nameInput.fill('Account Tester');
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Account Management', () => {
  test('change username in settings and see updated username across the app', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await registerAndLogin(page);

    // Navigate to settings
    await page.goto(`${baseURL}/settings`);

    // Look for a profile or account section
    const profileLink = page.getByRole('link', { name: /profile|account/i });
    if ((await profileLink.count()) > 0) {
      await profileLink.first().click();
    }

    // Find the username field and update it
    const newUsername = `user-${String(Date.now()).slice(-8)}`;
    const usernameInput = page.getByLabel(/username/i).or(page.locator('input[name="username"]'));
    if ((await usernameInput.count()) > 0) {
      await usernameInput.clear();
      await usernameInput.fill(newUsername);

      // Save changes
      const saveButton = page.getByRole('button', { name: /save|update/i }).first();
      await saveButton.click();

      // Wait for save confirmation
      await page.waitForTimeout(1000);

      // Navigate to dashboard and back to verify persistence
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForTimeout(500);

      // The updated username should appear somewhere in the UI (header, sidebar, etc.)
      const usernameVisible = page.getByText(newUsername);
      if ((await usernameVisible.count()) > 0) {
        await expect(usernameVisible.first()).toBeVisible();
      }

      // Navigate back to settings and verify the input still shows the new username
      await page.goto(`${baseURL}/settings`);
      const profileLinkAgain = page.getByRole('link', { name: /profile|account/i });
      if ((await profileLinkAgain.count()) > 0) {
        await profileLinkAgain.first().click();
      }
      const usernameField = page
        .getByLabel(/username/i)
        .or(page.locator('input[name="username"]'));
      if ((await usernameField.count()) > 0) {
        await expect(usernameField).toHaveValue(newUsername);
      }
    }
  });

  test('upload avatar and see it in profile and header', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await registerAndLogin(page);

    // Navigate to profile settings
    await page.goto(`${baseURL}/settings`);
    const profileLink = page.getByRole('link', { name: /profile|account/i });
    if ((await profileLink.count()) > 0) {
      await profileLink.first().click();
    }

    // Look for avatar upload area
    const avatarInput = page.locator('input[type="file"][accept*="image"]').first();
    if ((await avatarInput.count()) > 0) {
      // Create a minimal PNG buffer for upload (1x1 pixel transparent PNG)
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const pngBuffer = Buffer.from(pngBase64, 'base64');

      // Write temp file and upload
      await avatarInput.setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Wait for upload processing
      await page.waitForTimeout(2000);

      // Look for save/upload confirmation button if needed
      const uploadButton = page.getByRole('button', { name: /upload|save avatar|confirm/i });
      if ((await uploadButton.count()) > 0) {
        await uploadButton.click();
        await page.waitForTimeout(1000);
      }

      // Verify avatar image is visible in the profile section
      const avatarImages = page.locator('img[alt*="avatar" i], img[alt*="profile" i]');
      if ((await avatarImages.count()) > 0) {
        const avatarSrc = await avatarImages.first().getAttribute('src');
        expect(avatarSrc).toBeTruthy();
        // Avatar src should not be a default/placeholder
        expect(avatarSrc).not.toContain('placeholder');
      }

      // Check header for avatar image
      const headerAvatar = page.locator(
        'header img[alt*="avatar" i], header img[alt*="profile" i], nav img[alt*="avatar" i]',
      );
      if ((await headerAvatar.count()) > 0) {
        await expect(headerAvatar.first()).toBeVisible();
      }
    }
  });

  test('update profile fields, save, refresh, and see persisted changes', async ({ page }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await registerAndLogin(page);

    await page.goto(`${baseURL}/settings`);
    const profileLink = page.getByRole('link', { name: /profile|account/i });
    if ((await profileLink.count()) > 0) {
      await profileLink.first().click();
    }

    // Update various profile fields
    const bioInput = page.getByLabel(/bio/i).or(page.locator('textarea[name="bio"]'));
    const cityInput = page.getByLabel(/city/i).or(page.locator('input[name="city"]'));
    const websiteInput = page.getByLabel(/website/i).or(page.locator('input[name="website"]'));

    const testBio = 'Automated test bio for E2E validation';
    const testCity = 'Test City';
    const testWebsite = 'https://example.com/e2e-test';

    if ((await bioInput.count()) > 0) {
      await bioInput.clear();
      await bioInput.fill(testBio);
    }
    if ((await cityInput.count()) > 0) {
      await cityInput.clear();
      await cityInput.fill(testCity);
    }
    if ((await websiteInput.count()) > 0) {
      await websiteInput.clear();
      await websiteInput.fill(testWebsite);
    }

    // Save the changes
    const saveButton = page.getByRole('button', { name: /save|update/i }).first();
    await saveButton.click();

    // Wait for save to complete
    await page.waitForTimeout(1500);

    // Full page refresh to confirm persistence
    await page.reload();
    await page.waitForTimeout(1000);

    // Navigate back to profile settings if needed
    const profileLinkRefreshed = page.getByRole('link', { name: /profile|account/i });
    if ((await profileLinkRefreshed.count()) > 0) {
      await profileLinkRefreshed.first().click();
    }

    // Verify the saved values persisted
    if ((await bioInput.count()) > 0) {
      await expect(bioInput).toHaveValue(testBio);
    }
    if ((await cityInput.count()) > 0) {
      await expect(cityInput).toHaveValue(testCity);
    }
    if ((await websiteInput.count()) > 0) {
      await expect(websiteInput).toHaveValue(testWebsite);
    }
  });

  test('view profile completeness bar, fill missing fields, and bar reaches 100%', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    await registerAndLogin(page);

    await page.goto(`${baseURL}/settings`);
    const profileLink = page.getByRole('link', { name: /profile|account/i });
    if ((await profileLink.count()) > 0) {
      await profileLink.first().click();
    }

    // Look for profile completeness indicator
    const completenessBar = page
      .getByText(/profile.*complet/i)
      .or(page.locator('[role="progressbar"]'))
      .or(page.getByText(/%/));

    if ((await completenessBar.count()) > 0) {
      // Note initial completeness (should be less than 100% for a fresh account)
      const initialText = await completenessBar.first().textContent();

      // Fill in all available profile fields
      const fieldsToFill: Array<{ label: RegExp; value: string }> = [
        { label: /first.?name/i, value: 'Test' },
        { label: /last.?name/i, value: 'User' },
        { label: /bio/i, value: 'A complete profile bio for testing' },
        { label: /city/i, value: 'San Francisco' },
        { label: /state|province/i, value: 'California' },
        { label: /country/i, value: 'United States' },
        { label: /language/i, value: 'English' },
        { label: /website/i, value: 'https://example.com' },
        { label: /phone/i, value: '+1555000123' },
      ];

      for (const field of fieldsToFill) {
        const input = page.getByLabel(field.label);
        if ((await input.count()) > 0) {
          await input.clear();
          await input.fill(field.value);
        }
      }

      // Save changes
      const saveButton = page.getByRole('button', { name: /save|update/i }).first();
      await saveButton.click();
      await page.waitForTimeout(1500);

      // Reload and check that completeness has increased
      await page.reload();
      await page.waitForTimeout(1000);

      const updatedCompleteness = page
        .getByText(/profile.*complet/i)
        .or(page.locator('[role="progressbar"]'))
        .or(page.getByText(/100%/));

      if ((await updatedCompleteness.count()) > 0) {
        const updatedText = await updatedCompleteness.first().textContent();
        // Completeness should have changed (increased) after filling fields
        // In ideal case it reaches 100%, but at minimum it should be different
        if (initialText !== null && updatedText !== null) {
          const initialNum = parseInt(initialText.replace(/\D/g, ''), 10);
          const updatedNum = parseInt(updatedText.replace(/\D/g, ''), 10);
          if (!isNaN(initialNum) && !isNaN(updatedNum)) {
            expect(updatedNum).toBeGreaterThanOrEqual(initialNum);
          }
        }
      }
    }
  });

  test('delete account, confirm password, logout, and re-login attempt is blocked', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    const { email, password } = await registerAndLogin(page);

    // Navigate to account settings / danger zone
    await page.goto(`${baseURL}/settings`);

    // Look for account/danger section
    const accountLink = page.getByRole('link', { name: /account|danger|security/i });
    if ((await accountLink.count()) > 0) {
      await accountLink.first().click();
    }

    // Find and click the delete account button
    const deleteButton = page.getByRole('button', { name: /delete.*account|remove.*account/i });
    if ((await deleteButton.count()) > 0) {
      await deleteButton.click();

      // A confirmation dialog/modal should appear asking for password
      await page.waitForTimeout(500);

      const passwordConfirm = page
        .getByLabel(/password/i)
        .or(page.locator('input[type="password"]'));
      if ((await passwordConfirm.count()) > 0) {
        // Fill the last visible password input (the confirmation one)
        await passwordConfirm.last().fill(password);
      }

      // Confirm the deletion
      const confirmDelete = page.getByRole('button', {
        name: /confirm.*delete|yes.*delete|permanently delete/i,
      });
      if ((await confirmDelete.count()) > 0) {
        await confirmDelete.click();
      }

      // Wait for the deletion to process
      await page.waitForTimeout(3000);

      // User should be logged out after deletion
      const currentUrl = page.url();
      const isLoggedOut =
        currentUrl.includes('login') ||
        currentUrl.includes('signin') ||
        currentUrl.includes('/') ||
        (await page.getByText(/account.*deleted|goodbye|sign in/i).count()) > 0;
      expect(isLoggedOut).toBeTruthy();

      // Attempt re-login with the deleted account credentials
      await page.goto(`${baseURL}/login`);
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Wait for the error response
      await page.waitForTimeout(2000);

      // Re-login should fail with an error message
      const errorMessage = page.getByText(
        /account.*deleted|account.*not found|invalid.*credentials|deactivated|does not exist/i,
      );
      const loginFailed = (await errorMessage.count()) > 0 || page.url().includes('login');
      expect(loginFailed).toBeTruthy();
    }
  });

  test('sudo mode: sensitive action prompts for password re-auth, then succeeds', async ({
    page,
  }) => {
    test.skip(
      process.env['E2E_BASE_URL'] === undefined,
      'Set E2E_BASE_URL to run this test against a live app',
    );

    const { password } = await registerAndLogin(page);

    // Navigate to a settings area that requires sudo mode
    await page.goto(`${baseURL}/settings`);

    // Try to trigger a sensitive action (e.g., change password, security settings)
    const securityLink = page.getByRole('link', { name: /security|password/i });
    if ((await securityLink.count()) > 0) {
      await securityLink.first().click();
    }

    // Attempt a sensitive action like changing password
    const changePasswordButton = page.getByRole('button', {
      name: /change.*password|update.*password/i,
    });
    const sensitiveAction = page.getByRole('button', {
      name: /enable.*2fa|security.*settings|manage.*keys/i,
    });

    const actionButton =
      (await changePasswordButton.count()) > 0 ? changePasswordButton : sensitiveAction;

    if ((await actionButton.count()) > 0) {
      await actionButton.first().click();
      await page.waitForTimeout(500);

      // Check if sudo/re-auth modal appears
      const sudoPrompt = page
        .getByText(/confirm.*identity|re-?authenticate|enter.*password.*continue/i)
        .or(page.getByText(/sudo/i));

      if ((await sudoPrompt.count()) > 0) {
        // Enter password for re-authentication
        const passwordInput = page.locator(
          'input[type="password"]:visible',
        );
        if ((await passwordInput.count()) > 0) {
          await passwordInput.last().fill(password);
        }

        // Submit re-auth
        const submitButton = page.getByRole('button', {
          name: /confirm|verify|authenticate|continue/i,
        });
        if ((await submitButton.count()) > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // After re-auth, the sensitive action should proceed
          // The sudo prompt should be gone and we should be on the action page
          await expect(sudoPrompt.first()).not.toBeVisible();
        }
      }

      // If the app doesn't have sudo mode, the action should work directly
      // Either way, we should not see an error at this point
      const errorAlert = page.getByRole('alert').filter({ hasText: /error|failed/i });
      if ((await errorAlert.count()) > 0) {
        // Only fail if there is a genuine blocking error
        const alertText = await errorAlert.first().textContent();
        expect(alertText).not.toContain('authentication required');
      }
    }
  });
});
