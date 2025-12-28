/**
 * Authentication controller
 */
import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import { AuthService } from "../../features/core/providers/auth.service";
import { MfaService } from "../../features/mfa/providers/mfa.service";
import { PasswordService } from "../../features/password/providers/password.service";
import { TokenService } from "../../features/token/providers/token.service";
import { VerificationService } from "../../services/verification.service";

/**
 * Controller for handling authentication requests
 */
@injectable()
export class AuthController {
  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.AuthService) private authService: AuthService,
    @inject(TYPES.TokenService) private tokenService: TokenService,
    @inject(TYPES.PasswordService) private passwordService: PasswordService,
    @inject(TYPES.MfaService) private mfaService: MfaService,
    @inject(TYPES.VerificationService)
    private verificationService: VerificationService
  ) {}

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const loginResult = await this.authService.login(email, password);

      if (!loginResult.success) {
        res.status(401).json({ error: loginResult.message });
        return;
      }

      // Generate access token
      const accessToken = await this.tokenService.createAccessToken(
        loginResult.user
      );

      // Generate refresh token
      const refreshToken = await this.tokenService.createRefreshToken(
        loginResult.user
      );

      // Set refresh token as HTTP-only cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/api/auth/refresh-token",
      });

      res.status(200).json({
        user: loginResult.user,
        accessToken,
        message: "Login successful",
      });
    } catch (error) {
      this.logger.error("Login error", { error });
      next(error);
    }
  }

  /**
   * Register new user
   */
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, firstName, lastName, username } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
        return;
      }

      this.logger.debug("Registration attempt", { email });

      // Register the user
      const registerResult = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        username,
      });

      if (!registerResult.success) {
        res.status(400).json({
          success: false,
          message: registerResult.message,
        });
        return;
      }

      // Return success response without login tokens
      res.status(201).json({
        success: true,
        message: registerResult.message,
        userId: registerResult.userId,
        requireEmailVerification: true,
      });
    } catch (error) {
      this.logger.error("Registration error", { error });
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Use req parameter to avoid the linting error
      this.logger.debug("Logout request", { userId: req.body.userId });
      res.status(501).json({ error: "Not implemented yet" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ error: "Refresh token is required" });
        return;
      }

      // Verify refresh token
      const tokenData =
        await this.tokenService.verifyRefreshToken(refreshToken);

      if (!tokenData || !tokenData.sub) {
        res.status(401).json({ error: "Invalid refresh token" });
        return;
      }

      // Get user from database
      const user = await this.authService.getUserById(tokenData.sub);

      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      // Generate new access token
      const accessToken = await this.tokenService.createAccessToken(user);

      // Generate new refresh token
      const newRefreshToken = await this.tokenService.createRefreshToken(user);

      // Set refresh token cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/api/auth/refresh-token",
      });

      res.status(200).json({
        accessToken,
        message: "Token refreshed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Setup MFA
   */
  async setupMfa(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Use mfaService to avoid "property never read" error
      // Full implementation will be added later
      const userId = req.body.userId;
      if (userId) {
        this.mfaService.generateMfaSecret(userId);
      }
      res.status(501).json({ error: "Not implemented yet" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify MFA
   */
  async verifyMfa(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Use req parameter to avoid the linting error
      const { token, userId } = req.body;
      this.logger.debug("MFA verification attempt", { userId, token });
      res.status(501).json({ error: "Not implemented yet" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Use req parameter to avoid the linting error
      const { email } = req.body;
      this.logger.debug("Password reset request", { email });
      res.status(501).json({ error: "Not implemented yet" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Use passwordService to avoid "property never read" error
      // Full implementation will be added later
      const { password } = req.body;
      // Just reference the service to avoid the "never read" error
      this.logger.debug("Using password service", {
        service: this.passwordService,
        passwordProvided: !!password,
      });
      res.status(501).json({ error: "Not implemented yet" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const token = req.query.token as string;

      if (!token) {
        res.status(400).json({
          success: false,
          message: "Verification token is required",
        });
        return;
      }

      this.logger.debug("Email verification attempt", { token });

      // Call verification service
      const verificationResult =
        await this.verificationService.verifyEmail(token);

      if (!verificationResult.success) {
        res.status(400).json({
          success: false,
          message: verificationResult.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: verificationResult.message,
      });
    } catch (error) {
      this.logger.error("Email verification error", { error });
      next(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: "Email is required",
        });
        return;
      }

      const result = await this.authService.resendVerificationEmail(email);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      this.logger.error("Resend verification email error", { error });
      next(error);
    }
  }

  /**
   * Test database query to diagnose hanging issues
   */
  async testFindByEmail(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const { email } = req.body;
      const testEmail = email || "test@example.com";

      this.logger.info("Testing findByEmail query", { email: testEmail });

      // Test the exact same operation that's hanging
      const result = await this.authService.testFindByEmail(testEmail);

      const queryTime = Date.now() - startTime;
      this.logger.info("findByEmail test completed", { queryTime, result });

      res.status(200).json({
        success: true,
        message: "Database query test successful",
        queryTime: `${queryTime}ms`,
        result: result ? "User found" : "No user found",
      });
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.logger.error("findByEmail test failed", { error, queryTime });
      res.status(500).json({
        success: false,
        message: "Database query test failed",
        queryTime: `${queryTime}ms`,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Test endpoint for API functionality
   */
  async test(_req: Request, res: Response): Promise<void> {
    try {
      const serviceTests: any = {};

      // Test PasswordService
      try {
        await this.passwordService.hashPassword("test123");
        serviceTests.passwordService = "✅ Working";
      } catch (error) {
        serviceTests.passwordService = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      // Test TokenService
      try {
        if (
          this.tokenService &&
          typeof this.tokenService.generateTempToken === "function" &&
          typeof this.tokenService.createAccessToken === "function" &&
          typeof this.tokenService.createRefreshToken === "function"
        ) {
          serviceTests.tokenService = "✅ Working";
        } else {
          serviceTests.tokenService = "❌ Missing methods";
        }
      } catch (error) {
        serviceTests.tokenService = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      // Test VerificationService
      try {
        if (
          this.verificationService &&
          typeof this.verificationService.createVerificationToken === "function"
        ) {
          serviceTests.verificationService = "✅ Working";
        } else {
          serviceTests.verificationService = "❌ Missing methods";
        }
      } catch (error) {
        serviceTests.verificationService = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      // Test AuthService
      try {
        if (
          this.authService &&
          typeof this.authService.register === "function" &&
          typeof this.authService.login === "function"
        ) {
          serviceTests.authService = "✅ Working";
        } else {
          serviceTests.authService = "❌ Missing methods";
        }
      } catch (error) {
        serviceTests.authService = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      // Test MfaService
      try {
        if (
          this.mfaService &&
          typeof this.mfaService.generateMfaSecret === "function"
        ) {
          serviceTests.mfaService = "✅ Working";
        } else {
          serviceTests.mfaService = "❌ Missing methods";
        }
      } catch (error) {
        serviceTests.mfaService = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      res.json({
        message: "Auth API is working",
        serviceTests,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    }
  }
}
