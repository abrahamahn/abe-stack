import { Request, Response } from "express";
import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Core Authentication Service
 */
@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.UserRepository) private userRepository: any,
    @inject(TYPES.TokenService) private tokenService: any,
    @inject(TYPES.PasswordService) private passwordService: any,
    @inject(TYPES.SessionService) private sessionService: any,
    @inject(TYPES.VerificationService) private verificationService: any,
    @inject(TYPES.EmailService) private emailService: any
  ) {}

  /**
   * Register a new user
   */
  async register(data: any): Promise<any> {
    try {
      console.log("=== AUTH SERVICE REGISTER ===");
      console.log("Registration data:", {
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      // Check if email already exists
      console.log("Checking if email already exists...");
      try {
        console.log(
          "About to call userRepository.findByEmail with email:",
          data.email
        );

        // Add a much shorter timeout to the findByEmail call (3 seconds instead of 10)
        const findByEmailPromise = this.userRepository.findByEmail(data.email);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  "findByEmail timeout after 3 seconds - possible database connection issue"
                )
              ),
            3000
          );
        });

        console.log("Starting findByEmail query with 3-second timeout...");
        const startTime = Date.now();

        const existingUser = await Promise.race([
          findByEmailPromise,
          timeoutPromise,
        ]);

        const queryTime = Date.now() - startTime;
        console.log(
          `findByEmail completed in ${queryTime}ms, result:`,
          existingUser ? "User found" : "No user found"
        );

        if (existingUser) {
          console.log("Registration failed: Email already registered");
          return { success: false, message: "Email already registered" };
        }
        console.log("Email check passed - no existing user found");
      } catch (emailCheckError) {
        console.error("Error checking existing email:", emailCheckError);

        // If it's a timeout, provide specific guidance
        if (
          emailCheckError instanceof Error &&
          emailCheckError.message.includes("timeout")
        ) {
          console.error("DATABASE TIMEOUT DETECTED - This suggests:");
          console.error("1. Database connection pool is exhausted");
          console.error("2. Query is hanging due to locks or deadlocks");
          console.error("3. Database server is overloaded or unresponsive");
          console.error("4. Network connectivity issues");

          // Try to get database stats
          try {
            const dbService = this.userRepository as any;
            if (
              dbService.databaseService &&
              typeof dbService.databaseService.getStats === "function"
            ) {
              const stats = dbService.databaseService.getStats();
              console.error("Database connection stats:", stats);
            }
          } catch (statsError) {
            console.error("Could not get database stats:", statsError);
          }
        }

        throw emailCheckError;
      }

      // Hash password
      console.log("Hashing password...");
      try {
        const hashedPassword = await this.passwordService.hashPassword(
          data.password
        );
        console.log("Password hashed successfully");

        // Create unverified user with proper data structure
        console.log("Creating new user...");
        const userData = {
          email: data.email,
          username: data.username || data.email.split("@")[0], // Use email prefix if no username provided
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          roles: ["user"], // Required field - array of roles
          active: true, // Required field - user is active by default
          isVerified: false,
          emailConfirmed: false,
          accountStatus: "pending",
          // Remove createdAt and updatedAt - these are auto-managed by the database
        };

        console.log("User data prepared:", {
          ...userData,
          password: "[REDACTED]",
        });

        try {
          const user = await this.userRepository.create(userData);
          console.log(`User created with ID: ${user.id}`);

          // Generate verification token
          console.log(`Generating verification token for user ${user.id}...`);
          try {
            const verificationToken =
              await this.verificationService.createVerificationToken(user.id);
            console.log(
              `Verification token created: ${verificationToken.token}`
            );

            // Send verification email
            console.log(`Sending verification email to ${user.email}...`);
            try {
              const emailResult = await this.emailService.sendVerificationEmail(
                user.email,
                user.firstName || "",
                verificationToken.token,
                process.env.APP_URL || "http://localhost:3000"
              );

              if (emailResult.success) {
                this.logger.info("Verification email sent", {
                  userId: user.id,
                  email: user.email,
                  messageId: emailResult.messageId,
                });
                console.log(
                  `Verification email sent successfully. Message ID: ${emailResult.messageId}`
                );
              } else {
                this.logger.error("Failed to send verification email", {
                  userId: user.id,
                  email: user.email,
                  error: emailResult.error,
                });
                console.error(
                  `Failed to send verification email: ${emailResult.error}`
                );
              }
            } catch (error) {
              this.logger.error("Error sending verification email", {
                userId: user.id,
                email: user.email,
                error,
              });
              console.error("Error sending verification email:", error);
            }
          } catch (tokenError) {
            console.error("Error creating verification token:", tokenError);
            this.logger.error("Failed to create verification token", {
              userId: user.id,
              error: tokenError,
            });
          }

          // Return success
          console.log("Registration completed successfully");
          return {
            success: true,
            message: "Registration successful. Please verify your email.",
            userId: user.id,
            requireEmailVerification: true,
          };
        } catch (userCreationError) {
          console.error("Error creating user:", userCreationError);
          throw userCreationError;
        }
      } catch (passwordError) {
        console.error("Error hashing password:", passwordError);
        throw passwordError;
      }
    } catch (error) {
      this.logger.error("Registration failed", { error });
      console.error("Registration failed:", error);
      throw new Error("Registration failed");
    }
  }

  /**
   * Authenticate a user with email and password
   * @param email User email
   * @param password User password
   * @returns Login result with user info and tokens
   */
  async login(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: any;
    message?: string;
    requireMfa?: boolean;
  }> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);

      // Check if user exists
      if (!user) {
        return { success: false, message: "Invalid email or password" };
      }

      // Verify password
      const isPasswordValid = await this.passwordService.verifyPassword(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return { success: false, message: "Invalid email or password" };
      }

      // Check if email is verified
      if (!user.is_verified || !user.email_confirmed) {
        return {
          success: false,
          message: "Please verify your email before logging in",
        };
      }

      // Check if MFA is required
      if (user.mfaEnabled) {
        return {
          success: true,
          message: "MFA verification required",
          user: this.sanitizeUser(user),
          requireMfa: true,
        };
      }

      // Create a new session
      await this.sessionService.createSession(user.id);

      // Return success with user data
      return {
        success: true,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      this.logger.error("Login error", { error, email });
      return { success: false, message: "An error occurred during login" };
    }
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User object or null
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      this.logger.error("Error getting user by ID", { error, userId });
      return null;
    }
  }

  /**
   * Logout a user
   */
  async logout(req: Request, res: Response): Promise<any> {
    try {
      // Get the current session ID (from middleware)
      const sessionId = (req as any).sessionId;

      // Invalidate the session if it exists
      if (sessionId) {
        await this.sessionService.invalidateSession(sessionId);
      }

      // Clear auth cookies
      this.tokenService.clearCookies(res);

      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      this.logger.error("Logout failed", { error });
      throw new Error("Logout failed");
    }
  }

  /**
   * Resend verification email
   * @param email - User's email address
   */
  async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);

      // Check if user exists
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check if already verified
      if (user.is_verified && user.email_confirmed) {
        return {
          success: false,
          message: "Email is already verified",
        };
      }

      // Generate new verification token
      const verificationToken =
        await this.verificationService.regenerateVerificationToken(user.id);

      // Send verification email
      try {
        const emailResult = await this.emailService.sendVerificationEmail(
          user.email,
          user.firstName || "",
          verificationToken.token,
          process.env.APP_URL || "http://localhost:3000"
        );

        if (emailResult.success) {
          this.logger.info("Verification email resent", {
            userId: user.id,
            email: user.email,
            messageId: emailResult.messageId,
          });

          return {
            success: true,
            message: "Verification email has been sent",
          };
        } else {
          this.logger.error("Failed to resend verification email", {
            userId: user.id,
            email: user.email,
            error: emailResult.error,
          });

          return {
            success: false,
            message: "Failed to send verification email",
          };
        }
      } catch (error) {
        this.logger.error("Error resending verification email", {
          userId: user.id,
          email: user.email,
          error,
        });

        return {
          success: false,
          message: "Error sending verification email",
        };
      }
    } catch (error) {
      this.logger.error("Resend verification email failed", { error, email });
      return {
        success: false,
        message: "Failed to process request",
      };
    }
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: any): any {
    const { password, mfaSecret, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Test method to diagnose findByEmail hanging issues
   */
  async testFindByEmail(email: string): Promise<any> {
    console.log("=== TESTING FINDBYEMAIL ===");
    console.log("Email to test:", email);

    try {
      const startTime = Date.now();
      console.log("Starting direct userRepository.findByEmail call...");

      const result = await this.userRepository.findByEmail(email);

      const queryTime = Date.now() - startTime;
      console.log(`Direct findByEmail completed in ${queryTime}ms`);
      console.log("Result:", result ? "User found" : "No user found");

      return result;
    } catch (error) {
      console.error("Direct findByEmail failed:", error);
      throw error;
    }
  }
}
