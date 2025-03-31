import { scrypt } from "crypto";

import {
  ServerEnvironment,
  ServerConfig,
} from "@server/infrastructure/config/Env";

import type { Request, Response } from "express";

export async function getPasswordHash(
  environment: { config: ServerConfig },
  password: string,
): Promise<string> {
  const passwordHash = await new Promise<string>((resolve, reject) => {
    scrypt(password, environment.config.passwordSalt, 64, (error, hash) => {
      if (error) return reject(error);
      else resolve(hash.toString("base64"));
    });
  });
  return passwordHash;
}

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

  // Set the cookie on the response.
  res.cookie("authToken", authToken, {
    secure: config.production,
    httpOnly: true,
    expires: expiration,
    domain: config.production
      ? typeof config.corsOrigin === "string"
        ? config.corsOrigin
        : undefined
      : undefined,
  });

  // Set the current logged in userId so the client knows.
  res.cookie("userId", userId, {
    secure: config.production,
    httpOnly: false,
    expires: expiration,
    domain: config.production
      ? typeof config.corsOrigin === "string"
        ? config.corsOrigin
        : undefined
      : undefined,
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
