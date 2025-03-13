// Remove the custom type declaration
import nodemailer from 'nodemailer';
import emailConfig from '../config/email';
import { Database } from './Database';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    
    // Create email transporter
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      },
    });
  }

  /**
   * Sends a confirmation email for user registration
   * 
   * @param userEmail - The recipient's email address
   * @param confirmationToken - Unique token for email verification
   * @returns Result of email sending process
   */
  async sendConfirmationEmail(
    userEmail: string,
    confirmationToken: string
  ): Promise<{ success: boolean; message: string }> {
    console.log("Sending confirmation email to:", userEmail);

    // Determine website domain based on environment
    const websiteDomain = emailConfig.isDevelopment
      ? `http://localhost:${emailConfig.port}`
      : emailConfig.appUrl;

    // Generate confirmation URL
    const confirmationUrl = `${websiteDomain}/auth/confirm-email?token=${confirmationToken}`;

    // Email content
    const emailContent = `
      <h2>Welcome to ${emailConfig.appName}!</h2>
      <p>Thank you for registering. Please confirm your email address by clicking the link below:</p>
      <p><a href="${confirmationUrl}">Confirm Email</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not register for an account, please ignore this email.</p>
    `;

    // Prepare email options
    const mailOptions = {
      from: `"${emailConfig.appName}" <${emailConfig.user}>`,
      to: userEmail,
      subject: 'Email Confirmation',
      html: emailContent,
    };

    // In development mode, just log the email and auto-confirm the user
    if (emailConfig.isDevelopment) {
      console.log('=== DEVELOPMENT MODE: Email not actually sent ===');
      console.log('To:', userEmail);
      console.log('Subject:', 'Email Confirmation');
      console.log('Confirmation URL:', confirmationUrl);
      console.log('Email Content:', emailContent);
      console.log('=== END OF EMAIL PREVIEW ===');
      
      // Auto-confirm the user in development mode
      try {
        const pool = this.db.getPool();
        if (pool) {
          // Update the user to mark email as confirmed
          await pool.query(
            'UPDATE users SET email_confirmed = TRUE, last_email_sent = NOW() WHERE email = $1',
            [userEmail]
          );
          console.log(`DEVELOPMENT MODE: Auto-confirmed email for user: ${userEmail}`);
        } else {
          console.warn('Database pool is not available, skipping auto-confirmation');
        }
      } catch (error) {
        console.error('Error auto-confirming user:', error);
      }
      
      return { success: true, message: 'Email logged in development mode and user auto-confirmed.' };
    }

    try {
      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);

      // Update last email sent timestamp in the database
      const pool = this.db.getPool();
      if (pool) {
        await pool.query(
          'UPDATE users SET last_email_sent = NOW() WHERE email = $1',
          [userEmail]
        );
      } else {
        console.warn('Database pool is not available, skipping update of last_email_sent');
      }

      return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return { success: false, message: 'Error sending confirmation email.' };
    }
  }

  /**
   * Sends a password reset email
   * 
   * @param userEmail - The recipient's email address
   * @param resetToken - Unique token for password reset
   * @returns Result of email sending process
   */
  async sendPasswordResetEmail(
    userEmail: string,
    resetToken: string
  ): Promise<{ success: boolean; message: string }> {
    console.log("Sending password reset email to:", userEmail);

    // Determine website domain based on environment
    const websiteDomain = emailConfig.isDevelopment
      ? `http://localhost:${emailConfig.port}`
      : emailConfig.appUrl;

    // Generate reset URL
    const resetUrl = `${websiteDomain}/auth/reset-password?token=${resetToken}`;

    // Email content
    const emailContent = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `;

    // Prepare email options
    const mailOptions = {
      from: `"${emailConfig.appName}" <${emailConfig.user}>`,
      to: userEmail,
      subject: 'Password Reset',
      html: emailContent,
    };

    // In development mode, just log the email
    if (emailConfig.isDevelopment) {
      console.log('=== DEVELOPMENT MODE: Email not actually sent ===');
      console.log('To:', userEmail);
      console.log('Subject:', 'Password Reset');
      console.log('Reset URL:', resetUrl);
      console.log('Email Content:', emailContent);
      console.log('=== END OF EMAIL PREVIEW ===');
      
      return { success: true, message: 'Email logged in development mode.' };
    }

    try {
      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, message: 'Error sending password reset email.' };
    }
  }
} 