import NodeCache from "node-cache";

import { User } from "@models/auth";
import { UserRepository } from "@repositories/auth";
import {
  EmailVerificationService,
  MFAService,
  PasswordService,
  TokenService,
} from "@services/app/core/auth";
import {
  BaseService,
  ValidationRule,
  commonValidators,
  DuplicateResourceError,
  UnauthorizedError,
  TooManyRequestsError,
  RateLimiter,
  SessionManager,
} from "@services/shared";

import {
  RegisterDTO,
  LoginDTO,
  AuthResult,
  PasswordResetRequestDTO,
  PasswordResetConfirmDTO,
  EmailVerificationDTO,
  MFASetupDTO,
  LoginAttempt,
  DeviceInfo,
  SessionInfo,
} from "./types";

/**
 * Service for handling authentication operations with enhanced security
 */
export class AuthService extends BaseService {
  private readonly loginRateLimiter: RateLimiter;
  private readonly resetRateLimiter: RateLimiter;
  private readonly verifyRateLimiter: RateLimiter;
  private readonly sessionManager: SessionManager;
  private readonly loginAttemptsCache: NodeCache;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_LOCKOUT_TIME = 15 * 60; // 15 minutes

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mfaService: MFAService,
  ) {
    super("AuthService");
    this.loginRateLimiter = new RateLimiter("login", 5, 60); // 5 attempts per minute
    this.resetRateLimiter = new RateLimiter("reset", 3, 60); // 3 attempts per minute
    this.verifyRateLimiter = new RateLimiter("verify", 3, 60); // 3 attempts per minute
    this.sessionManager = new SessionManager();
    this.loginAttemptsCache = new NodeCache({
      stdTTL: this.LOGIN_LOCKOUT_TIME,
    });
  }

  /**
   * Register a new user with enhanced security
   */
  public async register(
    data: RegisterDTO,
    deviceInfo: DeviceInfo,
  ): Promise<AuthResult> {
    try {
      // Validate registration data
      this.validateRegistration(data);

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new DuplicateResourceError("User", "email", data.email);
      }

      // Create user with hashed password and additional security fields
      const hashedPassword = await this.passwordService.hashPassword(
        data.password,
      );
      const user = await this.userRepository.createWithHashedPassword({
        ...data,
        password: hashedPassword,
        role: "user",
        isVerified: false,
        emailConfirmed: false,
        mfaEnabled: false,
        mfaSecret: null,
        lastPasswordChange: new Date(),
        passwordHistory: [],
        securityQuestions: [],
      });

      // Generate verification token and send email
      const verificationToken =
        await this.emailVerificationService.generateVerificationToken(user);
      await this.emailVerificationService.sendVerificationEmail(
        user,
        verificationToken,
      );

      // Create session and generate tokens
      const session = await this.sessionManager.createSession(
        user.id,
        deviceInfo,
      );
      const tokens = this.generateAuthTokens(user, session.id);

      return {
        user,
        ...tokens,
        requiresMFA: false,
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error("Error in register:", error);
      throw error;
    }
  }

  /**
   * Login user with MFA and session support
   */
  public async login(
    data: LoginDTO,
    deviceInfo: DeviceInfo,
  ): Promise<AuthResult> {
    try {
      // Check rate limiting
      await this.checkLoginRateLimit(data.email);

      // Validate login data
      this.validateLogin(data);

      // Find user by email
      const user = await this.userRepository.findByEmail(data.email);
      if (!user) {
        await this.recordFailedLoginAttempt(data.email);
        throw new UnauthorizedError("Invalid email or password");
      }

      // Check account lockout
      if (await this.isAccountLocked(data.email)) {
        throw new TooManyRequestsError(
          "Account temporarily locked due to too many failed attempts",
        );
      }

      // Verify password
      const isPasswordValid = await this.passwordService.comparePassword(
        data.password,
        user.password,
      );
      if (!isPasswordValid) {
        await this.recordFailedLoginAttempt(data.email);
        throw new UnauthorizedError("Invalid email or password");
      }

      // Reset failed login attempts on successful password verification
      await this.resetLoginAttempts(data.email);

      // Check if MFA is required
      if (user.mfaEnabled && !data.mfaToken) {
        return {
          user,
          token: "",
          refreshToken: "",
          requiresMFA: true,
          tempToken: this.tokenService.generateTempToken(user.id),
        };
      }

      // Verify MFA if enabled
      if (user.mfaEnabled) {
        const isMFAValid = await this.mfaService.verifyToken(
          user.id,
          data.mfaToken!,
        );
        if (!isMFAValid) {
          throw new UnauthorizedError("Invalid MFA token");
        }
      }

      // Create new session
      const session = await this.sessionManager.createSession(
        user.id,
        deviceInfo,
      );
      const tokens = this.generateAuthTokens(user, session.id);

      // Update last login information
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
        lastLoginIp: deviceInfo.ip,
        lastLoginUserAgent: deviceInfo.userAgent,
      });

      return {
        user,
        ...tokens,
        requiresMFA: false,
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error("Error in login:", error);
      throw error;
    }
  }

  /**
   * Setup MFA for user
   */
  public async setupMFA(userId: string): Promise<MFASetupDTO> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      const { secret, qrCode } = await this.mfaService.generateSecret(
        user.email,
      );

      // Store secret temporarily until verification
      await this.mfaService.storeTemporarySecret(userId, secret);

      return {
        secret,
        qrCode,
      };
    } catch (error) {
      this.logger.error("Error in setupMFA:", error);
      throw error;
    }
  }

  /**
   * Verify and enable MFA
   */
  public async verifyAndEnableMFA(
    userId: string,
    token: string,
  ): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      const tempSecret = await this.mfaService.getTemporarySecret(userId);
      if (!tempSecret) {
        throw new UnauthorizedError("MFA setup expired");
      }

      const isValid = await this.mfaService.verifyToken(
        userId,
        token,
        tempSecret,
      );
      if (!isValid) {
        throw new UnauthorizedError("Invalid MFA token");
      }

      // Enable MFA and store secret permanently
      await this.userRepository.update(userId, {
        mfaEnabled: true,
        mfaSecret: tempSecret,
      });

      await this.mfaService.clearTemporarySecret(userId);
      return true;
    } catch (error) {
      this.logger.error("Error in verifyAndEnableMFA:", error);
      throw error;
    }
  }

  /**
   * Disable MFA
   */
  public async disableMFA(userId: string, token: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      if (!user.mfaEnabled) {
        throw new UnauthorizedError("MFA is not enabled");
      }

      const isValid = await this.mfaService.verifyToken(userId, token);
      if (!isValid) {
        throw new UnauthorizedError("Invalid MFA token");
      }

      await this.userRepository.update(userId, {
        mfaEnabled: false,
        mfaSecret: null,
      });

      return true;
    } catch (error) {
      this.logger.error("Error in disableMFA:", error);
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   */
  public async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      return await this.sessionManager.getUserSessions(userId);
    } catch (error) {
      this.logger.error("Error in getUserSessions:", error);
      throw error;
    }
  }

  /**
   * Terminate a specific session
   */
  public async terminateSession(
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    try {
      return await this.sessionManager.terminateSession(userId, sessionId);
    } catch (error) {
      this.logger.error("Error in terminateSession:", error);
      throw error;
    }
  }

  /**
   * Terminate all sessions except current
   */
  public async terminateOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<boolean> {
    try {
      return await this.sessionManager.terminateOtherSessions(
        userId,
        currentSessionId,
      );
    } catch (error) {
      this.logger.error("Error in terminateOtherSessions:", error);
      throw error;
    }
  }

  /**
   * Request password reset with rate limiting
   */
  public async requestPasswordReset(
    data: PasswordResetRequestDTO,
  ): Promise<void> {
    try {
      await this.resetRateLimiter.checkLimit(data.email);

      const user = await this.userRepository.findByEmail(data.email);
      if (!user) {
        // Don't reveal that email doesn't exist
        return;
      }

      const resetToken = await this.passwordService.generateResetToken();
      const resetTokenExpiration =
        this.passwordService.getResetTokenExpiration();

      await this.userRepository.update(user.id, {
        emailToken: resetToken,
        emailTokenExpire: resetTokenExpiration,
      });

      await this.emailVerificationService.sendPasswordResetEmail(
        user,
        resetToken,
      );
    } catch (error) {
      this.logger.error("Error in requestPasswordReset:", error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(data: PasswordResetConfirmDTO): Promise<void> {
    try {
      const user = await this.userRepository.findByEmailToken(data.token);
      if (
        !user ||
        !user.emailTokenExpire ||
        user.emailTokenExpire < new Date()
      ) {
        throw new UnauthorizedError("Invalid or expired reset token");
      }

      // Validate new password
      if (!this.passwordService.validatePassword(data.newPassword)) {
        throw new UnauthorizedError("Password does not meet requirements");
      }

      // Update password
      const hashedPassword = await this.passwordService.hashPassword(
        data.newPassword,
      );
      const updatedUser = await this.userRepository.update(user.id, {
        password: hashedPassword,
        emailToken: null,
        emailTokenExpire: null,
      });

      if (!updatedUser) {
        throw new UnauthorizedError("Failed to update password");
      }
    } catch (error) {
      this.logger.error("Error in resetPassword:", error);
      throw error;
    }
  }

  /**
   * Verify email
   */
  public async verifyEmail(data: EmailVerificationDTO): Promise<User> {
    try {
      await this.verifyRateLimiter.checkLimit(data.token);
      return await this.emailVerificationService.verifyEmail(data.token);
    } catch (error) {
      this.logger.error("Error in verifyEmail:", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      const token = this.tokenService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: payload.sessionId,
      });

      return { token };
    } catch (error) {
      this.logger.error("Error in refreshToken:", error);
      throw error;
    }
  }

  /**
   * Check login rate limit
   */
  private async checkLoginRateLimit(identifier: string): Promise<void> {
    await this.loginRateLimiter.checkLimit(identifier);
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLoginAttempt(identifier: string): Promise<void> {
    const attempts: LoginAttempt[] =
      this.loginAttemptsCache.get(identifier) || [];
    attempts.push({
      timestamp: new Date(),
      successful: false,
    });
    this.loginAttemptsCache.set(identifier, attempts);
  }

  /**
   * Reset login attempts
   */
  private async resetLoginAttempts(identifier: string): Promise<void> {
    this.loginAttemptsCache.del(identifier);
  }

  /**
   * Check if account is locked
   */
  private async isAccountLocked(identifier: string): Promise<boolean> {
    const attempts: LoginAttempt[] =
      this.loginAttemptsCache.get(identifier) || [];
    const recentAttempts = attempts.filter(
      (attempt) =>
        !attempt.successful &&
        attempt.timestamp >
          new Date(Date.now() - this.LOGIN_LOCKOUT_TIME * 1000),
    );
    return recentAttempts.length >= this.MAX_LOGIN_ATTEMPTS;
  }

  /**
   * Generate authentication tokens with session ID
   */
  private generateAuthTokens(
    user: User,
    sessionId: string,
  ): { token: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    return {
      token: this.tokenService.generateToken(payload),
      refreshToken: this.tokenService.generateRefreshToken(payload),
    };
  }

  /**
   * Validate registration data
   */
  private validateRegistration(data: RegisterDTO): void {
    const rules: ValidationRule[] = [
      {
        field: "email",
        rules: [
          commonValidators.required("Email"),
          commonValidators.email("Email"),
        ],
      },
      {
        field: "password",
        rules: [
          commonValidators.required("Password"),
          commonValidators.minLength("Password", 8),
          (value) =>
            !this.passwordService.validatePassword(value as string)
              ? "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
              : null,
        ],
      },
      {
        field: "username",
        rules: [
          commonValidators.required("Username"),
          commonValidators.minLength("Username", 3),
          commonValidators.maxLength("Username", 30),
        ],
      },
    ];

    this.validateAndThrow(data, rules);
  }

  /**
   * Validate login data
   */
  private validateLogin(data: LoginDTO): void {
    const rules: ValidationRule[] = [
      {
        field: "email",
        rules: [
          commonValidators.required("Email"),
          commonValidators.email("Email"),
        ],
      },
      {
        field: "password",
        rules: [commonValidators.required("Password")],
      },
    ];

    this.validateAndThrow(data, rules);
  }
}
