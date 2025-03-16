import { Request, Response } from "express"

import * as t from "../../shared/dataTypes"
import { AuthService } from "../services/AuthService"
import { AuthTokenService, TokenType } from "../services/AuthTokenService"

// Register API
interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RefreshTokenInput {
  refreshToken: string;
}

const registerInput = t.object({
  username: t.string(),
  email: t.string(),
  password: t.string(),
  displayName: t.string(),
  firstName: t.string(),
  lastName: t.string(),
});

const loginInput = t.object({
  email: t.string(),
  password: t.string(),
});

const refreshTokenInput = t.object({
  refreshToken: t.string(),
});

// Get AuthService instance
const authService = AuthService.getInstance()

interface AuthRequest extends Request {
  headers: {
    authorization?: string;
  };
}

export async function register(
  req: Request & { body: RegisterInput },
  res: Response
) {
  const args = registerInput.validate(req.body);
  if (!args) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await authService.register(args);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

export async function login(
  req: Request & { body: LoginInput },
  res: Response
) {
  const args = loginInput.validate(req.body);
  if (!args) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await authService.login(args);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
}

// Get Current User API
export const getCurrentUserInput = t.object({})

export async function getCurrentUser(
  req: AuthRequest,
  res: Response
) {
  const authHeader = req.headers.authorization;
  const token = typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = await authService.getCurrentUser(token);
    return res.status(200).json(user);
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
}

// Refresh Token API
export async function refreshToken(
  req: Request & { body: RefreshTokenInput },
  res: Response
) {
  const args = refreshTokenInput.validate(req.body);
  if (!args) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await authService.refreshToken(args.refreshToken);
    const tokenService = AuthTokenService.getInstance();
    tokenService.blacklistToken(args.refreshToken, TokenType.REFRESH);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
}
