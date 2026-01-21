// apps/server/src/infrastructure/messaging/email/templates.ts
/**
 * Email Templates
 *
 * Pre-built email templates for common use cases.
 * Uses shared styles and a layout helper to maintain consistency.
 */

import type { EmailOptions } from '@email/types';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  body: "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #ffffff;",
  heading: 'color: #333333; font-size: 24px; font-weight: 600; margin-bottom: 16px;',
  text: 'color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 16px;',
  button:
    'display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; text-align: center;',
  buttonSuccess:
    'display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; text-align: center;',
  subtext: 'color: #6b7280; font-size: 14px; margin-top: 24px;',
  footer: 'color: #9ca3af; font-size: 12px; margin-top: 12px;',
  alert: 'color: #dc2626; font-weight: 500; margin-top: 12px;',
} as const;

// ============================================================================
// Layout Helper
// ============================================================================

function renderLayout(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="${styles.body}">
  ${content}
</body>
</html>
  `.trim();
}

// ============================================================================
// Templates
// ============================================================================

export const emailTemplates = {
  /**
   * Password reset email
   */
  passwordReset(resetUrl: string, expiresInMinutes = 15): EmailOptions & { to: '' } {
    const expiry = String(expiresInMinutes);
    return {
      to: '',
      subject: 'Reset Your Password',
      text: `
You requested to reset your password.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expiry} minutes.

If you did not request this, please ignore this email.
      `.trim(),
      html: renderLayout(
        'Reset Your Password',
        `
        <h2 style="${styles.heading}">Reset Your Password</h2>
        <p style="${styles.text}">You requested to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="${styles.button}">
            Reset Password
          </a>
        </p>
        <p style="${styles.subtext}">This link will expire in ${expiry} minutes.</p>
        <p style="${styles.footer}">If you did not request this, please ignore this email.</p>
        `,
      ),
    };
  },

  /**
   * Magic link email
   */
  magicLink(loginUrl: string, expiresInMinutes = 15): EmailOptions & { to: '' } {
    const expiry = String(expiresInMinutes);
    return {
      to: '',
      subject: 'Sign in to your account',
      text: `
Click the link below to sign in to your account:
${loginUrl}

This link will expire in ${expiry} minutes and can only be used once.

If you did not request this, please ignore this email.
      `.trim(),
      html: renderLayout(
        'Sign In',
        `
        <h2 style="${styles.heading}">Sign in to your account</h2>
        <p style="${styles.text}">Click the button below to sign in:</p>
        <p>
          <a href="${loginUrl}" style="${styles.button}">
            Sign In
          </a>
        </p>
        <p style="${styles.subtext}">This link will expire in ${expiry} minutes and can only be used once.</p>
        <p style="${styles.footer}">If you did not request this, please ignore this email.</p>
        `,
      ),
    };
  },

  /**
   * Email verification
   */
  emailVerification(verifyUrl: string, expiresInMinutes = 60): EmailOptions & { to: '' } {
    const expiry = String(expiresInMinutes);
    return {
      to: '',
      subject: 'Verify Your Email Address',
      text: `
Welcome! Please verify your email address.

Click the link below to verify your email:
${verifyUrl}

This link will expire in ${expiry} minutes.

If you did not create an account, please ignore this email.
      `.trim(),
      html: renderLayout(
        'Verify Your Email',
        `
        <h2 style="${styles.heading}">Verify Your Email Address</h2>
        <p style="${styles.text}">Welcome! Please verify your email address to complete your registration.</p>
        <p>
          <a href="${verifyUrl}" style="${styles.buttonSuccess}">
            Verify Email
          </a>
        </p>
        <p style="${styles.subtext}">This link will expire in ${expiry} minutes.</p>
        <p style="${styles.footer}">If you did not create an account, please ignore this email.</p>
        `,
      ),
    };
  },

  /**
   * Password changed notification
   */
  passwordChanged(): EmailOptions & { to: '' } {
    return {
      to: '',
      subject: 'Your Password Was Changed',
      text: `
Your password was recently changed.

If you made this change, you can ignore this email.

If you did not change your password, please contact support immediately.
      `.trim(),
      html: renderLayout(
        'Password Changed',
        `
        <h2 style="${styles.heading}">Your Password Was Changed</h2>
        <p style="${styles.text}">Your password was recently changed.</p>
        <p style="${styles.text}">If you made this change, you can ignore this email.</p>
        <p style="${styles.alert}">If you did not change your password, please contact support immediately.</p>
        `,
      ),
    };
  },
};
