// apps/server/src/services/email.ts
/**
 * Email service abstraction
 * In development, logs emails to console
 * In production, can be configured to use SMTP, SendGrid, etc.
 */

/* eslint-disable no-console */

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

/**
 * Console email service for development
 * Logs email content to console instead of sending
 */
class ConsoleEmailService implements EmailService {
  send(options: EmailOptions): Promise<EmailResult> {
    const messageId = `dev-${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`;

    console.log('\n📧 ═══════════════════════════════════════════════════════════');
    console.log('  EMAIL (Development Mode - Not Sent)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  To:      ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log(options.text);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return Promise.resolve({
      success: true,
      messageId,
    });
  }
}

/**
 * SMTP email service for production
 * Requires nodemailer to be installed: pnpm add nodemailer @types/nodemailer
 */
class SmtpEmailService implements EmailService {
  private transporter: unknown = null;
  private initialized = false;

  private async initTransporter(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // Dynamic import to avoid requiring nodemailer in dev
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const nodemailer = await import('nodemailer');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } catch {
      console.warn('Nodemailer not installed. Email sending will fail in production.');
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const info = await (this.transporter as any).sendMail({
        from: process.env.SMTP_FROM ?? 'noreply@example.com',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        messageId: info.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Select email service based on environment
const isProduction = process.env.NODE_ENV === 'production';
export const emailService: EmailService = isProduction
  ? new SmtpEmailService()
  : new ConsoleEmailService();

/**
 * Email templates
 */
export const emailTemplates = {
  /**
   * Password reset email
   */
  passwordReset(resetUrl: string, expiresInMinutes: number = 15): EmailOptions & { to: '' } {
    const expiry = String(expiresInMinutes);
    return {
      to: '', // Set by caller
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
   * Email verification email
   */
  emailVerification(verifyUrl: string, expiresInMinutes: number = 60): EmailOptions & { to: '' } {
    const expiry = String(expiresInMinutes);
    return {
      to: '', // Set by caller
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
      to: '', // Set by caller
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

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<EmailResult> {
  const baseUrl = process.env.APP_URL ?? 'http://localhost:5173';
  const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

  const template = emailTemplates.passwordReset(resetUrl);
  return emailService.send({
    ...template,
    to: email,
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
): Promise<EmailResult> {
  const baseUrl = process.env.APP_URL ?? 'http://localhost:5173';
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

  const template = emailTemplates.emailVerification(verifyUrl);
  return emailService.send({
    ...template,
    to: email,
  });
}

/**
 * Send password changed notification
 */
export async function sendPasswordChangedEmail(email: string): Promise<EmailResult> {
  const template = emailTemplates.passwordChanged();
  return emailService.send({
    ...template,
    to: email,
  });
}
