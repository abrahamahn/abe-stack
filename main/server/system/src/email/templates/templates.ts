// main/server/system/src/email/templates/templates.ts
/**
 * Email Templates
 *
 * Pre-built email templates for common use cases.
 * Uses a responsive base layout with header/footer branding.
 *
 * Layout structure:
 * - Outer wrapper table (background color, centering)
 * - Inner content table (max-width 600px, white background)
 * - Header with product branding
 * - Content section (template-specific)
 * - Footer with company info and optional unsubscribe
 *
 * All styles are inline for maximum email client compatibility.
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
// Responsive Base Layout
// ============================================================================

/**
 * Render a responsive HTML email layout with header and footer branding.
 *
 * Uses table-based layout for maximum email client compatibility
 * (Outlook, Gmail, Yahoo, Apple Mail, etc.).
 *
 * @param title - Email title (used in `<title>` and preheader)
 * @param content - Inner HTML content for the email body
 * @param options - Optional footer customization
 * @returns Complete HTML email string
 * @complexity O(1)
 */
function renderLayout(
  title: string,
  content: string,
  options?: { unsubscribeUrl?: string },
): string {
  const unsubscribeLink =
    options?.unsubscribeUrl !== undefined && options.unsubscribeUrl !== ''
      ? `<a href="${options.unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>`
      : '';

  const footerSeparator = unsubscribeLink !== '' ? ' &middot; ' : '';

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; display: block; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-content { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden, shows in inbox preview) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">${title}</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 24px 12px;">

        <!-- Email container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding: 28px 40px 20px 40px; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.025em;">
                    Abe Stack
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="email-content" style="padding: 32px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 28px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af; line-height: 1.6; text-align: center;">
                    &copy; ${String(new Date().getFullYear())} Abe Stack. All rights reserved.${footerSeparator}${unsubscribeLink}
                    <br>
                    <span style="color: #d1d5db;">This is an automated message. Please do not reply directly.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Email container -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->
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
        <p style="${styles.text}">You requested to reset your password. Click the button below to choose a new one.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #0066cc;">
              <a href="${resetUrl}" target="_blank" style="${styles.button}">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p style="${styles.subtext}">This link will expire in ${expiry} minutes.</p>
        <p style="${styles.text}; font-size: 14px;">If you can't click the button, copy and paste this URL into your browser:</p>
        <p style="color: #6b7280; font-size: 13px; word-break: break-all;">${resetUrl}</p>
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
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #0066cc;">
              <a href="${loginUrl}" target="_blank" style="${styles.button}">
                Sign In
              </a>
            </td>
          </tr>
        </table>
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
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #16a34a;">
              <a href="${verifyUrl}" target="_blank" style="${styles.buttonSuccess}">
                Verify Email
              </a>
            </td>
          </tr>
        </table>
        <p style="${styles.subtext}">This link will expire in ${expiry} minutes.</p>
        <p style="${styles.text}; font-size: 14px;">If you can't click the button, copy and paste this URL into your browser:</p>
        <p style="color: #6b7280; font-size: 13px; word-break: break-all;">${verifyUrl}</p>
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

  /**
   * Welcome email sent after successful email verification.
   * Includes greeting with name, brief product intro, and CTA to log in.
   */
  welcome(firstName: string, loginUrl: string): EmailOptions & { to: '' } {
    return {
      to: '',
      subject: 'Welcome to BSLT!',
      text: `
Hi ${firstName}, welcome to BSLT!

Your email has been verified and your account is ready to go.

BSLT gives you a complete, production-ready foundation for building modern applications — authentication, billing, notifications, and more, all out of the box.

Sign in to get started:
${loginUrl}

If you have any questions, reply to this email. We're happy to help.
      `.trim(),
      html: renderLayout(
        'Welcome',
        `
        <h2 style="${styles.heading}">Welcome to BSLT!</h2>
        <p style="${styles.text}">Hi <strong>${firstName}</strong>, your email has been verified and your account is ready to go.</p>
        <p style="${styles.text}">BSLT gives you a complete, production-ready foundation for building modern applications &mdash; authentication, billing, notifications, and more, all out of the box.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #16a34a;">
              <a href="${loginUrl}" target="_blank" style="${styles.buttonSuccess}">
                Get Started
              </a>
            </td>
          </tr>
        </table>
        <p style="${styles.footer}">If you have any questions, reply to this email. We're happy to help.</p>
        `,
      ),
    };
  },

  /**
   * Generic security notification email
   * Used for: password changed from new device, 2FA disabled, new device login, etc.
   */
  securityNotification(
    type: string,
    details: string,
    actionUrl: string,
  ): EmailOptions & { to: '' } {
    return {
      to: '',
      subject: `Security Alert: ${type}`,
      text: `
Security Alert: ${type}

${details}

If this was you, no action is needed.

If you did not perform this action, please secure your account immediately:
${actionUrl}
      `.trim(),
      html: renderLayout(
        'Security Alert',
        `
        <h2 style="${styles.heading}">Security Alert: ${type}</h2>
        <p style="${styles.text}">${details}</p>

        <div style="background-color: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #856404; margin: 0;">If this was you, no action is needed.</p>
        </div>

        <p style="${styles.alert}">If you did not perform this action, please secure your account immediately:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #0066cc;">
              <a href="${actionUrl}" target="_blank" style="${styles.button}">
                Secure My Account
              </a>
            </td>
          </tr>
        </table>
        <p style="${styles.footer}">If you need help, please contact our support team.</p>
        `,
      ),
    };
  },

  /**
   * Workspace invitation email
   * Sent when a user is invited to join a workspace.
   */
  workspaceInvitation(
    acceptUrl: string,
    workspaceName: string,
    inviterName: string,
    role: string,
    expiresInDays = 7,
  ): EmailOptions & { to: '' } {
    const expiry = String(expiresInDays);
    return {
      to: '',
      subject: `You've been invited to join ${workspaceName}`,
      text: `
You've been invited to join ${workspaceName}

${inviterName} has invited you to join the "${workspaceName}" workspace as a ${role}.

Click the link below to accept the invitation:
${acceptUrl}

This invitation will expire in ${expiry} days.

If you did not expect this invitation, you can safely ignore this email.
      `.trim(),
      html: renderLayout(
        'Workspace Invitation',
        `
        <h2 style="${styles.heading}">You've been invited to join ${workspaceName}</h2>
        <p style="${styles.text}"><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace as a <strong>${role}</strong>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #16a34a;">
              <a href="${acceptUrl}" target="_blank" style="${styles.buttonSuccess}">
                Accept Invitation
              </a>
            </td>
          </tr>
        </table>
        <p style="${styles.subtext}">This invitation will expire in ${expiry} days.</p>
        <p style="${styles.footer}">If you did not expect this invitation, you can safely ignore this email.</p>
        `,
      ),
    };
  },
};
