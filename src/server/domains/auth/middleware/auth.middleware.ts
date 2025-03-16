// src/server/domains/auth/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { UnauthorizedError } from '../errors/unauthorized.error';

declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      role: string;
    };
  }
}

/**
 * Authentication middleware
 * Verifies the JWT token and attaches the user to the request
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = (req.headers as Record<string, string | string[] | undefined>)['authorization'] as string | undefined;
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}

/**
 * Role-based authorization middleware
 * Checks if the user has the required role
 */
export function authorize(role: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user as { userId: string; role: string } | undefined;
    if (!user || user.role !== role) {
      throw new UnauthorizedError('Insufficient permissions');
    }
    next();
  };
}

