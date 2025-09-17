import { pbkdf2, randomBytes } from "crypto";
import { promisify } from "util";

import { Response } from "express";

import { ServerEnvironment } from "@/server/infrastructure/config/ConfigService";

const pbkdf2Async = promisify(pbkdf2);

/**
 * Password strength validation options
 */
export interface PasswordStrengthOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

/**
 * Password strength validation result
 */
export interface PasswordStrengthResult {
  valid: boolean;
  reasons: string[];
}

/**
 * Authentication cookie data
 */
export interface AuthCookieData {
  authToken: string;
  userId: string;
  expiration: Date;
}

/**
 * Generate a password hash using PBKDF2
 */
export async function getPasswordHash(
  env: { config: { passwordSalt: string } },
  password: string,
  iterations: number = 100000
): Promise<string> {
  const salt = env.config.passwordSalt;
  const hash = await pbkdf2Async(password, salt, iterations, 64, "sha512");
  return hash.toString("hex");
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(
  password: string,
  options: PasswordStrengthOptions = {}
): PasswordStrengthResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  const reasons: string[] = [];

  if (password.length < minLength) {
    reasons.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push("Password must contain at least one uppercase letter");
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    reasons.push("Password must contain at least one lowercase letter");
  }

  if (requireNumbers && !/\d/.test(password)) {
    reasons.push("Password must contain at least one number");
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    reasons.push("Password must contain at least one special character");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Set authentication cookies
 */
export function setAuthCookies(
  env: ServerEnvironment,
  data: AuthCookieData,
  res: Response
): void {
  const isProduction = env.config.production;
  const domain = isProduction ? env.config.baseUrl : undefined;

  const cookieOptions = {
    secure: isProduction,
    httpOnly: true,
    expires: data.expiration,
    sameSite: "strict" as const,
    domain,
  };

  // Set auth token cookie (httpOnly)
  res.cookie("authToken", data.authToken, cookieOptions);

  // Set user ID cookie (not httpOnly for client access)
  res.cookie("userId", data.userId, {
    ...cookieOptions,
    httpOnly: false,
  });
}

/**
 * Get auth token from cookie
 */
export function getAuthTokenCookie(req: {
  cookies: Record<string, string>;
}): string | undefined {
  return req.cookies.authToken;
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: Response): void;
export function clearAuthCookies(env: ServerEnvironment, res: Response): void;
export function clearAuthCookies(
  envOrRes: ServerEnvironment | Response,
  res?: Response
): void {
  let env: ServerEnvironment | undefined;
  let response: Response;

  if (res) {
    // Two parameter version
    env = envOrRes as ServerEnvironment;
    response = res;
  } else {
    // Single parameter version
    response = envOrRes as Response;
  }

  const isProduction = env?.config?.production || false;
  const domain = isProduction ? env?.config?.baseUrl : undefined;

  const cookieOptions = {
    secure: isProduction,
    httpOnly: true,
    sameSite: "strict" as const,
    domain,
  };

  response.clearCookie("authToken", cookieOptions);
  response.clearCookie("userId", { ...cookieOptions, httpOnly: false });
}
