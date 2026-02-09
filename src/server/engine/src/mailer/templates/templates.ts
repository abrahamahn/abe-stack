// src/server/engine/src/mailer/templates/templates.ts
/**
 * Email Templates
 *
 * Pre-built email templates for common use cases.
 * Uses shared styles and a layout helper to maintain consistency.
 */

import type { EmailOptions } from '../types';

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

  /**
   * Existing account registration attempt notification
   * Sent when someone tries to register with an email that already has an account
   */
  existingAccountRegistrationAttempt(email: string): EmailOptions & { to: '' } {
    return {
      to: '',
      subject: 'Sign-in Attempt on Your Account',
      text: `
Someone attempted to create a new account using your email address (${email}).

If this was you, you may already have an account. Try signing in instead, or use the "Forgot Password" option if you don't remember your password.

If you did not attempt to create a new account, you can safely ignore this email. Your account remains secure.
      `.trim(),
      html: renderLayout(
        'Sign-in Attempt',
        `
        <h2 style="${styles.heading}">Sign-in Attempt on Your Account</h2>
        <p style="${styles.text}">Someone attempted to create a new account using your email address.</p>
        <p style="${styles.text}">If this was you, you may already have an account. Try signing in instead, or use the "Forgot Password" option if you don't remember your password.</p>
        <p style="${styles.footer}">If you did not attempt to create a new account, you can safely ignore this email. Your account remains secure.</p>
        `,
      ),
    };
  },

  /**
   * New login "Was this you?" alert
   * Sent after a successful login to notify the user.
   */
  newLoginAlert(ipAddress: string, userAgent: string, timestamp: Date): EmailOptions & { to: '' } {
    const formattedDate = timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return {
      to: '',
      subject: 'New Sign-In to Your Account',
      text: `
New Sign-In Detected

We noticed a new sign-in to your account.

Details:
- Time: ${formattedDate}
- IP Address: ${ipAddress}
- Device/Browser: ${userAgent !== '' ? userAgent : 'Unknown'}

Was this you?
If yes, you can ignore this email.

If no, your account may be compromised. Please:
1. Change your password immediately
2. Enable two-factor authentication (2FA) if not already enabled
3. Review your recent account activity
      `.trim(),
      html: renderLayout(
        'New Sign-In',
        `
        <h2 style="${styles.heading}">New Sign-In to Your Account</h2>
        <p style="${styles.text}">We noticed a new sign-in to your account.</p>

        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">Details:</h3>
          <table style="color: #4b5563; font-size: 14px;">
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Time:</td><td>${formattedDate}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">IP Address:</td><td>${ipAddress}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Device/Browser:</td><td>${userAgent !== '' ? userAgent : 'Unknown'}</td></tr>
          </table>
        </div>

        <p style="${styles.text}"><strong>Was this you?</strong></p>
        <p style="${styles.text}">If yes, you can safely ignore this email.</p>
        <p style="${styles.alert}">If no, your account may be compromised. Change your password immediately and enable two-factor authentication (2FA).</p>
        `,
      ),
    };
  },

  /**
   * Password changed "Was this you?" alert
   * Sent after a user's password is changed.
   */
  passwordChangedAlert(
    ipAddress: string,
    userAgent: string,
    timestamp: Date,
  ): EmailOptions & { to: '' } {
    const formattedDate = timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return {
      to: '',
      subject: 'Your Password Was Changed',
      text: `
Your Password Was Changed

Your account password was recently changed.

Details:
- Time: ${formattedDate}
- IP Address: ${ipAddress}
- Device/Browser: ${userAgent !== '' ? userAgent : 'Unknown'}

Was this you?
If yes, you can ignore this email.

If no, your account may be compromised. Please:
1. Use "Forgot Password" to regain access immediately
2. Contact support if you cannot access your account
      `.trim(),
      html: renderLayout(
        'Password Changed',
        `
        <h2 style="${styles.heading}">Your Password Was Changed</h2>
        <p style="${styles.text}">Your account password was recently changed.</p>

        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">Details:</h3>
          <table style="color: #4b5563; font-size: 14px;">
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Time:</td><td>${formattedDate}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">IP Address:</td><td>${ipAddress}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Device/Browser:</td><td>${userAgent !== '' ? userAgent : 'Unknown'}</td></tr>
          </table>
        </div>

        <p style="${styles.text}"><strong>Was this you?</strong></p>
        <p style="${styles.text}">If yes, you can safely ignore this email.</p>
        <p style="${styles.alert}">If no, use "Forgot Password" to regain access immediately and contact support.</p>
        `,
      ),
    };
  },

  /**
   * Email changed "Was this you?" alert
   * Sent to the OLD email address after an email change.
   */
  emailChangedAlert(
    newEmail: string,
    ipAddress: string,
    userAgent: string,
    timestamp: Date,
    revertUrl?: string,
  ): EmailOptions & { to: '' } {
    const formattedDate = timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const revertText =
      revertUrl !== undefined && revertUrl !== ''
        ? `\nIf this wasn't you, revert the change immediately:\n${revertUrl}\n`
        : '';
    const revertHtml =
      revertUrl !== undefined && revertUrl !== ''
        ? `
        <p style="${styles.alert}">
          If this wasn't you, revert the change immediately:
        </p>
        <p><a href="${revertUrl}" style="${styles.button}">Revert email change</a></p>
        `
        : '';

    return {
      to: '',
      subject: 'Your Email Address Was Changed',
      text: `
Your Email Address Was Changed

The email address on your account was recently changed to ${newEmail}.

Details:
- Time: ${formattedDate}
- IP Address: ${ipAddress}
- Device/Browser: ${userAgent !== '' ? userAgent : 'Unknown'}

Was this you?
If yes, you can ignore this email.

If no, your account may be compromised. Please contact support immediately to recover your account.
${revertText}
      `.trim(),
      html: renderLayout(
        'Email Changed',
        `
        <h2 style="${styles.heading}">Your Email Address Was Changed</h2>
        <p style="${styles.text}">The email address on your account was recently changed to <strong>${newEmail}</strong>.</p>

        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">Details:</h3>
          <table style="color: #4b5563; font-size: 14px;">
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Time:</td><td>${formattedDate}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">IP Address:</td><td>${ipAddress}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Device/Browser:</td><td>${userAgent !== '' ? userAgent : 'Unknown'}</td></tr>
          </table>
        </div>

        <p style="${styles.text}"><strong>Was this you?</strong></p>
        <p style="${styles.text}">If yes, you can safely ignore this email.</p>
        <p style="${styles.alert}">If no, your account may be compromised. Contact support immediately to recover your account.</p>
        ${revertHtml}
        `,
      ),
    };
  },

  /**
   * Token reuse security alert
   * Sent when a refresh token is used after it has already been rotated,
   * indicating a potential token theft/replay attack.
   */
  tokenReuseAlert(
    ipAddress: string,
    userAgent: string,
    timestamp: Date,
  ): EmailOptions & { to: '' } {
    const formattedTime = timestamp.toISOString();
    const formattedDate = timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return {
      to: '',
      subject: 'Security Alert: Suspicious Activity on Your Account',
      text: `
SECURITY ALERT: Suspicious Activity Detected

We detected suspicious activity on your account that may indicate unauthorized access.

What happened:
- A previously used authentication token was reused, which is a sign of a potential security breach
- As a precaution, all your active sessions have been terminated

Details:
- Time: ${formattedDate}
- IP Address: ${ipAddress}
- Device/Browser: ${userAgent !== '' ? userAgent : 'Unknown'}

Recommended actions:
1. Change your password immediately
2. Enable two-factor authentication (2FA) if not already enabled
3. Review your recent account activity for any unauthorized actions
4. If you did not attempt to sign in, your credentials may have been compromised

If you recognize this activity, you can safely ignore this email and sign in again.

If you need assistance, please contact our support team immediately.
      `.trim(),
      html: renderLayout(
        'Security Alert',
        `
        <h2 style="${styles.heading}; color: #dc2626;">Security Alert: Suspicious Activity Detected</h2>
        <p style="${styles.text}">We detected suspicious activity on your account that may indicate unauthorized access.</p>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #991b1b; margin: 0 0 12px 0; font-size: 16px;">What happened:</h3>
          <ul style="color: #7f1d1d; margin: 0; padding-left: 20px;">
            <li>A previously used authentication token was reused, which is a sign of a potential security breach</li>
            <li>As a precaution, <strong>all your active sessions have been terminated</strong></li>
          </ul>
        </div>

        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">Details:</h3>
          <table style="color: #4b5563; font-size: 14px;">
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Time:</td><td>${formattedDate}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">IP Address:</td><td>${ipAddress}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; font-weight: 500;">Device/Browser:</td><td>${userAgent !== '' ? userAgent : 'Unknown'}</td></tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">Timestamp: ${formattedTime}</p>
        </div>

        <h3 style="color: #374151; margin: 24px 0 12px 0; font-size: 16px;">Recommended actions:</h3>
        <ol style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Change your password immediately</strong></li>
          <li>Enable two-factor authentication (2FA) if not already enabled</li>
          <li>Review your recent account activity for any unauthorized actions</li>
          <li>If you did not attempt to sign in, your credentials may have been compromised</li>
        </ol>

        <p style="${styles.text}; margin-top: 24px;">If you recognize this activity, you can safely ignore this email and sign in again.</p>
        <p style="${styles.alert}">If you need assistance, please contact our support team immediately.</p>
        `,
      ),
    };
  },
};
