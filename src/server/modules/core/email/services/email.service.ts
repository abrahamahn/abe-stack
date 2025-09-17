import * as nodemailer from "nodemailer";

import { IDatabaseServer } from "@infrastructure/database";
import { ILoggerService } from "@infrastructure/logging";

import { BaseService } from "../../../base/baseService";


/**
 * Email provider types
 */
export enum EmailProviderType {
  CONSOLE = "console", // Default, just logs to console
  SMTP = "smtp", // SMTP server
  SENDGRID = "sendgrid", // SendGrid API
  MAILGUN = "mailgun", // Mailgun API
  SES = "ses", // AWS SES
}

/**
 * Email options interface
 */
export interface EmailOptions {
  /**
   * Recipient email address
   */
  to: string | string[];

  /**
   * Email subject
   */
  subject: string;

  /**
   * Email body text (plain text version)
   */
  text?: string;

  /**
   * Email body HTML
   */
  html?: string;

  /**
   * CC recipients
   */
  cc?: string | string[];

  /**
   * BCC recipients
   */
  bcc?: string | string[];

  /**
   * Reply-to address
   */
  replyTo?: string;

  /**
   * From address
   */
  from?: string;

  /**
   * Email attachments
   */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Result of an email send operation
 */
export interface EmailResult {
  /**
   * Whether the email was sent successfully
   */
  success: boolean;

  /**
   * Message ID if available
   */
  messageId?: string;

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Email provider configuration
 */
export interface EmailProviderConfig {
  /**
   * Provider type
   */
  type: EmailProviderType;

  /**
   * Default sender
   */
  defaultFrom: string;

  /**
   * API key (for services that need it)
   */
  apiKey?: string;

  /**
   * Other provider-specific settings
   */
  options?: Record<string, any>;
}

// Add SMTP transporter cache
const smtpTransporters = new Map<string, nodemailer.Transporter>();

/**
 * Service responsible for sending emails
 */
export class EmailService extends BaseService {
  /**
   * Default from address
   */
  private defaultFrom: string;

  /**
   * Email provider type
   */
  private providerType: EmailProviderType;

  /**
   * SMTP transporter
   */
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Whether the service is initialized
   */
  private initialized: boolean = false;

  /**
   * Logger tag
   */
  private readonly LOG_TAG = "EmailService";

  /**
   * Constructor
   */
  constructor(logger?: ILoggerService, databaseService?: IDatabaseServer) {
    // Make sure we have a valid logger with all required methods
    const safeLogger: ILoggerService = logger || {
      debug: (...args: any[]) => console.log("[DEBUG]", ...args),
      info: (...args: any[]) => console.log("[INFO]", ...args),
      warn: (...args: any[]) => console.log("[WARN]", ...args),
      error: (...args: any[]) => console.log("[ERROR]", ...args),
    };

    super(safeLogger, databaseService || ({} as IDatabaseServer));

    // Debug Environment Variables
    console.log("===== ENVIRONMENT VARIABLE DEBUGGING =====");
    console.log(`process.env.EMAIL_PROVIDER: "${process.env.EMAIL_PROVIDER}"`);
    console.log(`process.env.EMAIL_FROM: "${process.env.EMAIL_FROM}"`);
    console.log(`process.env.EMAIL_HOST: "${process.env.EMAIL_HOST}"`);
    console.log(`process.env.NODE_ENV: "${process.env.NODE_ENV}"`);
    console.log(`Type of EMAIL_PROVIDER: ${typeof process.env.EMAIL_PROVIDER}`);
    console.log("========================================");

    // Read config from environment
    // Force SMTP provider type for testing
    this.providerType = EmailProviderType.SMTP; // Force SMTP provider

    console.log("FORCED EMAIL PROVIDER TO SMTP");

    this.defaultFrom = process.env.EMAIL_FROM || "noreply@example.com";

    console.log("=============== EMAIL SERVICE INITIALIZATION ===============");
    console.log(`Email provider type: ${this.providerType}`);
    console.log(`Default from address: ${this.defaultFrom}`);
    console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST}`);
    console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT}`);
    console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`EMAIL_SECURE: ${process.env.EMAIL_SECURE}`);
    console.log("============================================================");

    this.logger?.debug(
      `Email provider: ${this.providerType}, From: ${this.defaultFrom}`
    );

    // Initialize the service
    this.initialize().catch((error) => {
      console.error("Failed to initialize email service:", error);
    });
  }

  /**
   * Initialize the email service
   * This method sets up the SMTP transporter and verifies the connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("EmailService.initialize() - Already initialized, skipping");
      return;
    }

    try {
      console.log("EmailService.initialize() - Starting initialization");

      // Create the SMTP transporter
      this.transporter = this.getSmtpTransporter();
      console.log("EmailService.initialize() - SMTP transporter created");

      // Verify the SMTP connection
      if (this.providerType === EmailProviderType.SMTP) {
        console.log("EmailService.initialize() - Verifying SMTP connection...");
        try {
          const verificationResult = await this.transporter.verify();
          console.log(
            "EmailService.initialize() - SMTP verification result:",
            verificationResult
          );
          // Set initialized to true ONLY if verification succeeds
          this.initialized = true;
          console.log(
            "EmailService.initialize() - Service marked as initialized (verified)"
          );
        } catch (error) {
          console.warn(
            "EmailService.initialize() - SMTP verification failed, but continuing:",
            error
          );
          // Still mark as initialized even if verification fails
          this.initialized = true;
          console.log(
            "EmailService.initialize() - Service marked as initialized (despite verification failure)"
          );
        }
      } else {
        // For non-SMTP providers, just mark as initialized
        this.initialized = true;
        console.log(
          "EmailService.initialize() - Service marked as initialized (non-SMTP provider)"
        );
      }

      console.log(
        "EmailService.initialize() - Final initialization state:",
        this.initialized
      );
    } catch (error) {
      console.error(
        "EmailService.initialize() - Failed to initialize email service:",
        error
      );
      this.initialized = false; // Make sure it's marked as not initialized if it fails
      console.log(
        "EmailService.initialize() - Service marked as NOT initialized due to error"
      );
      throw error;
    }
  }

  /**
   * Check if the service is connected/initialized
   */
  isConnected(): boolean {
    console.log(
      `EmailService.isConnected() called, initialized = ${this.initialized}`
    );
    return this.initialized;
  }

  /**
   * Set the default from address
   * @param email - Default from email address
   */
  setDefaultFrom(email: string): void {
    this.defaultFrom = email;
  }

  /**
   * Get or create an SMTP transporter
   * @private
   */
  private getSmtpTransporter(): nodemailer.Transporter {
    const cacheKey = `smtp:${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`;

    if (smtpTransporters.has(cacheKey)) {
      return smtpTransporters.get(cacheKey)!;
    }

    // Get config from environment or use defaults
    // Gmail SMTP Settings:
    // - Port 465 with SSL (secure=true) OR
    // - Port 587 with TLS (secure=false)
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    // If using port 587, secure should be false; if using 465, secure should be true
    const port = parseInt(process.env.EMAIL_PORT || "465", 10);
    const secure = port === 465; // true for 465, false for 587
    const user = process.env.EMAIL_USER || "satmorningrain@gmail.com";
    // IMPORTANT: For Gmail, this should be an App Password, not the regular account password
    // Generate one at https://myaccount.google.com/apppasswords
    const pass = process.env.EMAIL_PASSWORD || "yxfyvyptxnazknkg";

    console.log("Creating new SMTP transporter with config:", {
      host,
      port,
      secure,
      auth: {
        user,
        pass: "****", // password hidden for security
      },
    });

    try {
      // Create transporter with config from environment or hardcoded fallback
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure, // true for 465, false for 587
        auth: {
          user,
          pass, // App Password, not regular password
        },
        // Only needed for port 587 (TLS)
        ...(port === 587
          ? {
              tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false,
              },
            }
          : {}),
      });

      // Cache it
      smtpTransporters.set(cacheKey, transporter);
      return transporter;
    } catch (error) {
      console.error("Error creating SMTP transporter:", error);
      throw error;
    }
  }

  /**
   * Send an email
   * @param options - Email options
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      console.log("================== SENDING EMAIL ===================");
      console.log(`Provider: ${this.providerType}`);
      console.log(`To: ${JSON.stringify(options.to)}`);
      console.log(`Subject: ${options.subject}`);
      console.log("=====================================================");

      // Validation
      if (!options.to) {
        return {
          success: false,
          error: "Recipient (to) is required",
        };
      }

      if (!options.subject) {
        return {
          success: false,
          error: "Subject is required",
        };
      }

      if (!options.text && !options.html) {
        return {
          success: false,
          error: "Either text or html content is required",
        };
      }

      // Normalize recipients
      const to = Array.isArray(options.to) ? options.to : [options.to];
      const cc = options.cc
        ? Array.isArray(options.cc)
          ? options.cc
          : [options.cc]
        : [];
      const bcc = options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc
          : [options.bcc]
        : [];

      // Log email details
      this.logger?.info(`Sending email via ${this.providerType}:`, {
        from: options.from || this.defaultFrom,
        to,
        cc,
        bcc,
        subject: options.subject,
        textLength: options.text?.length || 0,
        htmlLength: options.html?.length || 0,
        attachmentsCount: options.attachments?.length || 0,
      });

      // Send email based on provider type
      // Force SMTP for testing
      const forceSmtp = true; // Set to true to force SMTP

      if (forceSmtp) {
        try {
          console.log("============= FORCING SMTP SENDING =============");
          console.log(`Host: ${process.env.EMAIL_HOST}`);
          console.log(`Port: ${process.env.EMAIL_PORT}`);
          console.log(`Secure: ${process.env.EMAIL_SECURE}`);
          console.log(`User: ${process.env.EMAIL_USER}`);
          console.log(
            `Password: ${process.env.EMAIL_PASSWORD ? "********" : "NOT SET"}`
          );
          console.log("==============================================");

          console.log("Creating SMTP transporter...");
          const transporter = this.getSmtpTransporter();
          console.log("SMTP transporter created successfully");

          const mailOptions = {
            from: options.from || this.defaultFrom,
            to: Array.isArray(options.to) ? options.to.join(",") : options.to,
            cc: options.cc
              ? Array.isArray(options.cc)
                ? options.cc.join(",")
                : options.cc
              : undefined,
            bcc: options.bcc
              ? Array.isArray(options.bcc)
                ? options.bcc.join(",")
                : options.bcc
              : undefined,
            subject: options.subject,
            text: options.text,
            html: options.html,
            replyTo: options.replyTo,
            attachments: options.attachments,
          };

          console.log("Sending mail with options:", {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
          });

          try {
            console.log("Calling transporter.sendMail...");
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent successfully:", {
              messageId: info.messageId,
              response: info.response,
            });
            return {
              success: true,
              messageId: info.messageId,
            };
          } catch (emailError) {
            console.error("SMTP sendMail error:", emailError);
            // Check if we have detailed error info
            if (emailError && typeof emailError === "object") {
              const err = emailError as any;
              if (err.code) console.error("Error code:", err.code);
              if (err.command) console.error("Error command:", err.command);
              if (err.response) console.error("Error response:", err.response);
            }
            throw emailError;
          }
        } catch (error) {
          this.logger?.error("Error sending email via SMTP", { error });
          console.error("Error sending email via SMTP:", error);
          throw error;
        }
      }

      // Original switch statement for provider type
      switch (this.providerType) {
        case EmailProviderType.SMTP:
          try {
            console.log("============= SMTP CONFIGURATION =============");
            console.log(`Host: ${process.env.EMAIL_HOST}`);
            console.log(`Port: ${process.env.EMAIL_PORT}`);
            console.log(`Secure: ${process.env.EMAIL_SECURE}`);
            console.log(`User: ${process.env.EMAIL_USER}`);
            console.log("==============================================");

            const transporter = this.getSmtpTransporter();

            const mailOptions = {
              from: options.from || this.defaultFrom,
              to: Array.isArray(options.to) ? options.to.join(",") : options.to,
              cc: options.cc
                ? Array.isArray(options.cc)
                  ? options.cc.join(",")
                  : options.cc
                : undefined,
              bcc: options.bcc
                ? Array.isArray(options.bcc)
                  ? options.bcc.join(",")
                  : options.bcc
                : undefined,
              subject: options.subject,
              text: options.text,
              html: options.html,
              replyTo: options.replyTo,
              attachments: options.attachments,
            };

            const info = await transporter.sendMail(mailOptions);

            this.logger?.info("Email sent successfully via SMTP", {
              messageId: info.messageId,
              response: info.response,
            });

            return {
              success: true,
              messageId: info.messageId,
            };
          } catch (error) {
            this.logger?.error("Error sending email via SMTP", { error });
            throw error;
          }

        case EmailProviderType.SENDGRID:
          // TODO: Implement SendGrid sending
          this.logger?.info("SendGrid email sending not yet implemented");
          break;

        case EmailProviderType.MAILGUN:
          // TODO: Implement Mailgun sending
          this.logger?.info("Mailgun email sending not yet implemented");
          break;

        case EmailProviderType.SES:
          // TODO: Implement AWS SES sending
          this.logger?.info("AWS SES email sending not yet implemented");
          break;

        case EmailProviderType.CONSOLE:
        default:
          // Just log to console in development environments
          console.log("============= EMAIL =============");
          console.log(`From: ${options.from || this.defaultFrom}`);
          console.log(`To: ${to.join(", ")}`);
          if (cc.length > 0) console.log(`CC: ${cc.join(", ")}`);
          if (bcc.length > 0) console.log(`BCC: ${bcc.join(", ")}`);
          console.log(`Subject: ${options.subject}`);
          console.log("---------- CONTENT -----------");
          console.log(options.html || options.text);
          console.log("===============================");
          break;
      }

      // Simulate successful send
      const messageId = `${Date.now()}.${Math.random().toString(36).substring(2)}@example.com`;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      // Log the error
      console.error(`[${this.LOG_TAG}] Error sending email:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a template-based email
   * @param templateName - Name of the template
   * @param data - Template variables
   * @param options - Email options
   */
  async sendTemplateEmail(
    templateName: string,
    data: Record<string, any>,
    options: Omit<EmailOptions, "text" | "html">
  ): Promise<EmailResult> {
    try {
      // TODO: Implement template rendering
      // This would use a template engine like Handlebars, EJS, etc.

      // For now, just create a simple representation of the template
      const html = `
        <h1>Template: ${templateName}</h1>
        <p>This is a template email with the following data:</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;

      const text = `Template: ${templateName}\nThis is a template email with the following data:\n${JSON.stringify(
        data,
        null,
        2
      )}`;

      // Send the email with the rendered content
      return this.sendEmail({
        ...options,
        html,
        text,
      });
    } catch (error) {
      console.error(`[${this.LOG_TAG}] Error sending template email:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a verification email
   * @param to - Recipient email
   * @param name - Recipient name
   * @param token - Verification token
   * @param appUrl - Application URL
   */
  async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
    appUrl = process.env.APP_URL || "http://localhost:3000"
  ): Promise<EmailResult> {
    console.log("=== SENDING VERIFICATION EMAIL ===");
    console.log(`To: ${to}`);
    console.log(`Name: ${name}`);
    console.log(`Token: ${token}`);
    console.log(`App URL: ${appUrl}`);

    const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
    console.log(`Verification URL: ${verificationUrl}`);

    const subject = "Verify Your Email Address";

    const html = `
      <h1>Email Verification</h1>
      <p>Hello ${name || "there"},</p>
      <p>Thank you for registering. Please click the link below to verify your email address:</p>
      <p><a href="${verificationUrl}" target="_blank">Verify Email Address</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
    `;

    const text = `
      Email Verification
      
      Hello ${name || "there"},
      
      Thank you for registering. Please visit the link below to verify your email address:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you did not create an account, please ignore this email.
    `;

    try {
      console.log("Calling sendEmail method...");
      const result = await this.sendEmail({
        to,
        subject,
        html,
        text,
      });
      console.log("sendEmail result:", result);
      return result;
    } catch (error) {
      console.error("Error in sendVerificationEmail:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
