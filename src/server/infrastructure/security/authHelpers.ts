import { scrypt } from "crypto";

import {
  ServerEnvironment,
  ServerConfig,
} from "@server/infrastructure/config/ConfigService";

import type { Request, Response } from "express";

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Generate a secure password hash using scrypt
 *
 * @param environment - Server environment with configuration
 * @param password - Plain text password to hash
 * @param iterations - Number of iterations for the hashing algorithm (defaults to 16384)
 * @returns Promise resolving to the hashed password as a base64 string
 */
export async function getPasswordHash(
  environment: { config: ServerConfig },
  password: string,
  iterations: number = 16384,
): Promise<string> {
  const passwordHash = await new Promise<string>((resolve, reject) => {
    // Use reasonable scrypt parameters that won't exceed memory limits
    const scryptOptions = {
      N: iterations, // CPU/memory cost parameter
      r: 8, // Block size parameter
      p: 1, // Parallelization parameter
      maxmem: 128 * 1024 * 1024, // 128MB - adjust based on your environment
    };

    scrypt(
      password,
      environment.config.passwordSalt,
      64,
      scryptOptions,
      (error, hash) => {
        if (error) return reject(error);
        else resolve(hash.toString("base64"));
      },
    );
  });
  return passwordHash;
}

/**
 * Validate password strength against requirements
 *
 * @param password - Password to validate
 * @param requirements - Password requirements (uses default if not provided)
 * @returns Object with result and any failure reasons
 */
export function validatePasswordStrength(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (password.length < requirements.minLength) {
    reasons.push(
      `Password must be at least ${requirements.minLength} characters long`,
    );
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push("Password must contain at least one uppercase letter");
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    reasons.push("Password must contain at least one lowercase letter");
  }

  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    reasons.push("Password must contain at least one number");
  }

  if (requirements.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    reasons.push("Password must contain at least one special character");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Set authentication cookies on the response
 *
 * @param environment - Server environment with configuration
 * @param args - Authentication data including token, expiration and user ID
 * @param res - Express response object
 */
export function setAuthCookies(
  environment: ServerEnvironment,
  args: {
    authToken: string;
    expiration: Date;
    userId: string;
  },
  res: Response,
): void {
  const { config } = environment;
  const { authToken, expiration, userId } = args;

  const cookieOptions = {
    secure: config.production,
    httpOnly: true,
    expires: expiration,
    sameSite: "strict" as const,
    domain: config.production
      ? typeof config.corsOrigin === "string"
        ? config.corsOrigin
        : undefined
      : undefined,
  };

  // Set the cookie on the response.
  res.cookie("authToken", authToken, cookieOptions);

  // Set the current logged in userId so the client knows.
  res.cookie("userId", userId, {
    ...cookieOptions,
    httpOnly: false,
  });
}

export function getAuthTokenCookie(
  req: Request & { cookies: { [key: string]: string | undefined } },
): string | undefined {
  const cookies = req.cookies as { [key: string]: string | undefined };
  return cookies["authToken"];
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("authToken");
  res.clearCookie("userId");
}
