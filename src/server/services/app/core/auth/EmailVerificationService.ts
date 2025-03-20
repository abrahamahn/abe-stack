import crypto from "crypto";
import path from "path";

import NodeCache from "node-cache";

import { User } from "@models/auth";
import { UserRepository } from "@repositories/auth";
import { EmailService } from "@services/app/email";
import { BaseService, RateLimiter } from "@services/shared";
import { TemplateEngine } from "@services/shared/communication/TemplateEngine";
import {
  ExternalServiceError,
  TooManyRequestsError,
  ValidationError,
} from "@services/shared/errors/ServiceError";

interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

interface VerificationAttempt {
  timestamp: Date;
  success: boolean;
  ip?: string;
}

interface EmailVerificationConfig {
  tokenExpiry: number; // hours
  maxAttempts: number; // per time window
  timeWindow: number; // minutes
  resendCooldown: number; // minutes
  templatePath: string;
}

/**
 * Service for handling email verification
 */
export class EmailVerificationService extends BaseService {
  private readonly config: EmailVerificationConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly templateCache: NodeCache;
  private readonly verificationAttempts: NodeCache;
  private readonly userRepository: UserRepository;

  constructor(
    private readonly emailService: EmailService,
    private readonly templateEngine: TemplateEngine,
    userRepository: UserRepository,
  ) {
    super("EmailVerificationService");
    this.userRepository = userRepository;

    this.config = {
      tokenExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || "24", 10),
      maxAttempts: parseInt(
        process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || "5",
        10,
      ),
      timeWindow: parseInt(
        process.env.EMAIL_VERIFICATION_TIME_WINDOW || "60",
        10,
      ),
      resendCooldown: parseInt(
        process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN || "5",
        10,
      ),
      templatePath:
        process.env.EMAIL_TEMPLATE_PATH ||
        path.join(__dirname, "../../../templates/email"),
    };

    this.rateLimiter = new RateLimiter(
      "email_verification",
      this.config.maxAttempts,
      this.config.timeWindow,
    );
    this.templateCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache for templates
    this.verificationAttempts = new NodeCache({
      stdTTL: this.config.timeWindow * 60,
    }); // Cache for tracking attempts
  }

  /**
   * Generate a verification token for a user
   */
  public async generateVerificationToken(user: User): Promise<string> {
    try {
      const token = await this.generateSecureToken();
      const expiration = this.getTokenExpiration();

      await this.updateUserVerificationToken(user.id, token, expiration);

      return token;
    } catch (error) {
      this.logger.error("Error generating verification token:", error);
      throw new ExternalServiceError(
        "EmailVerification",
        "Failed to generate verification token",
      );
    }
  }

  /**
   * Verify a user's email with a token
   */
  public async verifyEmail(token: string, ip?: string): Promise<User> {
    try {
      // Check verification attempt rate limiting
      await this.checkVerificationRateLimit(ip || "unknown");

      const user = await this.findUserByVerificationToken(token);
      if (!user) {
        await this.recordVerificationAttempt(ip || "unknown", false);
        throw new ValidationError("Invalid verification token");
      }

      if (!user.emailTokenExpire || user.emailTokenExpire < new Date()) {
        await this.recordVerificationAttempt(ip || "unknown", false);
        throw new ValidationError("Verification token has expired");
      }

      // Update user verification status
      await this.updateUserVerificationStatus(user.id);
      await this.recordVerificationAttempt(ip || "unknown", true);

      return user;
    } catch (error) {
      this.logger.error("Error verifying email:", error);
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError(
        "EmailVerification",
        "Failed to verify email",
      );
    }
  }

  /**
   * Send verification email
   * Note: This is a placeholder. You'll need to implement actual email sending logic
   */
  public async sendVerificationEmail(user: User, token: string): Promise<void> {
    try {
      // Check rate limiting for email sending
      await this.checkResendRateLimit(user.email);

      const template = await this.getEmailTemplate("verification");
      const verificationUrl = this.generateVerificationUrl(token);

      const emailData = {
        to: user.email,
        subject: template.subject,
        text: this.templateEngine.render(template.text, {
          username: user.username,
          verificationUrl,
          expiryHours: this.config.tokenExpiry,
        }),
        html: this.templateEngine.render(template.html, {
          username: user.username,
          verificationUrl,
          expiryHours: this.config.tokenExpiry,
        }),
      };

      await this.emailService.sendEmail(emailData);
      this.recordEmailSent(user.email);
    } catch (error) {
      this.logger.error("Error sending verification email:", error);
      throw new ExternalServiceError(
        "EmailVerification",
        "Failed to send verification email",
      );
    }
  }

  /**
   * Resend verification email
   */
  public async resendVerificationEmail(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new ExternalServiceError("EmailVerification", "User not found");
      }

      if (user.emailConfirmed) {
        throw new ExternalServiceError(
          "EmailVerification",
          "Email already verified",
        );
      }

      const token = await this.generateVerificationToken(user);
      await this.sendVerificationEmail(user, token);
    } catch (error) {
      this.logger.error("Error resending verification email:", error);
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError(
        "EmailVerification",
        "Failed to resend verification email",
      );
    }
  }

  /**
   * Get email template
   */
  private async getEmailTemplate(templateName: string): Promise<EmailTemplate> {
    const cacheKey = `template:${templateName}`;
    const cachedTemplate = this.templateCache.get<EmailTemplate>(cacheKey);

    if (cachedTemplate) {
      return cachedTemplate;
    }

    try {
      const template = await this.loadEmailTemplate(templateName);
      this.templateCache.set(cacheKey, template);
      return template;
    } catch (error) {
      this.logger.error("Error loading email template:", error);
      throw new Error("Failed to load email template");
    }
  }

  /**
   * Load email template from file system
   */
  private async loadEmailTemplate(
    _templateName: string,
  ): Promise<EmailTemplate> {
    // Implementation would load and parse template files
    // This is a placeholder that would be replaced with actual template loading logic
    return {
      subject: "Verify your email",
      text: "Please verify your email by clicking: {verificationUrl}",
      html: '<p>Please verify your email by clicking: <a href="{verificationUrl}">here</a></p>',
    };
  }

  /**
   * Generate a secure random token
   */
  private async generateSecureToken(): Promise<string> {
    const buffer = await crypto.randomBytes(32);
    return buffer.toString("base64url");
  }

  /**
   * Get token expiration date
   */
  private getTokenExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + this.config.tokenExpiry);
    return expiration;
  }

  /**
   * Generate verification URL
   */
  private generateVerificationUrl(token: string): string {
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    return `${baseUrl}/verify-email?token=${token}`;
  }

  /**
   * Check verification rate limit
   */
  private async checkVerificationRateLimit(identifier: string): Promise<void> {
    await this.rateLimiter.checkLimit(identifier);
  }

  /**
   * Check resend rate limit
   */
  private async checkResendRateLimit(email: string): Promise<void> {
    const lastSent = this.verificationAttempts.get<Date>(`resend:${email}`);
    if (lastSent) {
      const timeSinceLastSend = Math.floor(
        (Date.now() - lastSent.getTime()) / (1000 * 60),
      );
      if (timeSinceLastSend < this.config.resendCooldown) {
        throw new TooManyRequestsError(
          `Please wait ${this.config.resendCooldown - timeSinceLastSend} minutes before requesting another email`,
        );
      }
    }
  }

  /**
   * Record verification attempt
   */
  private async recordVerificationAttempt(
    identifier: string,
    success: boolean,
  ): Promise<void> {
    const attempts =
      this.verificationAttempts.get<VerificationAttempt[]>(identifier) || [];
    attempts.push({
      timestamp: new Date(),
      success,
      ip: identifier,
    });
    this.verificationAttempts.set(identifier, attempts);
  }

  /**
   * Record email sent
   */
  private recordEmailSent(email: string): void {
    this.verificationAttempts.set(`resend:${email}`, new Date());
  }

  /**
   * Update user verification token
   */
  private async updateUserVerificationToken(
    _userId: string,
    _token: string,
    _expiration: Date,
  ): Promise<void> {
    // Implementation would update user in database
    // This is a placeholder that would be replaced with actual database update
  }

  /**
   * Update user verification status
   */
  private async updateUserVerificationStatus(_userId: string): Promise<void> {
    // Implementation would update user in database
    // This is a placeholder that would be replaced with actual database update
  }

  /**
   * Find user by verification token
   */
  private async findUserByVerificationToken(
    _token: string,
  ): Promise<User | null> {
    // Implementation would query database
    // This is a placeholder that would be replaced with actual database query
    return null;
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(
    user: User,
    token: string,
  ): Promise<void> {
    try {
      const template = await this.getEmailTemplate("password-reset");
      const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

      const emailData = {
        to: user.email,
        subject: "Reset Your Password",
        text: this.templateEngine.render(template.text, {
          username: user.username,
          resetUrl,
          expiryHours: this.config.tokenExpiry,
        }),
        html: this.templateEngine.render(template.html, {
          username: user.username,
          resetUrl,
          expiryHours: this.config.tokenExpiry,
        }),
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      this.logger.error("Error sending password reset email:", error);
      throw new ExternalServiceError(
        "EmailVerification",
        "Failed to send password reset email",
      );
    }
  }
}
