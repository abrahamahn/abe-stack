// apps/server/src/infra/email/templates.ts
/**
 * Email Templates
 *
 * Pre-built email templates for common use cases.
 */

import type { EmailOptions } from './types';

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
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Reset Your Password</h2>
  <p>You requested to reset your password.</p>
  <p>
    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px;">
      Reset Password
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">This link will expire in ${expiry} minutes.</p>
  <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
</body>
</html>
      `.trim(),
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
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sign In</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Sign in to your account</h2>
  <p>Click the button below to sign in:</p>
  <p>
    <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px;">
      Sign In
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">This link will expire in ${expiry} minutes and can only be used once.</p>
  <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
</body>
</html>
      `.trim(),
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
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Verify Your Email Address</h2>
  <p>Welcome! Please verify your email address to complete your registration.</p>
  <p>
    <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
      Verify Email
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">This link will expire in ${expiry} minutes.</p>
  <p style="color: #999; font-size: 12px;">If you did not create an account, please ignore this email.</p>
</body>
</html>
      `.trim(),
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
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Changed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Your Password Was Changed</h2>
  <p>Your password was recently changed.</p>
  <p>If you made this change, you can ignore this email.</p>
  <p style="color: #dc2626; font-weight: 500;">If you did not change your password, please contact support immediately.</p>
</body>
</html>
      `.trim(),
    };
  },
};
