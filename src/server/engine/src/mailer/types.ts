// backend/engine/src/mailer/types.ts
/**
 * Email Service Types
 *
 * Core type definitions for the email service.
 */

/**
 * Email sending options.
 */
export interface EmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Plain text content */
  text?: string;
  /** HTML content */
  html?: string;
}

/**
 * Result of an email sending operation.
 */
export interface EmailResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Message ID from the email service (if available) */
  messageId?: string;
  /** Error message if sending failed */
  error?: string;
}

/**
 * Email service interface.
 */
export interface EmailService {
  /**
   * Send an email.
   * @param options - Email sending options
   * @returns Promise resolving to email result
   */
  send(options: EmailOptions): Promise<EmailResult>;
}
