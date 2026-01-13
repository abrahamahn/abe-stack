// apps/server/src/infra/email/index.ts
/**
 * Email Service Infrastructure
 *
 * Provides email sending capabilities with multiple providers.
 * In development, logs emails to console.
 * In production, sends via SMTP.
 */

import type { EmailConfig } from '../../config';

// ============================================================================
// Types
// ============================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailService {
  send(options: EmailOptions): Promise<EmailResult>;
}

// ============================================================================
// Console Email Service (Development)
// ============================================================================

/**
 * Console email service for development
 * Logs email content to console instead of sending
 */
export class ConsoleEmailService implements EmailService {
  send(options: EmailOptions): Promise<EmailResult> {
    const messageId = `dev-${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`;

    /* eslint-disable no-console */
    console.log('\n📧 ═══════════════════════════════════════════════════════════');
    console.log('  EMAIL (Development Mode - Not Sent)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  To:      ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log(options.text);
    console.log('═══════════════════════════════════════════════════════════════\n');
    /* eslint-enable no-console */

    return Promise.resolve({
      success: true,
      messageId,
    });
  }
}

// ============================================================================
// SMTP Email Service (Production)
// ============================================================================

/**
 * SMTP email service for production
 * Uses nodemailer for sending emails
 */
export class SmtpEmailService implements EmailService {
  private transporter: unknown = null;
  private initialized = false;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  private async initTransporter(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const nodemailer = await import('nodemailer');

      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: {
          user: this.config.smtp.auth.user,
          pass: this.config.smtp.auth.pass,
        },
      });
    } catch {
      /* eslint-disable no-console */
      console.warn('Nodemailer not installed. Email sending will fail.');
      /* eslint-enable no-console */
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    await this.initTransporter();

    if (!this.transporter) {
      return {
        success: false,
        error: 'Email transporter not configured',
      };
    }

    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
      const info = await (this.transporter as any).sendMail({
        from: `"${this.config.from.name}" <${this.config.from.address}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// Email Templates
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
