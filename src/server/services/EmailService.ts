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

    try {
      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);

      // Update last email sent timestamp in the database
      await this.db.query(
        'UPDATE users SET last_email_sent = NOW() WHERE email = $1',
        [userEmail]
      );

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
      <h2>${emailConfig.appName} Password Reset</h2>
      <p>You requested to reset your password. Please click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `;

    // Prepare email options
    const mailOptions = {
      from: `"${emailConfig.appName}" <${emailConfig.user}>`,
      to: userEmail,
      subject: 'Password Reset Request',
      html: emailContent,
    };

    try {
      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);

      // Update last email sent timestamp in the database
      await this.db.query(
        'UPDATE users SET last_email_sent = NOW() WHERE email = $1',
        [userEmail]
      );

      return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, message: 'Error sending password reset email.' };
    }
  }
} 